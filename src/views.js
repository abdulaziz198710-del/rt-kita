const { escapeHtml, formatTanggal } = require('./httpUtils');

function layout({ title, user, content, active = '' }) {
  const link = (href, label, key) =>
    `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
  const nav = user
    ? `<nav class="topnav">
        <span class="brand">🏘️ RT Kita</span>
        ${link('/', 'Dashboard', 'dashboard')}
        ${user.role === 'pengurus'
          ? link('/warga', 'Warga', 'warga') + link('/kas', 'Kas RT', 'kas')
          : link('/kas/saya', 'Iuran Saya', 'iuran')}
        ${link('/pengumuman', 'Pengumuman', 'pengumuman')}
        ${link('/aduan', 'Aduan', 'aduan')}
        <span class="spacer"></span>
        <span class="user">${escapeHtml(user.name)} · ${escapeHtml(user.role)}</span>
        <form method="post" action="/logout"><button class="btn-link" type="submit">Keluar</button></form>
      </nav>`
    : '';
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · RT Kita</title>
<link rel="stylesheet" href="/public/style.css">
</head>
<body>
${nav}
<main class="container">
${content}
</main>
<script src="/public/app.js"></script>
</body>
</html>`;
}

function alert(req) {
  if (req.query && req.query.pesan) return `<p class="alert ok">${escapeHtml(req.query.pesan)}</p>`;
  if (req.query && req.query.error) return `<p class="alert error">${escapeHtml(req.query.error)}</p>`;
  return '';
}

function field(label, inner) {
  return `<label class="field"><span>${escapeHtml(label)}</span>${inner}</label>`;
}

function input(name, { type = 'text', value = '', required = false, placeholder = '', min, step } = {}) {
  const attrs = [`type="${type}"`, `name="${escapeHtml(name)}"`, `value="${escapeHtml(value)}"`];
  if (required) attrs.push('required');
  if (placeholder) attrs.push(`placeholder="${escapeHtml(placeholder)}"`);
  if (min !== undefined) attrs.push(`min="${min}"`);
  if (step !== undefined) attrs.push(`step="${step}"`);
  return `<input ${attrs.join(' ')}>`;
}

function textarea(name, { value = '', required = false, rows = 4 } = {}) {
  return `<textarea name="${escapeHtml(name)}" rows="${rows}"${required ? ' required' : ''}>${escapeHtml(value)}</textarea>`;
}

function select(name, options, selected = '') {
  const opts = options
    .map(([v, l]) => `<option value="${escapeHtml(v)}"${String(v) === String(selected) ? ' selected' : ''}>${escapeHtml(l)}</option>`)
    .join('');
  return `<select name="${escapeHtml(name)}">${opts}</select>`;
}

function badge(status) {
  const cls = { baru: 'badge baru', diproses: 'badge proses', selesai: 'badge ok', belum: 'badge warning', lunas: 'badge ok', masuk: 'badge ok', keluar: 'badge warning' }[status] || 'badge';
  return `<span class="${cls}">${escapeHtml(status)}</span>`;
}

function card(title, value, sub = '') {
  return `<div class="card"><div class="card-title">${escapeHtml(title)}</div><div class="card-value">${value}</div>${sub ? `<div class="card-sub">${sub}</div>` : ''}</div>`;
}

function table(headers, rows) {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = Array.isArray(rows) ? rows.join('') : rows || '';
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body || '<tr><td colspan="' + headers.length + '" class="muted">Belum ada data.</td></tr>'}</tbody></table></div>`;
}

function announcementItem(a) {
  return `<div class="item${a.penting ? ' penting' : ''}">
    <div class="item-head">
      <strong>${escapeHtml(a.judul)}</strong>
      ${a.penting ? '<span class="badge penting">penting</span>' : ''}
      <span class="muted">${escapeHtml(formatTanggal(a.created_at))}${a.author ? ' · oleh ' + escapeHtml(a.author) : ''}</span>
    </div>
    <p>${escapeHtml(a.isi)}</p>
  </div>`;
}

module.exports = { layout, alert, field, input, textarea, select, badge, card, table, announcementItem };
