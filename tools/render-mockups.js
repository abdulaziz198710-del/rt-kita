const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const C = {
  bg: '#f4f6f8', panel: '#ffffff', ink: '#1c2733', muted: '#6b7a89', line: '#e2e8f0',
  primary: '#1d6f5c', primaryDark: '#155244', danger: '#b3372f', ok: '#1e7d46', warning: '#a86a00',
  headBg: '#f8fafc', navText: '#e7f3ef', inputBg: '#ffffff',
  badgeOkBg: '#e3f4e9', badgeWarnBg: '#fdf3e0', badgeBaruBg: '#e7ecff', badgePentingBg: '#fbe7e5',
  badgeNetralBg: '#e8edf2', tanggapanBg: '#f0f7f4',
};

const FONT = {
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.#.#.', '.....', '.....', '.....', '.....'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '*': ['.....', '.#.#.', '.###.', '#####', '.###.', '.#.#.', '.....'],
  '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
  '<': ['....#', '...#.', '..#..', '.#...', '..#..', '...#.', '....#'],
  '|': ['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  '•': ['.....', '.....', '.##..', '.##..', '.....', '.....', '.....'],
};

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

const CRC_TABLE = (() => {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

class Canvas {
  constructor(w, h, bg = C.bg) {
    this.w = w; this.h = h;
    this.data = Buffer.alloc(w * h * 4);
    this.fillAll(bg);
  }
  fillAll(c) {
    const [r, g, b] = hex(c);
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
    }
  }
  px(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c);
    const i = (y * this.w + x) * 4;
    this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c);
  }
  strokeRect(x, y, w, h, c) {
    this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c);
  }
  textWidth(str, scale = 2) {
    return String(str).length * 6 * scale - scale;
  }
  text(x, y, str, scale = 2, c = C.ink) {
    let cx = x;
    for (const ch of String(str).toUpperCase()) {
      const g = FONT[ch] || FONT['?'];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === '#') {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) this.px(cx + col * scale + sx, y + r * scale + sy, c);
            }
          }
        }
      }
      cx += 6 * scale;
    }
    return cx - x;
  }
  textCentered(cx, y, str, scale = 2, c = C.ink) {
    this.text(cx - this.textWidth(str, scale) / 2, y, str, scale, c);
  }
  save(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, encodePNG(this.w, this.h, this.data));
    console.log('  ' + path.basename(file));
  }
}

let W = 1120;
let PAD = 24;
let CW = W - PAD * 2;

function configure(width) {
  W = width;
  PAD = width < 640 ? 12 : 24;
  CW = W - PAD * 2;
}

function nav(c, active, links, userLabel) {
  const narrow = W < 640;
  const brandScale = narrow ? 2 : 3;
  c.rect(0, 0, W, 46, C.primary);
  c.text(PAD, narrow ? 15 : 12, 'RT KITA', brandScale, '#ffffff');
  const right = 'KELUAR';
  const bw = c.textWidth(right, 2) + 20;
  c.strokeRect(W - PAD - bw, 10, bw, 26, C.navText);
  c.text(W - PAD - bw + 10, 17, right, 2, C.navText);
  const ul = userLabel.toUpperCase();
  const us = narrow ? 1 : 2;
  const ux = W - PAD - bw - 12 - c.textWidth(ul, us);
  if (ux > PAD + c.textWidth('RT KITA', brandScale) + 16) c.text(ux, 18, ul, us, C.navText);
  if (!narrow) {
    let x = PAD + c.textWidth('RT KITA', 3) + 30;
    for (const [label, key] of links) {
      const w = c.textWidth(label, 2) + 16;
      if (key === active) c.rect(x - 8, 8, w, 32, C.primaryDark);
      c.text(x, 18, label, 2, C.navText);
      x += w + 14;
    }
    return 46;
  }
  let x = PAD;
  let y = 46;
  const rowH = 34;
  c.rect(0, 46, W, rowH, C.primaryDark);
  for (const [label, key] of links) {
    const w = c.textWidth(label, 2) + 16;
    if (x + w > W - PAD) {
      x = PAD;
      y += rowH;
      c.rect(0, y, W, rowH, C.primaryDark);
    }
    if (key === active) c.rect(x - 8, y + 3, w, 28, C.primary);
    c.text(x, y + 11, label, 2, C.navText);
    x += w + 10;
  }
  return y + rowH;
}

