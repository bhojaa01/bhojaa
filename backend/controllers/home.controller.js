const homeService = require("../services/home.service");
const { json } = require("../utils/http");

function get(req, res) {
  json(res, 200, homeService.get());
}

function save(req, res) {
  try { json(res, 200, homeService.save(req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { get, save };
