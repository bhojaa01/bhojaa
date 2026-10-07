const Category = require("../models/category.model");
const Food = require("../models/food.model");
const catalog = require("./catalog");
const home = require("../services/home.service");
const Partner = require("../models/partner.model");

let done = false;

function seedCatalog() {
  catalog.forEach((row) => {
    let cat = Category.findBySlug(row.slug);
    if (!cat) cat = Category.create({ name: row.name, slug: row.slug, image: row.image, diet: row.diet || "all" });
    else {
      let ch = false;
      if (!cat.image && row.image) { cat.image = row.image; ch = true; }
      if (row.diet && cat.diet !== row.diet) { cat.diet = row.diet; ch = true; }
      if (ch) Category.save(cat);
    }
    (row.foods || []).forEach((name) => {
      if (!Food.findInCategory(name, cat._id)) Food.create({ name, categoryId: cat._id });
    });
  });
}

module.exports = function seed() {
  if (done) return;
  done = true;
  seedCatalog();
  home.ensure();
  seedPartners();
};

function seedPartners() {
  if (!Partner.findBySlug("gosms")) {
    Partner.create({
      slug: "gosms",
      name: "GoSMS",
      type: "sms",
      enabled: false,
      url: "https://gosms.in/api/v1/sms",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        sender_id: "bhojaa_validation",
        numbers: "{{phone}}",
        rout: "sms",
        variables_values: "{{otp}}"
      }
    });
  }
  if (!Partner.findBySlug("kapso")) {
    Partner.create({
      slug: "kapso",
      name: "Kapso WhatsApp",
      type: "whatsapp",
      enabled: false,
      url: "https://api.kapso.ai/meta/whatsapp/v24.0/PHONE_ID/messages",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        messaging_product: "whatsapp",
        to: "{{phone91}}",
        type: "text",
        text: { body: "Your Bhojaa OTP is {{otp}}. Do not share this code." }
      }
    });
  }
}

module.exports.seedCatalog = seedCatalog;