function h1(c, y, str) { c.text(PAD, y, str, 3, C.ink); return y + 34; }
function h2(c, y, str) { c.text(PAD, y, str, 2, C.ink); return y + 26; }
function muted(c, y, str, x = PAD) { c.text(x, y, str, 2, C.muted); return y + 22; }

function card(c, x, y, w, h, title, value, sub) {
  c.rect(x, y, w, h, C.panel);
  c.strokeRect(x, y, w, h, C.line);
  c.text(x + 12, y + 10, title, 1, C.muted);
  c.text(x + 12, y + 26, value, 3, C.ink);
  if (sub) c.text(x + 12, y + h - 18, sub, 1, C.muted);
}

function cardGrid(c, y, cards, cardW, gap) {
  let x = PAD;
  let rowH = 0;
  for (const [t, v, s] of cards) {
    if (x + cardW > PAD + CW) {
      x = PAD;
      y += rowH + gap;
      rowH = 0;
    }
    card(c, x, y, cardW, 92, t, v, s);
    rowH = 92;
    x += cardW + gap;
  }
  return y + rowH;
}

function button(c, x, y, w, h, label, color = C.primary, textColor = '#ffffff') {
  c.rect(x, y, w, h, color);
  c.textCentered(x + w / 2, y + (h - 14) / 2, label, 2, textColor);
}

function badge(c, x, y, label, bg, fg) {
  const w = c.textWidth(label, 1) + 14;
  c.rect(x, y, w, 18, bg);
  c.text(x + 7, y + 6, label, 1, fg);
  return w;
}

function field(c, x, y, w, label, value, { isArea = false, areaH = 30 } = {}) {
  c.text(x, y, label, 1, C.muted);
  const boxH = isArea ? areaH : 30;
  c.rect(x, y + 14, w, boxH, C.inputBg);
  c.strokeRect(x, y + 14, w, boxH, C.line);
  if (value) c.text(x + 8, y + 14 + (boxH - 14) / 2, value, 2, C.ink);
  return y + 14 + boxH;
}

function selectBox(c, x, y, w, label, value) {
  field(c, x, y, w, label, value);
  c.text(x + w - 22, y + 14 + 8, 'V', 2, C.muted);
}

function table(c, x, y, w, headers, rows, colFracs, rowH = 34, cellRender) {
  const cols = [];
  let cx = x;
  colFracs.forEach((f, i) => { cols.push({ x: cx, w: Math.floor(w * f) }); cx += Math.floor(w * f); });
  c.rect(x, y, w, 28, C.headBg);
  c.strokeRect(x, y, w, 28, C.line);
  cols.forEach((col, i) => c.text(col.x + 10, y + 10, headers[i], 1, C.muted));
  let ry = y + 28;
  rows.forEach((row) => {
    c.rect(x, ry, w, rowH, C.panel);
    c.strokeRect(x, ry, w, rowH, C.line);
    cols.forEach((col, i) => {
      const maxChars = Math.floor((col.w - 20) / 6);
      let cell = String(row[i] ?? '');
      if (cell.length > maxChars) cell = cell.slice(0, Math.max(1, maxChars - 3)) + '...';
      c.text(col.x + 10, ry + (rowH - 14) / 2, cell, 2, C.ink);
    });
    if (cellRender) cellRender(c, row, x, ry, w, cols, rowH);
    ry += rowH;
  });
  return ry;
}

function item(c, x, y, w, h, title, meta, badges, bodyLines, thumb, tanggapan) {
  c.rect(x, y, w, h, C.panel);
  c.strokeRect(x, y, w, h, C.line);
  let tx = x + 14;
  tx += c.text(tx, y + 12, title, 2, C.ink) + 10;
  for (const b of badges) { tx += badge(c, tx, y + 12, b[0], b[1], b[2]) + 8; }
  let ly;
  if (W < 640) {
    c.text(x + 14, y + 36, meta, 1, C.muted);
    ly = y + 56;
  } else {
    c.text(tx, y + 14, meta, 1, C.muted);
    ly = y + 38;
  }
  for (const line of bodyLines) { c.text(x + 14, ly, line, 2, C.ink); ly += 20; }
  if (tanggapan) {
    c.rect(x + 14, ly + 2, Math.min(c.textWidth(tanggapan, 2) + 20, w - 28), 26, C.tanggapanBg);
    c.text(x + 24, ly + 8, tanggapan, 2, C.ink);
    ly += 30;
  }
  if (thumb) {
    const txp = W < 640 ? x + 14 : x + w - 14 - 120;
    const typ = W < 640 ? ly + 6 : y + 12;
    c.rect(txp, typ, 120, 84, '#dfe5ea');
    c.strokeRect(txp, typ, 120, 84, C.line);
    c.textCentered(txp + 60, typ + 36, 'FOTO', 2, C.muted);
  }
}

