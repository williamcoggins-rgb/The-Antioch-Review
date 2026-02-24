const db = require('./_lib/db');
const { requireAuth, sendJSON, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  if (req.method === 'GET') {
    const { page, limit, section, published } = req.query || {};
    const result = await db.getArticles(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      section || undefined,
      published !== undefined ? published === 'true' : undefined
    );
    return sendJSON(res, result);
  }

  if (req.method === 'POST') {
    const data = req.body || {};
    if (!data.title || !data.author || !data.section || !data.body) {
      return sendError(res, 'Title, author, section, and body are required');
    }
    const validSections = ['faith', 'politics', 'culture', 'world', 'opinion', 'theology', 'church'];
    if (!validSections.includes(data.section.toLowerCase())) {
      return sendError(res, 'Invalid section. Must be one of: ' + validSections.join(', '));
    }
    data.section = data.section.toLowerCase();
    const result = await db.createArticle(data);
    return sendJSON(res, { success: true, ...result }, 201);
  }

  sendError(res, 'Method not allowed', 405);
};
