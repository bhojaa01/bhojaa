const config = require("../config");
const { User, Otp, Token, Admin } = require("../models");
const { phoneOf, phoneError, contactPhoneOf } = require("../utils/http");
const notify = require("./notify.service");

function makeCode() {
  return notify.live() ? String(Math.floor(1000 + Math.random() * 9000)) : config.otp;
}

async function sendOtp(rawPhone) {
  const phone = phoneOf(rawPhone);
  if (phoneError(phone)) throw Object.assign(new Error(phoneError(phone)), { status: 400 });
  const wait = Otp.resendWait(phone);
  if (wait > 0) {
    const err = new Error("Wait " + wait + "s to resend OTP");
    err.status = 429;
    err.resendIn = wait;
    throw err;
  }
  const isNew = !User.findByPhone(phone);
  if (isNew) User.ensure(phone);
  const code = makeCode();
  Otp.set(phone, code);
  if (notify.live()) await notify.sendOtp(phone, code);
  const message = notify.live()
    ? (isNew ? "Number registered. OTP sent." : "OTP sent.")
    : (isNew ? "Number registered. OTP sent. Use 1234" : "OTP sent. Use 1234");
  return { ok: true, registered: isNew, resendIn: 30, message };
}

async function login(rawPhone, otp, extra) {
  const phone = phoneOf(rawPhone);
  if (phoneError(phone)) throw Object.assign(new Error(phoneError(phone)), { status: 400 });
  const row = Otp.take(phone);
  if (!row) throw Object.assign(new Error("OTP expired. Continue again"), { status: 400 });
  if (String(otp || "") !== row.code) throw Object.assign(new Error("Wrong OTP"), { status: 401 });
  Otp.clear(phone);
  const user = User.ensure(phone);
  if (extra.address) user.address = String(extra.address).trim();
  const lat = Number(extra.lat);
  const lng = Number(extra.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    await User.setLocation(user, lng, lat, extra);
  }
  return finishLogin(user);
}

async function finishLogin(user) {
  User.save(user);
  const token = Token.createUser(user, { role: "user" });
  User.setToken(user, token);
  return { token, user: await profile(user) };
}

function authConfig() {
  return { googleClientId: config.googleClientId };
}

// Checks a Google Identity Services ID token with Google and returns its claims.
async function verifyGoogle(credential) {
  if (!config.googleClientId) throw Object.assign(new Error("Google sign-in is not set up"), { status: 503 });
  if (!credential) throw Object.assign(new Error("Google sign-in failed. Try again"), { status: 400 });
  let claims;
  try {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential));
    if (!r.ok) throw new Error("bad token");
    claims = await r.json();
  } catch {
    throw Object.assign(new Error("Google sign-in failed. Try again"), { status: 401 });
  }
  const issOk = claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
  const fresh = Number(claims.exp) * 1000 > Date.now();
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (claims.aud !== config.googleClientId || !issOk || !fresh || !claims.sub || !claims.email || !verified) {
    throw Object.assign(new Error("Google sign-in failed. Try again"), { status: 401 });
  }
  return claims;
}

async function googleLogin(credential, extra) {
  const g = await verifyGoogle(credential);
  const email = String(g.email).trim().toLowerCase();
  let user = User.findByGoogle(g.sub) || User.findByEmail(email);
  if (!user) user = User.create({ email, googleId: g.sub, name: g.name || g.given_name || "" });
  user.googleId = g.sub;
  user.email = email;
  if (g.name && (!user.profile.name || user.profile.name === "Neighbor")) user.profile.name = String(g.name).trim();
  const lat = Number(extra.lat);
  const lng = Number(extra.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    await User.setLocation(user, lng, lat, extra);
  }
  return finishLogin(user);
}

async function profile(user) {
  const p = User.coords(user);
  if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) await User.setLocation(user, p.lng, p.lat);
  return {
    phone: user.phone || "",
    email: user.email || "",
    contactPhone: user.contactPhone || "",
    name: user.profile.name,
    address: user.address,
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    role: user.role,
    roles: Array.isArray(user.roles) ? user.roles : [],
    lat: p.lat,
    lng: p.lng
  };
}

