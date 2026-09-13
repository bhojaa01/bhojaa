const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
};

function cors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

function json(res, code, data) {
  cors(res);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error("bad json")); }
    });
    req.on("error", reject);
  });
}

function tokenOf(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return new URL(req.url, "http://localhost").searchParams.get("token") || "";
}

function phoneOf(v) {
  return String(v || "").replace(/\D/g, "");
}

module.exports = { json, readBody, tokenOf, phoneOf, cors };
