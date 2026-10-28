const { SupportTopic, SupportTicket, Order, Listing, NeedRequest, User } = require("../models");

const MAX_TEXT = 1000;
const MAX_OPEN = 5;
const AUDIENCES = ["all", "giver", "seeker"];
const STATUSES = ["open", "answered", "closed"];

const defaults = [
  { group: "Pickups", audience: "seeker", question: "The giver hasn’t accepted my request", answer: "Givers choose who collects. If they don’t accept before the pickup time, the request lapses and you can request other food nearby." },
  { group: "Pickups", audience: "seeker", question: "I can’t see the pickup address", answer: "The house number appears only after the giver accepts. Open the order in Mine to see it." },
  { group: "Pickups", audience: "seeker", question: "Food wasn’t as described", answer: "Leave an honest review on the order. If the food was unsafe, tell us below and we’ll review the giver." },
  { group: "Giving", audience: "giver", question: "Nobody requested my food", answer: "Listings show only to people within a short distance. Check the “Available until” time and try posting again later." },
  { group: "Giving", audience: "giver", question: "Someone didn’t turn up to collect", answer: "Set the listing inactive in Mine so others can request it. Tell us below if it keeps happening." },
  { group: "Giving", audience: "giver", question: "How do I remove a listing?", answer: "Open Mine and tap “Set inactive” on the listing." },
  { group: "Account", audience: "all", question: "Change my address or location", answer: "Go to Account, tap Edit, then “Use this device location”." },
  { group: "Safety", audience: "all", question: "Report a user", answer: "Tell us who it was and what happened. We review every report." }
];

const OTHER = { group: "", audience: "all", question: "Something else", answer: "", isOther: true };

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

function clean(v, max) {
  return String(v == null ? "" : v).replace(/<[^>]*>/g, "").replace(/\s+\n/g, "\n").trim().slice(0, max || MAX_TEXT);
}

function ensure() {
  if (SupportTopic.all().length) return;
  defaults.forEach((d, i) => SupportTopic.create({ ...d, order: i + 1 }));
  SupportTopic.create({ ...OTHER, order: 999 });
}

function topicView(t) {
  return { id: t._id, group: t.group, question: t.question, answer: t.answer, isOther: !!t.isOther };
}

function topicsFor(user) {
  const role = user && user.role;
  return SupportTopic.all()
    .filter((t) => t.enabled !== false && (t.audience === "all" || t.audience === role))
    .map(topicView);
}

function solved(id) {
  const t = SupportTopic.findById(id);
  if (!t) throw fail(404, "Question not found");
  t.solvedCount = (t.solvedCount || 0) + 1;
  SupportTopic.save(t);
  return { ok: true };
}

function orderFor(user, orderId) {
  if (!orderId) return null;
  const o = Order.findById(orderId);
  if (!o || (o.seekerId !== user._id && o.providerId !== user._id)) throw fail(400, "That order isn’t yours");
  const listing = o.listingId ? Listing.findById(o.listingId) : null;
  const need = o.needRequestId ? NeedRequest.findById(o.needRequestId) : null;
  return { id: o._id, label: (listing && listing.name) || (need && need.what) || "Pickup" };
}

