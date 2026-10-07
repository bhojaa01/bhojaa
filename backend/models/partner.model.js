const db = require("../db");

function create(data) {
  return db.partners.insertOne({
    slug: String(data.slug || "").toLowerCase(),
    name: data.name,
    type: data.type === "whatsapp" ? "whatsapp" : "sms",
    enabled: !!data.enabled,
    url: data.url || "",
    method: String(data.method || "POST").toUpperCase(),
    headers: data.headers && typeof data.headers === "object" ? data.headers : {},
    body: data.body && typeof data.body === "object" ? data.body : {},
    createdAt: new Date()
  });
}

function findBySlug(slug) {
  return db.partners.findOne({ slug: String(slug || "").toLowerCase() }) || null;
}

function findById(id) {
  return db.partners.findById(id);
}

function all() {
  return db.partners.find();
}

function enabled() {
  return all().filter((p) => p.enabled && p.url);
}

function save(row) {
  return db.partners.save(row);
}

function remove(id) {
  return db.partners.deleteById(id);
}

module.exports = { create, findBySlug, findById, all, enabled, save, remove };