const NAV_LINKS = [['DASHBOARD', 'dashboard'], ['WARGA', 'warga'], ['KAS RT', 'kas'], ['PENGUMUMAN', 'pengumuman'], ['ADUAN', 'aduan']];
const NAV_LINKS_WARGA = [['DASHBOARD', 'dashboard'], ['IURAN SAYA', 'iuran'], ['PENGUMUMAN', 'pengumuman'], ['ADUAN', 'aduan']];

function screenLogin() {
  const c = new Canvas(W, 640);
  const x = (W - 380) / 2, y = 110;
  c.rect(x, y, 380, 400, C.panel);
  c.strokeRect(x, y, 380, 400, C.line);
  c.textCentered(W / 2, y + 30, 'RT KITA', 4, C.ink);
  c.textCentered(W / 2, y + 72, 'MASUK KE APLIKASI RT', 2, C.muted);
  let fy = y + 110;
  fy = field(c, x + 28, fy, 324, 'EMAIL', 'admin@rt.local') + 14;
  fy = field(c, x + 28, fy, 324, 'PASSWORD', '********') + 14;
  button(c, x + 28, fy, 324, 36, 'MASUK');
  c.textCentered(W / 2, fy + 56, 'AKUN DEFAULT: ADMIN@RT.LOCAL / ADMIN123', 1, C.muted);
  c.textCentered(W / 2, fy + 72, 'ATAU WARGA@RT.LOCAL / WARGA123', 1, C.muted);
  return c;
}

function screenDashboardPengurus() {
  const c = new Canvas(W, 900);
  const navH = nav(c, 'dashboard', NAV_LINKS, 'Pengurus RT · pengurus');
  let y = h1(c, navH + 22, 'DASHBOARD');
  y = muted(c, y, 'RINGKASAN RT - JUNI 2025') + 8;
  const cards = [
    ['KARTU KELUARGA', '2', ''],
    ['WARGA', '5', ''],
    ['SALDO KAS', 'RP 70.000', ''],
    ['IURAN JUNI 2025', '1/2 LUNAS', 'LIHAT IURAN'],
    ['ADUAN BELUM SELESAI', '1', 'LIHAT ADUAN'],
  ];
  y = cardGrid(c, y, cards, W < 640 ? 170 : 200, 12) + 30;
  y = h2(c, y, 'PENGUMUMAN TERBARU') + 6;
  item(c, PAD, y, CW, 84, 'KERJA BAKTI HARI MINGGU', '12/06/2025 · OLEH PENGURUS RT',
    [['PENTING', C.badgePentingBg, C.danger]],
    ['DIHARAPKAN KEHADIRAN SELURUH WARGA PADA PUKUL 07.00 DI BALAI RT.']);
  y += 84 + 26;
  y = h2(c, y, 'ADUAN TERBARU') + 6;
  const rows = [['1', 'LAMPU JALAN MATI', 'BUDI SANTOSO', 'BARU', '12/06/2025']];
  table(c, PAD, y, CW, ['ID', 'JUDUL', 'PELAPOR', 'STATUS', 'TANGGAL'], rows, [0.06, 0.3, 0.24, 0.2, 0.2]);
  return c;
}

