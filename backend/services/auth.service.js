const config = require("../config");
const { User, Otp, Token, Admin } = require("../models");
const { phoneOf } = require("../utils/http");
const kapso = require("./kapso.service");

function makeCode() {
  return kapso.on() ? String(Math.floor(1000 + Math.random() * 9000)) : config.otp;
}

async function sendOtp(rawPhone) {
  const phone = phoneOf(rawPhone);
  if (phone.length !== 10) throw Object.assign(new Error("Enter a 10-digit phone"), { status: 400 });
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
  if (kapso.on()) await kapso.sendOtp(phone, code);
  const message = kapso.on()
    ? (isNew ? "Number registered. OTP sent on WhatsApp." : "OTP sent on WhatsApp.")
    : (isNew ? "Number registered. OTP sent. Use 1234" : "OTP sent. Use 1234");
  return { ok: true, registered: isNew, resendIn: 30, message };
}

async function login(rawPhone, otp, extra) {
  const phone = phoneOf(rawPhone);
  if (phone.length !== 10) throw Object.assign(new Error("Enter a 10-digit phone"), { status: 400 });
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
  User.save(user);
  const token = Token.createUser(user);
  User.setToken(user, token);
  return { token, user: await profile(user) };
}

async function profile(user) {
  const p = User.coords(user);
  if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) await User.setLocation(user, p.lng, p.lat);
  return {
    phone: user.phone,
    name: user.profile.name,
    address: user.address,
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    role: user.role,
    lat: p.lat,
    lng: p.lng
  };
}

async function updateProfile(user, body) {
  if (body.phone != null && body.phone !== "") {
    const phone = phoneOf(body.phone);
    if (phone.length !== 10) throw Object.assign(new Error("Enter a 10-digit phone"), { status: 400 });
    const taken = User.findByPhone(phone);
    if (taken && taken._id !== user._id) throw Object.assign(new Error("Phone already in use"), { status: 400 });
    user.phone = phone;
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
  if (body.role === "seeker" || body.role === "giver") {
    user.role = body.role;
    if (!Array.isArray(user.roles)) user.roles = [];
    if (!user.roles.includes(body.role)) user.roles.push(body.role);
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    await User.setLocation(user, lng, lat, body);
  }
  User.save(user);
  return await profile(user);
}

function logout(user) {
  if (user) User.clearToken(user);
  return { ok: true };
}

function adminReady() {
  return { setup: Admin.size() === 0 };
}

function adminSetup(username, password) {
  if (Admin.size() > 0) throw Object.assign(new Error("Admin already set up"), { status: 400 });
  const row = Admin.create({ username, password });
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

function adminCreate(username, password) {
  const row = Admin.create({ username, password });
  return Admin.dump(row);
}

function adminList() {
  return Admin.all().map(Admin.dump);
}

module.exports = { sendOtp, login, profile, updateProfile, logout, adminLogin, adminReady, adminSetup, adminCreate, adminList };
