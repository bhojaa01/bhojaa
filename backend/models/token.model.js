const crypto = require("crypto");

const sessions = new Map();
const adminSessions = new Map();

function token() {
  return crypto.randomBytes(16).toString("hex");
}

function createUser(userId) {
  const t = token();
  sessions.set(t, userId);
  return t;
}

function createAdmin() {
  const t = token();
  adminSessions.set(t, true);
  return t;
}

function userIdOf(t) {
  return sessions.get(t) || null;
}

function isAdmin(t) {
  return adminSessions.get(t) === true;
}

function userCount() {
  return sessions.size;
}

function userIds() {
  return [...sessions.values()].map((userId) => ({ userId }));
}

function remove(t) {
  sessions.delete(t);
  adminSessions.delete(t);
}

module.exports = { createUser, createAdmin, userIdOf, isAdmin, userCount, userIds, remove };
