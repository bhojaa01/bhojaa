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
  categories: "Categories",
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
  const klass = s === "expired" || s === "declined" ? "bad" : s === "requested" || s === "waiting" ? "warn" : "";
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
  table(document.getElementById("otps"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Phone", cell: (r) => esc(r.phone) },
    { label: "Expires", cell: (r) => esc(when(r.expiresAt)) }
  ], data.otps);
  table(document.getElementById("categories"), [
    { label: "Id", cell: (r) => esc(r.id) },
    { label: "Name", cell: (r) => esc(r.name) },
    { label: "Slug", cell: (r) => esc(r.slug) }
  ], data.categories);
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
