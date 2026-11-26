const auth = require('./auth');
const dashboard = require('./dashboard');
const warga = require('./warga');
const kas = require('./kas');
const pengumuman = require('./pengumuman');
const aduan = require('./aduan');

module.exports = function register(router, ctx) {
  auth.register(router, ctx);
  dashboard.register(router, ctx);
  warga.register(router, ctx);
  kas.register(router, ctx);
  pengumuman.register(router, ctx);
  aduan.register(router, ctx);
};
