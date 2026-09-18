const { NeedRequest, Order, User } = require("../models");
const geo = require("./geo.service");

function view(item, who, now, here) {
  here = here || User.coords(who);
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

function radiusKm(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(10, n);
}

function list(who, km, here) {
  const radius = radiusKm(km);
  const now = Date.now();
  const at = here || User.coords(who);
  const all = NeedRequest.open(now)
    .map((n) => view(n, who, now, at))
    .sort((a, b) => a.distance - b.distance);
  const others = all.filter((n) => !n.mine);
  const nearby = others.filter((n) => n.distance <= radius);
  if (!nearby.length && others[0]) nearby.push(others[0]);
  const mine = all.filter((n) => n.mine);
  const seen = new Set(nearby.map((n) => n.id));
  mine.forEach((m) => { if (!seen.has(m.id)) nearby.push(m); });
  const nearest = others[0] || null;
  return {
    needs: nearby,
    km: radius,
    nearest: nearest ? { id: nearest.id, what: nearest.what, distance: nearest.distance, mine: nearest.mine } : null
  };
}

function create(who, body) {
  if (who.role !== "seeker") throw Object.assign(new Error("Switch to Need mode first"), { status: 403 });
  const what = String(body.what || "").trim();
  if (!what) throw Object.assign(new Error("Say what you need"), { status: 400 });
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) User.setLocation(who, lng, lat);
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
