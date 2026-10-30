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
  visits: "Visitors",
  support: "Open support",
  support_topics: "Support questions",
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
  const d = new Date(t);
  if (!Number.isFinite(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return dd + "-" + mm + "-" + d.getFullYear() + " " + String(h).padStart(2, "0") + ":" + min + ap;
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

// Makes headers of columns that have a `sort` key clickable; sort is { key, dir } with dir 1 / -1.
function sortHeads(el, cols, sort, onSort) {
  el.querySelectorAll("th").forEach((th, i) => {
    const c = cols[i];
    if (!c || !c.sort) return;
    th.classList.add("sortable");
    th.tabIndex = 0;
    th.setAttribute("aria-sort", c.sort === sort.key ? (sort.dir > 0 ? "ascending" : "descending") : "none");
    const go = () => onSort(c.sort === sort.key ? { key: c.sort, dir: -sort.dir } : { key: c.sort, dir: c.newestFirst ? -1 : 1 });
    th.onclick = go;
    th.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
}

function pagerHtml(prefix, page, pages, label) {
  return '<button type="button" class="ghost" id="' + prefix + '-prev"' + (page <= 1 ? " disabled" : "") + ">Prev</button>"
    + "<span>Page " + page + " of " + pages + " · " + label + "</span>"
    + '<button type="button" class="ghost" id="' + prefix + '-next"' + (page >= pages ? " disabled" : "") + ">Next</button>";
}

const USER_PAGE = 20;
let userRows = [];
let userPage = 1;
let userSort = { key: "createdAt", dir: -1 };
const userText = (r) => [r.id, r.phone, r.contactPhone, r.email, r.profile && r.profile.name, r.address, r.city, r.state, r.country].join(" ").toLowerCase();
const userCols = [
  { key: "id", sort: "id", label: "Id", val: (r) => Number(String(r.id).replace(/\D/g, "")) || 0, cell: (r) => esc(r.id) },
  { key: "phone", sort: "phone", label: "Phone / email", val: (r) => r.phone || r.contactPhone || r.email || "", cell: (r) => esc(r.phone || r.contactPhone || r.email) },
  { key: "login", sort: "login", label: "Login", val: (r) => (r.email && !r.phone ? "google" : "phone"), cell: (r) => badge(r.email && !r.phone ? "google" : "otp") },
  { key: "name", sort: "name", label: "Name", val: (r) => (r.profile && r.profile.name) || "", cell: (r) => esc(r.profile && r.profile.name) },
  { key: "role", sort: "role", label: "Role", val: (r) => r.role || "", cell: (r) => badge(r.role) },
  { key: "address", sort: "address", label: "Address", val: (r) => r.address || "", cell: (r) => esc(r.address) },
  { key: "city", sort: "city", label: "City / town", val: (r) => r.city || "", cell: (r) => esc(r.city) },
  { key: "state", sort: "state", label: "State", val: (r) => r.state || "", cell: (r) => esc(r.state) },
  { key: "country", sort: "country", label: "Country", val: (r) => r.country || "", cell: (r) => esc(r.country) },
  { key: "createdAt", sort: "createdAt", newestFirst: true, label: "Joined", val: (r) => new Date(r.createdAt || 0).getTime() || 0, cell: (r) => esc(when(r.createdAt)) },
  { key: "updatedAt", sort: "updatedAt", newestFirst: true, label: "Last update", val: (r) => new Date(r.updatedAt || r.createdAt || 0).getTime() || 0, cell: (r) => esc(when(r.updatedAt || r.createdAt)) },
  { key: "geo", label: "GeoJSON [lng, lat]", cell: (r) => esc(geo(r)) }
];

function paintUsers() {
  const el = document.getElementById("users");
  if (!el) return;
  const q = document.getElementById("u-q").value.trim().toLowerCase();
  const role = document.getElementById("u-role").value;
  const login = document.getElementById("u-login").value;
  const col = userCols.find((c) => c.key === userSort.key);
  const rows = userRows
    .filter((r) => !q || userText(r).includes(q))
    .filter((r) => !role || (r.role || "user") === role)
    .filter((r) => !login || userCols[2].val(r) === login)
    .sort((a, b) => {
      const x = col.val(a);
      const y = col.val(b);
      const d = typeof x === "number" ? x - y : String(x).localeCompare(String(y), undefined, { sensitivity: "base" });
      return d * userSort.dir;
    });
  const pages = Math.max(1, Math.ceil(rows.length / USER_PAGE));
  if (userPage > pages) userPage = pages;
  if (userPage < 1) userPage = 1;
  const start = (userPage - 1) * USER_PAGE;
  table(el, userCols, rows.slice(start, start + USER_PAGE));
  sortHeads(el, userCols, userSort, (s) => { userSort = s; userPage = 1; paintUsers(); });
  document.getElementById("u-pager").innerHTML = pagerHtml("u", userPage, pages,
    rows.length + (rows.length !== userRows.length ? " of " + userRows.length : "") + " users");
  document.getElementById("u-prev").onclick = () => { userPage -= 1; paintUsers(); };
  document.getElementById("u-next").onclick = () => { userPage += 1; paintUsers(); };
}

["u-q", "u-role", "u-login"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", () => { userPage = 1; paintUsers(); });
});

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
    { label: "", cell: (r) => '<button type="button" class="ghost w" data-del-cat="' + esc(r.id) + '">Delete</button>' }
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
  set("home-city", d.city);
  set("home-headline", d.headline);
  set("home-tagline", d.tagline);
  set("home-proof", d.proof);
  set("home-banner", d.banner);
  set("home-how-title", d.howTitle);
  set("home-about-title", d.aboutTitle);
  set("home-about-text", d.aboutText);
  set("home-faq-title", d.faqTitle);
  set("home-footer", d.footer);
  (d.points || []).forEach((p, i) => {
    set("home-p" + i + "-title", p.title);
    set("home-p" + i + "-text", p.text);
  });
  (d.steps || []).forEach((s, i) => {
    set("home-s" + i + "-title", s.title);
    set("home-s" + i + "-text", s.text);
  });
  (d.faqs || []).forEach((f, i) => {
    set("home-f" + i + "-q", f.q);
    set("home-f" + i + "-a", f.a);
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
  if (typeof canSee === "function" && !canSee(name)) name = "overview";
  document.querySelectorAll(".menu-item").forEach((b) => b.classList.toggle("on", b.dataset.section === name));
  document.querySelectorAll("[data-panel]").forEach((p) => p.classList.toggle("hide", p.dataset.panel !== name));
  if (name === "visits") loadVisits().catch(() => {});
  if (name === "support") loadSupport().catch(() => {});
  if (name === "support_topics") loadTopics().catch(() => {});
}

let supStatus = "open";
let supPage = 1;
let supOpenId = "";
let supRows = [];
const AUD = { all: "Everyone", seeker: "Seekers", giver: "Givers" };
const SUP_LABEL = { open: "Open", answered: "Answered", closed: "Closed", all: "All" };

function supBadge(s) {
  return '<span class="badge ' + (s === "open" ? "warn" : s === "closed" ? "muted-badge" : "") + '">' + esc(SUP_LABEL[s] || s) + "</span>";
}
async function loadSupport() {
  const d = await api("/api/admin/support/tickets?status=" + supStatus + "&page=" + supPage + "&size=20");
  supRows = d.tickets;
  document.getElementById("sup-filter").innerHTML = ["open", "answered", "closed", "all"].map((s) =>
    `<button type="button" class="chip${s === supStatus ? " on" : ""}" data-sup-status="${s}">${SUP_LABEL[s]} · ${esc(d.counts[s])}</button>`).join("");
  table(document.getElementById("sup-tickets"), [
    { label: "Ticket", cell: (r) => esc(r.id) },
    { label: "Updated", cell: (r) => esc(when(r.updatedAt || r.createdAt)) },
    { label: "User", cell: (r) => esc((r.name ? r.name + " · " : "") + r.phone) },
    { label: "Role", cell: (r) => badge(r.role === "giver" ? "Giver" : r.role === "seeker" ? "Seeker" : "User") },
    { label: "Question", cell: (r) => esc(r.question) },
    { label: "Last message", cell: (r) => { const m = r.messages[r.messages.length - 1] || {}; return '<span class="clip">' + esc((m.from === "admin" ? "You: " : "") + (m.text || "")) + "</span>"; } },
    { label: "Order", cell: (r) => esc(r.orderId || "—") },
    { label: "Status", cell: (r) => supBadge(r.status) },
    { label: "", cell: (r) => '<button type="button" class="ghost" data-sup-open="' + esc(r.id) + '">Open</button>' }
  ], supRows);
  const pager = document.getElementById("sup-pager");
  pager.innerHTML = d.total > 20
    ? '<button type="button" class="ghost" id="sup-prev"' + (d.page <= 1 ? " disabled" : "") + ">Prev</button><span>Page " + d.page + " of " + d.pages + " · " + d.total + "</span>"
      + '<button type="button" class="ghost" id="sup-next"' + (d.page >= d.pages ? " disabled" : "") + ">Next</button>"
    : "";
  const prev = document.getElementById("sup-prev");
  const next = document.getElementById("sup-next");
  if (prev) prev.onclick = () => { supPage -= 1; loadSupport().catch(() => {}); };
  if (next) next.onclick = () => { supPage += 1; loadSupport().catch(() => {}); };
  const still = supRows.find((r) => r.id === supOpenId);
  if (still) showTicket(still);
}
function showTicket(r) {
  supOpenId = r.id;
  const box = document.getElementById("sup-detail");
  box.classList.remove("hide");
  document.getElementById("sup-detail-body").innerHTML = `
    <div class="panel-head">
      <div><h3>${esc(r.question)}</h3><p class="muted">${esc(r.id)} · ${esc((r.name ? r.name + " · " : "") + r.phone)} · ${esc(r.role || "user")}${r.orderId ? " · Order " + esc(r.orderId) + (r.orderLabel ? " (" + esc(r.orderLabel) + ")" : "") : ""}</p></div>
      ${supBadge(r.status)}
    </div>
    <div class="sup-thread">${r.messages.map((m) => `<div class="sup-msg ${m.from === "admin" ? "from-team" : ""}"><small>${m.from === "admin" ? "Bhojaa team" : "User"} · ${esc(when(m.at))}</small><p>${esc(m.text)}</p></div>`).join("")}</div>
    <label for="sup-reply" class="w">Reply</label>
    <textarea class="w" id="sup-reply" rows="3" maxlength="1000" placeholder="Write a reply. The user sees it in the app."></textarea>
    <p id="sup-msg" class="err"></p>
    <p class="row">
      <button class="btn w" type="button" id="sup-send">Send reply</button>
      ${r.status === "closed"
        ? '<button class="ghost w" type="button" data-sup-set="open">Reopen</button>'
        : '<button class="ghost w" type="button" data-sup-set="closed">Close</button>'}
      <button class="ghost" type="button" id="sup-hide">Hide</button>
    </p>`;
  document.getElementById("sup-send").onclick = async () => {
    const msg = document.getElementById("sup-msg");
    msg.textContent = "";
    try {
      await api("/api/admin/support/tickets/" + r.id + "/reply", { body: { message: document.getElementById("sup-reply").value } });
      await loadSupport();
    } catch (e) { msg.textContent = e.message; }
  };
  document.querySelectorAll("[data-sup-set]").forEach((b) => {
    b.onclick = async () => {
      try {
        await api("/api/admin/support/tickets/" + r.id + "/status", { body: { status: b.dataset.supSet } });
        await loadSupport();
      } catch (e) { document.getElementById("sup-msg").textContent = e.message; }
    };
  });
  document.getElementById("sup-hide").onclick = () => { supOpenId = ""; box.classList.add("hide"); };
}
document.getElementById("sup-filter").onclick = (e) => {
  const b = e.target.closest("[data-sup-status]");
  if (!b) return;
  supStatus = b.dataset.supStatus;
  supPage = 1;
  loadSupport().catch(() => {});
};
document.getElementById("sup-tickets").onclick = (e) => {
  const b = e.target.closest("[data-sup-open]");
  if (!b) return;
  const r = supRows.find((x) => x.id === b.dataset.supOpen);
  if (r) { showTicket(r); document.getElementById("sup-detail").scrollIntoView({ behavior: "smooth", block: "start" }); }
};

let topicRows = [];
function showTopicForm(on, r) {
  const form = document.getElementById("sq-form");
  form.classList.toggle("hide", !on);
  if (!on) return;
  document.getElementById("sq-id").value = r ? r.id : "";
  document.getElementById("sq-group").value = r ? r.group || "" : "";
  document.getElementById("sq-question").value = r ? r.question : "";
  document.getElementById("sq-answer").value = r ? r.answer || "" : "";
  document.getElementById("sq-audience").value = r ? r.audience || "all" : "all";
  document.getElementById("sq-answer-wrap").classList.toggle("hide", !!(r && r.isOther));
  const msg = document.getElementById("sq-msg");
  msg.className = "muted";
  msg.textContent = r && r.isOther ? "This opens the message box directly, so it has no answer." : "";
  document.getElementById("sq-question").focus();
}
async function loadTopics() {
  topicRows = (await api("/api/admin/support/topics")).topics;
  const last = topicRows.filter((t) => !t.isOther).length - 1;
  let i = -1;
  table(document.getElementById("sq-table"), [
    { label: "Order", cell: (r) => { if (r.isOther) return '<span class="muted">Last</span>'; i += 1;
      return '<button type="button" class="ghost icon-btn w" aria-label="Move up" data-sq-move="up" data-id="' + esc(r.id) + '"' + (i === 0 ? " disabled" : "") + ">↑</button> "
        + '<button type="button" class="ghost icon-btn w" aria-label="Move down" data-sq-move="down" data-id="' + esc(r.id) + '"' + (i === last ? " disabled" : "") + ">↓</button>"; } },
    { label: "Topic", cell: (r) => esc(r.group || "—") },
    { label: "Question", cell: (r) => esc(r.question) },
    { label: "Shown to", cell: (r) => esc(AUD[r.audience] || r.audience) },
    { label: "Status", cell: (r) => badge(r.enabled ? "on" : "off") },
    { label: "Solved", cell: (r) => r.isOther ? "—" : esc(r.solvedCount) },
    { label: "", cell: (r) => '<button type="button" class="ghost w" data-sq-edit="' + esc(r.id) + '">Edit</button>'
      + (r.isOther ? "" : ' <button type="button" class="ghost w" data-sq-toggle="' + esc(r.id) + '" data-on="' + (r.enabled ? "0" : "1") + '">' + (r.enabled ? "Hide" : "Show") + "</button>"
      + ' <button type="button" class="ghost w" data-sq-del="' + esc(r.id) + '">Delete</button>') }
  ], topicRows);
}
document.getElementById("sq-open").onclick = () => showTopicForm(true);
document.getElementById("sq-cancel").onclick = () => showTopicForm(false);
document.getElementById("sq-save").onclick = async () => {
  const id = document.getElementById("sq-id").value;
  const msg = document.getElementById("sq-msg");
  try {
    await api(id ? "/api/admin/support/topics/" + id : "/api/admin/support/topics", { body: {
      group: document.getElementById("sq-group").value,
      question: document.getElementById("sq-question").value,
      answer: document.getElementById("sq-answer").value,
      audience: document.getElementById("sq-audience").value
    } });
    showTopicForm(false);
    await loadTopics();
  } catch (e) { msg.className = "err"; msg.textContent = e.message; }
};
document.getElementById("sq-table").onclick = async (e) => {
  const edit = e.target.closest("[data-sq-edit]");
  const tog = e.target.closest("[data-sq-toggle]");
  const del = e.target.closest("[data-sq-del]");
  const move = e.target.closest("[data-sq-move]");
  try {
    if (edit) { showTopicForm(true, topicRows.find((t) => t.id === edit.dataset.sqEdit)); return; }
    if (tog) await api("/api/admin/support/topics/" + tog.dataset.sqToggle + "/toggle", { body: { enabled: tog.dataset.on === "1" } });
    if (move) await api("/api/admin/support/topics/" + move.dataset.id + "/move", { body: { dir: move.dataset.sqMove } });
    if (del) {
      if (del.dataset.armed !== "1") { del.dataset.armed = "1"; del.textContent = "Confirm delete"; del.classList.add("danger"); return; }
      await api("/api/admin/support/topics/" + del.dataset.sqDel + "/delete", { body: {} });
    }
    if (tog || move || del) await loadTopics();
  } catch (err) { alert(err.message); }
};

let visitPage = 1;
let visitOn = true;
let visitSort = { key: "createdAt", dir: -1 };
let visitTimer = null;
function place(r) {
  return [r.city, r.state, r.country].filter(Boolean).join(", ") || "Unknown";
}
async function loadVisits() {
  const qs = new URLSearchParams({
    page: visitPage, size: 20, sort: visitSort.key, dir: visitSort.dir > 0 ? "asc" : "desc",
    q: document.getElementById("v-q").value.trim(),
    source: document.getElementById("v-source").value,
    device: document.getElementById("v-device").value
  });
  const d = await api("/api/admin/visits?" + qs);
  visitOn = d.enabled;
  const btn = document.getElementById("visit-toggle");
  btn.textContent = visitOn ? "Turn off recording" : "Turn on recording";
  btn.className = visitOn ? "ghost" : "btn";
  document.getElementById("visit-msg").textContent = visitOn ? "Recording is on." : "Recording is off. New visits are not saved.";
  document.getElementById("visit-stats").innerHTML = [
    [d.total, "Total visits"],
    [d.today, "Today"],
    [d.places.length ? place(d.places[0]) : "None yet", "Top place"]
  ].map(([v, k]) => `<div class="stat stat-static"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join("");
  table(document.getElementById("visit-places"), [
    { label: "Place", cell: (r) => esc(place(r)) },
    { label: "Visits", cell: (r) => esc(r.count) },
    { label: "Last visit", cell: (r) => esc(when(r.last)) }
  ], d.places);
  const visitCols = [
    { sort: "createdAt", newestFirst: true, label: "When", cell: (r) => esc(when(r.createdAt)) },
    { sort: "locality", label: "Area", cell: (r) => esc(r.locality && r.locality !== r.city ? r.locality : "") },
    { sort: "city", label: "City", cell: (r) => esc(r.city) },
    { sort: "state", label: "State", cell: (r) => esc(r.state) },
    { sort: "country", label: "Country", cell: (r) => esc(r.country) },
    { sort: "postcode", label: "Postcode", cell: (r) => esc(r.postcode) },
    { label: "Lat", cell: (r) => esc(r.lat) },
    { label: "Long", cell: (r) => esc(r.lng) },
    { sort: "source", label: "Source", cell: (r) => r.source === "gps"
      ? '<span class="badge">GPS' + (r.accuracy != null ? " ±" + esc(r.accuracy) + " m" : "") + "</span>"
      : '<span class="badge warn">Network</span>' },
    { sort: "device", label: "Device", cell: (r) => esc(r.device) },
    { sort: "page", label: "Page", cell: (r) => esc(r.page) }
  ];
  const visitsEl = document.getElementById("visits");
  table(visitsEl, visitCols, d.rows);
  sortHeads(visitsEl, visitCols, visitSort, (s) => { visitSort = s; visitPage = 1; loadVisits().catch(() => {}); });
  const matched = d.matched != null ? d.matched : d.total;
  const pages = Math.max(1, Math.ceil(matched / d.size));
  if (visitPage > pages) { visitPage = pages; return loadVisits(); }
  const pager = document.getElementById("visit-pager");
  pager.innerHTML = d.total
    ? pagerHtml("visit", visitPage, pages, matched + (matched !== d.total ? " of " + d.total : "") + " visits")
    : "";
  const prev = document.getElementById("visit-prev");
  const next = document.getElementById("visit-next");
  if (prev) prev.onclick = () => { visitPage -= 1; loadVisits().catch(() => {}); };
  if (next) next.onclick = () => { visitPage += 1; loadVisits().catch(() => {}); };
}
["v-q", "v-source", "v-device"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    clearTimeout(visitTimer);
    visitTimer = setTimeout(() => { visitPage = 1; loadVisits().catch(() => {}); }, id === "v-q" ? 300 : 0);
  });
});
document.getElementById("visit-toggle").onclick = async () => {
  const msg = document.getElementById("visit-msg");
  try {
    await api("/api/admin/visits/toggle", { body: { enabled: !visitOn } });
    await loadVisits();
  } catch (e) {
    msg.className = "err";
    msg.textContent = e.message;
  }
};

async function load() {
  await loadMe();
  const data = await api("/api/admin/data");
  const s = data.stats;
  document.getElementById("stats").innerHTML = [
    ["support", s.support],
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
  ].filter(([k, v]) => v != null && canSee(k)).map(([k, v]) => `<button type="button" class="stat" data-section="${esc(k)}"><b>${esc(v)}</b><span>${esc(LABELS[k] || k)}</span></button>`).join("");
  if (canSee("visits")) api("/api/admin/visits?size=1").then((v) => {
    document.getElementById("stats").insertAdjacentHTML("afterbegin", `<button type="button" class="stat" data-section="visits"><b>${esc(v.total)}</b><span>Visitors · ${esc(v.today)} today</span></button>`);
  }).catch(() => {});
  userRows = data.users || [];
  paintUsers();
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
    { label: "Food", cell: (r) => esc(r.listing) },
    { label: "From", cell: (r) => esc(r.from) },
    { label: "To", cell: (r) => esc(r.to) },
    { label: "Rating", cell: (r) => esc(r.rating) + " / 5" },
    { label: "Comment", cell: (r) => esc(r.comment) },
    { label: "When", cell: (r) => esc(when(r.createdAt)) }
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
      '<button type="button" class="ghost w" data-edit-partner="' + esc(r.id) + '">Edit</button> '
      + '<button type="button" class="ghost w" data-toggle-partner="' + esc(r.id) + '" data-on="' + (r.enabled ? "0" : "1") + '">' + (r.enabled ? "Disable" : "Enable") + "</button> "
      + '<button type="button" class="ghost w" data-del-partner="' + esc(r.id) + '">Delete</button>' }
  ], data.partners || []);
  staffRows = data.staff || [];
  paintStaff();
}

// ---- Admin roles: what the logged-in admin can see and change ----
let ME = null;
let staffRows = [];
let staffEditId = "";
const sectionLabel = (s) => {
  const b = document.querySelector('.menu-item[data-section="' + s + '"]');
  return b ? b.textContent.trim() : LABELS[s] || s;
};
const isSuper = () => !ME || ME.role === "super";
function canSee(s) {
  if (isSuper() || s === "overview") return true;
  if (s === "staff") return false;
  return ME.perms[s] === "read" || ME.perms[s] === "write";
}
function canWrite(s) {
  return isSuper() || ME.perms[s] === "write";
}
async function loadMe() {
  ME = await api("/api/admin/me");
  const who = document.getElementById("who");
  who.textContent = (ME.name ? ME.name + " (" + ME.username + ")" : ME.username) + " · " + (ME.role === "super" ? "Super admin" : "Staff");
  who.classList.remove("hide");
  document.querySelectorAll(".menu-item[data-section]").forEach((b) => b.classList.toggle("hide", !canSee(b.dataset.section)));
  document.querySelectorAll(".panel[data-panel]").forEach((p) => {
    const s = p.dataset.panel;
    const ro = s !== "overview" && canSee(s) && !canWrite(s);
    p.classList.toggle("ro", ro);
    let note = p.querySelector(".ro-note");
    if (ro && !note) {
      note = document.createElement("p");
      note.className = "ro-note";
      note.textContent = "View only — ask a super admin for write access.";
      p.querySelector("h2").insertAdjacentElement("afterend", note);
    }
    if (note) note.classList.toggle("hide", !ro);
    if (s === "home") p.querySelectorAll("input,textarea,select").forEach((el) => { el.disabled = ro; });
  });
}

function permText(r) {
  if (r.role === "super") return "Everything";
  const parts = Object.entries(r.perms || {}).map(([k, v]) => sectionLabel(k) + (v === "write" ? " (write)" : ""));
  return parts.length ? parts.join(", ") : "No menus";
}

function paintStaff() {
  const el = document.getElementById("staff");
  if (!el) return;
  table(el, [
    { label: "Name", cell: (r) => esc(r.name || "—") + (ME && r.id === ME.id ? ' <span class="badge">you</span>' : "") },
    { label: "Username", cell: (r) => esc(r.username) },
    { label: "Type", cell: (r) => badge(r.role === "super" ? "super admin" : "staff") },
    { label: "Access", cell: (r) => esc(permText(r)) },
    { label: "Created", cell: (r) => esc(when(r.createdAt)) },
    { label: "", cell: (r) => '<button type="button" class="ghost" data-staff-edit="' + esc(r.id) + '">Edit</button>'
      + (ME && r.id === ME.id ? "" : ' <button type="button" class="ghost" data-staff-del="' + esc(r.id) + '">Delete</button>') }
  ], staffRows);
}

function permRows(perms) {
  const sections = (ME && ME.sections) || [];
  document.getElementById("staff-perm-rows").innerHTML = sections.map((s) => {
    const v = (perms || {})[s] || "none";
    return '<div class="perm-row"><span>' + esc(sectionLabel(s)) + '</span><span class="seg" role="radiogroup" aria-label="' + esc(sectionLabel(s)) + '">'
      + ["none", "read", "write"].map((lv) => '<label><input type="radio" name="perm-' + esc(s) + '" value="' + lv + '"' + (v === lv ? " checked" : "") + "><span>" + lv[0].toUpperCase() + lv.slice(1) + "</span></label>").join("")
      + "</span></div>";
  }).join("");
}

function readPerms() {
  const out = {};
  ((ME && ME.sections) || []).forEach((s) => {
    const c = document.querySelector('input[name="perm-' + s + '"]:checked');
    if (c && c.value !== "none") out[s] = c.value;
  });
  return out;
}

function showStaffForm(on, r) {
  const form = document.getElementById("staff-form");
  form.classList.toggle("hide", !on);
  document.getElementById("staff-open").classList.toggle("hide", on);
  if (!on) return;
  staffEditId = r ? r.id : "";
  document.getElementById("staff-form-title").textContent = r ? "Edit " + (r.name || r.username) : "Add admin";
  const user = document.getElementById("staff-user");
  user.value = r ? r.username : "";
  user.readOnly = !!r;
  document.getElementById("staff-name").value = r ? r.name || "" : "";
  document.getElementById("staff-pass").value = "";
  document.getElementById("staff-pass-label").textContent = r ? "New password (leave blank to keep)" : "Password";
  document.getElementById("staff-role").value = r ? r.role : "staff";
  permRows(r ? r.perms : {});
  document.getElementById("staff-perms").classList.toggle("hide", document.getElementById("staff-role").value === "super");
  const msg = document.getElementById("staff-msg");
  msg.className = "muted";
  msg.textContent = "";
  (r ? document.getElementById("staff-name") : user).focus();
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
document.getElementById("refresh").onclick = () => load()
  .then(() => {
    const on = (n) => !document.querySelector('[data-panel="' + n + '"]').classList.contains("hide");
    if (on("visits")) return loadVisits();
    if (on("support")) return loadSupport();
    if (on("support_topics")) return loadTopics();
  })
  .catch((e) => alert(e.message));
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
        city: document.getElementById("home-city").value,
        headline,
        tagline: document.getElementById("home-tagline").value,
        proof: document.getElementById("home-proof").value,
        banner,
        howTitle: document.getElementById("home-how-title").value,
        steps: [0, 1, 2].map((i) => ({
          title: document.getElementById("home-s" + i + "-title").value,
          text: document.getElementById("home-s" + i + "-text").value
        })),
        aboutTitle: document.getElementById("home-about-title").value,
        aboutText: document.getElementById("home-about-text").value,
        points: [0, 1, 2].map((i) => ({
          title: document.getElementById("home-p" + i + "-title").value,
          text: document.getElementById("home-p" + i + "-text").value
        })),
        faqTitle: document.getElementById("home-faq-title").value,
        faqs: [0, 1, 2].map((i) => ({
          q: document.getElementById("home-f" + i + "-q").value,
          a: document.getElementById("home-f" + i + "-a").value
        })),
        footer: document.getElementById("home-footer").value
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
document.getElementById("staff-open").onclick = () => showStaffForm(true);
document.getElementById("staff-cancel").onclick = () => showStaffForm(false);
document.getElementById("staff-role").onchange = (e) => {
  document.getElementById("staff-perms").classList.toggle("hide", e.target.value === "super");
};
document.getElementById("staff-perms").onclick = (e) => {
  const b = e.target.closest("[data-perm-all]");
  if (!b) return;
  document.querySelectorAll('#staff-perm-rows input[value="' + b.dataset.permAll + '"]').forEach((i) => { i.checked = true; });
};
document.getElementById("staff-save").onclick = async () => {
  const msg = document.getElementById("staff-msg");
  msg.className = "muted";
  const body = {
    name: document.getElementById("staff-name").value,
    role: document.getElementById("staff-role").value,
    perms: readPerms(),
    password: document.getElementById("staff-pass").value
  };
  try {
    if (staffEditId) {
      await api("/api/admin/staff/" + encodeURIComponent(staffEditId), { body });
    } else {
      await api("/api/admin/staff", { body: { ...body, username: document.getElementById("staff-user").value } });
    }
    showStaffForm(false);
    await load();
  } catch (e) {
    msg.className = "err";
    msg.textContent = e.message;
  }
};
document.getElementById("staff").onclick = async (e) => {
  const ed = e.target.closest("[data-staff-edit]");
  if (ed) return showStaffForm(true, staffRows.find((r) => r.id === ed.dataset.staffEdit));
  const del = e.target.closest("[data-staff-del]");
  if (!del) return;
  const r = staffRows.find((x) => x.id === del.dataset.staffDel);
  if (!r || !confirm("Delete admin " + (r.name || r.username) + "? They will be logged out.")) return;
  try {
    await api("/api/admin/staff/" + encodeURIComponent(r.id) + "/delete", { body: {} });
    await load();
  } catch (err) { alert(err.message); }
};
document.getElementById("out").onclick = () => {
  localStorage.removeItem(KEY);
  ME = null;
  document.getElementById("who").classList.add("hide");
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
