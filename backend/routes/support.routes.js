const Router = require("../utils/router");
const support = require("../controllers/support.controller");
const { requireAuth, requirePerm } = require("../middleware/auth");

const router = new Router();
router.get("/api/support/topics", requireAuth, support.topics);
router.post("/api/support/topics/:id/solved", requireAuth, support.solved);
router.get("/api/support/tickets", requireAuth, support.mine);
router.post("/api/support/tickets", requireAuth, support.create);
router.get("/api/support/unread", requireAuth, support.unread);
router.post("/api/support/seen", requireAuth, support.seen);
router.post("/api/support/tickets/:id/reply", requireAuth, support.reply);

router.get("/api/admin/support/topics", requirePerm("support_topics", "read"), support.adminTopics);
router.post("/api/admin/support/topics", requirePerm("support_topics", "write"), support.addTopic);
router.post("/api/admin/support/topics/:id", requirePerm("support_topics", "write"), support.updateTopic);
router.post("/api/admin/support/topics/:id/toggle", requirePerm("support_topics", "write"), support.toggleTopic);
router.post("/api/admin/support/topics/:id/move", requirePerm("support_topics", "write"), support.moveTopic);
router.post("/api/admin/support/topics/:id/delete", requirePerm("support_topics", "write"), support.removeTopic);
router.get("/api/admin/support/tickets", requirePerm("support", "read"), support.adminTickets);
router.post("/api/admin/support/tickets/:id/reply", requirePerm("support", "write"), support.adminReply);
router.post("/api/admin/support/tickets/:id/status", requirePerm("support", "write"), support.setStatus);

module.exports = router;
