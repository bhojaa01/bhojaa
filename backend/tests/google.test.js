const { test } = require("node:test");
const assert = require("node:assert/strict");
const config = require("../config");
const app = require("../app");

function call(method, url, body) {
  return new Promise((resolve, reject) => {
    const raw = body ? JSON.stringify(body) : "";
    const req = {
      method, url,
      headers: body ? { "content-type": "application/json" } : {},
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

function fakeGoogle(claims) {
  const real = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => claims });
  return () => { global.fetch = real; };
}

const base = () => ({
  iss: "https://accounts.google.com",
  aud: "test-client.apps.googleusercontent.com",
  sub: "g-100",
  email: "Ana@Example.com",
  email_verified: "true",
  name: "Ana Silva",
  exp: String(Math.floor(Date.now() / 1000) + 600)
});

test("auth config exposes the Google client id", async () => {
  config.googleClientId = "test-client.apps.googleusercontent.com";
  const out = await call("GET", "/api/auth/config");
  assert.equal(out.data.googleClientId, "test-client.apps.googleusercontent.com");
});

test("Google login creates a user without a phone and reuses it next time", async () => {
  config.googleClientId = "test-client.apps.googleusercontent.com";
  const restore = fakeGoogle(base());
  try {
    const first = await call("POST", "/api/login/google", { credential: "x" });
    assert.equal(first.status, 200);
    assert.ok(first.data.token);
    assert.equal(first.data.user.email, "ana@example.com");
    assert.equal(first.data.user.phone, "");
    assert.equal(first.data.user.name, "Ana Silva");
    const again = await call("POST", "/api/login/google", { credential: "x" });
    const { User } = require("../models");
    assert.equal(User.all().filter((u) => u.googleId === "g-100").length, 1);
    assert.equal(again.data.user.email, "ana@example.com");
  } finally { restore(); }
});

test("Google tokens for another app or unverified email are refused", async () => {
  config.googleClientId = "test-client.apps.googleusercontent.com";
  for (const bad of [{ aud: "other-app" }, { email_verified: "false" }, { exp: "1" }, { iss: "evil.com" }]) {
    const restore = fakeGoogle({ ...base(), sub: "g-bad", ...bad });
    try {
      const out = await call("POST", "/api/login/google", { credential: "x" });
      assert.equal(out.status, 401, JSON.stringify(bad));
    } finally { restore(); }
  }
});

test("Google login is off when no client id is configured", async () => {
  config.googleClientId = "";
  const out = await call("POST", "/api/login/google", { credential: "x" });
  assert.equal(out.status, 503);
});