function ticketView(t) {
  return {
    id: t._id,
    question: t.question,
    status: t.status,
    orderId: t.orderId,
    orderLabel: t.orderLabel,
    unread: t.unread || 0,
    messages: (t.messages || []).map((m) => ({ from: m.from, text: m.text, at: m.at })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
}

function byNewest(a, b) {
  return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
}

function createTicket(user, body) {
  const b = body || {};
  const topic = b.topicId ? SupportTopic.findById(b.topicId) : SupportTopic.all().find((t) => t.isOther);
  if (!topic || topic.enabled === false) throw fail(400, "Pick a question first");
  const message = clean(b.message);
  if (message.length < 3) throw fail(400, "Write a few words about the problem");
  const open = SupportTicket.forUser(user._id).filter((t) => t.status === "open").length;
  if (open >= MAX_OPEN) throw fail(429, "You have " + MAX_OPEN + " open questions. Wait for a reply before sending another.");
  const order = orderFor(user, b.orderId);
  const row = SupportTicket.create({
    userId: user._id,
    phone: user.phone || user.contactPhone || user.email || "",
    name: (user.profile && user.profile.name) || "",
    role: user.role,
    topicId: topic._id,
    question: topic.question,
    orderId: order && order.id,
    orderLabel: order && order.label,
    message
  });
  return ticketView(row);
}

function myTickets(user) {
  return { tickets: SupportTicket.forUser(user._id).sort(byNewest).map(ticketView) };
}

function unread(user) {
  return { count: SupportTicket.forUser(user._id).reduce((n, t) => n + (t.unread || 0), 0) };
}

function markSeen(user) {
  SupportTicket.forUser(user._id).forEach((t) => {
    if (t.unread) {
      t.unread = 0;
      SupportTicket.save(t);
    }
  });
  return { ok: true };
}

function mine(user, id) {
  const t = SupportTicket.findById(id);
  if (!t || t.userId !== user._id) throw fail(404, "Question not found");
  return t;
}

function userReply(user, id, body) {
  const t = mine(user, id);
  if (t.status === "closed") throw fail(400, "This question is closed. Send a new one instead.");
  const text = clean(body && body.message);
  if (text.length < 1) throw fail(400, "Write a message first");
  t.messages.push({ from: "user", text, at: new Date() });
  t.status = "open";
  t.updatedAt = new Date();
  SupportTicket.save(t);
  return ticketView(t);
}

// Admin

function adminTopicView(t) {
  return { ...topicView(t), audience: t.audience, order: t.order, enabled: t.enabled !== false, solvedCount: t.solvedCount || 0 };
}

function adminTopics() {
  return { topics: SupportTopic.all().map(adminTopicView) };
}

function saveTopic(id, body) {
  const b = body || {};
  const question = clean(b.question, 160);
  if (!question) throw fail(400, "Question is required");
  const audience = AUDIENCES.includes(b.audience) ? b.audience : "all";
  if (id) {
    const t = SupportTopic.findById(id);
    if (!t) throw fail(404, "Question not found");
    t.question = question;
    t.group = clean(b.group, 40);
    if (!t.isOther) {
      t.answer = clean(b.answer);
      t.audience = audience;
    }
    if (b.enabled != null && !t.isOther) t.enabled = !!b.enabled;
    SupportTopic.save(t);
    return adminTopicView(t);
  }
  const answer = clean(b.answer);
  if (!answer) throw fail(400, "Answer is required");
  const last = SupportTopic.all().filter((t) => !t.isOther).reduce((m, t) => Math.max(m, t.order || 0), 0);
  return adminTopicView(SupportTopic.create({ group: clean(b.group, 40), question, answer, audience, order: last + 1, enabled: b.enabled !== false }));
}

function toggleTopic(id, enabled) {
  const t = SupportTopic.findById(id);
  if (!t) throw fail(404, "Question not found");
  if (t.isOther) throw fail(400, "“" + t.question + "” is always shown");
  t.enabled = !!enabled;
  SupportTopic.save(t);
  return adminTopicView(t);
}

function moveTopic(id, dir) {
  const list = SupportTopic.all().filter((t) => !t.isOther);
  const i = list.findIndex((t) => t._id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return adminTopics();
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((t, k) => {
    if (t.order !== k + 1) {
      t.order = k + 1;
      SupportTopic.save(t);
    }
  });
  return adminTopics();
}

function removeTopic(id) {
  const t = SupportTopic.findById(id);
  if (!t) throw fail(404, "Question not found");
  if (t.isOther) throw fail(400, "“" + t.question + "” can’t be deleted");
  SupportTopic.remove(id);
  return { ok: true };
}

function adminTicketView(t) {
  const u = User.findById(t.userId);
  return {
    ...ticketView(t),
    userId: t.userId,
    phone: t.phone || (u && (u.phone || u.contactPhone || u.email)) || "",
    name: t.name || (u && u.profile && u.profile.name) || "",
    role: t.role
  };
}

function adminTickets(query) {
  const q = query || {};
  const all = SupportTicket.all();
  const counts = { open: 0, answered: 0, closed: 0, all: all.length };
  all.forEach((t) => { if (counts[t.status] != null) counts[t.status] += 1; });
  const status = STATUSES.includes(q.status) ? q.status : "all";
  const size = Math.min(100, Math.max(1, Number(q.size) || 20));
  const rows = all.filter((t) => status === "all" || t.status === status).sort(byNewest);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(pages, Math.max(1, Number(q.page) || 1));
  return {
    status, page, pages, total: rows.length, counts,
    tickets: rows.slice((page - 1) * size, page * size).map(adminTicketView)
  };
}

function adminReply(admin, id, body) {
  const t = SupportTicket.findById(id);
  if (!t) throw fail(404, "Ticket not found");
  const text = clean(body && body.message);
  if (!text) throw fail(400, "Write a reply first");
  t.messages.push({ from: "admin", text, at: new Date(), by: admin && admin.username });
  t.status = "answered";
  t.unread = (t.unread || 0) + 1;
  t.updatedAt = new Date();
  SupportTicket.save(t);
  return adminTicketView(t);
}

function setStatus(id, status) {
  const t = SupportTicket.findById(id);
  if (!t) throw fail(404, "Ticket not found");
  if (!STATUSES.includes(status)) throw fail(400, "Unknown status");
  t.status = status;
  t.updatedAt = new Date();
  SupportTicket.save(t);
  return adminTicketView(t);
}

function openCount() {
  return SupportTicket.all().filter((t) => t.status === "open").length;
}

module.exports = {
  ensure, topicsFor, solved, createTicket, myTickets, unread, markSeen, userReply,
  adminTopics, saveTopic, toggleTopic, moveTopic, removeTopic, adminTickets, adminReply, setStatus, openCount
};
