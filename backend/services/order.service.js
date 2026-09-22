const config = require("../config");
const { Order, Listing, NeedRequest, User } = require("../models");
const listingService = require("./listing.service");
const needService = require("./need.service");

function person(u) {
  if (!u) return { name: "", phone: "" };
  return { name: (u.profile && u.profile.name) || "Neighbor", phone: u.phone || "" };
}

function view(o, who) {
  const listing = o.listingId ? Listing.findById(o.listingId) : null;
  const need = o.needRequestId ? NeedRequest.findById(o.needRequestId) : null;
  const unlocked = o.status === "accepted" || o.status === "collected";
  const provider = User.findById(o.providerId);
  const seeker = User.findById(o.seekerId);
  const seekerP = person(seeker);
  const giverP = person(provider);
  if (!o.createdAt) o.createdAt = o.acceptedAt || o.collectedAt || new Date();
  return {
    id: o._id,
    type: listing ? "listing" : "need",
    status: o.status,
    name: listing ? listing.name : (need ? need.what : ""),
    servings: listing ? listing.servings : (need ? need.servings : 0),
    image: listing ? listing.image : config.foodImage,
    note: listing ? listing.note : "",
    until: listing ? listing.availableUntil : (need ? need.neededBy : null),
    address: unlocked ? (listing ? listing.address : (provider ? provider.address : null)) : null,
    hint: unlocked ? "Call after you reach the gate." : "Exact house number is shown only after the giver accepts.",
    mineRequest: String(o.seekerId) === String(who._id),
    mineGive: String(o.providerId) === String(who._id),
    listingId: o.listingId || null,
    needId: o.needRequestId || null,
    seeker: seekerP.phone,
    seekerName: seekerP.name,
    giver: giverP.phone,
    giverName: giverP.name,
    createdAt: o.createdAt,
    acceptedAt: o.acceptedAt,
    collectedAt: o.collectedAt,
    given: listing ? Order.collectedByListing(listing._id) : 0,
    providerGiven: Order.collectedByProvider(o.providerId),
    seekerCollected: Order.collectedBySeeker(o.seekerId)
  };
}

function mine(who) {
  const now = Date.now();
  return {
    orders: Order.findForUser(who._id).map((o) => view(o, who)),
    listings: Listing.findByProvider(who._id).map((l) => {
      if (l.status === "open" && l.availableUntil <= now) {
        l.status = Order.collectedByListing(l._id) ? "done" : "expired";
      }
      return l;
    }).map((l) => {
      const row = listingService.view(l, who, now);
      row.requests = Order.findByListing(l._id).filter((o) => o.status !== "collected").map((o) => view(o, who));
      row.history = Order.findByListing(l._id).map((o) => view(o, who));
      return row;
    }),
    needs: NeedRequest.findBySeeker(who._id).map((n) => {
      const row = needService.view(n, who, now);
      const hist = Order.findByNeed(n._id).map((o) => view(o, who));
      const hit = hist.find((o) => o.status === "accepted" || o.status === "collected") || hist[0];
      row.history = hist;
      if (hit) {
        row.giverName = hit.giverName;
        row.giver = hit.giver;
        row.acceptedAt = hit.acceptedAt;
        row.collectedAt = hit.collectedAt;
      }
      return row;
    })
  };
}

function get(who, id) {
  const o = Order.findById(id);
  if (!o || (o.seekerId !== who._id && o.providerId !== who._id)) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  return { order: view(o, who) };
}

function accept(who, id) {
  const o = Order.findById(id);
  if (!o || o.providerId !== who._id) throw Object.assign(new Error("Not found"), { status: 404 });
  if (o.status !== "requested") throw Object.assign(new Error("Already handled"), { status: 400 });
  o.status = "accepted";
  o.acceptedAt = new Date();
  Order.save(o);
  const listing = Listing.findById(o.listingId);
  if (listing) {
    listing.status = "reserved";
    Listing.save(listing);
  }
  Order.findByListing(o.listingId).filter((x) => x._id !== o._id && x.status === "requested").forEach((x) => {
    x.status = "declined";
    Order.save(x);
  });
  return { order: view(o, who) };
}

function collect(who, id) {
  const o = Order.findById(id);
  if (!o || (o.seekerId !== who._id && o.providerId !== who._id)) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (o.status !== "accepted") throw Object.assign(new Error("Not ready for pickup"), { status: 400 });
  o.status = "collected";
  o.collectedAt = new Date();
  Order.save(o);
  const listing = Listing.findById(o.listingId);
  if (listing) {
    listing.status = "done";
    Listing.save(listing);
  }
  return { order: view(o, who) };
}

module.exports = { view, mine, get, accept, collect };
