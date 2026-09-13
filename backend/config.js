const path = require("path");

module.exports = {
  port: 4000,
  appPort: 3000,
  adminPort: 3001,
  otp: "1234",
  adminUser: "admin",
  adminPass: "1234",
  defaultLocation: { lat: 12.9352, lng: 77.6245 },
  foodImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  webDir: path.join(__dirname, "../web"),
  adminDir: path.join(__dirname, "../admin")
};
