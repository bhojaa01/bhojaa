const Router = require("../utils/router");
const listing = require("../controllers/listing.controller");
const { requireAuth } = require("../middleware/auth");

const router = new Router();
router.get("/api/listings", requireAuth, listing.list);
router.post("/api/listings", requireAuth, listing.create);
router.get("/api/listings/:id", requireAuth, listing.get);
router.post("/api/listings/:id/request", requireAuth, listing.request);

module.exports = router;
