const db = require("../db");
const config = require("../config");

const RESEND_MS = 30 * 1000;
const LIVE_MS = 10 * 60 * 1000;

function byPhone(phone) {
  return db.otps.find({ phone }).sort((a, b) => new Date(b.lastSentAt || 0) - new Date(a.lastSentAt || 0));
}

function set(phone, code) {
  const now = new Date();
  return db.otps.insertOne({
    phone,
    code: code || config.otp,
    expiresAt: new Date(now.getTime() + LIVE_MS),
    lastSentAt: now,
    usedAt: null
  });
}

function take(phone) {
  const row = byPhone(phone).find((o) => !o.usedAt);
  if (!row) return null;
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) return null;
  return row;
}

function resendWait(phone) {
  const row = byPhone(phone)[0];
  if (!row || !row.lastSentAt) return 0;
  const left = RESEND_MS - (Date.now() - new Date(row.lastSentAt).getTime());
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

function clear(phone) {
  const row = byPhone(phone).find((o) => !o.usedAt);
  if (!row) return;
  row.usedAt = new Date();
  db.otps.save(row);
}

function all() {
  return db.otps.find();
}

module.exports = { set, take, clear, all, resendWait, RESEND_MS };
