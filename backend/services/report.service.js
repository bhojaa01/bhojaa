const { Report } = require("../models");

function create(who, body) {
  const targetType = String(body.targetType || "").trim();
  const targetId = String(body.targetId || "").trim();
  const reason = String(body.reason || "").trim();
  if (!["user", "listing", "order"].includes(targetType) || !targetId || !reason) {
    throw Object.assign(new Error("targetType, targetId and reason required"), { status: 400 });
  }
  const row = Report.create({
    reporterId: who._id,
    targetType,
    targetId,
    reason
  });
  return { ok: true, id: row._id };
}

module.exports = { create };
