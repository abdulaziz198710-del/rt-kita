# 🏘️ RT Kita

![CI](https://github.com/abdulaziz198710-del/rt-kita/actions/workflows/ci.yml/badge.svg)

Aplikasi web manajemen untuk satu RT (Rukun Tetangga): data warga & KK, kas RT + iuran, pengumuman, dan aduan warga.

Dibuat **tanpa dependensi eksternal** — cukup Node.js versi 22 ke atas, tidak perlu `npm install`.

## Cara menjalankan

```bash
node server.js
```

Lalu buka http://localhost:3000

Untuk menjalankan test:

```bash
npm test
```

## Tampilan UI/UX (mockup)

Mockup setiap halaman ada di [`docs/screenshots/`](docs/screenshots) dan bisa diubah lewat `npm run mockups`:

| Halaman | Gambar |
|---|---|
| Login | [01-login.png](docs/screenshots/01-login.png) |
| Dashboard pengurus | [02-dashboard-pengurus.png](docs/screenshots/02-dashboard-pengurus.png) |
| Dashboard warga | [03-dashboard-warga.png](docs/screenshots/03-dashboard-warga.png) |
| Data warga & KK | [04-data-warga.png](docs/screenshots/04-data-warga.png) |
| Kas RT & iuran | [05-kas-rt.png](docs/screenshots/05-kas-rt.png) |
| Pengumuman | [06-pengumuman.png](docs/screenshots/06-pengumuman.png) |
| Aduan (warga) | [07-aduan-warga.png](docs/screenshots/07-aduan-warga.png) |
| Aduan (pengurus) | [08-aduan-pengurus.png](docs/screenshots/08-aduan-pengurus.png) |
| Login (HP 390px) | [09-mobile-login.png](docs/screenshots/09-mobile-login.png) |
| Dashboard pengurus (HP) | [10-mobile-dashboard-pengurus.png](docs/screenshots/10-mobile-dashboard-pengurus.png) |
| Kas RT (HP) | [11-mobile-kas-rt.png](docs/screenshots/11-mobile-kas-rt.png) |
| Aduan (HP) | [12-mobile-aduan.png](docs/screenshots/12-mobile-aduan.png) |
| Layar utama HP setelah di-install (PWA) | [13-mobile-home-screen.png](docs/screenshots/13-mobile-home-screen.png) |

Tampilan **responsif** — saat dibuka di HP, navigasi menumpuk, kartu & form menjadi satu kolom, tombol menjadi full-width, dan tabel bisa digeser horizontal (`public/style.css`, media query `max-width: 640px`).

## Install sebagai aplikasi di HP (PWA)

Aplikasi ini sudah bisa dipasang di layar utama seperti aplikasi native:

- **Android/Chrome**: buka aplikasi → menu ⋮ → **"Tambah ke layar utama"** / "Install app"
- **iPhone/Safari**: tombol Share → **"Tambah ke Layar Utama"**

Setelah di-install: muncul ikon **RT Kita** di layar utama, terbuka full-screen tanpa address bar (mode `standalone`), dan tetap bisa dibuka **offline** (service worker `public/sw.js` menyimpan aset & halaman yang pernah dibuka; halaman baru tetap butuh koneksi).

Catatan: service worker berjalan di `http://localhost` saat development. Untuk dipakai online, wajib **HTTPS** — mis. deploy di belakang nginx/HTTPS, baru fitur install & offline aktif penuh.

Ikon aplikasi (`public/icons/*.png`) di-generate oleh `npm run mockups`.

## Akun default (dari data contoh)

| Peran | Email | Password |
|---|---|---|
| Pengurus RT | `admin@rt.local` | `admin123` |
| Warga (contoh) | `warga@rt.local` | `warga123` |

Pengurus bisa membuat akun baru untuk warga lewat menu **Warga → Detail KK → Buat akun login**.

## Fitur

- **Login & peran** — pengurus (akses penuh) dan warga (akses terbatas), sesi via cookie HttpOnly, password di-hash dengan scrypt.
- **Dashboard** — ringkasan untuk pengurus (KK, warga, saldo kas, iuran, aduan) dan tampilan pribadi untuk warga.
- **Data Warga & KK** (pengurus) — tambah/hapus KK dan anggota keluarga, buat akun login warga.
- **Kas RT** (pengurus) — catat pemasukan/pengeluaran, buat iuran per KK per bulan, tandai lunas/belum, laporan per periode. Warga melihat iuran milik KK-nya di menu **Iuran Saya**.
- **Pengumuman** — pengurus menerbitkan (bisa ditandai penting), semua warga bisa membaca.
- **Aduan** — warga mengirim aduan dengan kategori + foto (maks 5 MB), pengurus mengubah status (baru → diproses → selesai) dan memberi tanggapan.

## Struktur proyek

```
server.js            entry point (jalankan dengan: node server.js)
src/
  app.js             HTTP handler utama: sesi, guard peran, static file, upload
  router.js          router sederhana dengan pola /path/:param
  db.js               koneksi SQLite (node:sqlite), migrasi skema, data contoh
  security.js         hash/verifikasi password (scrypt), token sesi
  httpUtils.js        parsing cookie/body/multipart, escape HTML, format rupiah/tanggal
  views.js            layout & komponen HTML
  routes/             satu file per modul: auth, dashboard, warga, kas, pengumuman, aduan
public/              style.css & app.js (frontend)
test/                test end-to-end memakai node:test (database in-memory)
data/                file database SQLite (dibuat otomatis, jangan di-commit)
uploads/             foto aduan (dibuat otomatis, jangan di-commit)
```

## Catatan keamanan

- Semua input yang ditampilkan ke HTML di-escape (anti XSS).
- Password tidak pernah disimpan dalam bentuk teks biasa.
- Upload foto dibatasi 5 MB dan hanya menerima JPG/PNG/WEBP.
- Body request dibatasi 10 MB.

## Roadmap (tahap berikutnya)

- Versi mobile / PWA (bisa di-install di HP) dengan tampilan yang sama.
- Notifikasi WhatsApp untuk iuran & pengumuman penting.
- Jadwal ronda + absensi, rapat RT dengan notulen, voting keputusan.
- Surat pengantar digital dengan nomor otomatis.
- Export laporan kas ke PDF/Excel.

Untuk produksi, jalankan di balik reverse proxy (mis. nginx) dengan HTTPS, dan ganti `DB_PATH` lewat environment variable jika ingin lokasi database khusus.
