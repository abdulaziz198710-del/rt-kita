const { escapeHtml } = require('../httpUtils');
const { verifyPassword, createToken } = require('../security');
const views = require('../views');

function register(router, { db }) {
  router.get('/login', (req, res) => {
    if (req.user) return res.redirect('/');
    const err = req.query.error ? `<p class="alert error">${escapeHtml(req.query.error)}</p>` : '';
    res.html(views.layout({
      title: 'Masuk',
      user: null,
      content: `
        <div class="login-box">
          <h1>🏘️ RT Kita</h1>
          <p class="muted">Masuk ke aplikasi RT</p>
          ${err}
          <form method="post" action="/login" class="form">
            ${views.field('Email', views.input('email', { type: 'email', required: true, placeholder: 'admin@rt.local' }))}
            ${views.field('Password', views.input('password', { type: 'password', required: true }))}
            <button class="btn" type="submit">Masuk</button>
          </form>
          <p class="muted">Akun default — pengurus: <code>admin@rt.local / admin123</code>, warga: <code>warga@rt.local / warga123</code></p>
        </div>`,
    }));
  });

  router.post('/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.redirect('/login?error=' + encodeURIComponent('Email atau password salah'));
    }
    const token = createToken();
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))").run(token, user.id);
    res.writeHead(303, {
      location: '/',
      'set-cookie': `rt_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
    });
    res.end();
  });

  router.post('/logout', (req, res) => {
    const token = (req.headers.cookie || '').match(/rt_session=([^;]+)/)?.[1];
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.writeHead(303, {
      location: '/login',
      'set-cookie': 'rt_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
    });
    res.end();
  });
}

module.exports = { register };
