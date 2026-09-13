const http = require("http");

const USER = { lat: 12.9352, lng: 77.6245 };
const listings = [
  { name: "Veg thali", category: "tiffin", servings: 2, lat: 12.936, lng: 77.6252, until: Date.now() + 40 * 60 * 1000 },
  { name: "Pancakes", category: "meals", servings: 3, lat: 12.941, lng: 77.63, until: Date.now() + 4 * 60 * 60 * 1000 }
];

function km(a, b) {
  const R = 6371, x = (b.lat - a.lat) * Math.PI / 180, y = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(x / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(y / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function cap(item, now) {
  const m = (item.until - now) / 60000;
  if (m <= 0) return 0;
  let k = m <= 60 ? 1 : m <= 180 ? 2 : 5;
  if (item.category === "tiffin" || item.category === "meals") k = Math.min(k, 2);
  return k;
}

http.createServer((req, res) => {
  const now = Date.now();
  const rows = listings.map((l) => {
    const distance = Number(km(USER, l).toFixed(2));
    const maxKm = cap(l, now);
    const minLeft = Math.max(0, Math.round((l.until - now) / 60000));
    return { ...l, distance, maxKm, minLeft };
  }).filter((l) => l.maxKm > 0 && l.distance <= l.maxKm);

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4efe6;padding:24px">
  <h1>SparePlate nearby</h1>
  <p>Near-expiry food only within 1 km.</p>
  ${rows.map((l) => `<div style="background:#fffaf3;border-radius:16px;padding:16px;margin:12px 0">
    <b>${l.name}</b><br>${l.distance} km · ${l.minLeft} min left · max ${l.maxKm} km
  </div>`).join("") || "<p>No food nearby</p>"}
  </body></html>`;

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
}).listen(4000, () => console.log("Open http://localhost:4000"));