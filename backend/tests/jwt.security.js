const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const { User, Token, Admin } = require("../models");
const config = require("../config");

function call(method, url, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const raw = body ? JSON.stringify(body) : "";
    const req = {
      method,
      url,
      headers: {
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

async function loginPhone(phone) {
  const otp = await call("POST", "/api/otp", { body: { phone } });
  assert.equal(otp.status, 200);
  const out = await call("POST", "/api/login", { body: { phone, otp: config.otp } });
  assert.equal(out.status, 200);
  assert.ok(out.data.token);
  return out.data;
}

test("login JWT is HS256 with user claims and 30-day exp", async () => {
  const { token, user } = await loginPhone("9111111111");
  const parts = token.split(".");
  assert.equal(parts.length, 3);
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  assert.equal(header.alg, "HS256");
  assert.equal(payload.kind, "user");
  assert.equal(payload.phone, "9111111111");
  assert.equal(payload.sub, User.findByPhone("9111111111")._id);
  assert.ok(payload.exp - payload.iat >= 30 * 24 * 3600 - 5);
  assert.equal(user.phone, "9111111111");
  assert.equal(user.token, undefined);
});

test("JWT is saved on the user document", async () => {
  const { token } = await loginPhone("9111111112");
  const row = User.findByPhone("9111111112");
  assert.equal(row.token, token);
  assert.equal(Token.userIdOf(token), row._id);
});

test("valid Bearer JWT fetches /api/me", async () => {
  const { token } = await loginPhone("9111111113");
  const me = await call("GET", "/api/me", { token });
  assert.equal(me.status, 200);
  assert.equal(me.data.phone, "9111111113");
  assert.equal(me.data.token, undefined);
});

test("missing token is rejected", async () => {
  const out = await call("GET", "/api/me");
  assert.equal(out.status, 401);
});

test("query-string token is ignored", async () => {
  const { token } = await loginPhone("9111111114");
  const out = await call("GET", "/api/me?token=" + token);
  assert.equal(out.status, 401);
});

test("garbage token is rejected", async () => {
  const out = await call("GET", "/api/me", { token: "not-a-jwt" });
  assert.equal(out.status, 401);
});

test("tampered payload is rejected", async () => {
  const { token } = await loginPhone("9111111115");
  const parts = token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  payload.phone = "0000000000";
  const bad = parts[0] + "." + Buffer.from(JSON.stringify(payload)).toString("base64url") + "." + parts[2];
  const out = await call("GET", "/api/me", { token: bad });
  assert.equal(out.status, 401);
});

test("unsigned alg-none token is rejected", async () => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: "US1001",
    kind: "user",
    phone: "9111111116",
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString("base64url");
  const out = await call("GET", "/api/me", { token: header + "." + payload + "." });
  assert.equal(out.status, 401);
});

test("expired JWT is rejected", async () => {
  const { token } = await loginPhone("9111111117");
  const user = User.findByPhone("9111111117");
  const expired = Token.createUser(user, { exp: Math.floor(Date.now() / 1000) - 10 });
  User.setToken(user, expired);
  const out = await call("GET", "/api/me", { token: expired });
  assert.equal(out.status, 401);
});

test("logout clears saved token and rejects it", async () => {
  const { token } = await loginPhone("9111111118");
  const out = await call("POST", "/api/logout", { token, body: {} });
  assert.equal(out.status, 200);
  assert.equal(User.findByPhone("9111111118").token, "");
  const me = await call("GET", "/api/me", { token });
  assert.equal(me.status, 401);
});

test("new login replaces saved token and old JWT fails", async () => {
  const first = await loginPhone("9111111119");
  const user = User.findByPhone("9111111119");
  const second = Token.createUser(user);
  User.setToken(user, second);
  assert.notEqual(first.token, second);
  assert.equal(user.token, second);
  const old = await call("GET", "/api/me", { token: first.token });
  const next = await call("GET", "/api/me", { token: second });
  assert.equal(old.status, 401);
  assert.equal(next.status, 200);
});

test("user JWT cannot access admin routes", async () => {
  const { token } = await loginPhone("9111111120");
  const out = await call("GET", "/api/admin/data", { token });
  assert.equal(out.status, 401);
});

test("admin JWT cannot access user routes", async () => {
  let token;
  const ready = await call("GET", "/api/admin/ready");
  if (ready.data.setup) {
    const setup = await call("POST", "/api/admin/setup", { body: { username: "secadmin", password: "secret1" } });
    assert.equal(setup.status, 200);
    token = setup.data.token;
  } else {
    const row = Admin.all()[0];
    token = Token.createAdmin(row);
    Admin.setToken(row, token);
  }
  const me = await call("GET", "/api/me", { token });
  assert.equal(me.status, 401);
  const data = await call("GET", "/api/admin/data", { token });
  assert.equal(data.status, 200);
  assert.equal(Admin.findById(Token.claims(token).sub).token, token);
});

test("user dump does not leak JWT", () => {
  const row = User.findByPhone("9111111112");
  assert.ok(row.token);
  assert.equal(User.dump(row).token, undefined);
});
