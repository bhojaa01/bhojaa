const Collection = require("./collection");

const db = {
  users: new Collection("users"),
  otps: new Collection("otps"),
  listings: new Collection("listings"),
  need_requests: new Collection("need_requests"),
  orders: new Collection("orders"),
  reviews: new Collection("reviews"),
  reports: new Collection("reports"),
  categories: new Collection("categories")
};

db.users.createIndex({ location: "2dsphere" });
db.listings.createIndex({ location: "2dsphere" });
db.need_requests.createIndex({ location: "2dsphere" });
db.users.createIndex({ phone: 1 }, { unique: true });
db.otps.createIndex({ phone: 1 });
db.listings.createIndex({ providerId: 1, status: 1 });
db.need_requests.createIndex({ seekerId: 1, status: 1 });
db.orders.createIndex({ seekerId: 1, providerId: 1, status: 1 });

module.exports = db;
