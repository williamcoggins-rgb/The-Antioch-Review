/**
 * Database module for Vercel Postgres
 * Shared by all serverless functions
 */
const { sql } = require('@vercel/postgres');
const crypto = require('crypto');

let initialized = false;

async function initTables() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      source TEXT DEFAULT 'newsletter',
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      author TEXT NOT NULL,
      section TEXT NOT NULL,
      label TEXT DEFAULT '',
      body TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      featured BOOLEAN DEFAULT FALSE,
      published BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      plan TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      square_payment_id TEXT,
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create default admin if none exists
  const { rows } = await sql`SELECT COUNT(*) as cnt FROM admin_users`;
  if (parseInt(rows[0].cnt) === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('Sanfred4926', salt, 64).toString('hex');
    await sql`INSERT INTO admin_users (username, password_hash, salt) VALUES ('admin', ${hash}, ${salt})`;
  }

  initialized = true;
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
async function verifyAdmin(username, password) {
  await initTables();
  const { rows } = await sql`SELECT * FROM admin_users WHERE username = ${username}`;
  if (!rows.length) return null;
  const user = rows[0];
  if (verifyPassword(password, user.password_hash, user.salt)) {
    return { id: user.id, username: user.username };
  }
  return null;
}

async function changeAdminPassword(username, newPassword) {
  const { hash, salt } = hashPassword(newPassword);
  await sql`UPDATE admin_users SET password_hash = ${hash}, salt = ${salt} WHERE username = ${username}`;
}

// --- Subscribers ---
async function addSubscriber(email, name, source) {
  await initTables();
  try {
    await sql`INSERT INTO subscribers (email, name, source) VALUES (${email}, ${name || ''}, ${source || 'newsletter'})`;
    return { success: true };
  } catch (e) {
    if (e.message && e.message.includes('unique') || e.message.includes('duplicate')) {
      return { success: false, error: 'Email already subscribed' };
    }
    throw e;
  }
}

async function getSubscribers(page, limit, search) {
  await initTables();
  page = page || 1;
  limit = limit || 50;
  const offset = (page - 1) * limit;

  let total, rows;
  if (search) {
    const pattern = '%' + search + '%';
    const countResult = await sql`SELECT COUNT(*) as total FROM subscribers WHERE email ILIKE ${pattern} OR name ILIKE ${pattern}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM subscribers WHERE email ILIKE ${pattern} OR name ILIKE ${pattern} ORDER BY subscribed_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) as total FROM subscribers`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  }
  return { subscribers: rows, total, page, limit };
}

async function deleteSubscriber(id) {
  await sql`DELETE FROM subscribers WHERE id = ${id}`;
}

async function exportSubscribers() {
  await initTables();
  const { rows } = await sql`SELECT email, name, source, subscribed_at, active FROM subscribers ORDER BY subscribed_at DESC`;
  return rows;
}

// --- Articles ---
async function createSlug(title) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
  const { rows } = await sql`SELECT id FROM articles WHERE slug = ${slug}`;
  if (rows.length) {
    slug += '-' + Date.now().toString(36);
  }
  return slug;
}

async function createArticle(data) {
  await initTables();
  const slug = await createSlug(data.title);
  const result = await sql`
    INSERT INTO articles (title, subtitle, author, section, label, body, excerpt, image_url, slug, featured, published)
    VALUES (${data.title}, ${data.subtitle || ''}, ${data.author}, ${data.section},
            ${data.label || data.section}, ${data.body}, ${data.excerpt || ''},
            ${data.image_url || ''}, ${slug}, ${!!data.featured}, ${!!data.published})
    RETURNING id
  `;
  return { id: result.rows[0].id, slug };
}

async function updateArticle(id, data) {
  await sql`
    UPDATE articles SET title=${data.title}, subtitle=${data.subtitle || ''}, author=${data.author},
    section=${data.section}, label=${data.label || data.section}, body=${data.body},
    excerpt=${data.excerpt || ''}, image_url=${data.image_url || ''},
    featured=${!!data.featured}, published=${!!data.published}, updated_at=NOW()
    WHERE id=${id}
  `;
}

async function deleteArticle(id) {
  await sql`DELETE FROM articles WHERE id = ${id}`;
}