function screenDashboardWarga() {
  const c = new Canvas(W, 980);
  const navH = nav(c, 'dashboard', NAV_LINKS_WARGA, 'Budi Santoso · warga');
  let y = h1(c, navH + 22, 'HALO, BUDI SANTOSO');
  y += 8;
  y = cardGrid(c, y, [['KARTU KELUARGA', '3201000001', 'BUDI SANTOSO · JL. MERDEKA NO. 1'], ['ANGGOTA KELUARGA', '3', '']], W < 640 ? 170 : 330, 12) + 30;
  y = h2(c, y, 'IURAN SAYA') + 6;
  const dueRows = [['JUNI 2025', 'RP 50.000', 'LUNAS', '12/06/2025']];
  table(c, PAD, y, CW, ['PERIODE', 'JUMLAH', 'STATUS', 'DIBAYAR'], dueRows, [0.25, 0.25, 0.25, 0.25]);
  y += 28 + 34 + 26;
  y = h2(c, y, 'PENGUMUMAN TERBARU') + 6;
  item(c, PAD, y, CW, 84, 'KERJA BAKTI HARI MINGGU', '12/06/2025 · OLEH PENGURUS RT',
    [['PENTING', C.badgePentingBg, C.danger]],
    ['DIHARAPKAN KEHADIRAN SELURURUH WARGA PADA PUKUL 07.00 DI BALAI RT.']);
  y += 84 + 26;
  y = h2(c, y, 'ADUAN SAYA') + 6;
  const rows = [['LAMPU JALAN MATI', 'KEAMANAN', 'BARU', '12/06/2025']];
  table(c, PAD, y, CW, ['JUDUL', 'KATEGORI', 'STATUS', 'TANGGAL'], rows, [0.35, 0.2, 0.2, 0.25]);
  return c;
}

function screenWarga() {
  const c = new Canvas(W, 760);
  const navH = nav(c, 'warga', NAV_LINKS, 'Pengurus RT · pengurus');
  let y = h1(c, navH + 22, 'DATA WARGA & KK');
  y = h2(c, y + 6, 'TAMBAH KK BARU') + 4;
  const fy = y;
  field(c, PAD, fy, 220, 'NO. KK', '3201000003');
  field(c, PAD + 236, fy, 260, 'KEPALA KELUARGA', '');
  field(c, PAD + 512, fy, 330, 'ALAMAT', '');
  button(c, PAD + 858, fy + 14, 214, 30, 'SIMPAN KK');
  y = fy + 14 + 30 + 30;
  y = h2(c, y, 'DAFTAR KK') + 6;
  const rows = [
    ['3201000001', 'BUDI SANTOSO', 'JL. MERDEKA NO. 1', '3', '01/06/2025', ''],
    ['3201000002', 'SITI AMINAH', 'JL. MERDEKA NO. 2', '2', '01/06/2025', ''],
  ];
  table(c, PAD, y, CW, ['NO. KK', 'KEPALA KELUARGA', 'ALAMAT', 'ANGGOTA', 'TERDAFTAR', 'AKSI'], rows, [0.13, 0.2, 0.24, 0.1, 0.15, 0.18], 38,
    (cc, row, x, ry, w, cols) => button(cc, cols[5].x + 10, ry + 4, 90, 30, 'DETAIL'));
  return c;
}

