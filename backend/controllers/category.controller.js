const categoryService = require("../services/category.service");
const { json } = require("../utils/http");

function list(req, res) {
  json(res, 200, categoryService.list());
}

module.exports = { list };
