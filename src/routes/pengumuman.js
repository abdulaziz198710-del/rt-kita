const { escapeHtml, formatTanggal } = require('../httpUtils');
const views = require('../views');
const { page } = require('./helpers');

function register(router, { db }) {
  router.get('/pengumuman', (req, res) => {
    const items = db.prepare(
      'SELECT a.*, u.name AS author FROM announcements a LEFT JOIN users u ON u.id = a.created_by ORDER BY a.id DESC'
    ).all();
    const isPengurus = req.user.role === 'pengurus';

    const list = items.map((a) => `
      <div class="item${a.penting ? ' penting' : ''}">
        <div class="item-head">
          <strong>${escapeHtml(a.judul)}</strong>
          ${a.penting ? '<span class="badge penting">penting</span>' : ''}
          <span class="muted">${escapeHtml(formatTanggal(a.created_at))}${a.author ? ' · oleh ' + escapeHtml(a.author) : ''}</span>
          ${isPengurus ? `<form method="post" action="/pengumuman/${a.id}/hapus" onsubmit="return confirm('Hapus pengumuman ini?')" style="display:inline"><button class="btn small danger" type="submit">Hapus</button></form>` : ''}
        </div>
        <p>${escapeHtml(a.isi)}</p>
      </div>`).join('') || '<p class="muted">Belum ada pengumuman.</p>';

    const form = isPengurus ? `
      <h2>Buat pengumuman</h2>
      <form method="post" action="/pengumuman" class="form">
        ${views.field('Judul', views.input('judul', { required: true }))}
        ${views.field('Isi', views.textarea('isi', { required: true }))}
        <label class="field"><span>&nbsp;</span><label class="checkbox"><input type="checkbox" name="penting" value="1"> Tandai penting</label></label>
        <button class="btn" type="submit">Terbitkan</button>
      </form>` : '';

    res.html(page(req, 'Pengumuman', `<h1>Pengumuman</h1>${form}<h2>Daftar pengumuman</h2>${list}`, 'pengumuman'));
  }, { auth: true });

  router.post('/pengumuman', (req, res) => {
    const judul = String(req.body.judul || '').trim();
    const isi = String(req.body.isi || '').trim();
    if (!judul || !isi) {
      return res.redirect('/pengumuman?error=' + encodeURIComponent('Judul dan isi wajib diisi'));
    }
    db.prepare('INSERT INTO announcements (judul, isi, penting, created_by) VALUES (?, ?, ?, ?)')
      .run(judul, isi, req.body.penting ? 1 : 0, req.user.id);
    res.redirect('/pengumuman?pesan=' + encodeURIComponent('Pengumuman diterbitkan'));
  }, { auth: true, role: 'pengurus' });

  router.post('/pengumuman/:id/hapus', (req, res) => {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.redirect('/pengumuman?pesan=' + encodeURIComponent('Pengumuman dihapus'));
  }, { auth: true, role: 'pengurus' });
}

module.exports = { register };
