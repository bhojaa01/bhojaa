const db = require("../db");

const defaults = {
  headline: "Extra food should feed someone nearby.",
  tagline: "Share leftover tiffin, fruit or a meal. Pickup only. Free.",
  banner: "hero.jpg",
  city: "Now in Bengaluru",
  proof: "Active in Bengaluru. Pickup only.",
  howTitle: "How it works",
  steps: [
    { title: "Post or ask", text: "Share extra food, or say what you need nearby." },
    { title: "A neighbor requests", text: "Someone close by asks to collect. You choose whether to accept." },
    { title: "You accept, they collect", text: "Address stays private until you accept. No delivery. No payment." }
  ],
  aboutTitle: "What Bhojaa does",
  aboutText: "Bhojaa connects neighbors. If you have extra food, post it. If you need a meal, ask nearby. The giver accepts, then you collect from their home. No delivery. No payment. Address stays private until they accept.",
  points: [
    { title: "Need food", text: "See leftover meals within a few kilometers, or post what you need. Nearby givers can accept." },
    { title: "Give extra food", text: "List a meal, how many servings, and until when. A neighbor can request it, then collect it from you. It stays free." },
    { title: "Safe pickup", text: "House number is shared only after you accept. Login with your phone to start." }
  ],
  faqTitle: "Common questions",
  faqs: [
    { q: "Is the food safe?", a: "Bhojaa is neighbor-to-neighbor. Use your judgement, check the note for allergens, and collect only food you are comfortable eating. We do not inspect or certify meals." },
    { q: "Can I give packed food?", a: "Yes. Leftover homemade food, packed meals, fruit, and similar extras are welcome. Say what’s inside and any allergens in the note." },
    { q: "What if nobody’s nearby?", a: "Listings are shown only within a short pickup radius. If no one is close, wait a little or try again later. Pickup is always free and local." }
  ],
  footer: "Bhojaa · Share extra food with neighbors in Bengaluru."
};

function str(v, fallback) {
  const s = String(v == null ? "" : v).trim();
  return s || fallback;
}

function trio(list, fallback, keys) {
  const arr = Array.isArray(list) ? list : [];
  return fallback.map((p, i) => {
    const row = {};
    keys.forEach((k) => { row[k] = str(arr[i] && arr[i][k], p[k]); });
    return row;
  });
}

function view(row) {
  const d = row || {};
  return {
    headline: str(d.headline, defaults.headline),
    tagline: str(d.tagline, defaults.tagline),
    banner: str(d.banner, defaults.banner),
    city: str(d.city, defaults.city),
    proof: str(d.proof, defaults.proof),
    howTitle: str(d.howTitle, defaults.howTitle),
    steps: trio(d.steps, defaults.steps, ["title", "text"]),
    aboutTitle: str(d.aboutTitle, defaults.aboutTitle),
    aboutText: str(d.aboutText, defaults.aboutText),
    points: trio(d.points, defaults.points, ["title", "text"]),
    faqTitle: str(d.faqTitle, defaults.faqTitle),
    faqs: trio(d.faqs, defaults.faqs, ["q", "a"]),
    footer: str(d.footer, defaults.footer)
  };
}

function get() {
  const Order = require("../models/order.model");
  const meals = Order.all().filter((o) => o.status === "collected").length;
  return { ...view(db.settings.findById("home")), stats: { meals, city: "Bengaluru" } };
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
