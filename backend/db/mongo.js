const { MongoClient } = require("mongodb");

let db = null;

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log("No MONGO_URI — Atlas off, memory only");
    return null;
  }
  const client = new MongoClient(uri);
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