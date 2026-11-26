const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./security');

function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no_kk TEXT NOT NULL,
      kepala_keluarga TEXT NOT NULL,
      alamat TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      nama TEXT NOT NULL,
      nik TEXT,
      jenis_kelamin TEXT,
      status TEXT NOT NULL DEFAULT 'tetap',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'warga' CHECK (role IN ('pengurus', 'warga')),
      household_id INTEGER REFERENCES households(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
      kategori TEXT NOT NULL,
      jumlah INTEGER NOT NULL CHECK (jumlah > 0),
      tanggal TEXT NOT NULL,
      keterangan TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS dues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      periode TEXT NOT NULL,
      jumlah INTEGER NOT NULL CHECK (jumlah > 0),
      status TEXT NOT NULL DEFAULT 'belum' CHECK (status IN ('belum', 'lunas')),
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (household_id, periode)
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      isi TEXT NOT NULL,
      penting INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      judul TEXT NOT NULL,
      kategori TEXT NOT NULL,
      isi TEXT NOT NULL,
      foto TEXT,
      status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'diproses', 'selesai')),
      tanggapan TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seed(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  db.prepare('INSERT INTO households (no_kk, kepala_keluarga, alamat) VALUES (?, ?, ?)')
    .run('3201000001', 'Budi Santoso', 'Jl. Merdeka No. 1');
  db.prepare('INSERT INTO households (no_kk, kepala_keluarga, alamat) VALUES (?, ?, ?)')
    .run('3201000002', 'Siti Aminah', 'Jl. Merdeka No. 2');

  const insResident = db.prepare('INSERT INTO residents (household_id, nama, nik, jenis_kelamin, status) VALUES (?, ?, ?, ?, ?)');
  insResident.run(1, 'Budi Santoso', '3201111111111111', 'L', 'tetap');
  insResident.run(1, 'Dewi Lestari', '3201112222222222', 'P', 'tetap');
  insResident.run(1, 'Andi Santoso', '3201113333333333', 'L', 'tetap');
  insResident.run(2, 'Siti Aminah', '3201114444444444', 'P', 'tetap');
  insResident.run(2, 'Rina Aminah', '3201115555555555', 'P', 'kontrak');

  const insUser = db.prepare('INSERT INTO users (name, email, password_hash, role, household_id) VALUES (?, ?, ?, ?, ?)');
  insUser.run('Pengurus RT', 'admin@rt.local', hashPassword('admin123'), 'pengurus', null);
  insUser.run('Budi Santoso', 'warga@rt.local', hashPassword('warga123'), 'warga', 1);

  const today = new Date().toISOString().slice(0, 10);
  const periode = new Date().toISOString().slice(0, 7);
  const insTx = db.prepare('INSERT INTO transactions (type, kategori, jumlah, tanggal, keterangan, created_by) VALUES (?, ?, ?, ?, ?, ?)');
  insTx.run('masuk', 'Iuran', 100000, today, 'Iuran bulan ini (contoh)', 1);
  insTx.run('keluar', 'Kebersihan', 30000, today, 'Biaya kebersihan jalan (contoh)', 1);

  const insDue = db.prepare('INSERT INTO dues (household_id, periode, jumlah, status, paid_at) VALUES (?, ?, ?, ?, ?)');
  insDue.run(1, periode, 50000, 'lunas', new Date().toISOString().slice(0, 19).replace('T', ' '));
  insDue.run(2, periode, 50000, 'belum', null);

  db.prepare('INSERT INTO announcements (judul, isi, penting, created_by) VALUES (?, ?, ?, ?)')
    .run('Kerja bakti hari Minggu', 'Diharapkan kehadiran seluruh warga pada pukul 07.00 di balai RT. Bawa alat kebersihan masing-masing.', 1, 1);
}

module.exports = { openDb, seed, migrate };
