const Router = require("../utils/router");
const support = require("../controllers/support.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = new Router();
router.get("/api/support/topics", requireAuth, support.topics);
router.post("/api/support/topics/:id/solved", requireAuth, support.solved);
router.get("/api/support/tickets", requireAuth, support.mine);
router.post("/api/support/tickets", requireAuth, support.create);
router.get("/api/support/unread", requireAuth, support.unread);
router.post("/api/support/seen", requireAuth, support.seen);
router.post("/api/support/tickets/:id/reply", requireAuth, support.reply);

router.get("/api/admin/support/topics", requireAdmin, support.adminTopics);
router.post("/api/admin/support/topics", requireAdmin, support.addTopic);
router.post("/api/admin/support/topics/:id", requireAdmin, support.updateTopic);
router.post("/api/admin/support/topics/:id/toggle", requireAdmin, support.toggleTopic);
router.post("/api/admin/support/topics/:id/move", requireAdmin, support.moveTopic);
router.post("/api/admin/support/topics/:id/delete", requireAdmin, support.removeTopic);
router.get("/api/admin/support/tickets", requireAdmin, support.adminTickets);
router.post("/api/admin/support/tickets/:id/reply", requireAdmin, support.adminReply);
router.post("/api/admin/support/tickets/:id/status", requireAdmin, support.setStatus);

module.exports = router;
