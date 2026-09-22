const Collection = require("./collection");

const uri = process.env.MONGO_URI;

const db = {
  uri,
  users: new Collection("users", "US"),
  otps: new Collection("otps", "OTP"),
  listings: new Collection("listings", "LST"),
  need_requests: new Collection("need_requests", "NR"),
  orders: new Collection("orders", "ORD"),
  reviews: new Collection("reviews", "REV"),
  reports: new Collection("reports", "RPT"),
  categories: new Collection("categories", "CAT"),
  admins: new Collection("admins", "ADM")
};

db.users.createIndex({ location: "2dsphere" });
db.listings.createIndex({ location: "2dsphere" });
db.need_requests.createIndex({ location: "2dsphere" });
db.users.createIndex({ phone: 1 }, { unique: true });
db.otps.createIndex({ phone: 1 });
db.listings.createIndex({ providerId: 1, status: 1 });
db.need_requests.createIndex({ seekerId: 1, status: 1 });
db.orders.createIndex({ seekerId: 1, providerId: 1, status: 1 });

function remap(col, fields, pairs) {
  if (!pairs || !pairs.length) return;
  const dict = Object.fromEntries(pairs);
  col.find().forEach((d) => {
    let ch = false;
    fields.forEach((f) => {
      const v = d[f] != null ? String(d[f]) : "";
      if (dict[v]) {
        d[f] = dict[v];
        ch = true;
      }
    });
    if (ch) col.save(d);
  });
}

db.loadFromAtlas = async function () {
  await Promise.all([
    db.users.loadFromAtlas(),
    db.listings.loadFromAtlas(),
    db.need_requests.loadFromAtlas(),
    db.orders.loadFromAtlas(),
    db.reviews.loadFromAtlas(),
    db.reports.loadFromAtlas(),
    db.categories.loadFromAtlas(),
    db.otps.loadFromAtlas(),
    db.admins.loadFromAtlas()
  ]);
};

db.migrateIds = function () {
  const users = db.users.migrateIds();
  const cats = db.categories.migrateIds();
  remap(db.listings, ["providerId"], users);
  remap(db.listings, ["categoryId"], cats);
  remap(db.need_requests, ["seekerId"], users);
  remap(db.orders, ["seekerId", "providerId"], users);
  remap(db.reviews, ["fromUserId", "toUserId"], users);
  remap(db.reports, ["reporterId"], users);
  const listings = db.listings.migrateIds();
  const needs = db.need_requests.migrateIds();
  remap(db.orders, ["listingId"], listings);
  remap(db.orders, ["needRequestId"], needs);
  const orders = db.orders.migrateIds();
  remap(db.reviews, ["orderId"], orders);
  db.reviews.migrateIds();
  db.reports.migrateIds();
  db.otps.migrateIds();
  db.admins.migrateIds();
};

module.exports = db;
