const seed = require("./db/seed");
const routes = require("./routes");
const { json, readBody, cors } = require("./utils/http");

seed();

async function app(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  const p = new URL(req.url, "http://localhost").pathname;
  req.body = {};
  if (req.method === "POST" || req.method === "PUT") {
    try { req.body = await readBody(req); }
    catch { return json(res, 400, { error: "Invalid JSON" }); }
  }
  if (p === "/health") return json(res, 200, { ok: true });
  if (p.startsWith("/api/")) {
    try {
      const hit = await routes.handle(req, res);
      if (!hit) json(res, 404, { error: "Not found" });
    } catch (e) {
      json(res, 500, { error: "Server error" });
    }
    return;
  }
  json(res, 404, { error: "Not found" });
}

module.exports = app;
