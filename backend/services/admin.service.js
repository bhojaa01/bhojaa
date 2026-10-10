const db = require("../db");
const config = require("../config");
const { User, Listing, NeedRequest, Order, Review, Report, Category, Otp, Token, Admin, Partner } = require("../models");
const geo = require("./geo.service");

function slugOf(name) {
  return String(name || "").toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function dietOf(v) {
  const d = String(v || "all").toLowerCase().replace(/[^a-z]/g, "");
  if (d === "veg") return "veg";
  if (d === "nonveg") return "nonveg";
  return "all";
}

function data() {
  const now = Date.now();
  return {
    stats: {
      users: User.size(),
      listings: Listing.all().length,
      need_requests: NeedRequest.all().length,
      orders: Order.all().length,
      reviews: Review.all().length,
      reports: Report.all().length,
      categories: Category.all().length,
      otps: Otp.all().length,
      staff: Admin.size(),
      partners: Partner.all().length,
      sessions: Token.userCount(),
      openListings: Listing.open().length,
      openNeeds: NeedRequest.open(now).length
    },
    users: User.all().map(User.dump),
    otps: Otp.all().map((o) => {
      const used = !!o.usedAt;
      const expired = !used && o.expiresAt && new Date(o.expiresAt).getTime() < now;
      return {
        id: o._id,
        phone: o.phone,
        used,
        status: used ? "used" : expired ? "expired" : "pending",
        lastSentAt: o.lastSentAt || o.createdAt,
        expiresAt: o.expiresAt,
        usedAt: o.usedAt || null
      };
    }).sort((a, b) => new Date(b.lastSentAt || 0) - new Date(a.lastSentAt || 0)),
    listings: Listing.all().map((l) => {
      const p = geo.latLng(l.location);
      return { ...l, id: l._id, lat: p.lat, lng: p.lng, minLeft: geo.minutesLeft(l.availableUntil, now), maxKm: geo.cap(l, now) };
    }),
    need_requests: NeedRequest.all().map((n) => {
      const p = geo.latLng(n.location);
      return { ...n, id: n._id, lat: p.lat, lng: p.lng, minLeft: geo.minutesLeft(n.neededBy, now) };
    }),
    orders: Order.all().map((o) => ({ ...o, id: o._id })),
    reviews: Review.all().map((r) => {
      const from = User.findById(r.fromUserId);
      const to = User.findById(r.toUserId);
      const o = Order.findById(r.orderId);
      return {
        id: r._id,
        orderId: r.orderId,
        listing: o ? (Listing.findById(o.listingId) || {}).name || "" : "",
        from: from ? from.phone : r.fromUserId,
        to: to ? to.phone : r.toUserId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt
      };
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    reports: Report.all().map((r) => ({ ...r, id: r._id })),
    categories: Category.all().map((c) => ({ ...c, id: c._id })),
    staff: Admin.all().map(Admin.dump),
    partners: Partner.all().map(dumpPartner),
    indexes: {
      users: db.users.indexes,
      listings: db.listings.indexes,
      need_requests: db.need_requests.indexes
    }
  };
}

function addCategory(body) {
  const name = String(body.name || "").trim();
  if (!name) throw Object.assign(new Error("Category name required"), { status: 400 });
  const slug = slugOf(body.slug || name);
  if (name.length < 2) throw Object.assign(new Error("Name must be at least 2 characters"), { status: 400 });
  if (!slug) throw Object.assign(new Error("Category name required"), { status: 400 });
  const key = name.toLowerCase();
  const dup = Category.all().find((c) => String(c.slug) === slug || String(c.name || "").trim().toLowerCase() === key);
  if (dup) throw Object.assign(new Error("Category already exists"), { status: 400 });
  const row = Category.create({
    name,
    slug,
    diet: dietOf(body.diet),
    image: String(body.image || "").trim() || config.foodImage
  });
  return { ok: true, id: row._id };
}

function removeCategory(id) {
  if (!Category.findById(id)) throw Object.assign(new Error("Category not found"), { status: 404 });
  Category.remove(id);
  return { ok: true };
}

function mask(v) {
  const s = String(v || "");
  if (!s) return "";
  if (s.length < 8) return "••••";
  return s.slice(0, 4) + "…" + s.slice(-4);
}

function dumpPartner(p) {
  const headers = { ...(p.headers || {}) };
  ["Authorization", "X-API-Key"].forEach((k) => {
    if (headers[k]) headers[k] = mask(headers[k]);
  });
  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    enabled: !!p.enabled,
    url: p.url,
    method: p.method,
    headers,
    body: p.body || {}
  };
}

function parseBody(raw) {
  let parsed = raw;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { throw Object.assign(new Error("Body must be JSON"), { status: 400 }); }
  }
  return parsed && typeof parsed === "object" ? parsed : { numbers: "{{phone}}", variables_values: "{{otp}}" };
}

function applyAuth(headers, type, auth) {
  const h = { ...(headers || {}), "Content-Type": "application/json" };
  const key = String(auth || "").trim();
  if (!key) return h;
  if (type === "whatsapp") h["X-API-Key"] = key;
  else h.Authorization = key;
  return h;
}

function addPartner(body) {
  const name = String(body.name || "").trim();
  if (name.length < 2) throw Object.assign(new Error("Partner name required"), { status: 400 });
  const slug = slugOf(body.slug || name);
  if (Partner.findBySlug(slug)) throw Object.assign(new Error("Partner already exists"), { status: 400 });
  const url = String(body.url || "").trim();
  if (!url) throw Object.assign(new Error("URL required"), { status: 400 });
  const type = body.type === "whatsapp" ? "whatsapp" : "sms";
  const row = Partner.create({
    slug,
    name,
    type,
    enabled: !!body.enabled,
    url,
    method: body.method || "POST",
    headers: applyAuth({}, type, body.auth || body.authorization),
    body: parseBody(body.body)
  });
  return { ok: true, id: row._id };
}

function updatePartner(id, body) {
  const row = Partner.findById(id);
  if (!row) throw Object.assign(new Error("Partner not found"), { status: 404 });
  const name = String(body.name || "").trim();
  if (name.length < 2) throw Object.assign(new Error("Partner name required"), { status: 400 });
  const url = String(body.url || "").trim();
  if (!url) throw Object.assign(new Error("URL required"), { status: 400 });
  const type = body.type === "whatsapp" ? "whatsapp" : "sms";
  row.name = name;
  row.type = type;
  row.url = url;
  row.method = body.method || row.method || "POST";
  row.body = parseBody(body.body);
  row.headers = applyAuth(row.headers, type, body.auth || body.authorization);
  Partner.save(row);
  return { ok: true, id: row._id };
}

function togglePartner(id, enabled) {
  const row = Partner.findById(id);
  if (!row) throw Object.assign(new Error("Partner not found"), { status: 404 });
  row.enabled = enabled == null ? !row.enabled : !!enabled;
  Partner.save(row);
  return { ok: true, enabled: row.enabled };
}

function removePartner(id) {
  if (!Partner.findById(id)) throw Object.assign(new Error("Partner not found"), { status: 404 });
  Partner.remove(id);
  return { ok: true };
}

module.exports = { data, addCategory, removeCategory, addPartner, updatePartner, togglePartner, removePartner };
