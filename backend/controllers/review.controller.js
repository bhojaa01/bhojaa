const reviewService = require("../services/review.service");
const { json } = require("../utils/http");

function create(req, res) {
  try { json(res, 201, reviewService.create(req.user, req.params.id, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { create };
