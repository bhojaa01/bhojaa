const fs = require("fs");
const path = require("path");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function serve(req, res, root) {
  const p = new URL(req.url, "http://localhost").pathname;
  const rel = p === "/" ? "index.html" : p.replace(/^\//, "");
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root + path.sep) && full !== root) {
    res.writeHead(403);
    return res.end("no");
  }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": mime[path.extname(full)] || "text/plain; charset=utf-8" });
    res.end(data);
  });
}

module.exports = serve;
