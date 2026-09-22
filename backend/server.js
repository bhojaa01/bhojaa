process.on("uncaughtException", (e) => {
  console.log("uncaught", e && e.stack ? e.stack : e);
});
process.on("unhandledRejection", (e) => {
  console.log("unhandled", e && e.stack ? e.stack : e);
});

const http = require("http");
const path = require("path");
const port = Number(process.env.PORT || 4000);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
};

let app = null;

http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    return res.end();
  }
  if (!app) {
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, booting: true }));
  }
  app(req, res).catch(() => {
    res.writeHead(500, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  });
}).listen(port, "0.0.0.0", () => console.log("API " + port));

setImmediate(() => {
  try {
    require("dotenv").config({ path: path.join(__dirname, ".env") });
    const { connectMongo } = require("./db/mongo");
    const db = require("./db");
    const seed = require("./db/seed");
    app = require("./app");
    connectMongo()
      .then(() => db.loadFromAtlas())
      .then(() => {
        seed();
        try { db.migrateIds(); } catch (e) { console.log("ids", e.message); }
      })
      .catch((e) => {
        console.log("Atlas", e.message);
        try { seed(); } catch (err) { console.log("seed", err.message); }
      });
  } catch (e) {
    console.log("BOOT", e && e.stack ? e.stack : e);
  }
});
