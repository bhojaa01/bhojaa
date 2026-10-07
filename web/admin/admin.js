const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const API = local ? "http://localhost:4000" : "https://bhojaa-production.up.railway.app";
const APP = local ? "http://localhost:3000" : "/";
const KEY = "sp_admin";
const LABELS = {
  users: "Users",
  listings: "Listings",
  need_requests: "Need requests",
  orders: "Orders",
  reviews: "Reviews",
  reports: "Reports",
  home: "Home page",
  categories: "Categories",
  partners: "Partners",
  otps: "OTPs",
  staff: "Admins"
};
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function when(t) {
  if (!t) return "";
  return new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function geo(r) {
  const c = r.location && r.location.coordinates;
  return c ? "[" + c[0] + ", " + c[1] + "]" : "";
}
function badge(status) {
  const s = String(status || "");
  const klass = s === "expired" || s === "declined" || s === "off" || s === "no" ? "bad" : s === "requested" || s === "waiting" || s === "pending" ? "warn" : "";
  return '<span class="badge ' + klass + '">' + esc(s) + "</span>";
}
function token() { return localStorage.getItem(KEY) || ""; }
async function api(path, opts = {}) {
  const headers = {};
  if (token()) headers.Authorization = "Bearer " + token();
  if (opts.body) headers["Content-Type"] = "application/json";
  const res = await fetch(API + path, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
function table(el, cols, rows) {
  el.innerHTML = "<thead><tr>" + cols.map((c) => "<th>" + esc(c.label) + "</th>").join("") + "</tr></thead><tbody>" +
    (rows.length ? rows.map((r) => "<tr>" + cols.map((c) => "<td>" + c.cell(r) + "</td>").join("") + "</tr>").join("") : '<tr><td colspan="' + cols.length + '">None</td></tr>') +
    "</tbody>";
}

const CAT_PAGE = 8;
let catRows = [];
let catPage = 1;
const OTP_PAGE = 10;
let otpRows = [];
let otpPage = 1;

function otpPages() {
  return Math.max(1, Math.ceil(otpRows.length / OTP_PAGE));
}

function paintOtps() {
  const el = document.getElementById("otps");
  if (!el) return;
  const pages = otpPages();
  if (otpPage > pages) otpPage = pages;
  if (otpPage < 1) otpPage = 1;
  const start = (otpPage - 1) * OTP_PAGE;
  const rows = otpRows.slice(start, start + OTP_PAGE);
  table(el, [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Phone", cell: (r) => esc(r.phone) },
    { label: "Used", cell: (r) => badge(r.used ? "used" : "no") },
    { label: "Status", cell: (r) => badge(r.status) },
    { label: "Sent", cell: (r) => esc(when(r.lastSentAt)) },
    { label: "Expires", cell: (r) => esc(when(r.expiresAt)) }
  ], rows);
  const pager = document.getElementById("otp-pager");
  if (!pager) return;
  pager.innerHTML = otpRows.length
    ? '<button type="button" class="ghost" id="otp-prev"' + (otpPage <= 1 ? " disabled" : "") + ">Prev</button>"
      + "<span>Page " + otpPage + " of " + pages + " · " + otpRows.length + "</span>"
      + '<button type="button" class="ghost" id="otp-next"' + (otpPage >= pages ? " disabled" : "") + ">Next</button>"
    : "";
  const prev = document.getElementById("otp-prev");
  const next = document.getElementById("otp-next");
  if (prev) prev.onclick = () => { if (otpPage > 1) { otpPage -= 1; paintOtps(); } };
  if (next) next.onclick = () => { if (otpPage < pages) { otpPage += 1; paintOtps(); } };
}

function slugOf(name) {
  return String(name || "").toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function catPages() {
  return Math.max(1, Math.ceil(catRows.length / CAT_PAGE));
}

function paintCats() {
  const el = document.getElementById("categories");
  if (!el) return;
  const pages = catPages();
  if (catPage > pages) catPage = pages;
  if (catPage < 1) catPage = 1;
  const start = (catPage - 1) * CAT_PAGE;
  const rows = catRows.slice(start, start + CAT_PAGE);
  table(el, [
    { label: "Image", cell: (r) => r.image ? '<img class="thumb" src="' + esc(r.image) + '" alt="">' : "" },
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Name", cell: (r) => esc(r.name) },
    { label: "Diet", cell: (r) => esc(r.diet || "all") },
    { label: "Slug", cell: (r) => esc(r.slug) },
    { label: "", cell: (r) => '<button type="button" class="ghost" data-del-cat="' + esc(r.id) + '">Delete</button>' }
  ], rows);
  const pager = document.getElementById("cat-pager");
  if (!pager) return;
  pager.innerHTML = catRows.length
    ? '<button type="button" class="ghost" id="cat-prev"' + (catPage <= 1 ? " disabled" : "") + ">Prev</button>"
      + "<span>Page " + catPage + " of " + pages + " · " + catRows.length + "</span>"
      + '<button type="button" class="ghost" id="cat-next"' + (catPage >= pages ? " disabled" : "") + ">Next</button>"
    : "";
  const prev = document.getElementById("cat-prev");
  const next = document.getElementById("cat-next");
  if (prev) prev.onclick = () => { if (catPage > 1) { catPage -= 1; paintCats(); } };
  if (next) next.onclick = () => { if (catPage < pages) { catPage += 1; paintCats(); } };
}

function bannerSrc(v) {
  const s = String(v || "hero.jpg").trim() || "hero.jpg";
  if (/^https?:\/\//i.test(s)) return s;
  return (APP.replace(/\/$/, "") || "") + "/" + s.replace(/^\//, "");
}

function fillHomeForm(d) {
  if (!d) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  set("home-headline", d.headline);
  set("home-tagline", d.tagline);
  set("home-banner", d.banner);
  set("home-about-title", d.aboutTitle);
  set("home-about-text", d.aboutText);
  (d.points || []).forEach((p, i) => {
    set("home-p" + i + "-title", p.title);
    set("home-p" + i + "-text", p.text);
  });
  const prev = document.getElementById("home-preview");
  if (prev) prev.src = bannerSrc(d.banner);
}

async function fillHome() {
  try { fillHomeForm(await api("/api/home")); } catch {}
}

function showCatForm(on) {
  const form = document.getElementById("cat-form");
  const open = document.getElementById("cat-open");
  if (form) form.classList.toggle("hide", !on);
  if (open) open.classList.toggle("hide", on);
  if (on) {
    const msg = document.getElementById("cat-msg");
    if (msg) { msg.className = "muted"; msg.textContent = ""; }
    ["cat-name", "cat-image"].forEach((id) => {
      const n = document.getElementById(id);
      if (n) n.classList.remove("field-err");
    });
  }
}

function catDup(name) {
  const key = String(name || "").trim().toLowerCase();
  const slug = slugOf(name);
  return catRows.some((c) => String(c.name || "").trim().toLowerCase() === key || String(c.slug) === slug);
}

function showSection(name) {
  document.querySelectorAll(".menu-item").forEach((b) => b.classList.toggle("on", b.dataset.section === name));
  document.querySelectorAll("[data-panel]").forEach((p) => p.classList.toggle("hide", p.dataset.panel !== name));
}

async function load() {
  const data = await api("/api/admin/data");
  const s = data.stats;
  document.getElementById("stats").innerHTML = [
    ["users", s.users],
    ["listings", s.listings],
    ["need_requests", s.need_requests],
    ["orders", s.orders],
    ["reviews", s.reviews],
    ["reports", s.reports],
    ["categories", s.categories],
    ["partners", s.partners],
    ["otps", s.otps],
    ["staff", s.staff]
  ].map(([k, v]) => `<button type="button" class="stat" data-section="${esc(k)}"><b>${esc(v)}</b><span>${esc(LABELS[k] || k)}</span></button>`).join("");
  table(document.getElementById("users"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Phone", cell: (r) => esc(r.phone) },
    { label: "Name", cell: (r) => esc(r.profile && r.profile.name) },
    { label: "Role", cell: (r) => badge(r.role) },
    { label: "Address", cell: (r) => esc(r.address) },
    { label: "City / town", cell: (r) => esc(r.city) },
    { label: "State", cell: (r) => esc(r.state) },
    { label: "Country", cell: (r) => esc(r.country) },
    { label: "GeoJSON [lng, lat]", cell: (r) => esc(geo(r)) }
  ], data.users);
  otpRows = data.otps || [];
  if (otpPage > otpPages()) otpPage = otpPages();
  paintOtps();
  await fillHome();
  catRows = data.categories || [];
  if (catPage > catPages()) catPage = catPages();
  paintCats();
  table(document.getElementById("listings"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Name", cell: (r) => esc(r.name) },
    { label: "Provider", cell: (r) => esc(r.providerId) },
    { label: "Status", cell: (r) => badge(r.status) },
    { label: "Category", cell: (r) => esc(r.category) },
    { label: "Diet", cell: (r) => esc(r.diet) },
    { label: "Servings", cell: (r) => esc(r.servings) },
    { label: "GeoJSON", cell: (r) => esc(geo(r)) },
    { label: "Max km", cell: (r) => esc(r.maxKm) },
    { label: "Until", cell: (r) => esc(when(r.availableUntil)) }
  ], data.listings);
  table(document.getElementById("need_requests"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "What", cell: (r) => esc(r.what) },
    { label: "Seeker", cell: (r) => esc(r.seekerId) },
    { label: "Status", cell: (r) => badge(r.status) },
    { label: "Servings", cell: (r) => esc(r.servings) },
    { label: "GeoJSON", cell: (r) => esc(geo(r)) },
    { label: "Needed by", cell: (r) => esc(when(r.neededBy)) }
  ], data.need_requests);
  table(document.getElementById("orders"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Status", cell: (r) => badge(r.status) },
    { label: "Seeker", cell: (r) => esc(r.seekerId) },
    { label: "Provider", cell: (r) => esc(r.providerId) },
    { label: "Listing", cell: (r) => esc(r.listingId || "") },
    { label: "Need", cell: (r) => esc(r.needRequestId || "") },
    { label: "Created", cell: (r) => esc(when(r.createdAt)) }
  ], data.orders);
  table(document.getElementById("reviews"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Order", cell: (r) => esc(r.orderId) },
    { label: "From", cell: (r) => esc(r.fromUserId) },
    { label: "To", cell: (r) => esc(r.toUserId) },
    { label: "Rating", cell: (r) => esc(r.rating) },
    { label: "Comment", cell: (r) => esc(r.comment) }
  ], data.reviews);
  table(document.getElementById("reports"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Reporter", cell: (r) => esc(r.reporterId) },
    { label: "Type", cell: (r) => esc(r.targetType) },
    { label: "Target", cell: (r) => esc(r.targetId) },
    { label: "Reason", cell: (r) => esc(r.reason) },
    { label: "Status", cell: (r) => badge(r.status) }
  ], data.reports);
  table(document.getElementById("partners"), [
    { label: "Name", cell: (r) => esc(r.name) },
    { label: "Type", cell: (r) => esc(r.type) },
    { label: "Status", cell: (r) => badge(r.enabled ? "on" : "off") },
    { label: "URL", cell: (r) => esc(r.url) },
    { label: "", cell: (r) =>
      '<button type="button" class="ghost" data-edit-partner="' + esc(r.id) + '">Edit</button> '
      + '<button type="button" class="ghost" data-toggle-partner="' + esc(r.id) + '" data-on="' + (r.enabled ? "0" : "1") + '">' + (r.enabled ? "Disable" : "Enable") + "</button> "
      + '<button type="button" class="ghost" data-del-partner="' + esc(r.id) + '">Delete</button>' }
  ], data.partners || []);
  table(document.getElementById("staff"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Username", cell: (r) => esc(r.username) },
    { label: "Created", cell: (r) => esc(when(r.createdAt)) }
  ], data.staff || []);
}

function showDash(on) {
  document.getElementById("login").classList.toggle("hide", on);
  document.getElementById("dash").classList.toggle("hide", !on);
  document.getElementById("refresh").classList.toggle("hide", !on);
  document.getElementById("out").classList.toggle("hide", !on);
}

async function enter(path) {
  const msg = document.getElementById("msg");
  msg.textContent = "";
  const data = await api(path, {
    body: {
      username: document.getElementById("username").value,
      password: document.getElementById("password").value
    }
  });
  localStorage.setItem(KEY, data.token);
  showDash(true);
  showSection("overview");
  await load();
}
document.getElementById("go").onclick = async () => {
  try { await enter("/api/admin/login"); }
  catch (e) { document.getElementById("msg").textContent = e.message; }
};
const setupBtn = document.getElementById("setup");
if (setupBtn) {
  setupBtn.onclick = async () => {
    try { await enter("/api/admin/setup"); }
    catch (e) { document.getElementById("msg").textContent = e.message; }
  };
}
api("/api/admin/ready").then((d) => {
  if (d.setup && setupBtn) {
    setupBtn.classList.remove("hide");
    document.getElementById("go").classList.add("hide");
  }
}).catch(() => {});
document.getElementById("refresh").onclick = () => load().catch((e) => alert(e.message));
const homeBanner = document.getElementById("home-banner");
if (homeBanner) homeBanner.oninput = () => {
  const prev = document.getElementById("home-preview");
  if (prev) prev.src = bannerSrc(homeBanner.value);
};
const homeSave = document.getElementById("home-save");
if (homeSave) homeSave.onclick = async () => {
  const msg = document.getElementById("home-msg");
  msg.className = "muted";
  const banner = document.getElementById("home-banner").value.trim();
  if (banner && banner !== "hero.jpg" && !/^https?:\/\/\S+/i.test(banner)) {
    msg.className = "err";
    msg.textContent = "Enter a valid banner image URL.";
    return;
  }
  const headline = document.getElementById("home-headline").value.trim();
  if (headline.length < 2) {
    msg.className = "err";
    msg.textContent = "Headline required.";
    return;
  }
  try {
    await api("/api/admin/home", {
      body: {
        headline,
        tagline: document.getElementById("home-tagline").value,
        banner,
        aboutTitle: document.getElementById("home-about-title").value,
        aboutText: document.getElementById("home-about-text").value,
        points: [0, 1, 2].map((i) => ({
          title: document.getElementById("home-p" + i + "-title").value,
          text: document.getElementById("home-p" + i + "-text").value
        }))
      }
    });
    msg.className = "ok";
    msg.textContent = "Home page saved.";
  } catch (e) {
    msg.className = "err";
    msg.textContent = e.message;
  }
};
function resetPartnerForm() {
  document.getElementById("partner-id").value = "";
  document.getElementById("partner-name").value = "";
  document.getElementById("partner-type").value = "sms";
  document.getElementById("partner-url").value = "";
  document.getElementById("partner-auth").value = "";
  document.getElementById("partner-body").value = '{\n  "sender_id": "bhojaa_validation",\n  "numbers": "{{phone}}",\n  "rout": "sms",\n  "variables_values": "{{otp}}"\n}';
  const msg = document.getElementById("partner-msg");
  if (msg) { msg.className = "muted"; msg.textContent = ""; }
}

function fillPartnerForm(r) {
  document.getElementById("partner-id").value = r.id;
  document.getElementById("partner-name").value = r.name || "";
  document.getElementById("partner-type").value = r.type === "whatsapp" ? "whatsapp" : "sms";
  document.getElementById("partner-url").value = r.url || "";
  document.getElementById("partner-auth").value = "";
  document.getElementById("partner-body").value = JSON.stringify(r.body || {}, null, 2);
  const msg = document.getElementById("partner-msg");
  if (msg) { msg.className = "muted"; msg.textContent = ""; }
}

function showPartnerForm(on) {
  const form = document.getElementById("partner-form");
  const open = document.getElementById("partner-open");
  if (form) form.classList.toggle("hide", !on);
  if (open) open.classList.toggle("hide", on);
}
const partnerOpen = document.getElementById("partner-open");
if (partnerOpen) partnerOpen.onclick = () => { resetPartnerForm(); showPartnerForm(true); };
const partnerCancel = document.getElementById("partner-cancel");
if (partnerCancel) partnerCancel.onclick = () => { resetPartnerForm(); showPartnerForm(false); };
const partnerSave = document.getElementById("partner-save");
if (partnerSave) partnerSave.onclick = async () => {
  const msg = document.getElementById("partner-msg");
  const id = document.getElementById("partner-id").value.trim();
  const name = document.getElementById("partner-name").value.trim();
  const url = document.getElementById("partner-url").value.trim();
  const bodyRaw = document.getElementById("partner-body").value.trim();
  msg.className = "muted";
  if (name.length < 2) { msg.className = "err"; msg.textContent = "Name required."; return; }
  if (!url) { msg.className = "err"; msg.textContent = "URL required."; return; }
  try { JSON.parse(bodyRaw); } catch { msg.className = "err"; msg.textContent = "Body must be JSON."; return; }
  try {
    const payload = {
      name,
      type: document.getElementById("partner-type").value,
      url,
      auth: document.getElementById("partner-auth").value.trim(),
      body: bodyRaw
    };
    if (!id) payload.enabled = true;
    await api(id ? "/api/admin/partners/" + id : "/api/admin/partners", { body: payload });
    resetPartnerForm();
    showPartnerForm(false);
    await load();
  } catch (e) {
    msg.className = "err";
    msg.textContent = e.message;
  }
};
const partnersTable = document.getElementById("partners");
if (partnersTable) partnersTable.onclick = async (e) => {
  const edit = e.target.closest("[data-edit-partner]");
  const tog = e.target.closest("[data-toggle-partner]");
  const del = e.target.closest("[data-del-partner]");
  try {
    if (edit) {
      const row = (await api("/api/admin/data")).partners.find((p) => p.id === edit.dataset.editPartner);
      if (!row) return;
      fillPartnerForm(row);
      showPartnerForm(true);
    } else if (tog) {
      await api("/api/admin/partners/" + tog.dataset.togglePartner + "/toggle", { body: { enabled: tog.dataset.on === "1" } });
      await load();
    } else if (del) {
      await api("/api/admin/partners/" + del.dataset.delPartner + "/delete", { body: {} });
      await load();
    }
  } catch (err) { alert(err.message); }
};
const catOpen = document.getElementById("cat-open");
if (catOpen) catOpen.onclick = () => showCatForm(true);
const catCancel = document.getElementById("cat-cancel");
if (catCancel) catCancel.onclick = () => {
  document.getElementById("cat-name").value = "";
  document.getElementById("cat-image").value = "";
  showCatForm(false);
};
const catSave = document.getElementById("cat-save");
if (catSave) catSave.onclick = async () => {
  const msg = document.getElementById("cat-msg");
  const nameEl = document.getElementById("cat-name");
  const imageEl = document.getElementById("cat-image");
  const name = nameEl.value.trim();
  const image = imageEl.value.trim();
  msg.className = "muted";
  msg.textContent = "";
  nameEl.classList.remove("field-err");
  imageEl.classList.remove("field-err");
  if (name.length < 2) {
    nameEl.classList.add("field-err");
    msg.className = "err";
    msg.textContent = "Name must be at least 2 characters.";
    return;
  }
  if (catDup(name)) {
    nameEl.classList.add("field-err");
    msg.className = "err";
    msg.textContent = "Category already exists.";
    return;
  }
  if (image && !/^https?:\/\/\S+/i.test(image)) {
    imageEl.classList.add("field-err");
    msg.className = "err";
    msg.textContent = "Enter a valid image URL.";
    return;
  }
  try {
    await api("/api/admin/categories", {
      body: {
        name,
        diet: document.getElementById("cat-diet").value,
        image
      }
    });
    nameEl.value = "";
    imageEl.value = "";
    showCatForm(false);
    await load();
    catPage = catPages();
    paintCats();
  } catch (e) {
    msg.className = "err";
    msg.textContent = e.message;
  }
};
const catsTable = document.getElementById("categories");
if (catsTable) catsTable.onclick = async (e) => {
  const b = e.target.closest("[data-del-cat]");
  if (!b) return;
  try {
    await api("/api/admin/categories/" + b.dataset.delCat + "/delete", { body: {} });
    await load();
  } catch (err) { alert(err.message); }
};
const staffAdd = document.getElementById("staff-add");
if (staffAdd) staffAdd.onclick = async () => {
  const msg = document.getElementById("staff-msg");
  msg.className = "muted";
  try {
    await api("/api/admin/staff", {
      body: {
        username: document.getElementById("staff-user").value,
        password: document.getElementById("staff-pass").value
      }
    });
    document.getElementById("staff-user").value = "";
    document.getElementById("staff-pass").value = "";
    msg.className = "ok";
    msg.textContent = "Admin added.";
    await load();
  } catch (e) {
    msg.className = "err";
    msg.textContent = e.message;
  }
};
document.getElementById("out").onclick = () => {
  localStorage.removeItem(KEY);
  showDash(false);
};
["username", "password"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("go").click();
  });
});
document.getElementById("menu").onclick = (e) => {
  const btn = e.target.closest("[data-section]");
  if (btn) showSection(btn.dataset.section);
};
document.getElementById("stats").onclick = (e) => {
  const btn = e.target.closest("[data-section]");
  if (btn) showSection(btn.dataset.section);
};

const appLink = document.getElementById("app-link");
if (appLink) appLink.href = APP;

if (token()) {
  showDash(true);
  showSection("overview");
  load().catch(() => {
    localStorage.removeItem(KEY);
    showDash(false);
  });
}
