const { sendJSON } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Path=/; Max-Age=0');
  sendJSON(res, { success: true });
};
