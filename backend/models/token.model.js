const crypto = require("crypto");
const config = require("../config");

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function eq(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function sign(payload) {
  const data = b64url({ alg: "HS256", typ: "JWT" }) + "." + b64url(payload);
  const sig = crypto.createHmac("sha256", config.jwtSecret).update(data).digest("base64url");
  return data + "." + sig;
}

function parse(t) {
  const parts = String(t || "").split(".");
  if (parts.length !== 3) return null;
  const data = parts[0] + "." + parts[1];
  const sig = crypto.createHmac("sha256", config.jwtSecret).update(data).digest("base64url");
  if (!eq(sig, parts[2])) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return null;
  }
}

function claims(t) {
  const p = parse(t);
  if (!p) return null;
  const now = Math.floor(Date.now() / 1000);
  if (p.exp && p.exp <= now) return null;
  return p;
}

function issue(kind, extra) {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomBytes(8).toString("hex");
  const exp = extra.exp || now + config.jwtExpiresSec;
  return sign({ ...extra, kind, jti, iat: now, exp });
}

function createUser(user, extra) {
  return issue("user", {
    sub: user._id,
    phone: user.phone,
    name: (user.profile && user.profile.name) || "",
    role: user.role || "user",
    ...(extra || {})
  });
}

function createAdmin(admin, extra) {
  return issue("admin", {
    sub: admin && admin._id,
    username: (admin && admin.username) || "",
    ...(extra || {})
  });
}

function userIdOf(t) {
  const p = claims(t);
  return p && p.kind === "user" ? p.sub : null;
}

function isAdmin(t) {
  const p = claims(t);
  return !!(p && p.kind === "admin");
}

function same(a, b) {
  if (!a || !b) return false;
  return eq(a, b);
}

function userCount() {
  const User = require("./user.model");
  return User.all().filter((u) => u.token).length;
}

function userIds() {
  const User = require("./user.model");
  return User.all().filter((u) => u.token).map((u) => ({ userId: u._id }));
}

function remove() {}

module.exports = { createUser, createAdmin, userIdOf, isAdmin, userCount, userIds, remove, claims, same };
