function compile(pattern) {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:([^/]+)/g, (_, k) => {
    keys.push(k);
    return "([^/]+)";
  }) + "$");
  return { re, keys };
}

function Router() {
  this.stack = [];
}

Router.prototype.add = function (method, path, ...handlers) {
  this.stack.push({ method, path, handlers, ...compile(path) });
};

Router.prototype.get = function (path, ...handlers) { this.add("GET", path, ...handlers); };
Router.prototype.post = function (path, ...handlers) { this.add("POST", path, ...handlers); };

Router.prototype.handle = async function (req, res) {
  const url = new URL(req.url, "http://localhost");
  req.pathname = url.pathname;
  req.query = Object.fromEntries(url.searchParams);
  for (const route of this.stack) {
    if (route.method !== req.method) continue;
    const m = req.pathname.match(route.re);
    if (!m) continue;
    req.params = {};
    route.keys.forEach((k, i) => { req.params[k] = m[i + 1]; });
    for (const fn of route.handlers) {
      let next = false;
      await fn(req, res, () => { next = true; });
      if (!next) return true;
    }
    return true;
  }
  return false;
};

module.exports = Router;
