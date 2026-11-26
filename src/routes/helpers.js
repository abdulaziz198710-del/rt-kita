const views = require('../views');

function page(req, title, content, active = '') {
  return views.layout({ title, user: req.user, content: views.alert(req) + content, active });
}

module.exports = { page };
