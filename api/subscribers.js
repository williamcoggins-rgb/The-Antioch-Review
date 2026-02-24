const db = require('./_lib/db');
const { requireAuth, sendJSON, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  // Public: newsletter signup
  if (req.method === 'POST') {
    const { email, name, source } = req.body || {};
    if (!email) return sendError(res, 'Email required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError(res, 'Invalid email address');
    }
    const result = await db.addSubscriber(email, name, source);
    if (!result.success) return sendError(res, result.error);
    return sendJSON(res, { success: true, message: 'Subscribed successfully' });
  }

  // Protected: list subscribers
  if (req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return sendError(res, 'Not authenticated', 401);
    const { page, limit, search } = req.query || {};
    const result = await db.getSubscribers(
      parseInt(page) || 1,
      parseInt(limit) || 50,
      search
    );
    return sendJSON(res, result);
  }

  sendError(res, 'Method not allowed', 405);
};
