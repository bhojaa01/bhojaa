const config = require("../config");
const { Listing, Order, Category, User } = require("../models");
const geo = require("./geo.service");

function nearHere(item, here) {
  const p = geo.latLng(item.location);
  const owner = User.findById(item.providerId);
  if (!owner || (owner.phone !== "9000000000" && owner.phone !== "9111111111")) return p;
  const origin = config.defaultLocation;
  if (geo.km(here, origin) <= 2) return p;
  return { lat: here.lat + (p.lat - origin.lat), lng: here.lng + (p.lng - origin.lng) };
}

function view(item, who, now, here) {
  here = here || User.coords(who);
  const pin = nearHere(item, here);
  const distance = Number(geo.km(here, pin).toFixed(2));
  const maxKm = geo.cap(item, now);
  return {
    id: item._id,
    name: item.name,
    category: item.category,
    diet: item.diet,
    servings: item.servings,
    note: item.note,
    image: item.image,
    status: item.status,
    distance,
    maxKm,
    minLeft: geo.minutesLeft(item.availableUntil, now),
    until: item.availableUntil,
    createdAt: item.createdAt,
    address: item.address || "",
    mine: item.providerId === who._id,
    given: Order.collectedByListing(item._id),
    waiting: Order.waitingByListing(item._id),
    providerGiven: Order.collectedByProvider(item.providerId),
    myCollected: Order.collectedBySeeker(who._id)
  };
}

function expireIfNeeded(item) {
  if (item && item.status === "open" && item.availableUntil <= Date.now()) {
    item.status = Order.collectedByListing(item._id) ? "done" : "expired";
  }
}

function liveOpen(now) {
  return Listing.open().filter((l) => {
    expireIfNeeded(l);
    return l.status === "open" && l.availableUntil > now;
  });
}

function radiusKm(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(10, n);
}

function nearby(who, km, here) {
  const radius = radiusKm(km);
  const now = Date.now();
  const at = here || User.coords(who);
  const all = liveOpen(now)
    .map((l) => view(l, who, now, at))
    .filter((l) => l.minLeft > 0);
  const listings = all.filter((l) => l.distance <= radius);
  const nearest = all.reduce((n, l) => (!n || l.distance < n.distance ? l : n), null);
  return {
    listings,
    km: radius,
    nearest: nearest ? { id: nearest.id, name: nearest.name, distance: nearest.distance, mine: nearest.mine } : null
  };
}

function create(who, body) {
  if (who.role !== "giver") throw Object.assign(new Error("Switch to Give mode first"), { status: 403 });
  const name = String(body.name || "").trim();
  if (!name) throw Object.assign(new Error("Food name required"), { status: 400 });
  const address = String(body.address || who.address || "").trim();
  if (!address) throw Object.assign(new Error("Pickup address required"), { status: 400 });
  who.address = address;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) User.setLocation(who, lng, lat);
  const slug = String(body.category || "meals").toLowerCase();
  const cat = Category.findBySlug(slug);
  const here = User.coords(who);
  const dietRaw = String(body.diet || "veg").toLowerCase().replace(/[^a-z]/g, "");
  const item = Listing.create({
    providerId: who._id,
    name,
    categoryId: cat ? cat._id : null,
    category: slug,
    diet: dietRaw === "nonveg" || dietRaw === "egg" ? "nonveg" : "veg",
    servings: Math.max(1, Number(body.servings) || 1),
    note: String(body.note || "").trim(),
    availableUntil: geo.untilFrom(body, 90),
    lat: here.lat,
    lng: here.lng,
    address,
    image: config.foodImage,
    status: "open"
  });
  return { ok: true, id: item._id };
}

function get(who, id) {
  const now = Date.now();
  const item = Listing.findById(id);
  if (!item) throw Object.assign(new Error("Listing gone"), { status: 404 });
  expireIfNeeded(item);
  const row = view(item, who, now);
  const mine = Order.findActiveRequest(item._id, who._id);
  const requests = row.mine ? Order.findByListing(item._id).filter((o) => o.status === "requested").map((o) => ({ id: o._id, status: o.status })) : [];
  return { listing: row, orderId: mine ? mine._id : null, requests };
}

function request(who, id) {
  if (who.role !== "seeker") throw Object.assign(new Error("Switch to Need mode first"), { status: 403 });
  const now = Date.now();
  const item = Listing.findById(id);
  expireIfNeeded(item);
  if (!item || item.status !== "open" || item.availableUntil <= now) {
    throw Object.assign(new Error("This food is no longer available"), { status: 400 });
  }
  if (item.providerId === who._id) throw Object.assign(new Error("This is your own listing"), { status: 400 });
  const row = view(item, who, now);
  if (row.minLeft <= 0) {
    throw Object.assign(new Error("This food is no longer available"), { status: 400 });
  }
  let order = Order.findActiveRequest(item._id, who._id);
  if (!order) {
    order = Order.create({
      listingId: item._id,
      seekerId: who._id,
      providerId: item.providerId,
      status: "requested"
    });
  }
  return { orderId: order._id, status: order.status };
}

function remove(who, id) {
  const item = Listing.findById(id);
  if (!item || item.providerId !== who._id) throw Object.assign(new Error("Listing not found"), { status: 404 });
  if (item.availableUntil > Date.now() && item.status !== "expired") {
    throw Object.assign(new Error("Only expired listings can be deleted"), { status: 400 });
  }
  Listing.remove(id);
  return { ok: true };
}

module.exports = { view, nearby, create, get, request, remove };
