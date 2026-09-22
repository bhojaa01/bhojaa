const db = require("../db");
const { point } = require("../db/geo");

function create(data) {
  return db.need_requests.insertOne({
    seekerId: data.seekerId,
    what: data.what,
    servings: data.servings,
    location: data.location || point(data.lng, data.lat),
    neededBy: data.neededBy,
    status: data.status || "open",
    createdAt: new Date()
  });
}

function findById(id) {
  return db.need_requests.findById(id);
}

function remove(id) {
  return db.need_requests.deleteById(id);
}

function findBySeeker(seekerId) {
  const id = String(seekerId);
  return db.need_requests.find((d) => String(d.seekerId) === id);
}

function open(now) {
  return db.need_requests.find((n) => n.status === "open" && n.neededBy > now);
}

function geoNear(lng, lat, maxKm) {
  return db.need_requests.geoNear(lng, lat, maxKm);
}

function all() {
  return db.need_requests.find();
}

function save(row) {
  return db.need_requests.save(row);
}

module.exports = { create, findById, remove, findBySeeker, open, geoNear, all, save };
