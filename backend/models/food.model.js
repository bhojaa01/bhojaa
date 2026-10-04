const db = require("../db");

function create(data) {
  return db.foods.insertOne({
    name: data.name,
    categoryId: data.categoryId,
    createdAt: new Date()
  });
}

function findById(id) {
  return db.foods.findById(id);
}

function findByCategory(categoryId) {
  const id = String(categoryId || "");
  return db.foods.find((d) => String(d.categoryId) === id);
}

function findInCategory(name, categoryId) {
  const n = String(name || "").trim().toLowerCase();
  return findByCategory(categoryId).find((f) => String(f.name || "").trim().toLowerCase() === n) || null;
}

function all() {
  return db.foods.find();
}

function remove(id) {
  return db.foods.deleteById(id);
}

function save(row) {
  return db.foods.save(row);
}

module.exports = { create, findById, findByCategory, findInCategory, all, remove, save };
