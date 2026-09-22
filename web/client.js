const API = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:4000"
  : "https://bhojaa-production.up.railway.app";

const SP = {
  apiUrl: API,
  token() { return localStorage.getItem("sp_token") || ""; },
  user() { try { return JSON.parse(localStorage.getItem("sp_user") || "null"); } catch { return null; } },
  setSession(token, user) {
    localStorage.setItem("sp_token", token);
    let place = null;
    try { place = JSON.parse(localStorage.getItem("sp_place") || "null"); } catch {}
    localStorage.setItem("sp_user", JSON.stringify(this.mergePlace(user, place)));
  },
  clearSession() {
    localStorage.removeItem("sp_token");
    localStorage.removeItem("sp_user");
    localStorage.removeItem("sp_place");
    try { sessionStorage.clear(); } catch {}
  },
  pin(lat, lng) {
    return {
      lat: Math.round(Number(lat) * 10000) / 10000,
      lng: Math.round(Number(lng) * 10000) / 10000
    };
  },
  thinAddr(s) {
    const t = String(s || "").trim().toLowerCase();
    return !t || t === "koramangala, bengaluru";
  },
  mergePlace(user, pos) {
    if (!user) user = {};
    if (!pos) return user;
    const u = { ...user };
    if (Number.isFinite(Number(pos.lat))) u.lat = pos.lat;
    if (Number.isFinite(Number(pos.lng))) u.lng = pos.lng;
    if (pos.city) u.city = pos.city;
    if (pos.state) u.state = pos.state;
    if (pos.country) u.country = pos.country;
    if (pos.address && this.thinAddr(u.address)) u.address = pos.address;
    return u;
  },
  async placeOf(lat, lng) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch(
        "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="
          + lat + "&longitude=" + lng + "&localityLanguage=en",
        { signal: ctrl.signal }
      );
      const d = await r.json();
      const city = d.city || d.locality || "";
      const state = d.principalSubdivision || "";
      const country = d.countryName || "";
      const adm = ((d.localityInfo || {}).administrative || [])
        .slice()
        .sort((a, b) => (b.adminLevel || 0) - (a.adminLevel || 0));
      const area = (adm.map((a) => a && a.name).find((n) => n && n !== city && n !== state && n !== country)) || "";
      return { city, state, country, address: area || city };
    } catch {
      return {};
    } finally {
      clearTimeout(t);
    }
  },
  locate() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        async (p) => {
          const pos = this.pin(p.coords.latitude, p.coords.longitude);
          const out = { ...pos, ...(await this.placeOf(pos.lat, pos.lng)) };
          try { localStorage.setItem("sp_place", JSON.stringify(out)); } catch {}
          resolve(out);
        },
        () => resolve(null),
        { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
      );
    });
  },
  async logout() {
    try { await this.api("/api/logout", { body: {}, allow401: true }); } catch {}
    this.clearSession();
    location.href = "login.html";
  },
  async api(path, opts = {}) {
    const headers = {};
    if (this.token()) headers.Authorization = "Bearer " + this.token();
    if (opts.body) headers["Content-Type"] = "application/json";
    const res = await fetch(this.apiUrl + path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers,
      cache: "no-store",
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !opts.allow401) {
      this.clearSession();
      location.href = "login.html";
      throw new Error("Login required");
    }
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  qs(name) { return new URLSearchParams(location.search).get(name); },
  left(min) {
    if (min <= 0) return "Expired";
    if (min < 60) return min + " min left";
    return Math.round(min / 60) + " hr left";
  },
  when(t) {
    if (t == null || t === "") return "—";
    const d = new Date(typeof t === "number" && t < 1e12 ? t * 1000 : t);
    if (!Number.isFinite(d.getTime())) return "—";
    const date = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return date + ", " + time;
  },
  who(name, phone) {
    const n = name || "Neighbor";
    return phone ? n + " · " + phone : n;
  },
  statusLabel(s) {
    return ({ requested: "Waiting", accepted: "Accepted", collected: "Collected", declined: "Declined", open: "Open", reserved: "Reserved", done: "Done", matched: "Matched", expired: "Expired" })[s] || s;
  }
};

function role() {
  return (SP.user() || {}).role || "";
}

function home() {
  return role() === "giver" ? "provider.html" : "app.html";
}

const PAGE = 10;
function takeMore(rows, n) {
  const all = rows || [];
  const take = Math.min(Math.max(PAGE, n || PAGE), all.length);
  return { rows: all.slice(0, take), shown: take, total: all.length, more: take < all.length };
}
function moreBar(key, shown, total) {
  if (!total) return "";
  if (shown >= total) return `<p class="muted pager-meta">${total} item${total === 1 ? "" : "s"}</p>`;
  return `<p class="muted pager-meta" data-more="${key}">${shown} of ${total}</p>`;
}
function watchMore(root, onMore) {
  (root.querySelectorAll("[data-more]") || []).forEach((el) => {
    const io = new IntersectionObserver((entries) => {
      if (entries[0] && entries[0].isIntersecting) {
        io.disconnect();
        onMore(el.dataset.more);
      }
    }, { rootMargin: "180px" });
    io.observe(el);
  });
}

