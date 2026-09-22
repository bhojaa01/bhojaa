const db = require("../db");

function create(data) {
  return db.orders.insertOne({
    listingId: data.listingId || null,
    needRequestId: data.needRequestId || null,
    seekerId: data.seekerId,
    providerId: data.providerId,
    status: data.status || "requested",
    createdAt: new Date(),
    acceptedAt: data.status === "accepted" ? new Date() : null,
    collectedAt: null
  });
}

function findById(id) {
  return db.orders.findById(id);
}

function findForUser(userId) {
  const id = String(userId);
  return db.orders.find((o) => String(o.seekerId) === id || String(o.providerId) === id);
}

function findByListing(listingId) {
  const id = String(listingId);
  return db.orders.find((o) => String(o.listingId) === id);
}

function findByNeed(needRequestId) {
  const id = String(needRequestId);
  return db.orders.find((o) => String(o.needRequestId) === id);
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

function save(row) {
  return db.orders.save(row);
}

module.exports = {
  create, findById, findForUser, findByListing, findByNeed, findActiveRequest, all, save,
  collectedByListing, waitingByListing, collectedByProvider, collectedBySeeker
};
