const API = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:4000"
  : "https://bhojaa-production.up.railway.app";

const SP = {
  apiUrl: API,
  token() { return localStorage.getItem("sp_token") || ""; },
  user() { try { return JSON.parse(localStorage.getItem("sp_user") || "null"); } catch { return null; } },
  setSession(token, user) {
    localStorage.setItem("sp_token", token);
    localStorage.setItem("sp_user", JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem("sp_token");
    localStorage.removeItem("sp_user");
    try { sessionStorage.clear(); } catch {}
  },
  locate() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
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
  statusLabel(s) {
    return ({ requested: "Waiting", accepted: "Accepted", collected: "Collected", declined: "Declined", open: "Open", reserved: "Reserved", done: "Done", matched: "Matched" })[s] || s;
  }
};

function role() {
  return (SP.user() || {}).role || "";
}

function home() {
  return role() === "giver" ? "provider.html" : "app.html";
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
    }
  };
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
  const logo = document.querySelector(".logo");
  if (logo && !logo.querySelector(".mode")) {
    const chip = document.createElement("a");
    chip.className = "badge mode";
    chip.href = "role.html";
    chip.textContent = r === "giver" ? "Give" : r === "seeker" ? "Need" : "";
    if (chip.textContent) logo.appendChild(chip);
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
      if (data.user.role === "giver") location.href = "provider.html";
      else if (data.user.role === "seeker") location.href = "app.html";
      else location.href = "role.html";
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
      grid.innerHTML = rows.map((l) => `
        <a class="card" href="listing.html?id=${l.id}">
          <div class="card-media">
            <img src="${l.image}" alt="">
            <span class="chip">${l.distance} km</span>
            <span class="chip time">${SP.left(l.minLeft)}</span>
          </div>
          <div class="pad">
            <div class="row"><h3>${l.name}</h3><span class="badge">${l.mine ? "YOURS" : (l.diet || "veg").toUpperCase()}</span></div>
            <p class="meta">${l.servings} serving${l.servings === 1 ? "" : "s"} · ${(l.category || "meal")}${l.mine ? " · your listing" : ""}</p>
          </div>
        </a>`).join("");
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
        : '<p class="muted">Waiting for someone in Need mode to request this.</p><p style="margin-top:10px"><a class="btn" href="mine.html">Open Mine</a></p>';
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

async function pageNeed() {
  if (!requireMode("seeker")) return;
  bindWhenPicker("when-picker", "when", "when-btn");
  const msg = document.getElementById("msg");
  document.getElementById("post").onclick = async () => {
    msg.className = "ok";
    try {
      await SP.api("/api/needs", { body: {
        what: document.getElementById("what").value,
        servings: document.getElementById("servings").value,
        untilAt: document.getElementById("when").value
      }});
      msg.textContent = "Request posted to nearby givers.";
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
      location.href = "mine.html";
    } catch (e) { msg.className = "err"; msg.textContent = e.message; }
  };
  try {
    const data = await SP.api("/api/needs");
    const open = data.needs.filter((n) => !n.mine && n.status === "open");
    if (!open.length) {
      needsBox.innerHTML = '<p class="muted">No nearby need posts right now.</p>';
    } else {
      needsBox.innerHTML = open.map((n) => `
        <div class="card"><div class="pad">
          <div class="row"><h3>${n.what}</h3><span class="badge">${n.servings} servings</span></div>
          <p class="meta">${n.distance} km · ${SP.left(n.minLeft)}</p>
          <p class="row" style="margin-top:10px"><button class="btn" type="button" data-offer="${n.id}">I can give this</button></p>
        </div></div>`).join("");
      needsBox.querySelectorAll("[data-offer]").forEach((b) => {
        b.onclick = async () => {
          try {
            const r = await SP.api("/api/needs/" + b.dataset.offer + "/offer", { body: { address: document.getElementById("address").value } });
            location.href = "order.html?id=" + r.orderId;
          } catch (e) { msg.className = "err"; msg.textContent = e.message; }
        };
      });
    }
  } catch (e) {
    needsBox.innerHTML = `<p class="err">${e.message}</p>`;
  }
}

async function pageMine() {
  if (!requireMode()) return;
  const root = document.getElementById("root");
  try {
    const data = await SP.api("/api/mine");
    const incoming = data.listings.flatMap((l) => l.requests.filter((r) => r.status === "requested"));
    const parts = [];
    if (role() === "giver") {
      parts.push("<h2>Pickup requests</h2>");
      if (!incoming.length) parts.push('<div class="card"><div class="pad"><p class="muted">No requests yet. Wait for someone in Need mode.</p></div></div>');
      incoming.forEach((o) => {
        parts.push(`<div class="card"><div class="pad">
          <div class="row"><h3>${o.name}</h3><span class="badge time">Waiting</span></div>
          <p class="meta">Someone nearby asked to collect this.</p>
          <p class="row" style="margin-top:10px"><button class="btn" type="button" data-accept="${o.id}">Accept and share address</button></p>
        </div></div>`);
      });
      parts.push("<h2>Food you gave</h2>");
      if (!data.listings.length) parts.push('<div class="card"><div class="pad"><p class="muted">No food given yet.</p></div></div>');
      data.listings.forEach((l) => {
        parts.push(`<div class="card"><div class="pad">
          <div class="row"><h3>${l.name}</h3><span class="badge">${SP.statusLabel(l.status)}</span></div>
          <p class="meta">${l.servings} serving${l.servings === 1 ? "" : "s"} · ${l.category || "meal"} · ${SP.left(l.minLeft)}</p>
          <p class="meta">${l.given || 0} pickup${(l.given || 0) === 1 ? "" : "s"} done</p>
        </div></div>`);
      });
    } else {
      const got = data.orders.filter((o) => o.mineRequest);
      parts.push("<h2>Food you got</h2>");
      if (!got.length) parts.push('<div class="card"><div class="pad"><p class="muted">No food collected yet.</p></div></div>');
      got.forEach((o) => {
        const open = o.status === "requested" || o.status === "accepted";
        parts.push(`<div class="card"><div class="pad">
          <div class="row"><h3>${o.name}</h3><span class="badge ${o.status === "accepted" ? "time" : ""}">${SP.statusLabel(o.status)}</span></div>
          <p class="meta">${o.servings} serving${o.servings === 1 ? "" : "s"} · ${o.status === "collected" ? "Collected" : o.status === "accepted" ? "Address unlocked · collect before expiry" : o.status === "requested" ? "Waiting for the giver to accept" : o.status}</p>
          ${open ? `<p style="margin-top:10px"><a class="btn" href="order.html?id=${o.id}">Open pickup</a></p>` : ""}
        </div></div>`);
      });
    }
    root.innerHTML = parts.join("");
    root.querySelectorAll("[data-accept]").forEach((b) => {
      b.onclick = async () => {
        try {
          await SP.api("/api/orders/" + b.dataset.accept + "/accept", { body: {} });
          location.reload();
        } catch (e) { alert(e.message); }
      };
    });
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
  function fillForm(u) {
    phone.value = u.phone || "";
    name.value = u.name || "";
    address.value = u.address || "";
    loc.textContent = "Location: " + locText(u);
  }
  function showView(u) {
    me = u;
    document.getElementById("v-name").textContent = u.name || "Neighbor";
    document.getElementById("v-role").textContent = u.role === "giver" ? "Give" : u.role === "seeker" ? "Need" : "Pick mode";
    document.getElementById("v-phone").textContent = u.phone || "—";
    document.getElementById("v-address").textContent = u.address || "—";
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
    me = await SP.api("/api/me");
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
      me = await SP.api("/api/me", { body: { name: name.value, address: address.value, ...(pin || {}) } });
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
