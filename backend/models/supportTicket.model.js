const db = require("../db");

function create(data) {
  const now = new Date();
  return db.support_tickets.insertOne({
    userId: data.userId,
    phone: data.phone || "",
    name: data.name || "",
    role: data.role || "",
    topicId: data.topicId || null,
    question: data.question || "",
    orderId: data.orderId || null,
    orderLabel: data.orderLabel || "",
    status: "open",
    unread: 0,
    messages: [{ from: "user", text: data.message, at: now }],
    createdAt: now,
    updatedAt: now
  });
}

function findById(id) {
  return db.support_tickets.findById(id);
}

function forUser(userId) {
  return db.support_tickets.find((t) => t.userId === userId);
}

function all() {
  return db.support_tickets.find();
}

function save(row) {
  return db.support_tickets.save(row);
}

module.exports = { create, findById, forUser, all, save };
