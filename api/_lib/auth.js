/**
 * Auth utilities for Vercel serverless functions
 */
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'antioch-review-default-secret-change-me';

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + signature;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(parts[0] + '.' + parts[1]).digest('base64url');
    if (signature !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(function (cookie) {
      const parts = cookie.split('=');
      cookies[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('='));
    });
  }
  return cookies;
}

function requireAuth(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return null;
  return verifyToken(token);
}

function sendJSON(res, data, status) {
  res.status(status || 200).json(data);
}

function sendError(res, message, status) {
  res.status(status || 400).json({ error: message });
}

module.exports = { createToken, verifyToken, requireAuth, sendJSON, sendError };