function screenKas() {
  const c = new Canvas(W, 1060);
  const navH = nav(c, 'kas', NAV_LINKS, 'Pengurus RT · pengurus');
  let y = h1(c, navH + 22, 'KAS RT');
  y = cardGrid(c, y, [['SALDO KAS', 'RP 70.000', ''], ['PEMASUKAN JUNI 2025', 'RP 100.000', ''], ['PENGELUARAN JUNI 2025', 'RP 30.000', '']], W < 640 ? 170 : 300, 12) + 12;
  c.text(PAD, y, 'LAPORAN KAS PERIODE JUNI 2025', 2, C.primary);
  y += 30;
  y = h2(c, y, 'TAMBAH TRANSAKSI') + 4;
  const fy = y;
  selectBox(c, PAD, fy, 170, 'JENIS', 'PEMASUKAN');
  field(c, PAD + 186, fy, 190, 'KATEGORI', 'IURAN');
  field(c, PAD + 392, fy, 150, 'JUMLAH (RP)', '50000');
  field(c, PAD + 558, fy, 170, 'TANGGAL', '2025-06-12');
  field(c, PAD + 744, fy, 190, 'KETERANGAN', '');
  button(c, PAD + 950, fy + 14, 122, 30, 'SIMPAN');
  y = fy + 44 + 30;
  y = h2(c, y, 'TRANSAKSI (100 TERAKHIR)') + 6;
  const txRows = [
    ['12/06/2025', 'MASUK', 'IURAN', 'RP 100.000', 'IURAN BULAN INI (CONTOH)', 'PENGURUS RT', ''],
    ['12/06/2025', 'KELUAR', 'KEBERSIHAN', 'RP 30.000', 'BIAYA KEBERSIHAN JALAN', 'PENGURUS RT', ''],
  ];
  y = table(c, PAD, y, CW, ['TANGGAL', 'JENIS', 'KATEGORI', 'JUMLAH', 'KETERANGAN', 'OLEH', 'AKSI'], txRows, [0.11, 0.09, 0.13, 0.12, 0.26, 0.14, 0.15], 38,
    (cc, row, x, ry, w, cols) => button(cc, cols[6].x + 10, ry + 4, 70, 30, 'HAPUS', C.danger));
  y += 26;
  y = h2(c, y, 'IURAN - JUNI 2025') + 4;
  const gy = y;
  field(c, PAD, gy, 170, 'PERIODE', '2025-06');
  field(c, PAD + 186, gy, 220, 'JUMLAH PER KK (RP)', '50000');
  button(c, PAD + 422, gy + 14, 330, 30, 'BUAT IURAN SEMUA KK (2)');
  y = gy + 44 + 26;
  const dueRows = [
    ['3201000001', 'BUDI SANTOSO', 'RP 50.000', '', '12/06/2025', ''],
    ['3201000002', 'SITI AMINAH', 'RP 50.000', '', '-', ''],
  ];
  table(c, PAD, y, CW, ['NO. KK', 'KEPALA KELUARGA', 'JUMLAH', 'STATUS', 'DIBAYAR', 'AKSI'], dueRows, [0.13, 0.2, 0.14, 0.12, 0.16, 0.25], 42,
    (cc, row, x, ry, w, cols) => {
      if (row[0] === '3201000001') {
        badge(cc, cols[3].x + 10, ry + 12, 'LUNAS', C.badgeOkBg, C.ok);
        button(cc, cols[5].x + 10, ry + 6, 130, 30, 'TANDAI BELUM');
      } else {
        badge(cc, cols[3].x + 10, ry + 12, 'BELUM', C.badgeWarnBg, C.warning);
        button(cc, cols[5].x + 10, ry + 6, 130, 30, 'TANDAI LUNAS', C.ok);
      }
    });
  return c;
}

function screenPengumuman() {
  const c = new Canvas(W, 860);
  const navH = nav(c, 'pengumuman', NAV_LINKS, 'Pengurus RT · pengurus');
  let y = h1(c, navH + 22, 'PENGUMUMAN');
  y = h2(c, y + 4, 'BUAT PENGUMUMAN') + 4;
  const fx = PAD;
  let fy = field(c, fx, y, 500, 'JUDUL', '') + 12;
  fy = field(c, fx, fy, 700, 'ISI', '', { isArea: true, areaH: 64 }) + 12;
  c.strokeRect(fx, fy + 2, 16, 16, C.line);
  c.rect(fx, fy + 2, 16, 16, C.inputBg);
  c.text(fx + 24, fy + 4, 'TANDAI PENTING', 2, C.ink);
  fy += 30;
  button(c, fx, fy, 180, 34, 'TERBITKAN');
  y = fy + 34 + 30;
  y = h2(c, y, 'DAFTAR PENGUMUMAN') + 6;
  item(c, PAD, y, CW, 92, 'KERJA BAKTI HARI MINGGU', '12/06/2025 · OLEH PENGURUS RT',
    [['PENTING', C.badgePentingBg, C.danger]],
    ['DIHARAPKAN KEHADIRAN SELURURUH WARGA PADA PUKUL 07.00 DI BALAI RT.', 'BAWA ALAT KEBERSIHAN MASING-MASING.']);
  y += 92 + 12;
  item(c, PAD, y, CW, 74, 'PEMADAMAN AIR SEMENTARA', '10/06/2025 · OLEH PENGURUS RT', [],
    ['Akan ada pemadaman air pada hari Sabtu pukul 08.00 - 12.00.']);
  return c;
}

