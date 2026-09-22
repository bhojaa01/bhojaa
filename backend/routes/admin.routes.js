const Router = require("../utils/router");
const auth = require("../controllers/auth.controller");
const admin = require("../controllers/admin.controller");
const { requireAdmin } = require("../middleware/auth");

const router = new Router();
router.post("/api/admin/login", auth.adminLogin);
router.get("/api/admin/ready", auth.adminReady);
router.post("/api/admin/setup", auth.adminSetup);
router.get("/api/admin/staff", requireAdmin, auth.adminList);
router.post("/api/admin/staff", requireAdmin, auth.adminCreate);
router.get("/api/admin/data", requireAdmin, admin.data);

module.exports = router;
