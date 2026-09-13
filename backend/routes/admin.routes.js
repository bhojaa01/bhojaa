const Router = require("../utils/router");
const auth = require("../controllers/auth.controller");
const admin = require("../controllers/admin.controller");
const { requireAdmin } = require("../middleware/auth");

const router = new Router();
router.post("/api/admin/login", auth.adminLogin);
router.get("/api/admin/data", requireAdmin, admin.data);

module.exports = router;
