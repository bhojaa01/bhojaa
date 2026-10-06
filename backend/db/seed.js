const Category = require("../models/category.model");
const Food = require("../models/food.model");
const catalog = require("./catalog");
const home = require("../services/home.service");

let done = false;

function seedCatalog() {
  catalog.forEach((row) => {
    let cat = Category.findBySlug(row.slug);
    if (!cat) cat = Category.create({ name: row.name, slug: row.slug, image: row.image, diet: row.diet || "all" });
    else {
      let ch = false;
      if (!cat.image && row.image) { cat.image = row.image; ch = true; }
      if (row.diet && cat.diet !== row.diet) { cat.diet = row.diet; ch = true; }
      if (ch) Category.save(cat);
    }
    (row.foods || []).forEach((name) => {
      if (!Food.findInCategory(name, cat._id)) Food.create({ name, categoryId: cat._id });
    });
  });
}

module.exports = function seed() {
  if (done) return;
  done = true;
  seedCatalog();
  home.ensure();
};

module.exports.seedCatalog = seedCatalog;
