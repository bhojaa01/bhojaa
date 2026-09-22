const KEYS = ["createdAt", "acceptedAt", "collectedAt", "availableUntil", "neededBy", "expiresAt", "lastSentAt", "updatedAt"];

function asDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return new Date(n < 1e12 ? n * 1000 : n);
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function ms(v) {
  const d = asDate(v);
  return d ? d.getTime() : 0;
}

function stamp(doc) {
  if (!doc || typeof doc !== "object") return doc;
  KEYS.forEach((k) => {
    if (doc[k] != null) {
      const d = asDate(doc[k]);
      if (d) doc[k] = d;
    }
  });
  return doc;
}

module.exports = { asDate, ms, stamp };
