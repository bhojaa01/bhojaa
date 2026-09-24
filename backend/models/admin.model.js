const crypto = require("crypto");
const db = require("../db");

function hash(pass) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(String(pass), salt, 32).toString("hex");
  return salt + ":" + key;
}

function check(pass, stored) {
  const [salt, key] = String(stored || "").split(":");
  if (!salt || !key) return false;
  const next = crypto.scryptSync(String(pass), salt, 32);
  try {
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), next);
  } catch {
    return false;
  }
}

function create(data) {
  const username = String(data.username || "").trim().toLowerCase();
  const password = String(data.password || "");
  if (username.length < 3) throw Object.assign(new Error("Username too short"), { status: 400 });
  if (password.length < 6) throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
  if (findByUsername(username)) throw Object.assign(new Error("Username already in use"), { status: 400 });
  return db.admins.insertOne({
    username,
    password: hash(password),
    createdAt: new Date()
  });
}

function findByUsername(username) {
  return db.admins.findOne({ username: String(username || "").trim().toLowerCase() }) || null;
}

function verify(username, password) {
  const row = findByUsername(username);
  if (!row || !check(password, row.password)) return null;
  return row;
}

function findById(id) {
  return db.admins.findById(id);
}

function setToken(row, token) {
  row.token = token;
  db.admins.updateById(row._id, { token });
  return row;
}

function clearToken(row) {
  row.token = "";
  db.admins.updateById(row._id, { token: "" });
  return row;
}

function dump(a) {
  return { id: a._id, username: a.username, createdAt: a.createdAt };
}

function all() {
  return db.admins.find();
}

function size() {
  return db.admins.size();
}

module.exports = { create, findById, findByUsername, verify, dump, all, size, setToken, clearToken };
