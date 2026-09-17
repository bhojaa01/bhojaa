const Router = require("../utils/router");
const need = require("../controllers/need.controller");
const { requireAuth } = require("../middleware/auth");

const router = new Router();
router.get("/api/needs", requireAuth, need.list);
router.post("/api/needs", requireAuth, need.create);
router.post("/api/needs/:id/offer", requireAuth, need.offer);
router.post("/api/needs/:id/delete", requireAuth, need.remove);

module.exports = router;