function bindWhenPicker(rootId, hiddenId, btnId) {
  const root = document.getElementById(rootId);
  const hidden = document.getElementById(hiddenId);
  const btn = document.getElementById(btnId);
  if (!root || !hidden || !btn) return;
  const pop = root.querySelector(".when-pop");
  const cal = root.querySelector(".when-cal");
  const times = root.querySelector(".when-times");
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tom = new Date(today);
  tom.setDate(tom.getDate() + 1);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let selected = new Date(Date.now() + 60 * 60 * 1000);
  selected.setSeconds(0, 0);
  if (selected.getMinutes() > 30) { selected.setHours(selected.getHours() + 1); selected.setMinutes(0); }
  else if (selected.getMinutes() > 0) selected.setMinutes(30);
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function label() {
    const t = selected.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const d = sameDay(selected, today) ? "Today" : sameDay(selected, tom) ? "Tomorrow" : selected.toLocaleDateString();
    return d + ", " + t;
  }
  function apply() {
    hidden.value = selected.toISOString();
    btn.textContent = label();
  }
  function draw() {
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1);
    const start = (first.getDay() + 6) % 7;
    const dim = new Date(y, m + 1, 0).getDate();
    const thisMonth = today.getFullYear() === y && today.getMonth() === m;
    let days = "";
    for (let i = 0; i < start; i++) days += "<span></span>";
    for (let d = 1; d <= dim; d++) {
      const dt = new Date(y, m, d);
      const ok = dt.getTime() >= today.getTime();
      const on = sameDay(dt, selected) ? " on" : "";
      days += `<button type="button" data-day="${d}" class="${on}" ${ok ? "" : "disabled"}>${d}</button>`;
    }
    cal.innerHTML = `<h4><button type="button" class="when-nav" id="prev-m" ${thisMonth ? "disabled" : ""}>‹</button>${names[m]} ${y}<button type="button" class="when-nav" id="next-m">›</button></h4><div class="when-week"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div><div class="when-days">${days}</div>`;
    const prev = cal.querySelector("#prev-m");
    const next = cal.querySelector("#next-m");
    if (prev) prev.onclick = (e) => { e.stopPropagation(); view.setMonth(view.getMonth() - 1); draw(); };
    if (next) next.onclick = (e) => { e.stopPropagation(); view.setMonth(view.getMonth() + 1); draw(); };
    cal.querySelectorAll("[data-day]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        selected.setFullYear(y, m, Number(b.dataset.day));
        if (selected.getTime() <= Date.now()) {
          const n = new Date(Date.now() + 30 * 60 * 1000);
          selected.setHours(n.getHours(), n.getMinutes() >= 30 ? 30 : 0, 0, 0);
          if (selected.getTime() <= Date.now()) selected.setMinutes(selected.getMinutes() + 30);
        }
        apply();
        draw();
      };
    });
    let slots = "";
    for (let h = 6; h <= 23; h++) {
      for (const min of [0, 30]) {
        if (h === 23 && min === 30) continue;
        const slot = new Date(selected);
        slot.setHours(h, min, 0, 0);
        const past = slot.getTime() <= Date.now();
        const on = slot.getHours() === selected.getHours() && slot.getMinutes() === selected.getMinutes() && !past;
        const txt = slot.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        slots += `<button type="button" data-h="${h}" data-m="${min}" class="${on ? "on" : ""}" ${past ? "disabled" : ""}>${txt}</button>`;
      }
    }
    times.innerHTML = slots;
    times.querySelectorAll("button[data-h]").forEach((b) => {
      if (b.disabled) return;
      b.onclick = (e) => {
        e.stopPropagation();
        selected.setHours(Number(b.dataset.h), Number(b.dataset.m), 0, 0);
        apply();
        draw();
      };
    });
    const focus = times.querySelector("button.on") || times.querySelector("button:not([disabled])");
    if (focus) times.scrollTop = Math.max(0, focus.offsetTop - 24);
  }
  apply();
  const applyBtn = root.querySelector(".when-apply");
  if (applyBtn) applyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    apply();
    pop.classList.add("hide");
  };
  btn.onclick = (e) => {
    e.stopPropagation();
    if (pop.classList.contains("hide")) {
      pop.classList.remove("hide");
      draw();
    } else pop.classList.add("hide");
  };
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) pop.classList.add("hide");
  });
}

function requireAuth() {
  if (!SP.token()) {
    location.href = "login.html";
    return false;
  }
  return true;
}

function paintNav() {
  const nav = document.querySelector(".nav");
  const r = role();
  const page = document.body.dataset.page;
  const top = document.querySelector(".top");
  if (top) {
    const box = top.querySelector(".mode-toggle");
    if (box) box.remove();
  }
  const logo = document.querySelector(".logo");
  if (logo && !logo.querySelector(".mode")) {
    const chip = document.createElement("a");
    chip.className = "badge mode";
    chip.href = "role.html";
    chip.textContent = r === "giver" ? "Give" : r === "seeker" ? "Need" : "";
    if (chip.textContent) logo.appendChild(chip);
  } else if (logo) {
    const chip = logo.querySelector(".mode");
    if (chip) chip.textContent = r === "giver" ? "Give" : r === "seeker" ? "Need" : "";
  }
  if (!nav) return;
  if (r === "giver") {
    nav.innerHTML = `<a class="${page === "give" ? "on" : ""}" href="provider.html">Give</a><a class="${page === "mine" || page === "listing" || page === "order" ? "on" : ""}" href="mine.html">Mine</a><a class="${page === "profile" ? "on" : ""}" href="profile.html">Account</a>`;
  } else {
    nav.innerHTML = `<a class="${page === "nearby" || page === "listing" ? "on" : ""}" href="app.html">Nearby</a><a class="${page === "need" ? "on" : ""}" href="need.html">Need</a><a class="${page === "mine" || page === "order" ? "on" : ""}" href="mine.html">Mine</a><a class="${page === "profile" ? "on" : ""}" href="profile.html">Account</a>`;
  }
}

function requireMode(need) {
  if (!requireAuth()) return false;
  const r = role();
  if (r !== "seeker" && r !== "giver") {
    location.href = "role.html";
    return false;
  }
  if (need && r !== need) {
    location.href = home();
    return false;
  }
  paintNav();
  return true;
}

