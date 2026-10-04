const { User, Token, Admin } = require("../models");
const { json, tokenOf } = require("../utils/http");

function requireAuth(req, res, next) {
  const t = tokenOf(req);
  const p = Token.claims(t);
  const id = p && p.kind === "user" ? p.sub : null;
  const user = id ? User.findById(id) : null;
  if (!user || !User.hasToken(user, t)) return json(res, 401, { error: "Login required" });
  const role = p.role === "seeker" || p.role === "giver" ? p.role : user.role;
  req.user = Object.assign({}, user, { role });
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
