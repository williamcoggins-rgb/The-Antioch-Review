const { del } = require('@vercel/blob');
const db = require('../_lib/db');
const { requireAuth, sendJSON, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const img = await db.deleteImageRecord(parseInt(id));
    if (img && img.url) {
      try { await del(img.url); } catch (e) { /* blob may not exist */ }
    }
    return sendJSON(res, { success: true });
  }

  sendError(res, 'Method not allowed', 405);
};