async function getArticles(page, limit, section, published) {
  await initTables();
  page = page || 1;
  limit = limit || 20;
  const offset = (page - 1) * limit;

  let total, rows;
  if (section && published !== undefined) {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles WHERE section=${section} AND published=${published}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles WHERE section=${section} AND published=${published} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else if (section) {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles WHERE section=${section}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles WHERE section=${section} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else if (published !== undefined) {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles WHERE published=${published}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles WHERE published=${published} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  }
  return { articles: rows, total, page, limit };
}

async function getArticleById(id) {
  const { rows } = await sql`SELECT * FROM articles WHERE id = ${id}`;
  return rows[0] || null;
}

async function getArticleBySlug(slug) {
  const { rows } = await sql`SELECT * FROM articles WHERE slug = ${slug} AND published = TRUE`;
  return rows[0] || null;
}

async function getPublishedArticles(section, limit) {
  await initTables();
  limit = limit || 10;
  if (section) {
    const { rows } = await sql`SELECT * FROM articles WHERE published = TRUE AND section = ${section} ORDER BY created_at DESC LIMIT ${limit}`;
    return rows;
  }
  const { rows } = await sql`SELECT * FROM articles WHERE published = TRUE ORDER BY created_at DESC LIMIT ${limit}`;
  return rows;
}

// --- Images ---
async function saveImageRecord(filename, originalName, mimeType, size, url) {
  await initTables();
  await sql`INSERT INTO images (filename, original_name, mime_type, size, url) VALUES (${filename}, ${originalName}, ${mimeType}, ${size}, ${url})`;
  return url;
}

async function getImages(page, limit) {
  await initTables();
  page = page || 1;
  limit = limit || 30;
  const offset = (page - 1) * limit;
  const countResult = await sql`SELECT COUNT(*) as total FROM images`;
  const total = parseInt(countResult.rows[0].total);
  const { rows } = await sql`SELECT * FROM images ORDER BY uploaded_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return { images: rows, total, page, limit };
}

async function deleteImageRecord(id) {
  const { rows } = await sql`SELECT * FROM images WHERE id = ${id}`;
  if (rows.length) {
    await sql`DELETE FROM images WHERE id = ${id}`;
  }
  return rows[0] || null;
}

// --- Payments ---
async function recordPayment(email, plan, amount, squarePaymentId) {
  await initTables();
  await sql`INSERT INTO payments (email, plan, amount, square_payment_id) VALUES (${email}, ${plan}, ${amount}, ${squarePaymentId || ''})`;
}

async function getPayments(page, limit) {
  await initTables();
  page = page || 1;
  limit = limit || 50;
  const offset = (page - 1) * limit;
  const countResult = await sql`SELECT COUNT(*) as total FROM payments`;
  const total = parseInt(countResult.rows[0].total);
  const { rows } = await sql`SELECT * FROM payments ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return { payments: rows, total, page, limit };
}

// --- Stats ---
async function getDashboardStats() {
  await initTables();
  const s = await sql`SELECT COUNT(*) as cnt FROM subscribers WHERE active = TRUE`;
  const a = await sql`SELECT COUNT(*) as cnt FROM articles`;
  const p = await sql`SELECT COUNT(*) as cnt FROM articles WHERE published = TRUE`;
  const i = await sql`SELECT COUNT(*) as cnt FROM images`;
  const pay = await sql`SELECT COUNT(*) as cnt FROM payments`;
  const rs = await sql`SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT 5`;
  const ra = await sql`SELECT id, title, section, author, published, created_at FROM articles ORDER BY created_at DESC LIMIT 5`;
  return {
    totalSubscribers: parseInt(s.rows[0].cnt),
    totalArticles: parseInt(a.rows[0].cnt),
    publishedArticles: parseInt(p.rows[0].cnt),
    totalImages: parseInt(i.rows[0].cnt),
    totalPayments: parseInt(pay.rows[0].cnt),
    recentSubscribers: rs.rows,
    recentArticles: ra.rows
  };
}

module.exports = {
  initTables, verifyAdmin, changeAdminPassword,
  addSubscriber, getSubscribers, deleteSubscriber, exportSubscribers,
  createArticle, updateArticle, deleteArticle, getArticles, getArticleById, getArticleBySlug, getPublishedArticles,
  saveImageRecord, getImages, deleteImageRecord,
  recordPayment, getPayments,
  getDashboardStats
};
