const { distanceKm } = require("./geo");
const { col } = require("./mongo");
const { stamp } = require("./time");

function Collection(name, prefix) {
  this.name = name;
  this.prefix = prefix || "";
  this.docs = [];
  this._seq = 1;
  this.indexes = [];
}

Collection.prototype.createIndex = function (spec) {
  this.indexes.push(spec);
  return this;
};

Collection.prototype.nextId = function () {
  if (!this.prefix) return String(this._seq++);
  let max = 1000;
  const re = new RegExp("^" + this.prefix + "(\\d+)$", "i");
  this.docs.forEach((d) => {
    const m = String(d._id || "").match(re);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return this.prefix + (max + 1);
};

Collection.prototype.insertOne = function (doc) {
  const id = doc && doc._id ? String(doc._id) : this.nextId();
  const row = stamp({ ...doc, _id: id });
  this.docs.push(row);
  const c = col(this.name);
  if (c) c.insertOne({ ...row }).catch((e) => console.log("Atlas insert", this.name, e.message));
  return row;
};

Collection.prototype.migrateIds = function () {
  if (!this.prefix) return [];
  const re = new RegExp("^" + this.prefix + "\\d+$", "i");
  const map = [];
  this.docs.slice().forEach((row) => {
    if (re.test(String(row._id))) return;
    const old = String(row._id);
    const id = this.nextId();
    const i = this.docs.findIndex((d) => String(d._id) === old);
    if (i >= 0) this.docs.splice(i, 1);
    const c = col(this.name);
    if (c) c.deleteOne({ _id: old }).catch(() => {});
    row._id = id;
    this.save(row);
    map.push([old, id]);
  });
  return map;
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
  const s = String(id);
  return this.docs.find((d) => String(d._id) === s) || null;
};

Collection.prototype.updateById = function (id, patch) {
  const row = this.findById(id);
  if (!row) return null;
  Object.assign(row, stamp(patch));
  const c = col(this.name);
  if (c) c.updateOne({ _id: String(id) }, { $set: stamp({ ...patch }) }).catch((e) => console.log("Atlas update", e.message));
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

Collection.prototype.save = function (row) {
  if (!row || row._id == null) return row;
  const id = String(row._id);
  row._id = id;
  const i = this.docs.findIndex((d) => String(d._id) === id);
  if (i < 0) this.docs.push(row);
  else this.docs[i] = row;
  const c = col(this.name);
  stamp(row);
  if (c) c.replaceOne({ _id: id }, { ...row }, { upsert: true }).catch((e) => console.log("DB save", this.name, e.message));
  return row;
};

Collection.prototype.loadFromAtlas = async function () {
  const c = col(this.name);
  if (!c) return;
  const rows = await c.find({}).toArray();
  this.docs = rows.map((r) => stamp({ ...r, _id: String(r._id) }));
  const max = this.docs.reduce((m, r) => Math.max(m, Number(r._id) || 0), 0);
  this._seq = max + 1;
  if (c && this.docs.length) {
    await Promise.all(this.docs.map((row) => c.replaceOne({ _id: String(row._id) }, { ...row }, { upsert: true })));
  }
};

module.exports = Collection;