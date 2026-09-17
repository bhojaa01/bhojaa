const needService = require("../services/need.service");
const { json } = require("../utils/http");

function list(req, res) {
  json(res, 200, needService.list(req.user));
}

function create(req, res) {
  try { json(res, 201, needService.create(req.user, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function offer(req, res) {
  try { json(res, 200, needService.offer(req.user, req.params.id, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function remove(req, res) {
  try { json(res, 200, needService.remove(req.user, req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { list, create, offer, remove };
