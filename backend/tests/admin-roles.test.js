const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const { Token, Admin } = require("../models");

function call(method, url, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const raw = body ? JSON.stringify(body) : "";
    const req = {
      method, url,
      headers: { ...(token ? { authorization: "Bearer " + token } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      on(ev, fn) {
        if (ev === "data" && raw) queueMicrotask(() => fn(raw));
        if (ev === "end") queueMicrotask(fn);
        return req;
      }
    };
    const res = {
      statusCode: 200, setHeader() {}, writeHead(code) { this.statusCode = code; },
      end(s) { resolve({ status: this.statusCode, data: s ? JSON.parse(s) : {} }); }
    };
    Promise.resolve(app(req, res)).catch(reject);
  });
}

function tokenFor(row) {
  const t = Token.createAdmin(row);
  Admin.setToken(row, t);
  return t;
}

async function superToken() {
  const ready = await call("GET", "/api/admin/ready");
  if (ready.data.setup) return (await call("POST", "/api/admin/setup", { body: { username: "boss", password: "secret1" } })).data.token;
  return tokenFor(Admin.supers()[0]);
}

async function staff(name, perms) {
  const boss = await superToken();
  const made = await call("POST", "/api/admin/staff", { token: boss, body: { username: name, password: "secret1", role: "staff", perms } });
  assert.equal(made.status, 200);
  return { id: made.data.id, token: tokenFor(Admin.findById(made.data.id)), boss };
}

test("setup admin and admins created before roles are super admins", async () => {
  const boss = await superToken();
  const me = await call("GET", "/api/admin/me", { token: boss });
  assert.equal(me.data.role, "super");
  const legacy = Admin.create({ username: "oldadmin", password: "secret1" });
  delete legacy.role;
  assert.equal(Admin.roleOf(legacy), "super");
});

test("staff only get the menus they were given", async () => {
  const s = await staff("reader1", { users: "read", support: "write", bogus: "write", visits: "admin" });
  const me = await call("GET", "/api/admin/me", { token: s.token });
  assert.deepEqual(me.data.perms, { users: "read", support: "write" });
  const data = await call("GET", "/api/admin/data", { token: s.token });
  assert.ok(Array.isArray(data.data.users));
  assert.deepEqual(data.data.otps, []);
  assert.deepEqual(data.data.staff, []);
  assert.equal(data.data.stats.otps, undefined);
  assert.equal(data.data.indexes, undefined);
  assert.equal((await call("GET", "/api/admin/visits", { token: s.token })).status, 403);
  assert.equal((await call("GET", "/api/admin/support/tickets", { token: s.token })).status, 200);
  assert.equal((await call("GET", "/api/admin/staff", { token: s.token })).status, 403);
});

test("read access cannot change anything; write access can", async () => {
  const r = await staff("reader2", { categories: "read" });
  const denied = await call("POST", "/api/admin/categories", { token: r.token, body: { name: "Soups" } });
  assert.equal(denied.status, 403);
  const w = await staff("writer2", { categories: "write" });
  const ok = await call("POST", "/api/admin/categories", { token: w.token, body: { name: "Soups" } });
  assert.equal(ok.status, 200);
});

test("super admin edits access, and changes apply at once", async () => {
  const s = await staff("mover", { users: "read" });
  assert.equal((await call("GET", "/api/admin/visits", { token: s.token })).status, 403);
  const up = await call("POST", "/api/admin/staff/" + s.id, { token: s.boss, body: { perms: { visits: "read" } } });
  assert.deepEqual(up.data.perms, { visits: "read" });
  assert.equal((await call("GET", "/api/admin/visits", { token: s.token })).status, 200);
  await call("POST", "/api/admin/staff/" + s.id, { token: s.boss, body: { password: "newpass1" } });
  assert.equal((await call("GET", "/api/admin/me", { token: s.token })).status, 401);
});

test("staff cannot manage admins; last super admin is protected", async () => {
  const s = await staff("sneaky", { users: "write" });
  const self = await call("POST", "/api/admin/staff/" + s.id, { token: s.token, body: { role: "super" } });
  assert.equal(self.status, 403);
  const boss = await superToken();
  const me = (await call("GET", "/api/admin/me", { token: boss })).data;
  assert.equal((await call("POST", "/api/admin/staff/" + me.id + "/delete", { token: boss, body: {} })).status, 400);
  assert.equal((await call("POST", "/api/admin/staff/" + me.id, { token: boss, body: { role: "staff" } })).status, 400);
  const gone = await call("POST", "/api/admin/staff/" + s.id + "/delete", { token: boss, body: {} });
  assert.equal(gone.status, 200);
  assert.equal((await call("GET", "/api/admin/me", { token: s.token })).status, 401);
});
