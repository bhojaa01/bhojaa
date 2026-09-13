const { User, Token } = require("../models");
const { json, tokenOf } = require("../utils/http");

function requireAuth(req, res, next) {
  const id = Token.userIdOf(tokenOf(req));
  const user = id ? User.findById(id) : null;
  if (!user) return json(res, 401, { error: "Login required" });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!Token.isAdmin(tokenOf(req))) return json(res, 401, { error: "Admin login required" });
  next();
}

module.exports = { requireAuth, requireAdmin };
