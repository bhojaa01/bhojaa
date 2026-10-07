const Router = require("../utils/router");
const auth = require("../controllers/auth.controller");
const admin = require("../controllers/admin.controller");
const home = require("../controllers/home.controller");
const { requireAdmin } = require("../middleware/auth");

const router = new Router();
router.post("/api/admin/login", auth.adminLogin);
router.get("/api/admin/ready", auth.adminReady);
router.post("/api/admin/setup", auth.adminSetup);
router.get("/api/admin/staff", requireAdmin, auth.adminList);
router.post("/api/admin/staff", requireAdmin, auth.adminCreate);
router.get("/api/admin/data", requireAdmin, admin.data);
router.post("/api/admin/categories", requireAdmin, admin.addCategory);
router.post("/api/admin/categories/:id/delete", requireAdmin, admin.removeCategory);
router.post("/api/admin/home", requireAdmin, home.save);
router.post("/api/admin/partners", requireAdmin, admin.addPartner);
router.post("/api/admin/partners/:id", requireAdmin, admin.updatePartner);
router.post("/api/admin/partners/:id/toggle", requireAdmin, admin.togglePartner);
router.post("/api/admin/partners/:id/delete", requireAdmin, admin.removePartner);

module.exports = router;
