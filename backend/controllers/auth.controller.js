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

async function googleLogin(req, res) {
  try { json(res, 200, await authService.googleLogin(req.body.credential, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function authConfig(req, res) {
  json(res, 200, authService.authConfig());
}

async function me(req, res) {
  json(res, 200, await authService.profile(req.user));
}

async function updateMe(req, res) {
  try { json(res, 200, await authService.updateProfile(req.user, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function logout(req, res) {
  json(res, 200, authService.logout(req.user, tokenOf(req)));
}

function deleteMe(req, res) {
  try { json(res, 200, authService.deleteAccount(req.user, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function adminLogin(req, res) {
  try { json(res, 200, authService.adminLogin(req.body.username, req.body.password)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function adminReady(req, res) {
  json(res, 200, authService.adminReady());
}

function adminSetup(req, res) {
  try { json(res, 200, authService.adminSetup(req.body.username, req.body.password)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function adminCreate(req, res) {
  try { json(res, 200, authService.adminCreate(req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function adminUpdate(req, res) {
  try { json(res, 200, authService.adminUpdate(req.admin, req.params.id, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function adminRemove(req, res) {
  try { json(res, 200, authService.adminRemove(req.admin, req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function adminMe(req, res) {
  json(res, 200, authService.adminMe(req.admin));
}

function adminList(req, res) {
  json(res, 200, { admins: authService.adminList() });
}

module.exports = { sendOtp, login, googleLogin, authConfig, me, updateMe, logout, deleteMe, adminLogin, adminReady, adminSetup, adminCreate, adminUpdate, adminRemove, adminMe, adminList };
