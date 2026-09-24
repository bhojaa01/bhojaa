const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI,
  appPort: 3000,
  adminPort: 3001,
  otp: process.env.OTP_STATIC || "1234",
  jwtSecret: process.env.JWT_SECRET || "spareplate-dev-jwt",
  jwtExpiresSec: Number(process.env.JWT_EXPIRES_SEC) || 30 * 24 * 3600,
  kapsoKey: process.env.KAPSO_API_KEY || "",
  kapsoPhoneId: process.env.KAPSO_PHONE_NUMBER_ID || "",
  kapsoTemplate: process.env.KAPSO_OTP_TEMPLATE || "",
  kapsoLang: process.env.KAPSO_OTP_LANG || "en",
  adminUser: process.env.ADMIN_USER || "admin",
  adminPass: process.env.ADMIN_PASS || "1234",
  defaultLocation: { lat: 12.9352, lng: 77.6245 },
  foodImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  webDir: path.join(__dirname, "../web"),
  adminDir: path.join(__dirname, "../admin")
};
