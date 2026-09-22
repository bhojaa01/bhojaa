const db = require("../db");
const { User, Listing, NeedRequest, Order, Review, Report, Category, Otp, Token, Admin } = require("../models");
const geo = require("./geo.service");

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

module.exports = { data };
