const Router = require("../utils/router");
const auth = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

const router = new Router();
router.post("/api/otp", auth.sendOtp);
router.post("/api/login", auth.login);
router.get("/api/me", requireAuth, auth.me);
router.post("/api/me", requireAuth, auth.updateMe);
router.post("/api/logout", requireAuth, auth.logout);

module.exports = router;
