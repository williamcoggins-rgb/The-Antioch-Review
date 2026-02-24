const db = require('../_lib/db');
const { createToken, sendJSON, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { username, password } = req.body || {};
  if (!username || !password) return sendError(res, 'Username and password required');

  const user = await db.verifyAdmin(username, password);
  if (!user) return sendError(res, 'Invalid credentials', 401);

  const token = createToken({ id: user.id, username: user.username });
  res.setHeader('Set-Cookie', 'auth_token=' + token + '; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict');
  sendJSON(res, { success: true, user: { username: user.username } });
};
