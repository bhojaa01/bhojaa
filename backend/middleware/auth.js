const { User, Token, Admin } = require("../models");
const { json, tokenOf } = require("../utils/http");

function requireAuth(req, res, next) {
  const t = tokenOf(req);
  const id = Token.userIdOf(t);
  const user = id ? User.findById(id) : null;
  if (!user || !Token.same(user.token, t)) return json(res, 401, { error: "Login required" });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const t = tokenOf(req);
  const p = Token.claims(t);
  const row = p && p.kind === "admin" && p.sub ? Admin.findById(p.sub) : null;
  if (!row || !Token.same(row.token, t)) return json(res, 401, { error: "Admin login required" });
  req.admin = row;
  next();
}

module.exports = { requireAuth, requireAdmin };
