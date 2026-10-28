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

// Optional contact number for users outside India: stored as +<country code><number>.
// A plain 10-digit Indian mobile is accepted and stored as +91.
function contactPhoneOf(v) {
  const raw = String(v || "").trim();
  if (!raw) return { phone: "" };
  const d = raw.replace(/\D/g, "");
  if (!raw.startsWith("+") && !raw.startsWith("00")) {
    if (d.length === 10 && /^[6-9]/.test(d)) return { phone: "+91" + d };
    return { error: "Add your country code, e.g. +44 7911 123456." };
  }
  const n = raw.startsWith("00") ? d.slice(2) : d;
  if (n.length < 8 || n.length > 15 || n.startsWith("0")) return { error: "Enter a valid mobile number with country code, e.g. +44 7911 123456." };
  return { phone: "+" + n };
}

module.exports = { json, readBody, tokenOf, phoneOf, phoneError, contactPhoneOf, cors };
