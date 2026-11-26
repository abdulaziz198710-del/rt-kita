const { escapeHtml, formatRupiah, formatTanggal, currentPeriode, namaPeriode } = require('../httpUtils');
const views = require('../views');
const { page } = require('./helpers');

function register(router, { db }) {
  router.get('/', async (req, res) => {
    const u = req.user;
    const periode = currentPeriode();
    const announcements = db.prepare(
      'SELECT a.*, u.name AS author FROM announcements a LEFT JOIN users u ON u.id = a.created_by ORDER BY a.id DESC LIMIT 3'
    ).all();

    if (u.role === 'pengurus') {
      const kk = db.prepare('SELECT COUNT(*) AS c FROM households').get().c;
      const wargaCount = db.prepare('SELECT COUNT(*) AS c FROM residents').get().c;
      const saldo = db.prepare("SELECT COALESCE(SUM(CASE WHEN type='masuk' THEN jumlah ELSE -jumlah END), 0) AS s FROM transactions").get().s;
      const aduanOpen = db.prepare("SELECT COUNT(*) AS c FROM complaints WHERE status != 'selesai'").get().c;
      const iuran = db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'lunas' THEN 1 ELSE 0 END), 0) AS lunas FROM dues WHERE periode = ?").get(periode);
      const complaints = db.prepare(
        'SELECT c.*, u.name AS nama FROM complaints c JOIN users u ON u.id = c.user_id ORDER BY c.id DESC LIMIT 5'
      ).all();

      const complaintRows = complaints.map((c) => `<tr>
        <td>${c.id}</td>
        <td>${escapeHtml(c.judul)}</td>
        <td>${escapeHtml(c.nama)}</td>
        <td>${views.badge(c.status)}</td>
        <td class="muted">${escapeHtml(formatTanggal(c.created_at))}</td>
      </tr>`).join('');

      res.html(page(req, 'Dashboard', `
        <h1>Dashboard</h1>
        <p class="muted">Ringkasan RT — ${escapeHtml(namaPeriode(periode))}</p>
        <div class="cards">
          ${views.card('Kartu Keluarga', kk)}
          ${views.card('Warga', wargaCount)}
          ${views.card('Saldo Kas', escapeHtml(formatRupiah(saldo)))}
          ${views.card(`Iuran ${escapeHtml(namaPeriode(periode))}`, `${iuran.lunas}/${iuran.total} lunas`, `<a href="/kas?periode=${periode}">Lihat iuran</a>`)}
          ${views.card('Aduan belum selesai', aduanOpen, '<a href="/aduan">Lihat aduan</a>')}
        </div>
        <h2>Pengumuman terbaru</h2>
        ${announcements.map(views.announcementItem).join('') || '<p class="muted">Belum ada pengumuman.</p>'}
        <h2>Aduan terbaru</h2>
        ${views.table(['ID', 'Judul', 'Pelapor', 'Status', 'Tanggal'], complaintRows)}
      `, 'dashboard'));
      return;
    }

    const hh = u.household_id ? db.prepare('SELECT * FROM households WHERE id = ?').get(u.household_id) : null;
    const residents = hh ? db.prepare('SELECT * FROM residents WHERE household_id = ? ORDER BY id').all(hh.id) : [];
    const dues = hh ? db.prepare('SELECT * FROM dues WHERE household_id = ? ORDER BY periode DESC').all(hh.id) : [];
    const myComplaints = db.prepare('SELECT * FROM complaints WHERE user_id = ? ORDER BY id DESC LIMIT 5').all(u.id);

    const kkInfo = hh ? `
      <div class="card">
        <div class="card-title">Kartu Keluarga</div>
        <div class="card-value">${escapeHtml(hh.no_kk)}</div>
        <div class="card-sub">${escapeHtml(hh.kepala_keluarga)} · ${escapeHtml(hh.alamat)}</div>
      </div>` : '<p class="alert warning">Akun Anda belum terhubung ke KK. Silakan hubungi pengurus RT.</p>';

    const dueRows = dues.map((d) => `<tr>
      <td>${escapeHtml(namaPeriode(d.periode))}</td>
      <td>${escapeHtml(formatRupiah(d.jumlah))}</td>
      <td>${views.badge(d.status)}</td>
      <td class="muted">${escapeHtml(formatTanggal(d.paid_at))}</td>
    </tr>`).join('');

    const complaintRows = myComplaints.map((c) => `<tr>
      <td>${escapeHtml(c.judul)}</td>
      <td>${escapeHtml(c.kategori)}</td>
      <td>${views.badge(c.status)}</td>
      <td class="muted">${escapeHtml(formatTanggal(c.created_at))}</td>
    </tr>`).join('');

    res.html(page(req, 'Dashboard', `
      <h1>Halo, ${escapeHtml(u.name)}</h1>
      <div class="cards">
        ${kkInfo}
        ${hh ? views.card('Anggota Keluarga', residents.length) : ''}
      </div>
      ${hh ? `<h2>Iuran saya</h2>${views.table(['Periode', 'Jumlah', 'Status', 'Dibayar'], dueRows)}` : ''}
      <h2>Pengumuman terbaru</h2>
      ${announcements.map(views.announcementItem).join('') || '<p class="muted">Belum ada pengumuman.</p>'}
      <h2>Aduan saya</h2>
      ${views.table(['Judul', 'Kategori', 'Status', 'Tanggal'], complaintRows)}
    `, 'dashboard'));
  }, { auth: true });
}

module.exports = { register };
