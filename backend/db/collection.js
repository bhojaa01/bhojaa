const { distanceKm } = require("./geo");

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
  return row;
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

module.exports = Collection;
