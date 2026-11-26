const qs = require('node:querystring');

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return cookies;
}

function readBody(req, limit = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Ukuran data terlalu besar (maks 10 MB)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function parseBody(req) {
  const type = req.headers['content-type'] || '';
  const raw = await readBody(req);
  if (type.includes('application/x-www-form-urlencoded')) {
    return { fields: qs.parse(raw.toString('utf8')), files: [] };
  }
  if (type.includes('multipart/form-data')) {
    const boundary = (type.split('boundary=')[1] || '').trim();
    if (!boundary) throw new Error('Boundary multipart tidak ditemukan');
    return parseMultipart(raw, boundary);
  }
  return { fields: {}, files: [] };
}

function parseMultipart(buf, boundary) {
  const fields = {};
  const files = [];
  const delim = Buffer.from(`--${boundary}`);
  let pos = buf.indexOf(delim);
  while (pos !== -1) {
    let start = pos + delim.length;
    if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break;
    if (buf[start] === 0x0d && buf[start + 1] === 0x0a) start += 2;
    const headerEnd = buf.indexOf('\r\n\r\n', start);
    if (headerEnd === -1) break;
    const headerText = buf.slice(start, headerEnd).toString('utf8');
    const end = buf.indexOf(delim, headerEnd);
    if (end === -1) break;
    const content = buf.slice(headerEnd + 4, end - 2);
    const nameMatch = /name="([^"]+)"/.exec(headerText);
    const fileMatch = /filename="([^"]*)"/.exec(headerText);
    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headerText);
    if (nameMatch) {
      if (fileMatch && fileMatch[1]) {
        files.push({
          field: nameMatch[1],
          filename: fileMatch[1],
          contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
          data: content,
        });
      } else {
        fields[nameMatch[1]] = content.toString('utf8');
      }
    }
    pos = end;
  }
  return { fields, files };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function formatTanggal(s) {
  if (!s) return '-';
  const date = String(s).slice(0, 10);
  const time = String(s).slice(11, 16);
  const [y, m, d] = date.split('-');
  const base = `${d}/${m}/${y}`;
  return time && time !== '00:00' ? `${base} ${time}` : base;
}

function currentPeriode() {
  return new Date().toISOString().slice(0, 7);
}

function currentTanggal() {
  return new Date().toISOString().slice(0, 10);
}

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function namaPeriode(periode) {
  const [y, m] = String(periode).split('-');
  return `${NAMA_BULAN[Number(m) - 1] || m} ${y}`;
}

module.exports = {
  parseCookies,
  parseBody,
  escapeHtml,
  formatRupiah,
  formatTanggal,
  currentPeriode,
  currentTanggal,
  namaPeriode,
};
