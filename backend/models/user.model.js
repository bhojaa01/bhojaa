const db = require("../db");
const { point, latLng } = require("../db/geo");
const config = require("../config");
const geo = require("../services/geo.service");

function create(data) {
  const lng = data.lng ?? config.defaultLocation.lng;
  const lat = data.lat ?? config.defaultLocation.lat;
  return db.users.insertOne({
    phone: data.phone,
    profile: { name: data.name || "Neighbor" },
    location: data.location || point(lng, lat),
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    country: data.country || "",
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

function thinAddress(s) {
  const t = String(s || "").trim().toLowerCase();
  return !t || t === "koramangala, bengaluru";
}

async function setLocation(user, lng, lat) {
  const prev = latLng(user.location);
  const same = Math.abs(prev.lat - lat) < 0.0005 && Math.abs(prev.lng - lng) < 0.0005;
  user.location = point(lng, lat);
  if (!(same && user.city && user.state && user.country && !thinAddress(user.address))) {
    const place = await geo.reverse(lat, lng);
    if (place) {
      user.city = place.city;
      user.state = place.state;
      user.country = place.country;
      if (place.address) user.address = place.address;
    }
  }
  db.users.updateById(user._id, {
    location: user.location,
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    country: user.country || ""
  });
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
    city: u.city || "",
    state: u.state || "",
    country: u.country || "",
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
