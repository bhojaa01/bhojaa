const db = require("../db");

function create(data) {
  return db.support_topics.insertOne({
    group: data.group || "",
    question: data.question,
    answer: data.answer || "",
    audience: data.audience || "all",
    order: data.order || 0,
    enabled: data.enabled !== false,
    isOther: !!data.isOther,
    solvedCount: 0,
    createdAt: new Date()
  });
}

function findById(id) {
  return db.support_topics.findById(id);
}

function all() {
  return db.support_topics.find().sort((a, b) => {
    if (a.isOther !== b.isOther) return a.isOther ? 1 : -1;
    return (a.order || 0) - (b.order || 0);
  });
}

function save(row) {
  return db.support_topics.save(row);
}

function remove(id) {
  return db.support_topics.deleteById(id);
}

module.exports = { create, findById, all, save, remove };
