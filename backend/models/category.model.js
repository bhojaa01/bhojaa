const db = require("../db");

function create(data) {
  return db.categories.insertOne({
    name: data.name,
    slug: data.slug,
    createdAt: Date.now()
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

module.exports = { create, findBySlug, findById, all };
