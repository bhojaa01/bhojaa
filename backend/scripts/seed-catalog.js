const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { connectMongo } = require("../db/mongo");
const db = require("../db");
const { seedCatalog } = require("../db/seed");
const Category = require("../models/category.model");
const Food = require("../models/food.model");

connectMongo()
  .then(() => db.loadFromAtlas())
  .then(() => {
    seedCatalog();
    const cats = Category.all();
    const foods = Food.all();
    console.log("Catalog ready");
    cats.forEach((c) => {
      const n = foods.filter((f) => String(f.categoryId) === String(c._id)).length;
      console.log(" - " + c.name + " (" + n + " foods)" + (c.image ? "" : " [no image]"));
    });
    console.log(cats.length + " categories, " + foods.length + " foods");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
