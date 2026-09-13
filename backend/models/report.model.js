const db = require("../db");

function create(data) {
  return db.reports.insertOne({
    reporterId: data.reporterId,
    targetType: data.targetType,
    targetId: data.targetId,
    reason: data.reason,
    status: "open",
    createdAt: Date.now()
  });
}

function all() {
  return db.reports.find();
}

module.exports = { create, all };
