const Category = require("../models/category.model");

let done = false;

module.exports = function seed() {
  if (done) return;
  done = true;
  if (!Category.findBySlug("tiffin")) Category.create({ name: "Tiffin", slug: "tiffin" });
  if (!Category.findBySlug("meals")) Category.create({ name: "Meals", slug: "meals" });
  if (!Category.findBySlug("fruit")) Category.create({ name: "Fruit", slug: "fruit" });
};