function screenAduanWarga() {
  const c = new Canvas(W, 940);
  const navH = nav(c, 'aduan', NAV_LINKS_WARGA, 'Budi Santoso · warga');
  let y = h1(c, navH + 22, 'ADUAN SAYA');
  y = h2(c, y + 4, 'KIRIM ADUAN BARU') + 4;
  const fx = PAD;
  let fy = field(c, fx, y, 420, 'JUDUL', 'LAMPU JALAN MATI') + 12;
  selectBox(c, fx, fy, 240, 'KATEGORI', 'KEAMANAN');
  fy += 44 + 12;
  fy = field(c, fx, fy, 700, 'ISI ADUAN', '', { isArea: true, areaH: 64 }) + 12;
  field(c, fx, fy, 420, 'FOTO (OPSIONAL, MAKS 5 MB)', 'TIDAK ADA FILE DIPILIH');
  c.rect(fx + 436, fy + 14, 120, 84, '#dfe5ea');
  c.strokeRect(fx + 436, fy + 14, 120, 84, C.line);
  c.textCentered(fx + 496, fy + 50, 'PREVIEW', 1, C.muted);
  fy += 44 + 12;
  button(c, fx, fy, 200, 34, 'KIRIM ADUAN');
  y = fy + 34 + 30;
  y = h2(c, y, 'RIWAYAT ADUAN SAYA') + 6;
  item(c, PAD, y, CW, 130, 'LAMPU JALAN MATI', '12/06/2025',
    [['KEAMANAN', C.badgeNetralBg, C.muted], ['BARU', C.badgeBaruBg, '#3b4fc0']],
    ['MOHON SEGERA DIPERBAIKI, GELAP DI BLOK B.'], true, 'TANGGAPAN: BELUM ADA');
  return c;
}

function screenAduanPengurus() {
  const c = new Canvas(W, 720);
  const navH = nav(c, 'aduan', NAV_LINKS, 'Pengurus RT · pengurus');
  let y = h1(c, navH + 22, 'ADUAN WARGA');
  y += 6;
  item(c, PAD, y, CW, 150, 'LAMPU JALAN MATI', 'BUDI SANTOSO · 12/06/2025',
    [['KEAMANAN', C.badgeNetralBg, C.muted], ['BARU', C.badgeBaruBg, '#3b4fc0']],
    ['MOHON SEGERA DIPERBAIKI, GELAP DI BLOK B.'], true);
  const fy = y + 150 - 44;
  selectBox(c, PAD + 14, fy, 150, 'STATUS', 'DIPROSES');
  field(c, PAD + 180, fy, 420, 'TANGGAPAN', 'SEDANG DIKERJAKAN PETUGAS');
  button(c, PAD + 616, fy + 14, 170, 30, 'UPDATE STATUS');
  return c;
}

function screenMobileDashboard() {
  configure(390);
  const c = new Canvas(W, 980);
  const navH = nav(c, 'dashboard', NAV_LINKS, 'Pengurus RT');
  let y = h1(c, navH + 20, 'DASHBOARD');
  y = muted(c, y, 'RINGKASAN RT - JUNI 2025') + 6;
  y = cardGrid(c, y, [
    ['KARTU KELUARGA', '2', ''],
    ['WARGA', '5', ''],
    ['SALDO KAS', 'RP 70.000', ''],
    ['IURAN JUNI', '1/2 LUNAS', ''],
    ['ADUAN OPEN', '1', ''],
  ], 170, 10) + 22;
  y = h2(c, y, 'PENGUMUMAN TERBARU') + 4;
  item(c, PAD, y, CW, 118, 'KERJA BAKTI HARI MINGGU', '12/06/2025 · OLEH PENGURUS RT',
    [['PENTING', C.badgePentingBg, C.danger]],
    ['DIHARAPKAN KEHADIRAN SELURURUH WARGA PADA PUKUL 07.00 DI BALAI RT.']);
  y += 118 + 22;
  y = h2(c, y, 'ADUAN TERBARU') + 4;
  table(c, PAD, y, CW, ['ID', 'JUDUL', 'STATUS'], [['1', 'LAMPU JALAN MATI', '']], [0.1, 0.62, 0.28], 34,
    (cc, row, x, ry, w, cols) => badge(cc, cols[2].x + 8, ry + 8, 'BARU', C.badgeBaruBg, '#3b4fc0'));
  return c;
}

