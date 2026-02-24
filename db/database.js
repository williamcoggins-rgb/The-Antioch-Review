/**
 * Database module using Node.js 22 built-in SQLite
 * Manages subscribers, articles, images, and admin users
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'antioch.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA foreign_keys=ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      source TEXT DEFAULT 'newsletter',
      subscribed_at TEXT DEFAULT (datetime('now')),
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      author TEXT NOT NULL,
      section TEXT NOT NULL,
      label TEXT DEFAULT '',
      body TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      featured INTEGER DEFAULT 0,
      published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      plan TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      square_payment_id TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create default admin if none exists
  const count = db.prepare('SELECT COUNT(*) as cnt FROM admin_users').get();
  if (count.cnt === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('Sanfred4926', salt, 64).toString('hex');
    db.prepare('INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)')
      .run('admin', hash, salt);
    console.log('[DB] Default admin created — username: admin');
  }
}

// --- Password helpers ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// --- Admin ---
function verifyAdmin(username, password) {
  const user = getDb().prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user) return null;
  if (verifyPassword(password, user.password_hash, user.salt)) {
    return { id: user.id, username: user.username };
  }
  return null;
}

function changeAdminPassword(username, newPassword) {
  const { hash, salt } = hashPassword(newPassword);
  getDb().prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE username = ?')
    .run(hash, salt, username);
}

// --- Subscribers ---
function addSubscriber(email, name, source) {
  try {
    getDb().prepare('INSERT INTO subscribers (email, name, source) VALUES (?, ?, ?)')
      .run(email, name || '', source || 'newsletter');
    return { success: true };
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return { success: false, error: 'Email already subscribed' };
    }
    throw e;
  }
}

function getSubscribers(page, limit, search) {
  page = page || 1;
  limit = limit || 50;
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM subscribers';
  let countQuery = 'SELECT COUNT(*) as total FROM subscribers';
  const params = [];

  if (search) {
    query += ' WHERE email LIKE ? OR name LIKE ?';
    countQuery += ' WHERE email LIKE ? OR name LIKE ?';
    params.push('%' + search + '%', '%' + search + '%');
  }

  query += ' ORDER BY subscribed_at DESC LIMIT ? OFFSET ?';
  const total = getDb().prepare(countQuery).get(...params).total;
  const rows = getDb().prepare(query).all(...params, limit, offset);
  return { subscribers: rows, total, page, limit };
}

function deleteSubscriber(id) {
  getDb().prepare('DELETE FROM subscribers WHERE id = ?').run(id);
}

function exportSubscribers() {
  return getDb().prepare('SELECT email, name, source, subscribed_at, active FROM subscribers ORDER BY subscribed_at DESC').all();
}

// --- Articles ---
function createSlug(title) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
  // Check uniqueness
  const existing = getDb().prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (existing) {
    slug += '-' + Date.now().toString(36);
  }
  return slug;
}

function createArticle(data) {
  const slug = createSlug(data.title);
  const result = getDb().prepare(`
    INSERT INTO articles (title, subtitle, author, section, label, body, excerpt, image_url, slug, featured, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.title, data.subtitle || '', data.author, data.section,
    data.label || data.section, data.body, data.excerpt || '',
    data.image_url || '', slug, data.featured ? 1 : 0, data.published ? 1 : 0
  );
  return { id: result.lastInsertRowid, slug };
}

function updateArticle(id, data) {
  getDb().prepare(`
    UPDATE articles SET title=?, subtitle=?, author=?, section=?, label=?,
    body=?, excerpt=?, image_url=?, featured=?, published=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    data.title, data.subtitle || '', data.author, data.section,
    data.label || data.section, data.body, data.excerpt || '',
    data.image_url || '', data.featured ? 1 : 0, data.published ? 1 : 0, id
  );
}

function deleteArticle(id) {
  getDb().prepare('DELETE FROM articles WHERE id = ?').run(id);
}

function getArticles(page, limit, section, published) {
  page = page || 1;
  limit = limit || 20;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (section) {
    conditions.push('section = ?');
    params.push(section);
  }
  if (published !== undefined) {
    conditions.push('published = ?');
    params.push(published ? 1 : 0);
  }

  let where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const total = getDb().prepare('SELECT COUNT(*) as total FROM articles' + where).get(...params).total;
  const rows = getDb().prepare('SELECT * FROM articles' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(...params, limit, offset);
  return { articles: rows, total, page, limit };
}

function getArticleById(id) {
  return getDb().prepare('SELECT * FROM articles WHERE id = ?').get(id);
}

function getArticleBySlug(slug) {
  return getDb().prepare('SELECT * FROM articles WHERE slug = ? AND published = 1').get(slug);
}

function getPublishedArticles(section, limit) {
  limit = limit || 10;
  if (section) {
    return getDb().prepare('SELECT * FROM articles WHERE published = 1 AND section = ? ORDER BY created_at DESC LIMIT ?')
      .all(section, limit);
  }
  return getDb().prepare('SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC LIMIT ?')
    .all(limit);
}

// --- Images ---
function saveImageRecord(filename, originalName, mimeType, size) {
  const url = '/uploads/' + filename;
  getDb().prepare('INSERT INTO images (filename, original_name, mime_type, size, url) VALUES (?, ?, ?, ?, ?)')
    .run(filename, originalName, mimeType, size, url);
  return url;
}

function getImages(page, limit) {
  page = page || 1;
  limit = limit || 30;
  const offset = (page - 1) * limit;
  const total = getDb().prepare('SELECT COUNT(*) as total FROM images').get().total;
  const rows = getDb().prepare('SELECT * FROM images ORDER BY uploaded_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
  return { images: rows, total, page, limit };
}

function deleteImage(id) {
  const img = getDb().prepare('SELECT * FROM images WHERE id = ?').get(id);
  if (img) {
    const filepath = path.join(__dirname, '..', 'uploads', img.filename);
    try { fs.unlinkSync(filepath); } catch (e) { /* file may not exist */ }
    getDb().prepare('DELETE FROM images WHERE id = ?').run(id);
  }
  return img;
}

