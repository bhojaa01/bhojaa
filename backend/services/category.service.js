const { Category } = require("../models");

function list() {
  return { categories: Category.all().map((c) => ({ id: c._id, name: c.name, slug: c.slug })) };
}

module.exports = { list };
