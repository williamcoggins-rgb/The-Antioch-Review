const db = require('./_lib/db');
const { requireAuth, sendJSON, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);
  const stats = await db.getDashboardStats();
  sendJSON(res, stats);
};
