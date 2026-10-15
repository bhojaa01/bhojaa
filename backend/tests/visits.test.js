const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const { Token, Admin } = require("../models");

function call(method, url, { token, body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const raw = body ? JSON.stringify(body) : "";
    const req = {
      method,
      url,
      headers: {
        ...(headers || {}),
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...(body ? { "content-type": "application/json" } : {})
      },
      on(ev, fn) {
        if (ev === "data" && raw) queueMicrotask(() => fn(raw));
        if (ev === "end") queueMicrotask(fn);
        return req;
      }
    };
    const res = {
      statusCode: 200,
      setHeader() {},
      writeHead(code) { this.statusCode = code; },
      end(s) {
        let data = {};
        try { data = s ? JSON.parse(s) : {}; } catch { data = { raw: s }; }
        resolve({ status: this.statusCode, data });
      }
    };
    Promise.resolve(app(req, res)).catch(reject);
  });
}

async function adminToken() {
  const ready = await call("GET", "/api/admin/ready");
  if (ready.data.setup) {
    const setup = await call("POST", "/api/admin/setup", { body: { username: "visitadmin", password: "secret1" } });
    return setup.data.token;
  }
  const row = Admin.all()[0];
  const token = Token.createAdmin(row);
  Admin.setToken(row, token);
  return token;
}

const place = {
  page: "home", country: "India", countryCode: "in", state: "Karnataka", city: "Bengaluru",
  locality: "Koramangala", postcode: "560034", lat: 12.935212345, lng: 77.624512345, accuracy: 18.6, source: "gps",
  phone: "9876543210"
};

test("home visit stores location only and admin can list it", async () => {
  const out = await call("POST", "/api/visits", { body: place, headers: { "user-agent": "Mozilla/5.0 (iPhone) Mobile" } });
  assert.equal(out.status, 200);
  assert.equal(out.data.ok, true);
  const token = await adminToken();
  const list = await call("GET", "/api/admin/visits?page=1&size=5", { token });
  assert.equal(list.status, 200);
  const row = list.data.rows[0];
  assert.equal(row.city, "Bengaluru");
  assert.equal(row.state, "Karnataka");
  assert.equal(row.country, "India");
  assert.equal(row.countryCode, "IN");
  assert.equal(row.lat, 12.9352);
  assert.equal(row.lng, 77.6245);
  assert.equal(row.device, "mobile");
  assert.equal(row.source, "gps");
  assert.equal(row.accuracy, 19);
  assert.equal(row.phone, undefined);
  assert.equal(row.ip, undefined);
  assert.ok(list.data.total >= 1);
  assert.ok(list.data.today >= 1);
  assert.equal(list.data.places[0].city, "Bengaluru");
});

test("visit list needs an admin token", async () => {
  const out = await call("GET", "/api/admin/visits");
  assert.equal(out.status, 401);
});

test("admin can turn recording off and on", async () => {
  const token = await adminToken();
  const before = (await call("GET", "/api/admin/visits", { token })).data.total;
  const off = await call("POST", "/api/admin/visits/toggle", { token, body: { enabled: false } });
  assert.equal(off.data.enabled, false);
  const skipped = await call("POST", "/api/visits", { body: place });
  assert.equal(skipped.data.skipped, true);
  assert.equal((await call("GET", "/api/admin/visits", { token })).data.total, before);
  await call("POST", "/api/admin/visits/toggle", { token, body: { enabled: true } });
  await call("POST", "/api/visits", { body: place });
  assert.equal((await call("GET", "/api/admin/visits", { token })).data.total, before + 1);
});

test("visit without any location is ignored", async () => {
  const out = await call("POST", "/api/visits", { body: { page: "home", lat: "abc" } });
  assert.equal(out.data.skipped, true);
});
