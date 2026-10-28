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
    accuracy: Number.isFinite(Number(b.accuracy)) && b.accuracy !== null && b.accuracy !== "" ? Math.min(100000, Math.max(0, Math.round(Number(b.accuracy)))) : null,
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
    locality: r.locality, postcode: r.postcode, lat: r.lat, lng: r.lng, accuracy: r.accuracy == null ? null : r.accuracy,
    source: r.source, device: r.device, createdAt: r.createdAt
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const SORTS = ["createdAt", "locality", "city", "state", "country", "postcode", "source", "device", "page"];
const SEARCHED = ["locality", "city", "state", "country", "postcode"];

// Admin list options: sort/dir, free-text q, and exact source/device filters.
function listOpts(query) {
  const q = query || {};
  const sort = SORTS.includes(q.sort) ? q.sort : "createdAt";
  const dir = q.dir === "asc" ? 1 : -1;
  const term = text(q.q, 60).toLowerCase();
  const source = q.source === "gps" || q.source === "network" ? q.source : "";
  const device = ["mobile", "tablet", "desktop"].includes(q.device) ? q.device : "";
  return { sort, dir, term, source, device };
}

function mongoFilter(o) {
  const f = {};
  if (o.term) {
    const re = new RegExp(o.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    f.$or = SEARCHED.map((k) => ({ [k]: re }));
  }
  if (o.source === "gps") f.source = "gps";
  if (o.source === "network") f.source = { $ne: "gps" };
  if (o.device) f.device = o.device;
  return f;
}

function matches(r, o) {
  if (o.term && !SEARCHED.some((k) => String(r[k] || "").toLowerCase().includes(o.term))) return false;
  if (o.source === "gps" && r.source !== "gps") return false;
  if (o.source === "network" && r.source === "gps") return false;
  if (o.device && r.device !== o.device) return false;
  return true;
}

function compare(o) {
  return (a, b) => {
    const x = a[o.sort];
    const y = b[o.sort];
    const d = o.sort === "createdAt"
      ? new Date(x || 0) - new Date(y || 0)
      : String(x || "").localeCompare(String(y || ""), undefined, { sensitivity: "base" });
    return d * o.dir;
  };
}

async function list(query) {
  const size = Math.min(100, Math.max(1, Number(query && query.size) || 20));
  const page = Math.max(1, Number(query && query.page) || 1);
  const o = listOpts(query);
  const today = startOfToday();
  const c = store();
  if (c) {
    const filter = mongoFilter(o);
    const order = o.sort === "createdAt" ? { createdAt: o.dir } : { [o.sort]: o.dir, createdAt: -1 };
    const [rows, matched, total, todayCount, places] = await Promise.all([
      c.find(filter).sort(order).collation({ locale: "en", strength: 2 }).skip((page - 1) * size).limit(size).toArray(),
      c.countDocuments(filter),
      c.countDocuments({}),
      c.countDocuments({ createdAt: { $gte: today } }),
      c.aggregate([
        { $group: { _id: { city: "$city", state: "$state", country: "$country" }, count: { $sum: 1 }, last: { $max: "$createdAt" } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray()
    ]);
    return {
      enabled: enabled(), page, size, total, matched, today: todayCount, sort: o.sort, dir: o.dir > 0 ? "asc" : "desc",
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
  const found = memory.filter((r) => matches(r, o)).sort(compare(o));
  return {
    enabled: enabled(), page, size, total: memory.length, matched: found.length,
    today: memory.filter((r) => r.createdAt >= today).length, sort: o.sort, dir: o.dir > 0 ? "asc" : "desc",
    places: [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    rows: found.slice((page - 1) * size, page * size).map(view)
  };
}

module.exports = { record, list, enabled, setEnabled, deviceOf };
