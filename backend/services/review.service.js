const { Review, Order } = require("../models");

function create(who, orderId, body) {
  const o = Order.findById(orderId);
  if (!o || (o.seekerId !== who._id && o.providerId !== who._id)) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (o.status !== "collected") throw Object.assign(new Error("Collect first"), { status: 400 });
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw Object.assign(new Error("Rating 1–5 required"), { status: 400 });
  }
  const toUserId = o.seekerId === who._id ? o.providerId : o.seekerId;
  const row = Review.create({
    orderId: o._id,
    fromUserId: who._id,
    toUserId,
    rating,
    comment: String(body.comment || "").trim()
  });
  return { ok: true, id: row._id };
}

module.exports = { create };