async function pickRole(next) {
  const user = await SP.api("/api/me", { body: { role: next } });
  SP.setSession(SP.token(), user);
  location.href = next === "giver" ? "provider.html" : "app.html";
}

async function pageLogin() {
  const msg = document.getElementById("msg");
  const phone = document.getElementById("phone");
  const otp = document.getElementById("otp");
  const box = document.getElementById("otp-box");
  const go = document.getElementById("go");
  const resend = document.getElementById("resend");
  const timer = document.getElementById("timer");
  let step = "phone";
  let tick = null;
  function countdown(sec) {
    resend.classList.add("hide");
    let left = sec;
    timer.textContent = "Resend OTP in " + left + "s";
    clearInterval(tick);
    tick = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(tick);
        timer.textContent = "";
        resend.classList.remove("hide");
      } else timer.textContent = "Resend OTP in " + left + "s";
    }, 1000);
  }
  async function requestOtp() {
    if (phone.value.length !== 10) {
      msg.className = "err";
      msg.textContent = "Enter a 10-digit phone";
      return false;
    }
    msg.className = "muted";
    try {
      const data = await SP.api("/api/otp", { body: { phone: phone.value }, allow401: true });
      msg.textContent = data.message;
      box.classList.remove("hide");
      go.textContent = "Login";
      step = "otp";
      otp.value = "";
      otp.focus();
      countdown(data.resendIn || 30);
      return true;
    } catch (e) {
      msg.className = "err";
      msg.textContent = e.message;
      return false;
    }
  }
  phone.addEventListener("input", () => {
    phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
    if (step === "otp") {
      step = "phone";
      box.classList.add("hide");
      go.textContent = "Continue";
      msg.textContent = "";
      clearInterval(tick);
      timer.textContent = "";
      resend.classList.add("hide");
    }
  });
  otp.addEventListener("input", () => {
    otp.value = otp.value.replace(/\D/g, "").slice(0, 4);
  });
  resend.onclick = () => requestOtp();
  go.onclick = async () => {
    if (step === "phone") return requestOtp();
    if (otp.value.length !== 4) {
      msg.className = "err";
      msg.textContent = "Enter the 4-digit OTP";
      return;
    }
    msg.className = "muted";
    try {
      const pos = (await SP.locate()) || {};
      const data = await SP.api("/api/login", { body: { phone: phone.value, otp: otp.value, ...pos }, allow401: true });
      try { sessionStorage.clear(); } catch {}
      SP.setSession(data.token, data.user);
      const want = SP.qs("want");
      if (want === "seeker" || want === "giver") {
        await pickRole(want);
        return;
      }
      location.href = "role.html";
    } catch (e) { msg.className = "err"; msg.textContent = e.message; }
  };
}

async function pageRole() {
  if (!requireAuth()) return;
  const msg = document.getElementById("msg");
  document.getElementById("need").onclick = () => pickRole("seeker").catch((e) => { msg.textContent = e.message; });
  document.getElementById("give").onclick = () => pickRole("giver").catch((e) => { msg.textContent = e.message; });
  const out = document.getElementById("out");
  if (out) out.onclick = () => SP.logout();
}

async function pageNearby() {
  if (!requireMode("seeker")) return;
  const grid = document.getElementById("grid");
  const kmBox = document.getElementById("km");
  const dietBox = document.getElementById("diet");
  const count = document.getElementById("count");
  let km = Number(localStorage.getItem("sp_km") || 1);
  let diet = localStorage.getItem("sp_diet") || "all";
  if (![1, 2, 5, 10].includes(km)) km = 1;
  if (!["all", "veg", "nonveg"].includes(diet)) diet = "all";
  function paint() {
    kmBox.querySelectorAll("[data-km]").forEach((b) => b.classList.toggle("on", Number(b.dataset.km) === km));
    dietBox.querySelectorAll("[data-diet]").forEach((b) => b.classList.toggle("on", b.dataset.diet === diet));
  }
  async function load() {
    try {
      const pos = await SP.locate();
      if (pos) {
        const me = await SP.api("/api/me", { body: pos });
        SP.setSession(SP.token(), me);
      }
      const q = pos ? "&lat=" + pos.lat + "&lng=" + pos.lng : "";
      const data = await SP.api("/api/listings?km=" + km + q);
      let rows = (data.listings || []).filter((l) => l.minLeft > 0 && Number(l.distance) <= km);
      if (diet !== "all") rows = rows.filter((l) => (l.diet || "veg") === diet);
      count.textContent = rows.length ? rows.length + " meal" + (rows.length === 1 ? "" : "s") + " within " + km + " km" : "";
      if (!rows.length) {
        const n = data.nearest;
        const extra = n
          ? ` Nearest is ${n.name} at ${n.distance} km.${n.mine ? " That is your listing." : " Update location in Account."}`
          : "";
        grid.innerHTML = `<div class="card"><div class="pad"><p class="muted">No food within ${km} km${diet === "all" ? "" : " for " + diet}.${extra}</p></div></div>`;
        return;
      }
      rows.forEach((l) => { try { sessionStorage.setItem("sp_listing_" + l.id, JSON.stringify(l)); } catch {} });
      const qBox = document.getElementById("q");
      let shown = PAGE;
      function filtered() {
        const q = ((qBox && qBox.value) || "").trim().toLowerCase();
        return q ? rows.filter((l) => (l.name || "").toLowerCase().includes(q)) : rows;
      }
      function paintRows() {
        const list = filtered();
        const s = takeMore(list, shown);
        shown = s.shown;
        grid.innerHTML = s.rows.map(extraFoodCard).join("") + moreBar("near", s.shown, s.total);
        watchMore(grid, () => { shown += PAGE; paintRows(); });
      }
      if (qBox) qBox.oninput = () => { shown = PAGE; paintRows(); };
      paintRows();
    } catch (e) {
      count.textContent = "";
      grid.innerHTML = `<div class="card"><div class="pad"><p class="err">${e.message}</p></div></div>`;
    }
  }
  kmBox.onclick = (e) => {
    const btn = e.target.closest("[data-km]");
    if (!btn) return;
    km = Number(btn.dataset.km);
    localStorage.setItem("sp_km", String(km));
    paint();
    load();
  };
  dietBox.onclick = (e) => {
    const btn = e.target.closest("[data-diet]");
    if (!btn) return;
    diet = btn.dataset.diet;
    localStorage.setItem("sp_diet", diet);
    paint();
    load();
  };
  paint();
  await load();
}

