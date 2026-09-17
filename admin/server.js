require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const http = require("http");
const port = process.env.PORT || 3001;
http.createServer((req, res) => {
  require("../backend/utils/static")(req, res, __dirname);
}).listen(port, "0.0.0.0", () => console.log("Admin " + port));
