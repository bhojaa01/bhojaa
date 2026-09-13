const http = require("http");
const fs = require("fs");
const path = require("path");
const web = path.join(__dirname, "../web");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};
http.createServer((req, res) => {
  const p = new URL(req.url, "http://localhost").pathname;
  if (p === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  const file = p === "/" ? "/index.html" : p;
  const full = path.normalize(path.join(web, file));
  if (!full.startsWith(web)) { res.writeHead(403); return res.end("no"); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": mime[path.extname(full)] || "text/plain; charset=utf-8" });
    res.end(data);
  });
}).listen(4000, () => console.log("SparePlate http://localhost:4000"));
