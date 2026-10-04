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

module.exports = { data, addCategory, removeCategory };
