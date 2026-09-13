const listingService = require("../services/listing.service");
const { json } = require("../utils/http");

function list(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const here = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  json(res, 200, listingService.nearby(req.user, req.query.km, here));
}

function create(req, res) {
  try { json(res, 201, listingService.create(req.user, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function get(req, res) {
  try { json(res, 200, listingService.get(req.user, req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function request(req, res) {
  try { json(res, 200, listingService.request(req.user, req.params.id)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { list, create, get, request };