function screenMobileKas() {
  configure(390);
  const c = new Canvas(W, 1000);
  const navH = nav(c, 'kas', NAV_LINKS, 'Pengurus RT');
  let y = h1(c, navH + 20, 'KAS RT');
  y = cardGrid(c, y, [['SALDO KAS', 'RP 70.000', ''], ['PEMASUKAN', 'RP 100.000', ''], ['PENGELUARAN', 'RP 30.000', '']], 170, 10) + 20;
  y = h2(c, y, 'TAMBAH TRANSAKSI') + 4;
  let fy = field(c, PAD, y, CW, 'JENIS', 'PEMASUKAN') + 10;
  fy = field(c, PAD, fy, CW, 'KATEGORI', 'IURAN') + 10;
  fy = field(c, PAD, fy, CW, 'JUMLAH (RP)', '50000') + 10;
  fy = field(c, PAD, fy, CW, 'TANGGAL', '2025-06-12') + 10;
  button(c, PAD, fy, CW, 36, 'SIMPAN');
  y = fy + 36 + 26;
  y = h2(c, y, 'IURAN - JUNI 2025') + 4;
  table(c, PAD, y, CW, ['KK', 'JUMLAH', 'STATUS'],
    [['3201000001', 'RP 50.000', ''], ['3201000002', 'RP 50.000', '']],
    [0.34, 0.33, 0.33], 38,
    (cc, row, x, ry, w, cols) => {
      if (row[0] === '3201000001') badge(cc, cols[2].x + 8, ry + 10, 'LUNAS', C.badgeOkBg, C.ok);
      else badge(cc, cols[2].x + 8, ry + 10, 'BELUM', C.badgeWarnBg, C.warning);
    });
  return c;
}

function screenMobileAduan() {
  configure(390);
  const c = new Canvas(W, 1000);
  const navH = nav(c, 'aduan', NAV_LINKS_WARGA, 'Budi Santoso');
  let y = h1(c, navH + 20, 'ADUAN SAYA');
  y = h2(c, y + 4, 'KIRIM ADUAN BARU') + 4;
  let fy = field(c, PAD, y, CW, 'JUDUL', 'LAMPU JALAN MATI') + 10;
  selectBox(c, PAD, fy, CW, 'KATEGORI', 'KEAMANAN');
  fy += 44 + 10;
  fy = field(c, PAD, fy, CW, 'ISI ADUAN', '', { isArea: true, areaH: 64 }) + 10;
  field(c, PAD, fy, CW, 'FOTO (OPSIONAL)', 'TIDAK ADA FILE DIPILIH');
  fy += 44 + 10;
  button(c, PAD, fy, CW, 36, 'KIRIM ADUAN');
  y = fy + 36 + 26;
  y = h2(c, y, 'RIWAYAT ADUAN SAYA') + 4;
  item(c, PAD, y, CW, 200, 'LAMPU JALAN MATI', '12/06/2025',
    [['KEAMANAN', C.badgeNetralBg, C.muted], ['BARU', C.badgeBaruBg, '#3b4fc0']],
    ['MOHON SEGERA DIPERBAIKI, GELAP DI BLOK B.'], true, 'TANGGAPAN: BELUM ADA');
  return c;
}

const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
console.log('Merender mockup UI (desktop + mobile) ke ' + OUT);
configure(1120);
screenLogin().save(path.join(OUT, '01-login.png'));
screenDashboardPengurus().save(path.join(OUT, '02-dashboard-pengurus.png'));
screenDashboardWarga().save(path.join(OUT, '03-dashboard-warga.png'));
screenWarga().save(path.join(OUT, '04-data-warga.png'));
screenKas().save(path.join(OUT, '05-kas-rt.png'));
screenPengumuman().save(path.join(OUT, '06-pengumuman.png'));
screenAduanWarga().save(path.join(OUT, '07-aduan-warga.png'));
screenAduanPengurus().save(path.join(OUT, '08-aduan-pengurus.png'));
configure(390);
screenLogin().save(path.join(OUT, '09-mobile-login.png'));
screenMobileDashboard().save(path.join(OUT, '10-mobile-dashboard-pengurus.png'));
screenMobileKas().save(path.join(OUT, '11-mobile-kas-rt.png'));
screenMobileAduan().save(path.join(OUT, '12-mobile-aduan.png'));
console.log('Selesai.');
