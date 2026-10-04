const db = require("../db");
const config = require("../config");
const { User, Listing, NeedRequest, Order, Review, Report, Category, Otp, Token, Admin } = require("../models");
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
      sessions: Token.userCount(),
      openListings: Listing.open().length,
      openNeeds: NeedRequest.open(now).length
    },
    users: User.all().map(User.dump),
    otps: Otp.all().map((o) => ({ id: o._id, phone: o.phone, expiresAt: o.expiresAt })),
    listings: Listing.all().map((l) => {
      const p = geo.latLng(l.location);
      return { ...l, id: l._id, lat: p.lat, lng: p.lng, minLeft: geo.minutesLeft(l.availableUntil, now), maxKm: geo.cap(l, now) };
    }),
    need_requests: NeedRequest.all().map((n) => {
      const p = geo.latLng(n.location);
      return { ...n, id: n._id, lat: p.lat, lng: p.lng, minLeft: geo.minutesLeft(n.neededBy, now) };
    }),
    orders: Order.all().map((o) => ({ ...o, id: o._id })),
    reviews: Review.all().map((r) => ({ ...r, id: r._id })),
    reports: Report.all().map((r) => ({ ...r, id: r._id })),
    categories: Category.all().map((c) => ({ ...c, id: c._id })),
    staff: Admin.all().map(Admin.dump),
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

module.exports = { data, addCategory, removeCategory };
