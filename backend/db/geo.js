function point(lng, lat) {
  return { type: "Point", coordinates: [Number(lng), Number(lat)] };
}

function latLng(location) {
  if (!location || !Array.isArray(location.coordinates)) return { lat: 0, lng: 0 };
  return { lng: location.coordinates[0], lat: location.coordinates[1] };
}

function km(a, b) {
  const R = 6371;
  const x = (b.lat - a.lat) * Math.PI / 180;
  const y = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(x / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(y / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function distanceKm(location, lng, lat) {
  const p = latLng(location);
  return km({ lat, lng }, { lat: p.lat, lng: p.lng });
}

module.exports = { point, latLng, km, distanceKm };
