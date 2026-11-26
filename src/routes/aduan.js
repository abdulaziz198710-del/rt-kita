const fs = require('node:fs');
const path = require('node:path');
const { escapeHtml, formatTanggal } = require('../httpUtils');
const { createToken } = require('../security');
const views = require('../views');
const { page } = require('./helpers');

const KATEGORI = [['kebersihan', 'Kebersihan'], ['keamanan', 'Keamanan'], ['fasilitas', 'Fasilitas Umum'], ['lainnya', 'Lainnya']];
const STATUS = [['baru', 'Baru'], ['diproses', 'Diproses'], ['selesai', 'Selesai']];
const FOTO_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const FOTO_MAX = 5 * 1024 * 1024;

function fotoHtml(foto) {
  return foto ? `<a href="/uploads/${escapeHtml(foto)}" target="_blank"><img class="thumb" src="/uploads/${escapeHtml(foto)}" alt="foto aduan"></a>` : '';
}

function register(router, { db, uploadsDir }) {
  router.get('/aduan', (req, res) => {
    if (req.user.role === 'pengurus') {
      const items = db.prepare(
        'SELECT c.*, u.name AS nama FROM complaints c JOIN users u ON u.id = c.user_id ORDER BY c.id DESC'
      ).all();
      const list = items.map((c) => `<div class="item">
        <div class="item-head">
          <strong>${escapeHtml(c.judul)}</strong>
          <span class="badge">${escapeHtml(c.kategori)}</span>
          ${views.badge(c.status)}
          <span class="muted">${escapeHtml(c.nama)} · ${escapeHtml(formatTanggal(c.created_at))}</span>
        </div>
        <p>${escapeHtml(c.isi)}</p>
        ${fotoHtml(c.foto)}
        ${c.tanggapan ? `<p class="tanggapan"><strong>Tanggapan:</strong> ${escapeHtml(c.tanggapan)}</p>` : ''}
        <form method="post" action="/aduan/${c.id}/status" class="form inline">
          ${views.select('status', STATUS, c.status)}
          <input type="text" name="tanggapan" value="${escapeHtml(c.tanggapan || '')}" placeholder="Tanggapan (opsional)">
          <button class="btn small" type="submit">Update status</button>
        </form>
      </div>`).join('') || '<p class="muted">Belum ada aduan.</p>';
      res.html(page(req, 'Aduan Warga', `<h1>Aduan Warga</h1>${list}`, 'aduan'));
      return;
    }

    const items = db.prepare('SELECT * FROM complaints WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    const list = items.map((c) => `<div class="item">
      <div class="item-head">
        <strong>${escapeHtml(c.judul)}</strong>
        <span class="badge">${escapeHtml(c.kategori)}</span>
        ${views.badge(c.status)}
        <span class="muted">${escapeHtml(formatTanggal(c.created_at))}</span>
      </div>
      <p>${escapeHtml(c.isi)}</p>
      ${fotoHtml(c.foto)}
      ${c.tanggapan ? `<p class="tanggapan"><strong>Tanggapan pengurus:</strong> ${escapeHtml(c.tanggapan)}</p>` : ''}
    </div>`).join('') || '<p class="muted">Anda belum mengirim aduan.</p>';

    res.html(page(req, 'Aduan', `
      <h1>Aduan Saya</h1>
      <h2>Kirim aduan baru</h2>
      <form method="post" action="/aduan" enctype="multipart/form-data" class="form">
        ${views.field('Judul', views.input('judul', { required: true, placeholder: 'mis. Lampu jalan mati' }))}
        ${views.field('Kategori', views.select('kategori', KATEGORI, 'lainnya'))}
        ${views.field('Isi aduan', views.textarea('isi', { required: true }))}
        ${views.field('Foto (opsional, maks 5 MB)', `<input type="file" name="foto" accept="image/*"><img id="foto-preview" class="thumb" style="display:none" alt="preview">`)}
        <button class="btn" type="submit">Kirim aduan</button>
      </form>
      <h2>Riwayat aduan saya</h2>
      ${list}
    `, 'aduan'));
  }, { auth: true });

  router.post('/aduan', (req, res) => {
    const judul = String(req.body.judul || '').trim();
    const kategori = String(req.body.kategori || 'lainnya');
    const isi = String(req.body.isi || '').trim();
    if (!judul || !isi || !KATEGORI.some(([k]) => k === kategori)) {
      return res.redirect('/aduan?error=' + encodeURIComponent('Judul, kategori, dan isi aduan wajib diisi'));
    }
    let fotoName = null;
    const foto = (req.files || []).find((f) => f.field === 'foto' && f.filename);
    if (foto) {
      const ext = path.extname(foto.filename).toLowerCase();
      if (!FOTO_EXT.includes(ext)) {
        return res.redirect('/aduan?error=' + encodeURIComponent('Format foto harus JPG, PNG, atau WEBP'));
      }
      if (foto.data.length === 0 || foto.data.length > FOTO_MAX) {
        return res.redirect('/aduan?error=' + encodeURIComponent('Ukuran foto maksimal 5 MB'));
      }
      fotoName = createToken() + ext;
      fs.writeFileSync(path.join(uploadsDir, fotoName), foto.data);
    }
    db.prepare('INSERT INTO complaints (user_id, judul, kategori, isi, foto) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, judul, kategori, isi, fotoName);
    res.redirect('/aduan?pesan=' + encodeURIComponent('Aduan terkirim. Pengurus RT akan menindaklanjuti.'));
  }, { auth: true });

  router.post('/aduan/:id/status', (req, res) => {
    const status = String(req.body.status || '');
    const tanggapan = String(req.body.tanggapan || '').trim();
    if (!STATUS.some(([s]) => s === status)) {
      return res.redirect('/aduan?error=' + encodeURIComponent('Status tidak valid'));
    }
    db.prepare("UPDATE complaints SET status = ?, tanggapan = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, tanggapan, req.params.id);
    res.redirect('/aduan?pesan=' + encodeURIComponent('Status aduan diperbarui'));
  }, { auth: true, role: 'pengurus' });
}

module.exports = { register };
