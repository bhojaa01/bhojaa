const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const config = require("../config");
const { Token, Admin } = require("../models");
const support = require("../services/support.service");

support.ensure();

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

async function userAs(phone, role) {
  await call("POST", "/api/otp", { body: { phone } });
  const out = await call("POST", "/api/login", { body: { phone, otp: config.otp } });
  const me = await call("POST", "/api/me", { token: out.data.token, body: { role } });
  return me.data.token || out.data.token;
}

async function adminToken() {
  const ready = await call("GET", "/api/admin/ready");
  if (ready.data.setup) {
    const setup = await call("POST", "/api/admin/setup", { body: { username: "supportadmin", password: "secret1" } });
    return setup.data.token;
  }
  const row = Admin.all()[0];
  const token = Token.createAdmin(row);
  Admin.setToken(row, token);
  return token;
}

test("support needs login", async () => {
  assert.equal((await call("GET", "/api/support/topics")).status, 401);
  assert.equal((await call("POST", "/api/support/tickets", { body: { message: "hi there" } })).status, 401);
});

test("seekers and givers see their own questions, with Something else last", async () => {
  const seeker = await userAs("9222000001", "seeker");
  const giver = await userAs("9222000002", "giver");
  const s = (await call("GET", "/api/support/topics", { token: seeker })).data.topics;
  const g = (await call("GET", "/api/support/topics", { token: giver })).data.topics;
  assert.ok(s.some((t) => t.question === "I can’t see the pickup address"));
  assert.ok(!s.some((t) => t.question === "Nobody requested my food"));
  assert.ok(g.some((t) => t.question === "Nobody requested my food"));
  assert.ok(!g.some((t) => t.question === "I can’t see the pickup address"));
  assert.equal(s[s.length - 1].isOther, true);
  assert.equal(g[g.length - 1].isOther, true);
});

test("user sends a question, admin replies, user sees it and follows up", async () => {
  const user = await userAs("9222000003", "seeker");
  const other = await userAs("9222000004", "seeker");
  const admin = await adminToken();
  const topic = (await call("GET", "/api/support/topics", { token: user })).data.topics[0];

  const empty = await call("POST", "/api/support/tickets", { token: user, body: { topicId: topic.id, message: " " } });
  assert.equal(empty.status, 400);

  const sent = await call("POST", "/api/support/tickets", { token: user, body: { topicId: topic.id, message: "Still waiting <b>since 7pm</b>" } });
  assert.equal(sent.status, 200);
  assert.equal(sent.data.status, "open");
  assert.equal(sent.data.question, topic.question);
  assert.equal(sent.data.messages[0].text, "Still waiting since 7pm");
  const id = sent.data.id;

  assert.equal((await call("GET", "/api/support/tickets", { token: other })).data.tickets.length, 0);
  assert.equal((await call("POST", "/api/support/tickets/" + id + "/reply", { token: other, body: { message: "x" } })).status, 404);

  const inbox = await call("GET", "/api/admin/support/tickets?status=open", { token: admin });
  const row = inbox.data.tickets.find((t) => t.id === id);
  assert.equal(row.phone, "9222000003");
  assert.ok(inbox.data.counts.open >= 1);

  const reply = await call("POST", "/api/admin/support/tickets/" + id + "/reply", { token: admin, body: { message: "We reminded the giver." } });
  assert.equal(reply.data.status, "answered");
  assert.equal((await call("GET", "/api/support/unread", { token: user })).data.count, 1);

  const mine = (await call("GET", "/api/support/tickets", { token: user })).data.tickets[0];
  assert.equal(mine.messages[1].from, "admin");
  assert.equal(mine.messages[1].text, "We reminded the giver.");
  await call("POST", "/api/support/seen", { token: user, body: {} });
  assert.equal((await call("GET", "/api/support/unread", { token: user })).data.count, 0);

  const follow = await call("POST", "/api/support/tickets/" + id + "/reply", { token: user, body: { message: "Thanks, still nothing." } });
  assert.equal(follow.data.status, "open");

  await call("POST", "/api/admin/support/tickets/" + id + "/status", { token: admin, body: { status: "closed" } });
  const closed = await call("POST", "/api/support/tickets/" + id + "/reply", { token: user, body: { message: "Hello?" } });
  assert.equal(closed.status, 400);
});

test("a user can have at most 5 open questions", async () => {
  const user = await userAs("9222000005", "giver");
  for (let i = 0; i < 5; i++) {
    const ok = await call("POST", "/api/support/tickets", { token: user, body: { message: "Question number " + i } });
    assert.equal(ok.status, 200);
  }
  const sixth = await call("POST", "/api/support/tickets", { token: user, body: { message: "One more" } });
  assert.equal(sixth.status, 429);
});

test("linking someone else's order is refused", async () => {
  const user = await userAs("9222000006", "seeker");
  const out = await call("POST", "/api/support/tickets", { token: user, body: { message: "About my order", orderId: "ORD-NOPE" } });
  assert.equal(out.status, 400);
});

test("admin manages questions; Something else can't be deleted or hidden", async () => {
  const admin = await adminToken();
  const user = await userAs("9222000007", "seeker");
  assert.equal((await call("GET", "/api/admin/support/topics")).status, 401);

  const added = await call("POST", "/api/admin/support/topics", { token: admin, body: { group: "Pickups", question: "Can I collect late?", answer: "Ask the giver in the request note.", audience: "seeker" } });
  assert.equal(added.status, 200);
  const id = added.data.id;
  let seen = (await call("GET", "/api/support/topics", { token: user })).data.topics;
  assert.ok(seen.some((t) => t.id === id));

  await call("POST", "/api/admin/support/topics/" + id + "/toggle", { token: admin, body: { enabled: false } });
  seen = (await call("GET", "/api/support/topics", { token: user })).data.topics;
  assert.ok(!seen.some((t) => t.id === id));

  const before = (await call("GET", "/api/admin/support/topics", { token: admin })).data.topics;
  const pos = before.findIndex((t) => t.id === id);
  const moved = (await call("POST", "/api/admin/support/topics/" + id + "/move", { token: admin, body: { dir: "up" } })).data.topics;
  assert.equal(moved.findIndex((t) => t.id === id), pos - 1);

  assert.equal((await call("POST", "/api/admin/support/topics/" + id + "/delete", { token: admin, body: {} })).status, 200);

  const other = before.find((t) => t.isOther);
  assert.equal((await call("POST", "/api/admin/support/topics/" + other.id + "/delete", { token: admin, body: {} })).status, 400);
  assert.equal((await call("POST", "/api/admin/support/topics/" + other.id + "/toggle", { token: admin, body: { enabled: false } })).status, 400);
});
