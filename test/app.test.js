const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb, seed } = require('../src/db');
const { createApp } = require('../src/app');

function startServer() {
  const db = openDb(':memory:');
  seed(db);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-kita-test-'));
  const app = createApp({
    db,
    uploadsDir: path.join(tmp, 'uploads'),
    publicDir: path.join(__dirname, '..', 'public'),
  });
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, db, tmp, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function req(base, p, { method = 'GET', body, headers = {}, cookie } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie;
  const res = await fetch(base + p, { method, headers: h, body, redirect: 'manual' });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

function formBody(obj) {
  return {
    body: new URLSearchParams(obj).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  };
}

async function login(base, email, password) {
  const { body, headers } = formBody({ email, password });
  const res = await req(base, '/login', { method: 'POST', body, headers });
  return res.headers.get('set-cookie').split(';')[0];
}

test('halaman utama tanpa login dialihkan ke /login', async () => {
  const { server, base } = await startServer();
  try {
    const res = await req(base, '/');
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), '/login');
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('login gagal dan login berhasil mengatur sesi', async () => {
  const { server, base } = await startServer();
  try {
    const bad = await req(base, '/login', { method: 'POST', ...formBody({ email: 'admin@rt.local', password: 'salah' }) });
    assert.equal(bad.status, 303);
    assert.match(bad.headers.get('location'), /error=/);

    const ok = await req(base, '/login', { method: 'POST', ...formBody({ email: 'admin@rt.local', password: 'admin123' }) });
    assert.equal(ok.status, 303);
    assert.equal(ok.headers.get('location'), '/');
    const cookie = ok.headers.get('set-cookie').split(';')[0];
    assert.match(cookie, /^rt_session=/);

    const dash = await req(base, '/', { cookie });
    assert.equal(dash.status, 200);
    assert.match(dash.text, /Dashboard/);
    assert.match(dash.text, /Pengurus RT/);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('warga tidak bisa mengakses halaman pengurus (403)', async () => {
  const { server, base } = await startServer();
  try {
    const cookie = await login(base, 'warga@rt.local', 'warga123');
    const res = await req(base, '/warga', { cookie });
    assert.equal(res.status, 403);
    const kas = await req(base, '/kas', { cookie });
    assert.equal(kas.status, 403);
    const iuranSaya = await req(base, '/kas/saya', { cookie });
    assert.equal(iuranSaya.status, 200);
    assert.match(iuranSaya.text, /Iuran Saya/);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('pengurus menambah transaksi kas dan saldo bertambah', async () => {
  const { server, base, db } = await startServer();
  try {
    const cookie = await login(base, 'admin@rt.local', 'admin123');
    const saldoAwal = db.prepare("SELECT COALESCE(SUM(CASE WHEN type='masuk' THEN jumlah ELSE -jumlah END), 0) AS s FROM transactions").get().s;
    const today = new Date().toISOString().slice(0, 10);
    const res = await req(base, '/kas/transaksi', {
      method: 'POST',
      cookie,
      ...formBody({ type: 'masuk', kategori: 'Iuran', jumlah: '50000', tanggal: today, keterangan: 'test' }),
    });
    assert.equal(res.status, 303);
    const saldoAkhir = db.prepare("SELECT COALESCE(SUM(CASE WHEN type='masuk' THEN jumlah ELSE -jumlah END), 0) AS s FROM transactions").get().s;
    assert.equal(saldoAkhir - saldoAwal, 50000);

    const kas = await req(base, '/kas', { cookie });
    assert.equal(kas.status, 200);
    assert.match(kas.text, /Iuran/);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('transaksi dengan jumlah tidak valid ditolak', async () => {
  const { server, base, db } = await startServer();
  try {
    const cookie = await login(base, 'admin@rt.local', 'admin123');
    const before = db.prepare('SELECT COUNT(*) AS c FROM transactions').get().c;
    const res = await req(base, '/kas/transaksi', {
      method: 'POST',
      cookie,
      ...formBody({ type: 'keluar', kategori: 'X', jumlah: '-5', tanggal: '2024-01-01' }),
    });
    assert.equal(res.status, 303);
    assert.match(res.headers.get('location'), /error=/);
    const after = db.prepare('SELECT COUNT(*) AS c FROM transactions').get().c;
    assert.equal(after, before);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('generate iuran lalu tandai lunas', async () => {
  const { server, base, db } = await startServer();
  try {
    const cookie = await login(base, 'admin@rt.local', 'admin123');
    const res = await req(base, '/kas/iuran/generate', {
      method: 'POST',
      cookie,
      ...formBody({ periode: '2099-01', jumlah: '25000' }),
    });
    assert.equal(res.status, 303);
    const count = db.prepare("SELECT COUNT(*) AS c FROM dues WHERE periode = '2099-01'").get().c;
    assert.equal(count, 2);

    const due = db.prepare("SELECT id FROM dues WHERE periode = '2099-01' ORDER BY id LIMIT 1").get();
    await req(base, `/kas/iuran/${due.id}/lunas`, { method: 'POST', cookie });
    const updated = db.prepare('SELECT status, paid_at FROM dues WHERE id = ?').get(due.id);
    assert.equal(updated.status, 'lunas');
    assert.ok(updated.paid_at);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('warga mengirim aduan dengan foto, pengurus mengubah status', async () => {
  const { server, base, db, tmp } = await startServer();
  try {
    const wargaCookie = await login(base, 'warga@rt.local', 'warga123');
    const boundary = '----testboundary123';
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082', 'hex');
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="judul"\r\n\r\nLampu jalan mati\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="kategori"\r\n\r\nkeamanan\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="isi"\r\n\r\nMohon segera diperbaiki\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="foto"; filename="lampu.png"\r\nContent-Type: image/png\r\n\r\n`
    );
    const body = Buffer.concat([head, png, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const res = await req(base, '/aduan', {
      method: 'POST',
      cookie: wargaCookie,
      body,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    });
    assert.equal(res.status, 303);
    const complaint = db.prepare('SELECT * FROM complaints ORDER BY id DESC LIMIT 1').get();
    assert.equal(complaint.judul, 'Lampu jalan mati');
    assert.ok(complaint.foto);
    assert.ok(fs.existsSync(path.join(tmp, 'uploads', complaint.foto)));

    const aduanWarga = await req(base, '/aduan', { cookie: wargaCookie });
    assert.match(aduanWarga.text, /Lampu jalan mati/);

    const adminCookie = await login(base, 'admin@rt.local', 'admin123');
    const upd = await req(base, `/aduan/${complaint.id}/status`, {
      method: 'POST',
      cookie: adminCookie,
      ...formBody({ status: 'selesai', tanggapan: 'Sudah diperbaiki tadi malam' }),
    });
    assert.equal(upd.status, 303);
    const after = db.prepare('SELECT status, tanggapan FROM complaints WHERE id = ?').get(complaint.id);
    assert.equal(after.status, 'selesai');
    assert.equal(after.tanggapan, 'Sudah diperbaiki tadi malam');

    const aduanAdmin = await req(base, '/aduan', { cookie: adminCookie });
    assert.match(aduanAdmin.text, /Sudah diperbaiki tadi malam/);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('konten pengumuman di-escape (anti XSS)', async () => {
  const { server, base } = await startServer();
  try {
    const cookie = await login(base, 'admin@rt.local', 'admin123');
    await req(base, '/pengumuman', {
      method: 'POST',
      cookie,
      ...formBody({ judul: '<script>alert(1)</script>', isi: 'isi pengumuman' }),
    });
    const res = await req(base, '/pengumuman', { cookie });
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!res.text.includes('<script>alert(1)</script>'));
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('pengurus menambah KK dan resident, lalu membuat akun warga', async () => {
  const { server, base, db } = await startServer();
  try {
    const cookie = await login(base, 'admin@rt.local', 'admin123');
    await req(base, '/warga/kk', {
      method: 'POST',
      cookie,
      ...formBody({ no_kk: '3201000099', kepala_keluarga: 'Joko', alamat: 'Jl. Mawar No. 5' }),
    });
    const hh = db.prepare("SELECT id FROM households WHERE no_kk = '3201000099'").get();
    assert.ok(hh);

    await req(base, `/warga/kk/${hh.id}/resident`, {
      method: 'POST',
      cookie,
      ...formBody({ nama: 'Joko Prasetyo', nik: '3201119999999999', jenis_kelamin: 'L', status: 'tetap' }),
    });
    const resident = db.prepare('SELECT id FROM residents WHERE household_id = ?').get(hh.id);
    assert.ok(resident);

    const res = await req(base, `/warga/kk/${hh.id}/akun`, {
      method: 'POST',
      cookie,
      ...formBody({ resident_id: String(resident.id), email: 'joko@email.com', password: 'rahasia123' }),
    });
    assert.equal(res.status, 303);
    assert.match(res.headers.get('location'), /pesan=/);
    const user = db.prepare("SELECT role, household_id FROM users WHERE email = 'joko@email.com'").get();
    assert.equal(user.role, 'warga');
    assert.equal(user.household_id, hh.id);

    const newCookie = await login(base, 'joko@email.com', 'rahasia123');
    const dash = await req(base, '/', { cookie: newCookie });
    assert.equal(dash.status, 200);
    assert.match(dash.text, /3201000099/);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('halaman tidak dikenal mengembalikan 404', async () => {
  const { server, base } = await startServer();
  try {
    const cookie = await login(base, 'admin@rt.local', 'admin123');
    const res = await req(base, '/halaman-ngawur', { cookie });
    assert.equal(res.status, 404);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('PWA: manifest, service worker, ikon, dan registrasi SW tersedia', async () => {
  const { server, base } = await startServer();
  try {
    const manifest = await req(base, '/public/manifest.webmanifest');
    assert.equal(manifest.status, 200);
    assert.match(manifest.headers.get('content-type'), /manifest\+json/);
    const m = JSON.parse(manifest.text);
    assert.equal(m.short_name, 'RT Kita');
    assert.equal(m.display, 'standalone');
    assert.equal(m.start_url, '/');
    assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'));
    assert.ok(m.icons.some((i) => i.purpose === 'maskable'));

    const sw = await req(base, '/public/sw.js');
    assert.equal(sw.status, 200);
    assert.match(sw.headers.get('content-type'), /javascript/);
    assert.match(sw.text, /addEventListener\('fetch'/);

    for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
      const res = await req(base, '/public/icons/' + icon);
      assert.equal(res.status, 200, icon);
      assert.match(res.headers.get('content-type'), /image\/png/);
    }

    const login = await req(base, '/login');
    assert.match(login.text, /rel="manifest"/);
    assert.match(login.text, /apple-touch-icon/);
    assert.match(login.text, /\/public\/app\.js/);

    const appJs = await req(base, '/public/app.js');
    assert.equal(appJs.status, 200);
    assert.match(appJs.text, /serviceWorker\.register\('\/public\/sw\.js'\)/);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('logout menghapus sesi', async () => {
  const { server, base } = await startServer();
  try {
    const cookie = await login(base, 'admin@rt.local', 'admin123');
    const out = await req(base, '/logout', { method: 'POST', cookie });
    assert.equal(out.status, 303);
    const after = await req(base, '/', { cookie });
    assert.equal(after.status, 303);
    assert.equal(after.headers.get('location'), '/login');
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
