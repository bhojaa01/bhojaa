const db = require("../db");
const { point } = require("../db/geo");

function create(data) {
  return db.listings.insertOne({
    providerId: data.providerId,
    name: data.name,
    categoryId: data.categoryId || null,
    category: data.category,
    diet: data.diet,
    servings: data.servings,
    note: data.note || "",
    image: data.image,
    location: data.location || point(data.lng, data.lat),
    address: data.address,
    availableUntil: data.availableUntil,
    status: data.status || "open",
    createdAt: Date.now()
  });
}

function findById(id) {
  return db.listings.findById(id);
}

function findByProvider(providerId) {
  return db.listings.find({ providerId });
}

function open() {
  return db.listings.find({ status: "open" });
}

function geoNear(lng, lat, maxKm) {
  return db.listings.geoNear(lng, lat, maxKm);
}

function all() {
  return db.listings.find();
}

module.exports = { create, findById, findByProvider, open, geoNear, all };
