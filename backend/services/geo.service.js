const { km, latLng, point, distanceKm } = require("../db/geo");

const placeCache = new Map();

function uniq(parts) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const s = String(p || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function placeFrom(addr) {
  if (!addr) return { city: "", state: "", country: "", area: "", address: "" };
  const city = addr.city || addr.town || addr.village || addr.municipality || "";
  const state = addr.state || "";
  const country = addr.country || "";
  const area = uniq([
    addr.amenity,
    addr.building,
    addr.road,
    addr.neighbourhood,
    addr.quarter,
    addr.suburb,
    addr.residential,
    addr.hamlet
  ]).filter((p) => p !== city && p !== state && p !== country).join(", ");
  return { city, state, country, area, address: area };
}

async function getJson(url, headers, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function fromBigData(data) {
  if (!data) return null;
  const city = data.city || data.locality || "";
  const state = data.principalSubdivision || "";
  const country = data.countryName || "";
  const adm = ((data.localityInfo || {}).administrative || [])
    .slice()
    .sort((a, b) => (b.adminLevel || 0) - (a.adminLevel || 0));
  const area = uniq(adm.map((a) => a && a.name))
    .filter((p) => p && p !== city && p !== state && p !== country)[0] || "";
  if (!city && !state && !country) return null;
  return { city, state, country, area, address: area || city };
}

async function reverse(lat, lng) {
  const key = "18:" + Number(lat).toFixed(4) + "," + Number(lng).toFixed(4);
  if (placeCache.has(key)) return placeCache.get(key);
  const [nomRaw, bdRaw] = await Promise.all([
    getJson(
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat="
        + encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lng),
      { "User-Agent": "Bhojaa/1.0 (https://github.com/bhojaa01/bhojaa)", Accept: "application/json" },
      6000
    ),
    getJson(
      "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="
        + encodeURIComponent(lat) + "&longitude=" + encodeURIComponent(lng) + "&localityLanguage=en",
      { Accept: "application/json" },
      6000
    )
  ]);
  const nom = placeFrom(nomRaw && nomRaw.address);
  const bd = fromBigData(bdRaw);
  const place = {
    city: nom.city || (bd && bd.city) || "",
    state: nom.state || (bd && bd.state) || "",
    country: nom.country || (bd && bd.country) || "",
    area: nom.area || (bd && bd.area) || "",
    address: nom.address || (bd && bd.address) || ""
  };
  if (!place.city && !place.state && !place.country) return null;
  placeCache.set(key, place);
  return place;
}

function cap(item, now) {
  const until = item.availableUntil instanceof Date ? item.availableUntil.getTime() : Number(item.availableUntil);
  const n = now instanceof Date ? now.getTime() : Number(now);
  const m = (until - n) / 60000;
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
    return new Date(t);
  }
  const v = body.until || body.when || body.time;
  if (v === "tonight") {
    const t = new Date();
    t.setHours(21, 0, 0, 0);
    if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
    return t;
  }
  if (v === "tomorrow") {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(10, 0, 0, 0);
    return t;
  }
  const m = Number(v || body.untilMinutes);
  return new Date(Date.now() + (Number.isFinite(m) && m > 0 ? m : fallbackMin) * 60 * 1000);
}

function minutesLeft(until, now) {
  const a = until instanceof Date ? until.getTime() : Number(until);
  const b = now instanceof Date ? now.getTime() : Number(now);
  return Math.max(0, Math.round((a - b) / 60000));
}

module.exports = { km, latLng, point, distanceKm, cap, untilFrom, minutesLeft, reverse };
