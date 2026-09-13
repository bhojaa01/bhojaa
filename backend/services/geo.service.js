const { km, latLng, point, distanceKm } = require("../db/geo");

function cap(item, now) {
  const m = (item.availableUntil - now) / 60000;
  if (m <= 0) return 0;
  let k = m <= 60 ? 1 : m <= 180 ? 2 : 5;
  if (item.category === "tiffin" || item.category === "meals") k = Math.min(k, 2);
  return k;
}

function untilFrom(body, fallbackMin) {
  if (body.untilAt) {
    const t = Date.parse(body.untilAt);
    if (!Number.isFinite(t) || t <= Date.now()) {
      throw Object.assign(new Error("Pick a future date and time"), { status: 400 });
    }
    if (t > Date.now() + 14 * 24 * 60 * 60 * 1000) {
      throw Object.assign(new Error("Must be within 14 days"), { status: 400 });
    }
    return t;
  }
  const v = body.until || body.when || body.time;
  if (v === "tonight") {
    const t = new Date();
    t.setHours(21, 0, 0, 0);
    if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
    return t.getTime();
  }
  if (v === "tomorrow") {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(10, 0, 0, 0);
    return t.getTime();
  }
  const m = Number(v || body.untilMinutes);
  return Date.now() + (Number.isFinite(m) && m > 0 ? m : fallbackMin) * 60 * 1000;
}

function minutesLeft(until, now) {
  return Math.max(0, Math.round((until - now) / 60000));
}

module.exports = { km, latLng, point, distanceKm, cap, untilFrom, minutesLeft };
