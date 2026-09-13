const http = require("http");
const app = require("./app");
const config = require("./config");

http.createServer((req, res) => {
  app(req, res).catch(() => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  });
}).listen(config.port, () => console.log("API http://localhost:" + config.port));
