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
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  return "";
}

function phoneOf(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

// Indian mobile numbers: 10 digits starting with 6-9.
function phoneError(phone) {
  if (phone && !/^[6-9]/.test(phone)) return "Mobile numbers start with 6, 7, 8 or 9. Check the number and try again.";
  if (phone.length !== 10) return "Enter a 10-digit mobile number.";
  if (/^(\d)\1{9}$/.test(phone)) return "That doesn’t look like a real mobile number. Check it and try again.";
  return "";
}

module.exports = { json, readBody, tokenOf, phoneOf, phoneError, cors };
