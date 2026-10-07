const adminService = require("../services/admin.service");
const { json } = require("../utils/http");

function data(req, res) {
  json(res, 200, adminService.data());
}

function addCategory(req, res) {
  try { json(res, 200, adminService.addCategory(req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function removeCategory(req, res) {
  try { json(res, 200, adminService.removeCategory(req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function addPartner(req, res) {
  try { json(res, 200, adminService.addPartner(req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function updatePartner(req, res) {
  try { json(res, 200, adminService.updatePartner(req.params.id, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function togglePartner(req, res) {
  try { json(res, 200, adminService.togglePartner(req.params.id, req.body.enabled)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function removePartner(req, res) {
  try { json(res, 200, adminService.removePartner(req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { data, addCategory, removeCategory, addPartner, updatePartner, togglePartner, removePartner };
