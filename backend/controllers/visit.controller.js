const visitService = require("../services/visit.service");
const { json } = require("../utils/http");

async function record(req, res) {
  try { json(res, 200, await visitService.record(req.body, req.headers)); }
  catch (e) { json(res, 200, { ok: false }); }
}

async function list(req, res) {
  try { json(res, 200, await visitService.list(req.query)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

function toggle(req, res) {
  try { json(res, 200, visitService.setEnabled(req.body.enabled)); }
  catch (e) { json(res, e.status || 500, { error: e.message }); }
}

module.exports = { record, list, toggle };
