const { escapeHtml, formatTanggal } = require('../httpUtils');
const { hashPassword } = require('../security');
const views = require('../views');
const { page } = require('./helpers');

function register(router, { db }) {
  router.get('/warga', (req, res) => {
    const rows = db.prepare(
      'SELECT h.*, (SELECT COUNT(*) FROM residents r WHERE r.household_id = h.id) AS jumlah FROM households h ORDER BY h.id'
    ).all();
    const body = rows.map((h) => `<tr>
      <td>${escapeHtml(h.no_kk)}</td>
      <td>${escapeHtml(h.kepala_keluarga)}</td>
      <td>${escapeHtml(h.alamat)}</td>
      <td>${h.jumlah}</td>
      <td class="muted">${escapeHtml(formatTanggal(h.created_at))}</td>
      <td><a class="btn small" href="/warga/kk/${h.id}">Detail</a></td>
    </tr>`).join('');

    res.html(page(req, 'Data Warga', `
      <h1>Data Warga & KK</h1>
      <h2>Tambah KK baru</h2>
      <form method="post" action="/warga/kk" class="form inline">
        ${views.field('No. KK', views.input('no_kk', { required: true, placeholder: '3201000003' }))}
        ${views.field('Kepala keluarga', views.input('kepala_keluarga', { required: true }))}
        ${views.field('Alamat', views.input('alamat', { required: true }))}
        <button class="btn" type="submit">Simpan KK</button>
      </form>
      <h2>Daftar KK</h2>
      ${views.table(['No. KK', 'Kepala Keluarga', 'Alamat', 'Anggota', 'Terdaftar', 'Aksi'], body)}
    `, 'warga'));
  }, { auth: true, role: 'pengurus' });

  router.post('/warga/kk', (req, res) => {
    const noKk = String(req.body.no_kk || '').trim();
    const kepala = String(req.body.kepala_keluarga || '').trim();
    const alamat = String(req.body.alamat || '').trim();
    if (!noKk || !kepala || !alamat) {
      return res.redirect('/warga?error=' + encodeURIComponent('Semua isian wajib diisi'));
    }
    db.prepare('INSERT INTO households (no_kk, kepala_keluarga, alamat) VALUES (?, ?, ?)').run(noKk, kepala, alamat);
    res.redirect('/warga?pesan=' + encodeURIComponent('KK berhasil ditambahkan'));
  }, { auth: true, role: 'pengurus' });

  router.get('/warga/kk/:id', (req, res) => {
    const hh = db.prepare('SELECT * FROM households WHERE id = ?').get(req.params.id);
    if (!hh) return res.redirect('/warga?error=' + encodeURIComponent('KK tidak ditemukan'));
    const residents = db.prepare('SELECT * FROM residents WHERE household_id = ? ORDER BY id').all(hh.id);
    const accounts = db.prepare('SELECT id, name, email, role FROM users WHERE household_id = ? ORDER BY id').all(hh.id);

    const residentRows = residents.map((r) => `<tr>
      <td>${escapeHtml(r.nama)}</td>
      <td>${escapeHtml(r.nik || '-')}</td>
      <td>${escapeHtml(r.jenis_kelamin || '-')}</td>
      <td>${escapeHtml(r.status)}</td>
      <td>
        <form method="post" action="/warga/resident/${r.id}/hapus" onsubmit="return confirm('Hapus data warga ini?')">
          <button class="btn small danger" type="submit">Hapus</button>
        </form>
      </td>
    </tr>`).join('');

    const residentOptions = residents.map((r) => [r.id, r.nama]);
    const accountRows = accounts.map((a) => `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.email)}</td><td>${escapeHtml(a.role)}</td></tr>`).join('');

    res.html(page(req, `KK ${hh.no_kk}`, `
      <p><a href="/warga">← Kembali ke daftar KK</a></p>
      <h1>KK ${escapeHtml(hh.no_kk)}</h1>
      <p class="muted">${escapeHtml(hh.kepala_keluarga)} · ${escapeHtml(hh.alamat)}</p>

      <h2>Tambah anggota keluarga</h2>
      <form method="post" action="/warga/kk/${hh.id}/resident" class="form inline">
        ${views.field('Nama', views.input('nama', { required: true }))}
        ${views.field('NIK', views.input('nik', { placeholder: '16 digit' }))}
        ${views.field('Jenis kelamin', views.select('jenis_kelamin', [['L', 'Laki-laki'], ['P', 'Perempuan']]))}
        ${views.field('Status', views.select('status', [['tetap', 'Tetap'], ['kontrak', 'Kontrak'], ['pindah', 'Pindah']], 'tetap'))}
        <button class="btn" type="submit">Tambah</button>
      </form>
      <h2>Anggota keluarga (${residents.length})</h2>
      ${views.table(['Nama', 'NIK', 'JK', 'Status', 'Aksi'], residentRows)}

      <h2>Buat akun login untuk warga</h2>
      <form method="post" action="/warga/kk/${hh.id}/akun" class="form inline">
        ${views.field('Warga', views.select('resident_id', residentOptions.length ? residentOptions : [['', '(belum ada anggota)']] ))}
        ${views.field('Email', views.input('email', { type: 'email', required: true, placeholder: 'nama@email.com' }))}
        ${views.field('Password', views.input('password', { type: 'password', required: true, min: 6 }))}
        <button class="btn" type="submit">Buat akun</button>
      </form>
      ${accountRows ? `<h2>Akun terdaftar</h2>${views.table(['Nama', 'Email', 'Role'], accountRows)}` : ''}

      <h2>Zona bahaya</h2>
      <form method="post" action="/warga/kk/${hh.id}/hapus" onsubmit="return confirm('Hapus KK beserta seluruh anggotanya?')">
        <button class="btn danger" type="submit">Hapus KK ini</button>
      </form>
    `, 'warga'));
  }, { auth: true, role: 'pengurus' });

  router.post('/warga/kk/:id/resident', (req, res) => {
    const nama = String(req.body.nama || '').trim();
    if (!nama) return res.redirect(`/warga/kk/${req.params.id}?error=` + encodeURIComponent('Nama wajib diisi'));
    db.prepare('INSERT INTO residents (household_id, nama, nik, jenis_kelamin, status) VALUES (?, ?, ?, ?, ?)').run(
      Number(req.params.id),
      nama,
      String(req.body.nik || '').trim() || null,
      String(req.body.jenis_kelamin || '') || null,
      String(req.body.status || 'tetap')
    );
    res.redirect(`/warga/kk/${req.params.id}?pesan=` + encodeURIComponent('Anggota ditambahkan'));
  }, { auth: true, role: 'pengurus' });

  router.post('/warga/resident/:id/hapus', (req, res) => {
    const row = db.prepare('SELECT household_id FROM residents WHERE id = ?').get(req.params.id);
    if (!row) return res.redirect('/warga');
    db.prepare('DELETE FROM residents WHERE id = ?').run(req.params.id);
    res.redirect(`/warga/kk/${row.household_id}?pesan=` + encodeURIComponent('Data warga dihapus'));
  }, { auth: true, role: 'pengurus' });

  router.post('/warga/kk/:id/akun', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const residentId = req.body.resident_id ? Number(req.body.resident_id) : null;
    const resident = residentId ? db.prepare('SELECT nama FROM residents WHERE id = ?').get(residentId) : null;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 6) {
      return res.redirect(`/warga/kk/${req.params.id}?error=` + encodeURIComponent('Email tidak valid atau password minimal 6 karakter'));
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.redirect(`/warga/kk/${req.params.id}?error=` + encodeURIComponent('Email sudah terdaftar'));
    }
    db.prepare('INSERT INTO users (name, email, password_hash, role, household_id) VALUES (?, ?, ?, ?, ?)').run(
      resident ? resident.nama : email,
      email,
      hashPassword(password),
      'warga',
      Number(req.params.id)
    );
    res.redirect(`/warga/kk/${req.params.id}?pesan=` + encodeURIComponent('Akun warga berhasil dibuat'));
  }, { auth: true, role: 'pengurus' });

  router.post('/warga/kk/:id/hapus', (req, res) => {
    db.prepare('DELETE FROM households WHERE id = ?').run(req.params.id);
    res.redirect('/warga?pesan=' + encodeURIComponent('KK dihapus'));
  }, { auth: true, role: 'pengurus' });
}

module.exports = { register };
