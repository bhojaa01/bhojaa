require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const http = require("http");
const app = require("./app");

const port = process.env.PORT || 4000;

http.createServer((req, res) => {
  app(req, res).catch(() => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  });
}).listen(port, "0.0.0.0", () => console.log("API " + port));
