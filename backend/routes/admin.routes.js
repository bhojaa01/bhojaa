const Router = require("../utils/router");
const auth = require("../controllers/auth.controller");
const admin = require("../controllers/admin.controller");
const home = require("../controllers/home.controller");
const visit = require("../controllers/visit.controller");
const { requireAdmin, requirePerm } = require("../middleware/auth");

const router = new Router();
router.post("/api/admin/login", auth.adminLogin);
router.get("/api/admin/ready", auth.adminReady);
router.post("/api/admin/setup", auth.adminSetup);
router.get("/api/admin/me", requireAdmin, auth.adminMe);
router.get("/api/admin/staff", requirePerm("super"), auth.adminList);
router.post("/api/admin/staff", requirePerm("super"), auth.adminCreate);
router.post("/api/admin/staff/:id", requirePerm("super"), auth.adminUpdate);
router.post("/api/admin/staff/:id/delete", requirePerm("super"), auth.adminRemove);
router.get("/api/admin/data", requireAdmin, admin.data);
router.post("/api/admin/categories", requirePerm("categories", "write"), admin.addCategory);
router.post("/api/admin/categories/:id/delete", requirePerm("categories", "write"), admin.removeCategory);
router.post("/api/admin/home", requirePerm("home", "write"), home.save);
router.get("/api/admin/visits", requirePerm("visits", "read"), visit.list);
router.post("/api/admin/visits/toggle", requirePerm("visits", "write"), visit.toggle);
router.post("/api/admin/partners", requirePerm("partners", "write"), admin.addPartner);
router.post("/api/admin/partners/:id", requirePerm("partners", "write"), admin.updatePartner);
router.post("/api/admin/partners/:id/toggle", requirePerm("partners", "write"), admin.togglePartner);
router.post("/api/admin/partners/:id/delete", requirePerm("partners", "write"), admin.removePartner);

module.exports = router;
