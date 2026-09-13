const Router = require("../utils/router");
const order = require("../controllers/order.controller");
const review = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth");

const router = new Router();
router.get("/api/mine", requireAuth, order.mine);
router.get("/api/orders/:id", requireAuth, order.get);
router.post("/api/orders/:id/accept", requireAuth, order.accept);
router.post("/api/orders/:id/collect", requireAuth, order.collect);
router.post("/api/orders/:id/review", requireAuth, review.create);

module.exports = router;
