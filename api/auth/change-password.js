const db = require('../_lib/db');
const { requireAuth, sendJSON, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return sendError(res, 'New password must be at least 6 characters');
  }
  await db.changeAdminPassword(user.username, newPassword);
  sendJSON(res, { success: true });
};
