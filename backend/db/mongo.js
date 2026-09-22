const { MongoClient } = require("mongodb");

let db = null;

async function connectMongo() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    console.log("No MONGO_URI — Atlas off, memory only");
    return null;
  }
  try {
    const u = new URL(uri);
    if (!u.pathname || u.pathname === "/") u.pathname = "/bhojaa";
    uri = u.toString();
  } catch {}
  const client = new MongoClient(uri, { dbName: "bhojaa" });
  await client.connect();
  db = client.db("bhojaa");
  console.log("Atlas connected", db.databaseName);
  return db;
}

function col(name) {
  if (!db) return null;
  return db.collection(name);
}

module.exports = { connectMongo, col };