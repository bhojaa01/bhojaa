const { NeedRequest, Order, User } = require("../models");
const geo = require("./geo.service");

function view(item, who, now) {
  const here = User.coords(who);
  const minLeft = geo.minutesLeft(item.neededBy, now);
  const expired = item.neededBy <= now && item.status !== "matched";
  return {
    id: item._id,
    what: item.what,
    servings: item.servings,
    status: expired ? "expired" : item.status,
    distance: Number(geo.distanceKm(item.location, here.lng, here.lat).toFixed(2)),
    minLeft,
    until: item.neededBy,
    createdAt: item.createdAt,
    mine: item.seekerId === who._id
  };
}

function list(who) {
  const now = Date.now();
  const here = User.coords(who);
  const rows = NeedRequest.geoNear(here.lng, here.lat, 2)
    .map((x) => x.doc)
    .filter((n) => n.status === "open" && n.neededBy > now)
    .map((n) => view(n, who, now));
  const mine = NeedRequest.findBySeeker(who._id)
    .filter((n) => n.status === "open" && n.neededBy > now)
    .map((n) => view(n, who, now));
  const seen = new Set(rows.map((r) => r.id));
  mine.forEach((m) => { if (!seen.has(m.id)) rows.push(m); });
  return { needs: rows };
}

function create(who, body) {
  if (who.role !== "seeker") throw Object.assign(new Error("Switch to Need mode first"), { status: 403 });
  const what = String(body.what || "").trim();
  if (!what) throw Object.assign(new Error("Say what you need"), { status: 400 });
  const here = User.coords(who);
  const item = NeedRequest.create({
    seekerId: who._id,
    what,
    servings: Math.max(1, Number(body.servings) || 1),
    neededBy: geo.untilFrom(body, 90),
    lat: here.lat,
    lng: here.lng,
    status: "open"
  });
  return { ok: true, id: item._id };
}

function offer(who, id, body) {
  if (who.role !== "giver") throw Object.assign(new Error("Switch to Give mode first"), { status: 403 });
  const item = NeedRequest.findById(id);
  if (!item || item.status !== "open") throw Object.assign(new Error("Need not open"), { status: 400 });
  if (item.seekerId === who._id) throw Object.assign(new Error("This is your own request"), { status: 400 });
  const address = String(body.address || who.address || "").trim();
  if (!address) throw Object.assign(new Error("Pickup address required"), { status: 400 });
  who.address = address;
  item.status = "matched";
  const order = Order.create({
    needRequestId: item._id,
    seekerId: item.seekerId,
    providerId: who._id,
    status: "accepted"
  });
  return { orderId: order._id, status: order.status };
}

function remove(who, id) {
  const item = NeedRequest.findById(id);
  if (!item || item.seekerId !== who._id) throw Object.assign(new Error("Request not found"), { status: 404 });
  if (item.neededBy > Date.now()) throw Object.assign(new Error("Only expired requests can be deleted"), { status: 400 });
  NeedRequest.remove(id);
  return { ok: true };
}

module.exports = { view, list, create, offer, remove };