async function updateProfile(user, body) {
  if (body.phone != null && body.phone !== "") {
    const phone = phoneOf(body.phone);
    if (phoneError(phone)) throw Object.assign(new Error(phoneError(phone)), { status: 400 });
    const taken = User.findByPhone(phone);
    if (taken && taken._id !== user._id) throw Object.assign(new Error("Phone already in use"), { status: 400 });
    user.phone = phone;
  }
  if (body.contactPhone != null) {
    const c = contactPhoneOf(body.contactPhone);
    if (c.error) throw Object.assign(new Error(c.error), { status: 400 });
    user.contactPhone = c.phone;
  }
  if (body.address != null) user.address = String(body.address).trim();
  if (body.city != null) user.city = String(body.city).trim();
  if (body.state != null) user.state = String(body.state).trim();
  if (body.country != null) user.country = String(body.country).trim();
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) throw Object.assign(new Error("Name required"), { status: 400 });
    user.profile.name = name;
  }
  let token;
  if (body.role === "seeker" || body.role === "giver") {
    user.role = body.role;
    if (!Array.isArray(user.roles)) user.roles = [];
    if (!user.roles.includes(body.role)) user.roles.push(body.role);
    token = Token.createUser(user, { role: body.role });
    User.setRoleToken(user, body.role, token);
    User.clearToken(user);
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    await User.setLocation(user, lng, lat, body);
  }
  User.save(user);
  const out = await profile(user);
  if (token) out.token = token;
  return out;
}

function logout(user, token) {
  if (!user) return { ok: true };
  const p = Token.claims(token);
  if (p && (p.role === "seeker" || p.role === "giver")) User.clearRoleToken(user, p.role);
  if (Token.same(user.token, token)) User.clearToken(user);
  return { ok: true };
}

function adminReady() {
  return { setup: Admin.size() === 0 };
}

function adminSetup(username, password) {
  if (Admin.size() > 0) throw Object.assign(new Error("Admin already set up"), { status: 400 });
  const row = Admin.create({ username, password, role: "super" });
  const token = Token.createAdmin(row);
  Admin.setToken(row, token);
  return { token };
}

function adminLogin(username, password) {
  const row = Admin.verify(username, password);
  if (!row) throw Object.assign(new Error("Wrong username or password"), { status: 401 });
  const token = Token.createAdmin(row);
  Admin.setToken(row, token);
  return { token };
}

function adminCreate(body) {
  const row = Admin.create({ username: body.username, password: body.password, role: body.role === "super" ? "super" : "staff", perms: body.perms });
  return Admin.dump(row);
}

function adminTarget(id) {
  const row = Admin.findById(id);
  if (!row) throw Object.assign(new Error("Admin not found"), { status: 404 });
  return row;
}

function adminUpdate(me, id, body) {
  const row = adminTarget(id);
  const demote = body.role === "staff" && Admin.roleOf(row) === "super";
  if (demote && row._id === me._id) throw Object.assign(new Error("You can’t remove your own super admin access"), { status: 400 });
  if (demote && Admin.supers().length <= 1) throw Object.assign(new Error("Keep at least one super admin"), { status: 400 });
  return Admin.dump(Admin.update(row, body));
}

function adminRemove(me, id) {
  const row = adminTarget(id);
  if (row._id === me._id) throw Object.assign(new Error("You can’t delete yourself"), { status: 400 });
  if (Admin.roleOf(row) === "super" && Admin.supers().length <= 1) throw Object.assign(new Error("Keep at least one super admin"), { status: 400 });
  Admin.remove(row);
  return { ok: true };
}

function adminMe(row) {
  return { ...Admin.dump(row), sections: Admin.SECTIONS };
}

function adminList() {
  return Admin.all().map(Admin.dump);
}

module.exports = { sendOtp, login, googleLogin, authConfig, profile, updateProfile, logout, adminLogin, adminReady, adminSetup, adminCreate, adminUpdate, adminRemove, adminMe, adminList };
