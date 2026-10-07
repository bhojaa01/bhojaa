const { Partner } = require("../models");

function isProd() {
  return process.env.NODE_ENV === "production";
}

function live() {
  return isProd() && Partner.enabled().length > 0;
}

function fill(v, map) {
  if (Array.isArray(v)) return v.map((x) => fill(x, map));
  if (v && typeof v === "object") {
    const o = {};
    Object.keys(v).forEach((k) => { o[k] = fill(v[k], map); });
    return o;
  }
  if (typeof v !== "string") return v;
  return v.replace(/\{\{(\w+)\}\}/g, (_, k) => (map[k] != null ? String(map[k]) : ""));
}

function mapOf(phone, code) {
  const n = String(phone || "").replace(/\D/g, "");
  const ten = n.length === 12 && n.startsWith("91") ? n.slice(2) : n;
  const phone91 = ten.length === 10 ? "91" + ten : n;
  return { phone: ten, phone91, otp: code };
}

async function dispatch(row, phone, code) {
  const map = mapOf(phone, code);
  const url = fill(row.url, map);
  const headers = fill(row.headers || {}, map);
  const body = fill(row.body || {}, map);
  const res = await fetch(url, {
    method: row.method || "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.log("OTP partner failed", row.slug || row.name, res.status, err.slice(0, 300));
    throw new Error(row.name + " failed");
  }
  return true;
}

async function sendOtp(phone, code) {
  const rows = Partner.enabled();
  if (!rows.length) return false;
  const results = await Promise.allSettled(rows.map((p) => dispatch(p, phone, code)));
  const ok = results.some((r) => r.status === "fulfilled");
  if (!ok) throw Object.assign(new Error("Could not send OTP"), { status: 502 });
  return true;
}

module.exports = { live, sendOtp };
