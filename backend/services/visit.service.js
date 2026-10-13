const db = require("../db");
const { col } = require("../db/mongo");

const MEMORY_MAX = 5000;
const memory = [];
let indexed = false;

function text(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 80);
}

function coord(v, lim) {
  const n = Number(v);
  if (!Number.isFinite(n) || Math.abs(n) > lim) return null;
  return Math.round(n * 10000) / 10000;
}

function deviceOf(ua) {
  const s = String(ua || "");
  if (/iPad|Tablet/i.test(s)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(s)) return "mobile";
  return s ? "desktop" : "";
}

function enabled() {
  const row = db.settings.findById("visits");
  return !row || row.enabled !== false;
}

function setEnabled(on) {
  const row = db.settings.findById("visits");
  if (row) {
    row.enabled = !!on;
    db.settings.save(row);
  } else {
    db.settings.insertOne({ _id: "visits", enabled: !!on });
  }
  return { enabled: !!on };
}

function store() {
  const c = col("visits");
  if (c && !indexed) {
    indexed = true;
    c.createIndex({ createdAt: -1 }).catch(() => {});
  }
  return c;
}

async function record(body, headers) {
  if (!enabled()) return { ok: true, skipped: true };
  const b = body || {};
  const lat = coord(b.lat, 90);
  const lng = coord(b.lng, 180);
  const row = {
    page: text(b.page, 40) || "home",
    country: text(b.country),
    countryCode: text(b.countryCode, 4).toUpperCase(),
    state: text(b.state),
    city: text(b.city),
    locality: text(b.locality),
    postcode: text(b.postcode, 12),
    lat,
    lng,
    location: lat != null && lng != null ? { type: "Point", coordinates: [lng, lat] } : null,
    source: text(b.source, 30),
    device: deviceOf(headers && headers["user-agent"]),
    createdAt: new Date()
  };
  if (!row.country && !row.city && lat == null) return { ok: true, skipped: true };
  const c = store();
  if (c) {
    await c.insertOne(row);
  } else {
    memory.unshift(row);
    if (memory.length > MEMORY_MAX) memory.length = MEMORY_MAX;
  }
  return { ok: true };
}

function view(r) {
  return {
    id: String(r._id || ""),
    page: r.page, country: r.country, countryCode: r.countryCode, state: r.state, city: r.city,
    locality: r.locality, postcode: r.postcode, lat: r.lat, lng: r.lng,
    source: r.source, device: r.device, createdAt: r.createdAt
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function list(query) {
  const size = Math.min(100, Math.max(1, Number(query && query.size) || 20));
  const page = Math.max(1, Number(query && query.page) || 1);
  const today = startOfToday();
  const c = store();
  if (c) {
    const [rows, total, todayCount, places] = await Promise.all([
      c.find({}).sort({ createdAt: -1 }).skip((page - 1) * size).limit(size).toArray(),
      c.countDocuments({}),
      c.countDocuments({ createdAt: { $gte: today } }),
      c.aggregate([
        { $group: { _id: { city: "$city", state: "$state", country: "$country" }, count: { $sum: 1 }, last: { $max: "$createdAt" } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray()
    ]);
    return {
      enabled: enabled(), page, size, total, today: todayCount,
      places: places.map((p) => ({ ...p._id, count: p.count, last: p.last })),
      rows: rows.map(view)
    };
  }
  const tally = new Map();
  memory.forEach((r) => {
    const k = [r.city, r.state, r.country].join("|");
    const t = tally.get(k) || { city: r.city, state: r.state, country: r.country, count: 0, last: r.createdAt };
    t.count += 1;
    if (r.createdAt > t.last) t.last = r.createdAt;
    tally.set(k, t);
  });
  return {
    enabled: enabled(), page, size, total: memory.length,
    today: memory.filter((r) => r.createdAt >= today).length,
    places: [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    rows: memory.slice((page - 1) * size, page * size).map(view)
  };
}

module.exports = { record, list, enabled, setEnabled, deviceOf };
