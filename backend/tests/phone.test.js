const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const { phoneOf, phoneError } = require("../utils/http");

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

test("phone numbers are normalised from +91, 0 and spaces", () => {
  assert.equal(phoneOf("+91 98765 43210"), "9876543210");
  assert.equal(phoneOf("098765 43210"), "9876543210");
  assert.equal(phoneOf("98765-43210"), "9876543210");
});

test("only valid Indian mobile numbers pass", () => {
  assert.equal(phoneError("9876543210"), "");
  assert.equal(phoneError("6000012345"), "");
  assert.match(phoneError("98765"), /10-digit/);
  assert.match(phoneError("5678903453"), /start with 6, 7, 8 or 9/);
  assert.match(phoneError("1234567890"), /start with 6, 7, 8 or 9/);
  assert.match(phoneError("9999999999"), /real mobile number/);
});

test("OTP is refused for invalid numbers and no user is created", async () => {
  for (const phone of ["12345", "3453453453", "8888888888"]) {
    const out = await call("POST", "/api/otp", { phone });
    assert.equal(out.status, 400, phone);
    assert.ok(out.data.error);
  }
  const { User } = require("../models");
  assert.equal(User.findByPhone("3453453453"), null);
});

test("OTP works for a valid number typed with +91", async () => {
  const out = await call("POST", "/api/otp", { phone: "+91 93333 00001" });
  assert.equal(out.status, 200);
  const login = await call("POST", "/api/login", { phone: "9333300001", otp: require("../config").otp });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.phone, "9333300001");
});
