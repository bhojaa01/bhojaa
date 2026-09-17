const { distanceKm } = require("./geo");
const { col } = require("./mongo");

function Collection(name) {
  this.name = name;
  this.docs = [];
  this._seq = 1;
  this.indexes = [];
}

Collection.prototype.createIndex = function (spec) {
  this.indexes.push(spec);
  return this;
};

Collection.prototype.insertOne = function (doc) {
  const row = { _id: String(this._seq++), ...doc };
  this.docs.push(row);
  const c = col(this.name);
  if (c) c.insertOne({ ...row }).catch((e) => console.log("Atlas insert", this.name, e.message));
  return row;
};

Collection.prototype.find = function (query) {
  if (!query) return this.docs.slice();
  if (typeof query === "function") return this.docs.filter(query);
  return this.docs.filter((d) => Object.entries(query).every(([k, v]) => d[k] === v));
};

Collection.prototype.findOne = function (query) {
  return this.find(query)[0] || null;
};

Collection.prototype.findById = function (id) {
  return this.docs.find((d) => d._id === String(id)) || null;
};

Collection.prototype.updateById = function (id, patch) {
  const row = this.findById(id);
  if (!row) return null;
  Object.assign(row, patch);
  const c = col(this.name);
  if (c) c.updateOne({ _id: String(id) }, { $set: patch }).catch((e) => console.log("Atlas update", e.message));
  return row;
};

Collection.prototype.deleteById = function (id) {
  const i = this.docs.findIndex((d) => d._id === String(id));
  if (i < 0) return false;
  this.docs.splice(i, 1);
  const c = col(this.name);
  if (c) c.deleteOne({ _id: String(id) }).catch((e) => console.log("Atlas delete", e.message));
  return true;
};

Collection.prototype.geoNear = function (lng, lat, maxKm) {
  return this.docs
    .map((d) => ({ doc: d, distance: Number(distanceKm(d.location, lng, lat).toFixed(2)) }))
    .filter((x) => !Number.isFinite(maxKm) || x.distance <= maxKm)
    .sort((a, b) => a.distance - b.distance);
};

Collection.prototype.size = function () {
  return this.docs.length;
};

Collection.prototype.loadFromAtlas = async function () {
  const c = col(this.name);
  if (!c) return;
  const rows = await c.find({}).toArray();
  if (!rows.length) return;
  this.docs = rows;
  const max = rows.reduce((m, r) => Math.max(m, Number(r._id) || 0), 0);
  this._seq = max + 1;
};

module.exports = Collection;