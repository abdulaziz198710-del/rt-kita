const fs = require('node:fs');
const path = require('node:path');
const { createRouter } = require('./router');
const { parseCookies, parseBody, escapeHtml } = require('./httpUtils');
const registerRoutes = require('./routes');
const views = require('./views');

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function createApp({ db, uploadsDir, publicDir }) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const router = createRouter();
  registerRoutes(router, { db, uploadsDir });

  function send(res, code, headers, body) {
    res.writeHead(code, headers);
    res.end(body);
  }

  function decorate(res) {
    res.html = (s, code = 200) => send(res, code, { 'content-type': 'text/html; charset=utf-8' }, s);
    res.json = (o, code = 200) => send(res, code, { 'content-type': 'application/json; charset=utf-8' }, JSON.stringify(o));
    res.redirect = (loc, code = 303) => send(res, code, { location: loc }, '');
    res.text = (s, code = 200) => send(res, code, { 'content-type': 'text/plain; charset=utf-8' }, s);
  }

  function serveFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
      if (err) return send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'Tidak ditemukan');
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      send(res, 200, { 'content-type': type, 'cache-control': 'no-cache' }, data);
    });
  }

  function safeJoin(base, rel) {
    const p = path.normalize(path.join(base, rel));
    return p.startsWith(path.normalize(base)) ? p : null;
  }

  function loadUser(req) {
    const cookies = parseCookies(req);
    const token = cookies.rt_session;
    if (!token) return null;
    const row = db.prepare(
      "SELECT u.id, u.name, u.email, u.role, u.household_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')"
    ).get(token);
    if (row) {
      db.prepare("UPDATE sessions SET expires_at = datetime('now', '+7 days') WHERE token = ?").run(token);
    }
    return row || null;
  }

  return async function handler(req, res) {
    decorate(res);
    req.db = db;
    const url = new URL(req.url, 'http://localhost');
    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.user = loadUser(req);

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const parsed = await parseBody(req);
        req.body = parsed.fields;
        req.files = parsed.files;
      } catch (e) {
        return res.html(
          views.layout({ title: 'Error', user: req.user, content: `<h1>Permintaan tidak valid</h1><p>${escapeHtml(e.message)}</p>` }),
          413
        );
      }
    }

    if (req.path.startsWith('/public/')) {
      const f = safeJoin(publicDir, req.path.slice('/public/'.length));
      return f ? serveFile(res, f) : send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'Tidak ditemukan');
    }
    if (req.path.startsWith('/uploads/')) {
      const name = req.path.slice('/uploads/'.length);
      if (!/^[\w.-]+$/.test(name)) return send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'Tidak ditemukan');
      return serveFile(res, path.join(uploadsDir, name));
    }

    const match = router.match(req.method, req.path);
    if (!match) {
      if (!req.user) return res.redirect('/login');
      return res.html(
        views.layout({ title: '404', user: req.user, content: '<h1>404</h1><p>Halaman tidak ditemukan.</p><p><a href="/">Kembali ke dashboard</a></p>' }),
        404
      );
    }

    req.params = match.params;
    const { route } = match;
    if (route.auth && !req.user) return res.redirect('/login');
    if (route.role === 'pengurus' && req.user.role !== 'pengurus') {
      return res.html(
        views.layout({ title: '403', user: req.user, content: '<h1>403</h1><p>Hanya pengurus RT yang dapat mengakses halaman ini.</p><p><a href="/">Kembali ke dashboard</a></p>' }),
        403
      );
    }
    await route.handler(req, res);
  };
}

module.exports = { createApp };
