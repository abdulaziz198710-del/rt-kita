const http = require('node:http');
const path = require('node:path');
const { openDb, seed } = require('./src/db');
const { createApp } = require('./src/app');

const PORT = Number(process.env.PORT || 3000);
const root = __dirname;
const db = openDb(process.env.DB_PATH || path.join(root, 'data', 'rt.db'));
seed(db);

const app = createApp({
  db,
  uploadsDir: path.join(root, 'uploads'),
  publicDir: path.join(root, 'public'),
});

http.createServer(app).listen(PORT, () => {
  console.log(`RT Kita berjalan di http://localhost:${PORT}`);
  console.log('Akun default: admin@rt.local / admin123 (pengurus), warga@rt.local / warga123 (warga)');
});
