const orderService = require("../services/order.service");
const { json } = require("../utils/http");

function mine(req, res) {
  json(res, 200, orderService.mine(req.user));
}

function get(req, res) {
  try { json(res, 200, orderService.get(req.user, req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function accept(req, res) {
  try { json(res, 200, orderService.accept(req.user, req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function collect(req, res) {
  try { json(res, 200, orderService.collect(req.user, req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { mine, get, accept, collect };
