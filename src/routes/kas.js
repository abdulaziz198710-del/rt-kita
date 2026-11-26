const { escapeHtml, formatRupiah, formatTanggal, currentPeriode, currentTanggal, namaPeriode } = require('../httpUtils');
const views = require('../views');
const { page } = require('./helpers');

function saldo(db) {
  return db.prepare("SELECT COALESCE(SUM(CASE WHEN type='masuk' THEN jumlah ELSE -jumlah END), 0) AS s FROM transactions").get().s;
}

function register(router, { db }) {
  router.get('/kas', (req, res) => {
    const periode = /^\d{4}-\d{2}$/.test(req.query.periode || '') ? req.query.periode : currentPeriode();
    const masuk = db.prepare("SELECT COALESCE(SUM(jumlah), 0) AS s FROM transactions WHERE type = 'masuk' AND strftime('%Y-%m', tanggal) = ?").get(periode).s;
    const keluar = db.prepare("SELECT COALESCE(SUM(jumlah), 0) AS s FROM transactions WHERE type = 'keluar' AND strftime('%Y-%m', tanggal) = ?").get(periode).s;
    const transaksi = db.prepare(
      'SELECT t.*, u.name AS oleh FROM transactions t LEFT JOIN users u ON u.id = t.created_by ORDER BY t.tanggal DESC, t.id DESC LIMIT 100'
    ).all();
    const dues = db.prepare(
      'SELECT d.*, h.no_kk, h.kepala_keluarga FROM dues d JOIN households h ON h.id = d.household_id WHERE d.periode = ? ORDER BY h.no_kk'
    ).all(periode);
    const totalKK = db.prepare('SELECT COUNT(*) AS c FROM households').get().c;

    const txRows = transaksi.map((t) => `<tr>
      <td class="muted">${escapeHtml(formatTanggal(t.tanggal))}</td>
      <td>${views.badge(t.type)}</td>
      <td>${escapeHtml(t.kategori)}</td>
      <td>${escapeHtml(formatRupiah(t.jumlah))}</td>
      <td>${escapeHtml(t.keterangan || '-')}</td>
      <td class="muted">${escapeHtml(t.oleh || '-')}</td>
      <td>
        <form method="post" action="/kas/transaksi/${t.id}/hapus" onsubmit="return confirm('Hapus transaksi ini?')">
          <button class="btn small danger" type="submit">Hapus</button>
        </form>
      </td>
    </tr>`).join('');

    const dueRows = dues.map((d) => `<tr>
      <td>${escapeHtml(d.no_kk)}</td>
      <td>${escapeHtml(d.kepala_keluarga)}</td>
      <td>${escapeHtml(formatRupiah(d.jumlah))}</td>
      <td>${views.badge(d.status)}</td>
      <td class="muted">${escapeHtml(formatTanggal(d.paid_at))}</td>
      <td>
        ${d.status === 'lunas'
          ? `<form method="post" action="/kas/iuran/${d.id}/belum"><button class="btn small" type="submit">Tandai belum</button></form>`
          : `<form method="post" action="/kas/iuran/${d.id}/lunas"><button class="btn small ok" type="submit">Tandai lunas</button></form>`}
      </td>
    </tr>`).join('');

    res.html(page(req, 'Kas RT', `
      <h1>Kas RT</h1>
      <div class="cards">
        ${views.card('Saldo kas', escapeHtml(formatRupiah(saldo(db))))}
        ${views.card(`Pemasukan ${escapeHtml(namaPeriode(periode))}`, escapeHtml(formatRupiah(masuk)))}
        ${views.card(`Pengeluaran ${escapeHtml(namaPeriode(periode))}`, escapeHtml(formatRupiah(keluar)))}
      </div>
      <p><a href="/kas/laporan?periode=${periode}">📄 Laporan kas periode ${escapeHtml(namaPeriode(periode))}</a></p>

      <h2>Tambah transaksi</h2>
      <form method="post" action="/kas/transaksi" class="form inline">
        ${views.field('Jenis', views.select('type', [['masuk', 'Pemasukan'], ['keluar', 'Pengeluaran']], 'masuk'))}
        ${views.field('Kategori', `<input type="text" name="kategori" list="kategori-list" required placeholder="mis. Iuran, Kebersihan">
          <datalist id="kategori-list">
            <option value="Iuran"></option><option value="Kebersihan"></option><option value="Keamanan"></option>
            <option value="Perbaikan"></option><option value="Kegiatan"></option><option value="Lainnya"></option>
          </datalist>`)}
        ${views.field('Jumlah (Rp)', views.input('jumlah', { type: 'number', min: 1, step: 1, required: true, placeholder: '50000' }))}
        ${views.field('Tanggal', views.input('tanggal', { type: 'date', required: true, value: currentTanggal() }))}
        ${views.field('Keterangan', views.input('keterangan', { placeholder: 'opsional' }))}
        <button class="btn" type="submit">Simpan</button>
      </form>

      <h2>Transaksi (100 terakhir)</h2>
      ${views.table(['Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Keterangan', 'Oleh', 'Aksi'], txRows)}

      <h2>Iuran — ${escapeHtml(namaPeriode(periode))}</h2>
      <form method="post" action="/kas/iuran/generate" class="form inline">
        ${views.field('Periode', views.input('periode', { type: 'month', required: true, value: periode }))}
        ${views.field('Jumlah per KK (Rp)', views.input('jumlah', { type: 'number', min: 1, step: 1, required: true, placeholder: '50000' }))}
        <button class="btn" type="submit">Buat iuran untuk semua KK (${totalKK})</button>
      </form>
      ${views.table(['No. KK', 'Kepala Keluarga', 'Jumlah', 'Status', 'Dibayar', 'Aksi'], dueRows)}
    `, 'kas'));
  }, { auth: true, role: 'pengurus' });

  router.post('/kas/transaksi', (req, res) => {
    const type = String(req.body.type || '');
    const kategori = String(req.body.kategori || '').trim();
    const jumlah = Number.parseInt(String(req.body.jumlah || ''), 10);
    const tanggal = String(req.body.tanggal || '');
    const keterangan = String(req.body.keterangan || '').trim();
    if (!['masuk', 'keluar'].includes(type) || !kategori || !Number.isInteger(jumlah) || jumlah <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return res.redirect('/kas?error=' + encodeURIComponent('Data transaksi tidak valid'));
    }
    db.prepare('INSERT INTO transactions (type, kategori, jumlah, tanggal, keterangan, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(type, kategori, jumlah, tanggal, keterangan, req.user.id);
    res.redirect('/kas?pesan=' + encodeURIComponent('Transaksi tersimpan'));
  }, { auth: true, role: 'pengurus' });

  router.post('/kas/transaksi/:id/hapus', (req, res) => {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    res.redirect('/kas?pesan=' + encodeURIComponent('Transaksi dihapus'));
  }, { auth: true, role: 'pengurus' });

  router.post('/kas/iuran/generate', (req, res) => {
    const periode = String(req.body.periode || '');
    const jumlah = Number.parseInt(String(req.body.jumlah || ''), 10);
    if (!/^\d{4}-\d{2}$/.test(periode) || !Number.isInteger(jumlah) || jumlah <= 0) {
      return res.redirect('/kas?error=' + encodeURIComponent('Periode atau jumlah tidak valid'));
    }
    const households = db.prepare('SELECT id FROM households').all();
    const stmt = db.prepare('INSERT OR IGNORE INTO dues (household_id, periode, jumlah) VALUES (?, ?, ?)');
    for (const h of households) stmt.run(h.id, periode, jumlah);
    res.redirect(`/kas?periode=${periode}&pesan=` + encodeURIComponent(`Iuran ${namaPeriode(periode)} dibuat untuk ${households.length} KK`));
  }, { auth: true, role: 'pengurus' });

  router.post('/kas/iuran/:id/lunas', (req, res) => {
    const due = db.prepare('SELECT periode FROM dues WHERE id = ?').get(req.params.id);
    db.prepare("UPDATE dues SET status = 'lunas', paid_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.redirect(`/kas?periode=${due ? due.periode : ''}&pesan=` + encodeURIComponent('Iuran ditandai lunas'));
  }, { auth: true, role: 'pengurus' });

  router.post('/kas/iuran/:id/belum', (req, res) => {
    const due = db.prepare('SELECT periode FROM dues WHERE id = ?').get(req.params.id);
    db.prepare("UPDATE dues SET status = 'belum', paid_at = NULL WHERE id = ?").run(req.params.id);
    res.redirect(`/kas?periode=${due ? due.periode : ''}&pesan=` + encodeURIComponent('Status iuran dikembalikan ke belum'));
  }, { auth: true, role: 'pengurus' });

  router.get('/kas/laporan', (req, res) => {
    const periode = /^\d{4}-\d{2}$/.test(req.query.periode || '') ? req.query.periode : currentPeriode();
    const rows = db.prepare(
      'SELECT t.*, u.name AS oleh FROM transactions t LEFT JOIN users u ON u.id = t.created_by WHERE strftime(\'%Y-%m\', t.tanggal) = ? ORDER BY t.tanggal, t.id'
    ).all(periode);
    const masuk = rows.filter((r) => r.type === 'masuk').reduce((a, r) => a + r.jumlah, 0);
    const keluar = rows.filter((r) => r.type === 'keluar').reduce((a, r) => a + r.jumlah, 0);
    const tableRows = rows.map((t) => `<tr>
      <td class="muted">${escapeHtml(formatTanggal(t.tanggal))}</td>
      <td>${views.badge(t.type)}</td>
      <td>${escapeHtml(t.kategori)}</td>
      <td>${escapeHtml(formatRupiah(t.jumlah))}</td>
      <td>${escapeHtml(t.keterangan || '-')}</td>
      <td class="muted">${escapeHtml(t.oleh || '-')}</td>
    </tr>`).join('');

    res.html(page(req, `Laporan Kas ${namaPeriode(periode)}`, `
      <p><a href="/kas?periode=${periode}">← Kembali ke Kas RT</a></p>
      <h1>Laporan Kas — ${escapeHtml(namaPeriode(periode))}</h1>
      <div class="cards">
        ${views.card('Saldo kas saat ini', escapeHtml(formatRupiah(saldo(db))))}
        ${views.card('Pemasukan', escapeHtml(formatRupiah(masuk)))}
        ${views.card('Pengeluaran', escapeHtml(formatRupiah(keluar)))}
        ${views.card('Saldo periode', escapeHtml(formatRupiah(masuk - keluar)))}
      </div>
      ${views.table(['Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Keterangan', 'Oleh'], tableRows)}
    `, 'kas'));
  }, { auth: true, role: 'pengurus' });

  router.get('/kas/saya', (req, res) => {
    const u = req.user;
    if (!u.household_id) {
      return res.html(page(req, 'Iuran Saya', '<h1>Iuran Saya</h1><p class="alert warning">Akun Anda belum terhubung ke KK. Silakan hubungi pengurus RT.</p>', 'iuran'));
    }
    const hh = db.prepare('SELECT * FROM households WHERE id = ?').get(u.household_id);
    const dues = db.prepare('SELECT * FROM dues WHERE household_id = ? ORDER BY periode DESC').all(u.household_id);
    const rows = dues.map((d) => `<tr>
      <td>${escapeHtml(namaPeriode(d.periode))}</td>
      <td>${escapeHtml(formatRupiah(d.jumlah))}</td>
      <td>${views.badge(d.status)}</td>
      <td class="muted">${escapeHtml(formatTanggal(d.paid_at))}</td>
    </tr>`).join('');
    res.html(page(req, 'Iuran Saya', `
      <h1>Iuran Saya</h1>
      <p class="muted">KK ${escapeHtml(hh.no_kk)} · ${escapeHtml(hh.kepala_keluarga)}</p>
      ${views.table(['Periode', 'Jumlah', 'Status', 'Dibayar'], rows)}
    `, 'iuran'));
  }, { auth: true });
}

module.exports = { register };
