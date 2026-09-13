const db = require("../db");

function create(data) {
  return db.reviews.insertOne({
    orderId: data.orderId,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    rating: data.rating,
    comment: data.comment || "",
    createdAt: Date.now()
  });
}

function findByOrder(orderId) {
  return db.reviews.find({ orderId });
}

function all() {
  return db.reviews.find();
}

module.exports = { create, findByOrder, all };
