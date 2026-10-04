const db = require("../db");

function create(data) {
  return db.categories.insertOne({
    name: data.name,
    slug: String(data.slug || "").toLowerCase(),
    image: data.image || "",
    diet: data.diet || "all",
    createdAt: new Date()
  });
}

function findBySlug(slug) {
  return db.categories.findOne({ slug: String(slug || "").toLowerCase() }) || null;
}

function findById(id) {
  return db.categories.findById(id);
}

function all() {
  return db.categories.find();
}

function save(row) {
  return db.categories.save(row);
}

function remove(id) {
  return db.categories.deleteById(id);
}

module.exports = { create, findBySlug, findById, all, save, remove };
