const config = require("../config");
const { User, Otp, Token } = require("../models");
const { phoneOf } = require("../utils/http");

function sendOtp(rawPhone) {
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
  Otp.set(phone, config.otp);
  return { ok: true, registered: isNew, resendIn: 30, message: isNew ? "Number registered. OTP sent. Use 1234" : "OTP sent. Use 1234" };
}

function login(rawPhone, otp, extra) {
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
    User.setLocation(user, lng, lat);
  }
  const token = Token.createUser(user._id);
  return { token, user: profile(user) };
}

function profile(user) {
  const p = User.coords(user);
  return {
    phone: user.phone,
    name: user.profile.name,
    address: user.address,
    role: user.role,
    lat: p.lat,
    lng: p.lng
  };
}

function updateProfile(user, body) {
  if (body.phone != null && body.phone !== "") {
    const phone = phoneOf(body.phone);
    if (phone.length !== 10) throw Object.assign(new Error("Enter a 10-digit phone"), { status: 400 });
    const taken = User.findByPhone(phone);
    if (taken && taken._id !== user._id) throw Object.assign(new Error("Phone already in use"), { status: 400 });
    user.phone = phone;
  }
  if (body.address != null) user.address = String(body.address).trim();
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) throw Object.assign(new Error("Name required"), { status: 400 });
    user.profile.name = name;
  }
  if (body.role === "seeker" || body.role === "giver") user.role = body.role;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    User.setLocation(user, lng, lat);
  }
  return profile(user);
}

function logout(token) {
  Token.remove(token);
  return { ok: true };
}

function adminLogin(username, password) {
  const userOk = String(username || "").trim() === config.adminUser;
  const passOk = String(password || "") === config.adminPass;
  if (!userOk || !passOk) {
    throw Object.assign(new Error("Wrong username or password"), { status: 401 });
  }
  return { token: Token.createAdmin() };
}

module.exports = { sendOtp, login, profile, updateProfile, logout, adminLogin };
