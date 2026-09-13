const reportService = require("../services/report.service");
const { json } = require("../utils/http");

function create(req, res) {
  try { json(res, 201, reportService.create(req.user, req.body)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { create };
