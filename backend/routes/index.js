const auth = require("./auth.routes");
const listing = require("./listing.routes");
const need = require("./need.routes");
const order = require("./order.routes");
const admin = require("./admin.routes");
const extra = require("./report.routes");

const routers = [auth, listing, need, order, admin, extra];

async function handle(req, res) {
  for (const router of routers) {
    if (await router.handle(req, res)) return true;
  }
  return false;
}

module.exports = { handle };
