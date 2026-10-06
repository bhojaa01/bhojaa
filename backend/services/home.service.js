const db = require("../db");

const defaults = {
  headline: "Extra food should feed someone nearby.",
  tagline: "Share leftover tiffin, fruit or a meal. Pickup only. Free.",
  banner: "hero.jpg",
  aboutTitle: "What Bhojaa does",
  aboutText: "Bhojaa connects neighbors. If you have extra food, post it. If you need a meal, ask nearby. The giver accepts, then you collect from their home. No delivery. No payment. Address stays private until they accept.",
  points: [
    { title: "Need food", text: "See leftover meals within a few kilometers, or post what you need. Nearby givers can accept." },
    { title: "Give extra food", text: "Publish a dish, servings, and until when. A neighbor requests. They collect. Keep it free." },
    { title: "Safe pickup", text: "House number is shared only after you accept. Login with your phone to start." }
  ]
};

function str(v, fallback) {
  const s = String(v == null ? "" : v).trim();
  return s || fallback;
}

function view(row) {
  const d = row || {};
  const pts = Array.isArray(d.points) ? d.points : [];
  return {
    headline: str(d.headline, defaults.headline),
    tagline: str(d.tagline, defaults.tagline),
    banner: str(d.banner, defaults.banner),
    aboutTitle: str(d.aboutTitle, defaults.aboutTitle),
    aboutText: str(d.aboutText, defaults.aboutText),
    points: defaults.points.map((p, i) => ({
      title: str(pts[i] && pts[i].title, p.title),
      text: str(pts[i] && pts[i].text, p.text)
    }))
  };
}

function get() {
  return view(db.settings.findById("home"));
}

function ensure() {
  if (db.settings.findById("home")) return;
  db.settings.insertOne({ _id: "home", ...defaults });
}

function save(body) {
  const next = view(body);
  if (next.headline.length < 2) throw Object.assign(new Error("Headline required"), { status: 400 });
  if (next.banner !== "hero.jpg" && !/^https?:\/\/\S+/i.test(next.banner)) {
    throw Object.assign(new Error("Enter a valid banner image URL"), { status: 400 });
  }
  let row = db.settings.findById("home");
  if (!row) {
    row = db.settings.insertOne({ _id: "home", ...next });
  } else {
    Object.assign(row, next);
    db.settings.save(row);
  }
  return { ok: true, home: view(row) };
}

module.exports = { get, save, ensure, defaults };
