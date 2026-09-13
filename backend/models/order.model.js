const db = require("../db");

function create(data) {
  return db.orders.insertOne({
    listingId: data.listingId || null,
    needRequestId: data.needRequestId || null,
    seekerId: data.seekerId,
    providerId: data.providerId,
    status: data.status || "requested",
    createdAt: Date.now(),
    acceptedAt: data.status === "accepted" ? Date.now() : null,
    collectedAt: null
  });
}

function findById(id) {
  return db.orders.findById(id);
}

function findForUser(userId) {
  return db.orders.find((o) => o.seekerId === userId || o.providerId === userId);
}

function findByListing(listingId) {
  return db.orders.find({ listingId });
}

function findActiveRequest(listingId, seekerId) {
  return db.orders.findOne((o) => o.listingId === listingId && o.seekerId === seekerId && o.status !== "collected") || null;
}

function all() {
  return db.orders.find();
}

function collectedByListing(listingId) {
  return db.orders.find((o) => o.listingId === listingId && o.status === "collected").length;
}

function waitingByListing(listingId) {
  return db.orders.find((o) => o.listingId === listingId && o.status === "requested").length;
}

function collectedByProvider(providerId) {
  return db.orders.find((o) => o.providerId === providerId && o.status === "collected").length;
}

function collectedBySeeker(seekerId) {
  return db.orders.find((o) => o.seekerId === seekerId && o.status === "collected").length;
}

module.exports = {
  create, findById, findForUser, findByListing, findActiveRequest, all,
  collectedByListing, waitingByListing, collectedByProvider, collectedBySeeker
};