// --- Payments ---
function recordPayment(email, plan, amount, squarePaymentId) {
  getDb().prepare('INSERT INTO payments (email, plan, amount, square_payment_id) VALUES (?, ?, ?, ?)')
    .run(email, plan, amount, squarePaymentId || '');
}

function getPayments(page, limit) {
  page = page || 1;
  limit = limit || 50;
  const offset = (page - 1) * limit;
  const total = getDb().prepare('SELECT COUNT(*) as total FROM payments').get().total;
  const rows = getDb().prepare('SELECT * FROM payments ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
  return { payments: rows, total, page, limit };
}

// --- Stats ---
function getDashboardStats() {
  const totalSubscribers = getDb().prepare('SELECT COUNT(*) as cnt FROM subscribers WHERE active = 1').get().cnt;
  const totalArticles = getDb().prepare('SELECT COUNT(*) as cnt FROM articles').get().cnt;
  const publishedArticles = getDb().prepare('SELECT COUNT(*) as cnt FROM articles WHERE published = 1').get().cnt;
  const totalImages = getDb().prepare('SELECT COUNT(*) as cnt FROM images').get().cnt;
  const totalPayments = getDb().prepare('SELECT COUNT(*) as cnt FROM payments').get().cnt;
  const recentSubscribers = getDb().prepare('SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT 5').all();
  const recentArticles = getDb().prepare('SELECT id, title, section, author, published, created_at FROM articles ORDER BY created_at DESC LIMIT 5').all();
  return { totalSubscribers, totalArticles, publishedArticles, totalImages, totalPayments, recentSubscribers, recentArticles };
}

module.exports = {
  getDb, verifyAdmin, changeAdminPassword,
  addSubscriber, getSubscribers, deleteSubscriber, exportSubscribers,
  createArticle, updateArticle, deleteArticle, getArticles, getArticleById, getArticleBySlug, getPublishedArticles,
  saveImageRecord, getImages, deleteImage,
  recordPayment, getPayments,
  getDashboardStats
};
