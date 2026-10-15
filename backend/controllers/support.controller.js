const support = require("../services/support.service");
const { json } = require("../utils/http");

function wrap(fn) {
  return (req, res) => {
    try { json(res, 200, fn(req)); }
    catch (e) { json(res, e.status || 500, { error: e.message }); }
  };
}

module.exports = {
  topics: wrap((req) => ({ topics: support.topicsFor(req.user) })),
  solved: wrap((req) => support.solved(req.params.id)),
  create: wrap((req) => support.createTicket(req.user, req.body)),
  mine: wrap((req) => support.myTickets(req.user)),
  unread: wrap((req) => support.unread(req.user)),
  seen: wrap((req) => support.markSeen(req.user)),
  reply: wrap((req) => support.userReply(req.user, req.params.id, req.body)),
  adminTopics: wrap(() => support.adminTopics()),
  addTopic: wrap((req) => support.saveTopic(null, req.body)),
  updateTopic: wrap((req) => support.saveTopic(req.params.id, req.body)),
  toggleTopic: wrap((req) => support.toggleTopic(req.params.id, req.body.enabled)),
  moveTopic: wrap((req) => support.moveTopic(req.params.id, req.body.dir)),
  removeTopic: wrap((req) => support.removeTopic(req.params.id)),
  adminTickets: wrap((req) => support.adminTickets(req.query)),
  adminReply: wrap((req) => support.adminReply(req.admin, req.params.id, req.body)),
  setStatus: wrap((req) => support.setStatus(req.params.id, req.body.status))
};
