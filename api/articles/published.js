const db = require('../_lib/db');
const { sendJSON } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { section, limit } = req.query || {};
  const articles = await db.getPublishedArticles(section, parseInt(limit) || 10);
  sendJSON(res, { articles });
};
