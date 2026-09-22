const authService = require("../services/auth.service");
const { json, tokenOf } = require("../utils/http");

async function sendOtp(req, res) {
  try { json(res, 200, await authService.sendOtp(req.body.phone)); }
  catch (e) { json(res, e.status || 500, { error: e.message, resendIn: e.resendIn }); }
}

async function login(req, res) {
  try { json(res, 200, await authService.login(req.body.phone, req.body.otp, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

async function me(req, res) {
  json(res, 200, await authService.profile(req.user));
}

async function updateMe(req, res) {
  try { json(res, 200, await authService.updateProfile(req.user, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function logout(req, res) {
  json(res, 200, authService.logout(tokenOf(req)));
}

function adminLogin(req, res) {
  try {     json(res, 200, authService.adminLogin(req.body.username, req.body.password)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { sendOtp, login, me, updateMe, logout, adminLogin };
