const { Category, Food } = require("../models");

function list() {
  const foods = Food.all();
  return {
    categories: Category.all().map((c) => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      image: c.image || "",
      diet: c.diet || "all",
      foods: foods
        .filter((f) => String(f.categoryId) === String(c._id))
        .map((f) => ({ id: f._id, name: f.name }))
    }))
  };
}

module.exports = { list };
