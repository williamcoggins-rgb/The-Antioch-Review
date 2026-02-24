const db = require('../../_lib/db');
const { sendJSON, sendError } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);
  const { slug } = req.query;
  const article = await db.getArticleBySlug(slug);
  if (!article) return sendError(res, 'Article not found', 404);
  sendJSON(res, article);
};
