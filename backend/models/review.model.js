const db = require("../db");

function create(data) {
  return db.reviews.insertOne({
    orderId: data.orderId,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    rating: data.rating,
    comment: data.comment || "",
    createdAt: new Date()
  });
}

function findByOrder(orderId) {
  const id = String(orderId);
  return db.reviews.find((d) => String(d.orderId) === id);
}

function all() {
  return db.reviews.find();
}

module.exports = { create, findByOrder, all };
