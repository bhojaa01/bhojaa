const adminService = require("../services/admin.service");
const { json } = require("../utils/http");

function data(req, res) {
  json(res, 200, adminService.data());
}

module.exports = { data };