async function pageListing() {
  if (!requireMode()) return;
  const id = SP.qs("id");
  const root = document.getElementById("root");
  if (!id) { root.innerHTML = "<p>Missing listing.</p>"; return; }
  let data = null;
  try {
    const raw = sessionStorage.getItem("sp_listing_" + id);
    if (raw) data = { listing: JSON.parse(raw), requests: [], orderId: null };
  } catch {}
  try {
    data = await SP.api("/api/listings/" + id);
  } catch (e) {
    if (!data || !data.listing) {
      root.innerHTML = `<p class="muted">Could not open this listing.</p><p><a href="${home()}">← Back</a></p>`;
      return;
    }
  }
  try {
    const l = data.listing;
    if (!l) throw new Error("missing");
    const giver = role() === "giver";
    let action = "";
    if (giver && l.mine) {
      const reqs = data.requests || [];
      action = reqs.length
        ? reqs.map((o) => `<button class="btn" type="button" data-accept="${o.id}">Accept pickup request</button>`).join("")
        : '<p class="muted">Waiting for a pickup request.</p><p style="margin-top:10px"><a class="btn" href="mine.html">Open Mine</a></p>';
    } else if (giver) {
      action = '<p class="muted">You are in Give mode.</p><p style="margin-top:10px"><a class="btn" href="role.html">Switch to Need</a></p>';
    } else if (l.mine) {
      action = '<span class="muted">This is your listing.</span>';
    } else {
      action = `<button class="btn" id="req" type="button">${data.orderId ? "Open request" : "Request this food"}</button>`;
    }
    root.innerHTML = `
      <p><a href="${home()}">← Back</a></p>
      <div class="card">
        <img src="${l.image}" alt="">
        <div class="pad">
          <div class="row"><h1>${l.name}</h1><span class="badge">${(l.diet || "veg").toUpperCase()}</span></div>
          <p class="meta">${l.servings} servings · ${l.category} · ${l.distance} km · free pickup</p>
          <p class="meta">${l.given || 0} pickups done on this listing · ${l.waiting || 0} waiting</p>
          <p class="meta">Giver completed ${l.providerGiven || 0} · you collected ${l.myCollected || 0}</p>
          <p style="margin:12px 0">${l.note || ""}</p>
          <p class="muted">Exact house number is shown only after the giver accepts.</p>
          <p class="row" style="margin-top:16px">${action}</p>
          <p id="msg" class="ok"></p>
        </div>
      </div>`;
    const btn = document.getElementById("req");
    if (btn) btn.onclick = async () => {
      try {
        const r = await SP.api("/api/listings/" + id + "/request", { body: {} });
        location.href = "order.html?id=" + r.orderId;
      } catch (e) {
        document.getElementById("msg").className = "err";
        document.getElementById("msg").textContent = e.message;
      }
    };
    root.querySelectorAll("[data-accept]").forEach((b) => {
      b.onclick = async () => {
        try {
          const r = await SP.api("/api/orders/" + b.dataset.accept + "/accept", { body: {} });
          location.href = "order.html?id=" + r.order.id;
        } catch (e) {
          document.getElementById("msg").className = "err";
          document.getElementById("msg").textContent = e.message;
        }
      };
    });
  } catch (e) {
    root.innerHTML = `<p class="muted">Could not open this listing.</p><p><a href="${home()}">← Back</a></p>`;
  }
}

function extraFoodCard(l) {
  const wait = (l.waiting || 0) > 0;
  const done = l.status === "done" || (l.given || 0) > 0;
  const badge = done ? '<span class="badge">Collected</span>' : wait ? '<span class="badge time">Waiting</span>' : "";
  return `<article class="food-row">
    <img src="${l.image}" alt="">
    <div class="food-body">
      <span class="food-tag">Posted extra food</span>
      <h3>${l.name}</h3>
      <p class="food-line"><span>Servings</span><b>${l.servings}</b></p>
      <p class="food-line"><span>Available until</span><b>${SP.when(l.until)}</b></p>
      <p class="food-line"><span>Pickup requests</span><b>${(l.waiting || 0) + (l.given || 0)}</b></p>
      ${badge}
      <a class="btn food-cta" href="listing.html?id=${l.id}">Open extra food</a>
    </div>
  </article>`;
}

function nearbyNeedCard(n) {
  return `<div class="card req-card"><div class="pad">
    <div class="row"><h3>${n.what}</h3><span class="badge">${n.servings} serving${n.servings === 1 ? "" : "s"}</span></div>
    <p class="req-note muted">A neighbor nearby needs this. Accept to share your pickup address.</p>
    <div class="kv"><span>Distance</span><b>${n.distance} km</b></div>
    <div class="kv"><span>Posted</span><b>${SP.when(n.createdAt)}</b></div>
    <div class="kv"><span>Needed by</span><b>${SP.when(n.until)}</b></div>
    <div class="kv"><span>Time left</span><b>${SP.left(n.minLeft)}</b></div>
    <p class="row" style="margin-top:14px">
      <button class="btn" type="button" data-offer="${n.id}">Accept</button>
    </p>
  </div></div>`;
}

