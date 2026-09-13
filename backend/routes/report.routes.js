const Router = require("../utils/router");
const report = require("../controllers/report.controller");
const category = require("../controllers/category.controller");
const { requireAuth } = require("../middleware/auth");

const router = new Router();
router.post("/api/reports", requireAuth, report.create);
router.get("/api/categories", requireAuth, category.list);

module.exports = router;
