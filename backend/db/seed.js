const { point } = require("./geo");
const User = require("../models/user.model");
const Listing = require("../models/listing.model");
const NeedRequest = require("../models/needRequest.model");
const Category = require("../models/category.model");

let done = false;

module.exports = function seed() {
  if (done) return;
  done = true;
  if (User.size()) return;
  Category.create({ name: "Tiffin", slug: "tiffin" });
  Category.create({ name: "Meals", slug: "meals" });
  Category.create({ name: "Fruit", slug: "fruit" });
  const asha = User.create({
    phone: "9000000000",
    name: "Asha",
    address: "12, 4th Cross, Koramangala",
    lat: 12.936,
    lng: 77.6252,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    role: "giver"
  });
  const ravi = User.create({
    phone: "9111111111",
    name: "Ravi",
    address: "88, 7th Main, Koramangala",
    lat: 12.941,
    lng: 77.63,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    role: "seeker"
  });
  Listing.create({
    providerId: asha._id,
    name: "Veg thali",
    categoryId: "1",
    category: "tiffin",
    diet: "veg",
    servings: 2,
    note: "Dal, rice, roti and sabzi from today’s lunch. Packed at 2:10 pm.",
    availableUntil: Date.now() + 12 * 60 * 60 * 1000,
    location: point(77.6252, 12.936),
    address: "12, 4th Cross, Koramangala",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80",
    status: "open"
  });
  Listing.create({
    providerId: asha._id,
    name: "Leftover pancakes",
    categoryId: "2",
    category: "meals",
    diet: "veg",
    servings: 3,
    note: "Homestyle pancakes. Best with tea.",
    availableUntil: Date.now() + 12 * 60 * 60 * 1000,
    location: point(77.63, 12.941),
    address: "88, 7th Main, Koramangala",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80",
    status: "open"
  });
  NeedRequest.create({
    seekerId: ravi._id,
    what: "Any fruit",
    servings: 1,
    neededBy: Date.now() + 3 * 60 * 60 * 1000,
    location: point(77.63, 12.941),
    status: "open"
  });
};
