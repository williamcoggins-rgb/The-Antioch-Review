const db = require('../_lib/db');
const { requireAuth, sendJSON, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  const { id } = req.query;

  if (req.method === 'DELETE') {
    await db.deleteSubscriber(parseInt(id));
    return sendJSON(res, { success: true });
  }

  sendError(res, 'Method not allowed', 405);
};
