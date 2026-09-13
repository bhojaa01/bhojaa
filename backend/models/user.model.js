const db = require("../db");
const { point, latLng } = require("../db/geo");
const config = require("../config");

function create(data) {
  const lng = data.lng ?? config.defaultLocation.lng;
  const lat = data.lat ?? config.defaultLocation.lat;
  return db.users.insertOne({
    phone: data.phone,
    profile: { name: data.name || "Neighbor" },
    location: data.location || point(lng, lat),
    address: data.address || "Koramangala, Bengaluru",
    role: data.role || "user",
    createdAt: Date.now()
  });
}

function findById(id) {
  return db.users.findById(id);
}

function findByPhone(phone) {
  return db.users.findOne({ phone }) || null;
}

function ensure(phone) {
  return findByPhone(phone) || create({ phone });
}

function setLocation(user, lng, lat) {
  user.location = point(lng, lat);
  return user;
}

function coords(user) {
  const p = latLng(user.location);
  return { lat: p.lat, lng: p.lng, phone: user.phone };
}

function dump(u) {
  const p = latLng(u.location);
  return {
    id: u._id,
    phone: u.phone,
    profile: u.profile,
    role: u.role,
    address: u.address,
    location: u.location,
    lat: p.lat,
    lng: p.lng,
    createdAt: u.createdAt
  };
}

function all() {
  return db.users.find();
}

function size() {
  return db.users.size();
}

module.exports = { create, findById, findByPhone, ensure, setLocation, coords, dump, all, size };
