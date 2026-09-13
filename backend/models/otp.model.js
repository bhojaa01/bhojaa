const db = require("../db");
const config = require("../config");

const RESEND_MS = 30 * 1000;
const LIVE_MS = 10 * 60 * 1000;

function set(phone, code) {
  const now = Date.now();
  const existing = db.otps.findOne({ phone });
  if (existing) {
    existing.code = code;
    existing.expiresAt = now + LIVE_MS;
    existing.lastSentAt = now;
    return existing;
  }
  return db.otps.insertOne({ phone, code: code || config.otp, expiresAt: now + LIVE_MS, lastSentAt: now });
}

function take(phone) {
  const row = db.otps.findOne({ phone });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < Date.now()) {
    clear(phone);
    return null;
  }
  return row;
}

function resendWait(phone) {
  const row = db.otps.findOne({ phone });
  if (!row || !row.lastSentAt) return 0;
  const left = RESEND_MS - (Date.now() - row.lastSentAt);
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

function clear(phone) {
  db.otps.docs = db.otps.docs.filter((o) => o.phone !== phone);
}

function all() {
  return db.otps.find();
}

module.exports = { set, take, clear, all, resendWait, RESEND_MS };
