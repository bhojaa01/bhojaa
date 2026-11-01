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

// Admin menu sections a staff member can be given "read" or "write" access to.
// "staff" (managing admins) is super admin only and never configurable.
const SECTIONS = ["home", "visits", "support", "support_topics", "users", "listings", "need_requests", "orders", "reviews", "reports", "categories", "partners", "otps"];
const LEVELS = { none: 0, read: 1, write: 2 };

// Rows created before roles existed have no role and keep full access.
function roleOf(row) {
  return row && row.role === "staff" ? "staff" : "super";
}

function cleanPerms(perms) {
  const out = {};
  const src = perms && typeof perms === "object" ? perms : {};
  SECTIONS.forEach((s) => {
    if (src[s] === "read" || src[s] === "write") out[s] = src[s];
  });
  return out;
}

function can(row, section, level) {
  if (!row) return false;
  if (roleOf(row) === "super") return true;
  if (section === "overview") return true;
  if (!SECTIONS.includes(section)) return false;
  const have = LEVELS[(row.perms || {})[section]] || 0;
  return have >= (LEVELS[level || "read"] || 1);
}

// Display name shown in the admin UI; optional, login still uses username.
function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 60);
}

// Usernames ignore case and all spaces, so "98439 53135" and "9843953135" are the same login.
function cleanUser(username) {
  return String(username || "").replace(/\s+/g, "").toLowerCase();
}

function supers() {
  return all().filter((a) => roleOf(a) === "super");
}

function create(data) {
  const username = cleanUser(data.username);
  const password = String(data.password || "").trim();
  if (username.length < 3) throw Object.assign(new Error("Username too short"), { status: 400 });
  if (password.length < 6) throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
  if (findByUsername(username)) throw Object.assign(new Error("Username already in use"), { status: 400 });
  const role = data.role === "staff" ? "staff" : "super";
  return db.admins.insertOne({
    username,
    name: cleanName(data.name),
    password: hash(password),
    role,
    perms: role === "staff" ? cleanPerms(data.perms) : {},
    createdAt: new Date()
  });
}

function update(row, data) {
  const patch = {};
  if (data.name != null) patch.name = cleanName(data.name);
  if (data.role === "staff" || data.role === "super") patch.role = data.role;
  const role = patch.role || roleOf(row);
  if (data.perms != null || patch.role) patch.perms = role === "staff" ? cleanPerms(data.perms != null ? data.perms : row.perms) : {};
  const pass = data.password != null ? String(data.password).trim() : "";
  if (pass) {
    if (pass.length < 6) throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
    patch.password = hash(pass);
    patch.token = "";
  }
  patch.updatedAt = new Date();
  Object.assign(row, patch);
  db.admins.updateById(row._id, patch);
  return row;
}

function remove(row) {
  db.admins.deleteById(row._id);
}

function findByUsername(username) {
  const want = cleanUser(username);
  if (!want) return null;
  return db.admins.findOne((a) => cleanUser(a.username) === want) || null;
}

function verify(username, password) {
  const row = findByUsername(username);
  // Older passwords may have been saved with stray spaces, so try the raw value too.
  const raw = String(password || "");
  if (!row || !(check(raw.trim(), row.password) || check(raw, row.password))) return null;
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
  const role = roleOf(a);
  return { id: a._id, username: a.username, name: a.name || "", role, perms: role === "staff" ? cleanPerms(a.perms) : {}, createdAt: a.createdAt };
}

function all() {
  return db.admins.find();
}

function size() {
  return db.admins.size();
}

module.exports = { SECTIONS, create, update, remove, findById, findByUsername, verify, dump, all, size, setToken, clearToken, roleOf, can, supers, cleanPerms };