function openGiveForm(need) {
  const box = document.getElementById("give-box");
  if (!box) {
    location.href = "provider.html" + (need && need.id ? "?need=" + need.id : "");
    return;
  }
  if (need) {
    const name = document.getElementById("name");
    const servings = document.getElementById("servings");
    if (name) name.value = need.what || "";
    if (servings) servings.value = need.servings || 1;
  }
  box.classList.remove("hide");
  const openBtn = document.getElementById("open-give");
  if (openBtn) openBtn.classList.add("hide");
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindNeedOffers(root, msg, needs) {
  root.querySelectorAll("[data-offer]").forEach((b) => {
    b.onclick = async () => {
      try {
        const address = (document.getElementById("address") || {}).value || (SP.user() || {}).address || "";
        if (!address) {
          location.href = "provider.html?need=" + b.dataset.offer;
          return;
        }
        const r = await SP.api("/api/needs/" + b.dataset.offer + "/offer", { body: { address } });
        location.href = "order.html?id=" + r.orderId;
      } catch (e) {
        if (msg) { msg.className = "err"; msg.textContent = e.message; }
        else alert(e.message);
      }
    };
  });
  root.querySelectorAll("[data-give]").forEach((b) => {
    b.onclick = () => {
      const need = (needs || []).find((n) => n.id === b.dataset.give);
      openGiveForm(need || { id: b.dataset.give });
    };
  });
}

async function pageNeed() {
  if (!requireMode("seeker")) return;
  bindWhenPicker("when-picker", "when", "when-btn");
  const msg = document.getElementById("msg");
  document.getElementById("post").onclick = async () => {
    msg.className = "ok";
    try {
      const pos = (await SP.locate()) || {};
      await SP.api("/api/needs", { body: {
        what: document.getElementById("what").value,
        servings: document.getElementById("servings").value,
        untilAt: document.getElementById("when").value,
        ...pos
      }});
      location.href = "mine.html";
    } catch (e) { msg.className = "err"; msg.textContent = e.message; }
  };
}

async function pageGive() {
  if (!requireMode("giver")) return;
  const msg = document.getElementById("msg");
  const needsBox = document.getElementById("needs");
  const pos = await SP.locate();
  if (pos) {
    try {
      const updated = await SP.api("/api/me", { body: pos });
      SP.setSession(SP.token(), updated);
    } catch {}
  }
  const me = SP.user() || {};
  if (me.address) document.getElementById("address").value = me.address;
  bindWhenPicker("until-picker", "until", "until-btn");
  const giveBox = document.getElementById("give-box");
  const openGive = document.getElementById("open-give");
  const closeGive = document.getElementById("close-give");
  if (openGive) openGive.onclick = () => openGiveForm();
  if (closeGive) closeGive.onclick = () => {
    if (giveBox) giveBox.classList.add("hide");
    if (openGive) openGive.classList.remove("hide");
  };
  document.getElementById("save").onclick = async () => {
    msg.className = "ok";
    try {
      const pos = (await SP.locate()) || {};
      await SP.api("/api/listings", { body: {
        name: document.getElementById("name").value,
        category: document.getElementById("category").value,
        diet: document.getElementById("diet").value,
        servings: document.getElementById("servings").value,
        untilAt: document.getElementById("until").value,
        note: document.getElementById("note").value,
        address: document.getElementById("address").value,
        ...pos
      }});
      location.href = "provider.html";
    } catch (e) { msg.className = "err"; msg.textContent = e.message; }
  };
  const posted = document.getElementById("posted");
  if (posted) {
    try {
      const mine = await SP.api("/api/mine");
      const list = mine.listings || [];
      const qBox = document.getElementById("q");
      let shown = PAGE;
      function filtered() {
        const q = ((qBox && qBox.value) || "").trim().toLowerCase();
        return q ? list.filter((l) => (l.name || "").toLowerCase().includes(q)) : list;
      }
      function paintPosted() {
        const rows = filtered();
        if (!rows.length) {
          posted.innerHTML = '<div class="card"><div class="pad"><p class="muted">No extra food posted yet.</p></div></div>';
          return;
        }
        const s = takeMore(rows, shown);
        shown = s.shown;
        posted.innerHTML = s.rows.map(extraFoodCard).join("") + moreBar("posted", s.shown, s.total);
        watchMore(posted, () => { shown += PAGE; paintPosted(); });
      }
      if (qBox) qBox.oninput = () => { shown = PAGE; paintPosted(); };
      paintPosted();
    } catch (e) {
      posted.innerHTML = `<p class="err">${e.message}</p>`;
    }
  }
  const needId = SP.qs("need");
  try {
    const q = pos ? "?lat=" + pos.lat + "&lng=" + pos.lng + "&km=10" : "?km=10";
    const data = await SP.api("/api/needs" + q);
    const open = (data.needs || []).filter((n) => !n.mine && n.status === "open");
    if (!open.length) {
      needsBox.innerHTML = "";
    } else {
      let shown = PAGE;
      function paintNeeds() {
        const s = takeMore(open, shown);
        shown = s.shown;
        needsBox.innerHTML = s.rows.map(nearbyNeedCard).join("") + moreBar("give-needs", s.shown, s.total);
        bindNeedOffers(needsBox, msg, open);
        watchMore(needsBox, () => { shown += PAGE; paintNeeds(); });
      }
      paintNeeds();
    }
    if (needId) {
      const hit = open.find((n) => n.id === needId) || { id: needId };
      openGiveForm(hit);
    }
  } catch (e) {
    needsBox.innerHTML = `<p class="err">${e.message}</p>`;
  }
}

async function pageMine() {
  if (!requireMode()) return;
  const root = document.getElementById("root");
  try {
    const dataP = SP.api("/api/mine");
    const posP = SP.locate();
    const data = await dataP;
    const pos = await posP;
    if (pos) {
      try {
        const me = await SP.api("/api/me", { body: pos });
        SP.setSession(SP.token(), me);
      } catch {}
    }
    const incomingAll = data.listings.flatMap((l) => l.requests.filter((r) => r.status === "requested"));
    const givenAll = data.listings || [];
    const extraGiveAll = (data.orders || []).filter((o) => o.mineGive && !givenAll.some((l) => l.id === o.listingId));
    givenAll.sort((a, b) => {
      function rank(x) {
        if (x.status === "done" || (x.given || 0) > 0) return 1;
        if (x.status === "expired" || x.minLeft <= 0 || x.status === "inactive") return 2;
        return 0;
      }
      const d = rank(a) - rank(b);
      return d || (b.createdAt || 0) - (a.createdAt || 0);
    });
    const needRowsAll = [];
    {
      const needs = data.needs || [];
      const got = (data.orders || []).filter((o) => o.mineRequest);
      const seen = new Set();
      needs.forEach((n) => {
        const o = got.find((x) => String(x.needId) === String(n.id)) || null;
        if (o) seen.add(o.id);
        needRowsAll.push({ n, o });
      });
      got.forEach((o) => { if (!seen.has(o.id)) needRowsAll.push({ n: null, o }); });
    }
    let shown = { incoming: PAGE, gave: PAGE, req: PAGE };
    function bindMine() {
      bindNeedOffers(root);
      root.querySelectorAll("[data-accept]").forEach((b) => {
        b.onclick = async () => {
          try {
            await SP.api("/api/orders/" + b.dataset.accept + "/accept", { body: {} });
            location.reload();
          } catch (e) { alert(e.message); }
        };
      });
      root.querySelectorAll("[data-del-need]").forEach((b) => {
        b.onclick = async () => {
          try {
            await SP.api("/api/needs/" + b.dataset.delNeed + "/delete", { body: {} });
            location.reload();
          } catch (e) { alert(e.message); }
        };
      });
      root.querySelectorAll("[data-inactive]").forEach((b) => {
        b.onclick = async () => {
          try {
            await SP.api("/api/listings/" + b.dataset.inactive + "/inactive", { body: {} });
            location.reload();
          } catch (e) { alert(e.message); }
        };
      });
      watchMore(root, (key) => {
        shown[key] = (shown[key] || PAGE) + PAGE;
        paintMine();
      });
    }
    function paintMine() {
    const parts = [];
    if (role() === "giver") {
      const incoming = takeMore(incomingAll, shown.incoming);
      parts.push("<h2>Pickup requests</h2>");
      if (!incoming.total) parts.push('<div class="card"><div class="pad"><p class="muted">No requests yet. Wait for someone in Need mode.</p></div></div>');
      incoming.rows.forEach((o) => {
        parts.push(`<div class="card req-card"><div class="pad">
          <div class="row"><h3>${o.name}</h3><span class="badge time">Waiting</span></div>
          <p class="req-note muted">Someone nearby asked to collect this. Accept to share your address.</p>
          <div class="kv"><span>Need</span><b>${SP.who(o.seekerName, o.seeker)}</b></div>
          <div class="kv"><span>Requested</span><b>${SP.when(o.createdAt)}</b></div>
          <div class="kv"><span>Servings</span><b>${o.servings}</b></div>
          <div class="kv"><span>Available until</span><b>${SP.when(o.until)}</b></div>
          <div class="kv"><span>Status</span><b>${SP.statusLabel(o.status)}</b></div>
          <p class="row" style="margin-top:14px"><button class="btn" type="button" data-accept="${o.id}">Accept and share address</button></p>
        </div></div>`);
      });
      parts.push(moreBar("incoming", incoming.shown, incoming.total));
      parts.push("<h2>Food you gave</h2>");
      const givenCards = [];
      if (!givenAll.length && !extraGiveAll.length) givenCards.push('<div class="card"><div class="pad"><p class="muted">No food given yet. Publish a listing from <a href="provider.html">Give</a>.</p></div></div>');
      givenAll.forEach((l) => {
        const done = l.status === "done" || (l.given || 0) > 0;
        const off = l.status === "inactive";
        const expired = !done && !off && (l.status === "expired" || l.minLeft <= 0);
        const note = done ? "Pickup completed." : off ? "Inactive. Hidden from Nearby." : expired ? "Unaccepted and expired." : (l.waiting || 0) ? "Pickup request waiting." : "Visible to nearby seekers.";
        const folks = (l.history || l.requests || []);
        const whoNeed = folks.length
          ? folks.map((o) => `<div class="kv"><span>Need</span><b>${SP.who(o.seekerName, o.seeker)}</b></div><div class="kv"><span>Requested</span><b>${SP.when(o.createdAt)}</b></div>${o.acceptedAt ? `<div class="kv"><span>Accepted</span><b>${SP.when(o.acceptedAt)}</b></div>` : ""}${o.collectedAt ? `<div class="kv"><span>Collected</span><b>${SP.when(o.collectedAt)}</b></div>` : ""}`).join("")
          : '<div class="kv"><span>Need</span><b>No one yet</b></div>';
        givenCards.push(`<div class="card req-card${expired || off ? " is-expired" : ""}"><div class="pad">
          <div class="row"><h3>${l.name}</h3><span class="badge${expired || off ? " exp" : ""}">${done ? "Collected" : off ? "Inactive" : expired ? "Expired" : SP.statusLabel(l.status)}</span></div>
          <p class="req-note ${expired ? "err" : "muted"}">${note}</p>
          ${whoNeed}
          <div class="kv"><span>Posted</span><b>${SP.when(l.createdAt)}</b></div>
          <div class="kv"><span>Available until</span><b>${SP.when(l.until)}</b></div>
          <div class="kv"><span>Servings</span><b>${l.servings}</b></div>
          <div class="kv"><span>Category</span><b>${l.category || "meal"} · ${(l.diet || "veg").toUpperCase()}</b></div>
          <div class="kv"><span>Time left</span><b>${done ? "Completed" : off || expired ? "Expired" : SP.left(l.minLeft)}</b></div>
          <div class="kv"><span>Pickups</span><b>${l.given || 0} done · ${l.waiting || 0} waiting</b></div>
          ${expired ? `<p class="row" style="margin-top:14px"><button class="btn-del" type="button" data-inactive="${l.id}">Set inactive</button></p>` : ""}
        </div></div>`);
      });
      extraGiveAll.forEach((o) => {
        givenCards.push(`<div class="card req-card"><div class="pad">
          <div class="row"><h3>${o.name}</h3><span class="badge">${SP.statusLabel(o.status)}</span></div>
          <p class="req-note muted">You offered this to a neighbor.</p>
          <div class="kv"><span>Need</span><b>${SP.who(o.seekerName, o.seeker)}</b></div>
          <div class="kv"><span>Requested</span><b>${SP.when(o.createdAt || o.acceptedAt || o.collectedAt)}</b></div>
          <div class="kv"><span>Accepted</span><b>${SP.when(o.acceptedAt || o.collectedAt)}</b></div>
          <div class="kv"><span>Collected</span><b>${SP.when(o.collectedAt)}</b></div>
          <div class="kv"><span>Servings</span><b>${o.servings}</b></div>
        </div></div>`);
      });
      const gave = takeMore(givenCards, shown.gave);
      gave.rows.forEach((html) => parts.push(html));
      parts.push(moreBar("gave", gave.shown, gave.total));
    } else {
      const rows = takeMore(needRowsAll, shown.req);
      parts.push("<h2>Your requests</h2>");
      if (!rows.total) parts.push('<div class="card"><div class="pad"><p class="muted">No requests yet. Post one from Need.</p></div></div>');
      rows.rows.forEach((row) => {
        const n = row.n;
        const o = row.o;
        const status = (o && o.status) || (n && n.status) || "open";
        const expired = !o && n && (n.status === "expired" || n.minLeft <= 0);
        const title = (n && n.what) || (o && o.name) || "Request";
        const note = expired ? "Needed-by time has passed." : status === "collected" ? "Collected." : status === "accepted" ? "Giver accepted. Collect before expiry." : status === "requested" || status === "matched" ? "Waiting for pickup." : "Waiting for a nearby giver to accept.";
        const giver = (o && o.giverName) || (n && n.giverName);
        const giverPhone = (o && o.giver) || (n && n.giver);
        const open = o && (o.status === "requested" || o.status === "accepted");
        parts.push(`<div class="card req-card${expired ? " is-expired" : ""}"><div class="pad">
          <div class="row"><h3>${title}</h3><span class="badge${expired ? " exp" : status === "accepted" || status === "matched" ? " time" : ""}">${expired ? "Expired" : SP.statusLabel(status)}</span></div>
          <p class="req-note ${expired ? "err" : "muted"}">${note}</p>
          <div class="kv"><span>Gave</span><b>${giver ? SP.who(giver, giverPhone) : "Waiting for a giver"}</b></div>
          <div class="kv"><span>Posted</span><b>${SP.when((n && n.createdAt) || (o && o.createdAt))}</b></div>
          ${n ? `<div class="kv"><span>Needed by</span><b>${SP.when(n.until)}</b></div>` : ""}
          <div class="kv"><span>Requested</span><b>${SP.when((o && o.createdAt) || (n && n.createdAt))}</b></div>
          ${o && o.acceptedAt ? `<div class="kv"><span>Accepted</span><b>${SP.when(o.acceptedAt)}</b></div>` : ""}
          ${o && o.collectedAt ? `<div class="kv"><span>Collected</span><b>${SP.when(o.collectedAt)}</b></div>` : ""}
          <div class="kv"><span>Servings</span><b>${(n && n.servings) || (o && o.servings) || 1}</b></div>
          ${n && !expired && !o ? `<div class="kv"><span>Time left</span><b>${SP.left(n.minLeft)}</b></div>` : ""}
          ${open ? `<p style="margin-top:10px"><a class="btn" href="order.html?id=${o.id}">Open pickup</a></p>` : ""}
          ${expired && n ? `<p class="row" style="margin-top:14px"><button class="btn-del" type="button" data-del-need="${n.id}">Delete</button></p>` : ""}
        </div></div>`);
      });
      parts.push(moreBar("req", rows.shown, rows.total));
    }
    root.innerHTML = parts.join("");
    bindMine();
    }
    paintMine();
  } catch (e) {
    root.innerHTML = `<p class="err">${e.message}</p>`;
  }
}

async function pageOrder() {
  if (!requireMode()) return;
  const id = SP.qs("id");
  const root = document.getElementById("root");
  if (!id) { root.innerHTML = "<p>Missing pickup.</p>"; return; }
  try {
    const data = await SP.api("/api/orders/" + id);
    const o = data.order;
    const ready = o.status === "accepted";
    const done = o.status === "collected";
    root.innerHTML = `
      <p><a href="mine.html">← My requests</a></p>
      <h1>Pickup details</h1>
      <div class="card"><div class="pad">
        <span class="badge ${ready ? "time" : ""}">${SP.statusLabel(o.status)}${ready ? " · Ready" : ""}</span>
        <h3 style="margin:10px 0">${o.name} · ${o.servings} servings</h3>
        <p class="kv"><span>Need</span><b>${SP.who(o.seekerName, o.seeker)}</b></p>
        <p class="kv"><span>Gave</span><b>${SP.who(o.giverName, o.giver)}</b></p>
        <p class="kv"><span>Requested</span><b>${SP.when(o.createdAt)}</b></p>
        ${o.acceptedAt ? `<p class="kv"><span>Accepted</span><b>${SP.when(o.acceptedAt)}</b></p>` : ""}
        ${o.collectedAt ? `<p class="kv"><span>Collected</span><b>${SP.when(o.collectedAt)}</b></p>` : ""}
        <p>${o.address ? o.address + "<br>Call after you reach the gate." : o.hint}</p>
        <p class="meta">This listing: ${o.given || 0} pickups done · Giver: ${o.providerGiven || 0} given · You: ${o.seekerCollected || 0} collected</p>
        <p class="ok" id="done">${done ? "Collected. Thank you." : ""}</p>
        <p class="row" style="margin-top:14px">
          ${ready && o.mineRequest ? '<button class="btn" id="got" type="button">I collected it</button>' : ""}
          ${o.status === "requested" && o.mineGive ? '<button class="btn" id="ok" type="button">Accept request</button>' : ""}
          <a class="ghost" href="mine.html">Back</a>
        </p>
      </div></div>`;
    const got = document.getElementById("got");
    if (got) got.onclick = async () => {
      try {
        await SP.api("/api/orders/" + id + "/collect", { body: {} });
        location.reload();
      } catch (e) { document.getElementById("done").className = "err"; document.getElementById("done").textContent = e.message; }
    };
    const ok = document.getElementById("ok");
    if (ok) ok.onclick = async () => {
      try {
        await SP.api("/api/orders/" + id + "/accept", { body: {} });
        location.reload();
      } catch (e) { document.getElementById("done").className = "err"; document.getElementById("done").textContent = e.message; }
    };
  } catch (e) {
    root.innerHTML = `<p class="err">${e.message}</p>`;
  }
}

async function pageProfile() {
  if (!requireAuth()) return;
  paintNav();
  const view = document.getElementById("view");
  const form = document.getElementById("form");
  const phone = document.getElementById("phone");
  const name = document.getElementById("name");
  const address = document.getElementById("address");
  const loc = document.getElementById("loc");
  const msg = document.getElementById("msg");
  let me = SP.user() || {};
  let pin = null;
  function locText(u) {
    if (u && Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lng))) {
      return Number(u.lat).toFixed(4) + ", " + Number(u.lng).toFixed(4);
    }
    return "Not set";
  }
  function placeLine(u) {
    return [u && u.city, u && u.state, u && u.country].filter(Boolean).join(", ");
  }
  function fillForm(u) {
    phone.value = u.phone || "";
    name.value = u.name || "";
    address.value = u.address || "";
    loc.textContent = "Location: " + (placeLine(u) ? placeLine(u) + " · " : "") + locText(u);
  }
  function showView(u) {
    me = u;
    document.getElementById("v-name").textContent = u.name || "Neighbor";
    document.getElementById("v-role").textContent = u.role === "giver" ? "Give" : u.role === "seeker" ? "Need" : "Pick mode";
    document.getElementById("v-phone").textContent = u.phone || "—";
    document.getElementById("v-address").textContent = u.address || "—";
    document.getElementById("v-city").textContent = u.city || "—";
    document.getElementById("v-state").textContent = u.state || "—";
    document.getElementById("v-country").textContent = u.country || "—";
    document.getElementById("v-loc").textContent = locText(u);
    form.classList.add("hide");
    view.classList.remove("hide");
  }
  function showEdit() {
    pin = null;
    fillForm(me);
    msg.className = "muted";
    msg.textContent = "";
    view.classList.add("hide");
    form.classList.remove("hide");
  }
  try {
    const pos = await SP.locate();
    const pinNow = pos || (Number.isFinite(Number(me.lat)) && Number.isFinite(Number(me.lng)) ? { lat: Number(me.lat), lng: Number(me.lng) } : null);
    if (pinNow && !pinNow.city) Object.assign(pinNow, await SP.placeOf(pinNow.lat, pinNow.lng));
    me = pinNow ? await SP.api("/api/me", { body: pinNow }) : await SP.api("/api/me");
    me = SP.mergePlace(me, pinNow);
    SP.setSession(SP.token(), me);
    showView(me);
  } catch (e) {
    msg.className = "err";
    msg.textContent = e.message;
    showEdit();
  }
  document.getElementById("edit").onclick = () => showEdit();
  document.getElementById("cancel").onclick = () => showView(me);
  document.getElementById("gps").onclick = async () => {
    msg.className = "muted";
    msg.textContent = "Getting location…";
    pin = await SP.locate();
    if (!pin) {
      msg.className = "err";
      msg.textContent = "Location blocked. Allow location and try again.";
      return;
    }
    loc.textContent = "Location: " + locText(pin) + " (will save on Update)";
    msg.className = "ok";
    msg.textContent = "Location ready. Tap Update to save.";
  };
  document.getElementById("save").onclick = async () => {
    msg.className = "ok";
    try {
      const sent = { name: name.value, address: address.value, ...(pin || {}) };
      me = SP.mergePlace(await SP.api("/api/me", { body: sent }), sent);
      SP.setSession(SP.token(), me);
      showView(me);
    } catch (e) { msg.className = "err"; msg.textContent = e.message; }
  };
  document.getElementById("out").onclick = () => SP.logout();
}

const pages = {
  login: pageLogin,
  role: pageRole,
  nearby: pageNearby,
  listing: pageListing,
  need: pageNeed,
  give: pageGive,
  mine: pageMine,
  order: pageOrder,
  profile: pageProfile
};
const page = document.body.dataset.page;
if (page && pages[page]) pages[page]();
