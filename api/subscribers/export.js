const db = require('../_lib/db');
const { requireAuth, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  const subscribers = await db.exportSubscribers();
  const csv = 'email,name,source,subscribed_at,active\n' +
    subscribers.map(function (s) {
      return [s.email, s.name, s.source, s.subscribed_at, s.active].join(',');
    }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subscribers-' + new Date().toISOString().split('T')[0] + '.csv');
  res.send(csv);
};
