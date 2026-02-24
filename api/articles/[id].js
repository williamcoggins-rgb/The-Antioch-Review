const db = require('../_lib/db');
const { requireAuth, sendJSON, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const article = await db.getArticleById(parseInt(id));
    if (!article) return sendError(res, 'Article not found', 404);
    return sendJSON(res, article);
  }

  // Protected endpoints
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  if (req.method === 'PUT') {
    const data = req.body || {};
    if (!data.title) return sendError(res, 'Invalid data');
    await db.updateArticle(parseInt(id), data);
    return sendJSON(res, { success: true });
  }

  if (req.method === 'DELETE') {
    await db.deleteArticle(parseInt(id));
    return sendJSON(res, { success: true });
  }

  sendError(res, 'Method not allowed', 405);
};
