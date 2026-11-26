function createRouter() {
  const routes = [];

  function add(method, pattern, handler, opts = {}) {
    const keys = [];
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('^' + escaped.replace(/:([^/]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    }) + '$');
    routes.push({ method, regex, keys, handler, auth: !!opts.auth, role: opts.role || null });
  }

  return {
    add,
    get: (pattern, handler, opts) => add('GET', pattern, handler, opts),
    post: (pattern, handler, opts) => add('POST', pattern, handler, opts),
    match(method, path) {
      for (const route of routes) {
        if (route.method !== method) continue;
        const m = route.regex.exec(path);
        if (!m) continue;
        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(m[i + 1]);
        });
        return { route, params };
      }
      return null;
    },
  };
}

module.exports = { createRouter };
