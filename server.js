/**
 * The Antioch Review — Backend Server
 * Built with Node.js built-in modules (no npm dependencies required)
 * Node.js 22+ required for built-in SQLite support
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const db = require('./db/database.js');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || '';
const SQUARE_APP_ID = process.env.SQUARE_APP_ID || '';
const SQUARE_ENV = process.env.SQUARE_ENV || 'sandbox'; // 'sandbox' or 'production'

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

// --- Utility functions ---

function sendJSON(res, data, status) {
  status = status || 200;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res, message, status) {
  sendJSON(res, { error: message }, status || 400);
}

function parseBody(req) {
  return new Promise(function(resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on('data', function(chunk) {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function() {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

async function parseJSON(req) {
  const body = await parseBody(req);
  try {
    return JSON.parse(body.toString());
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie;
  if (header) {
    header.split(';').forEach(function(cookie) {
      const parts = cookie.split('=');
      cookies[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('='));
    });
  }
  return cookies;
}

function createToken(payload) {
  // Simple JWT implementation using Node.js crypto
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

function requireAuth(req) {
  const cookies = parseCookies(req);
  const token = cookies.auth_token;
  if (!token) return null;
  return verifyToken(token);
}

function parseQueryString(urlStr) {
  const parsed = new URL(urlStr, 'http://localhost');
  const params = {};
  parsed.searchParams.forEach(function(value, key) {
    params[key] = value;
  });
  return params;
}

// --- Multipart form data parser ---
function parseMultipart(req, body) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) return { fields: {}, files: [] };

  const boundary = '--' + boundaryMatch[1];
  const parts = [];
  const fields = {};
  const files = [];

  let idx = body.indexOf(boundary);
  while (idx !== -1) {
    const nextIdx = body.indexOf(boundary, idx + boundary.length);
    if (nextIdx === -1) break;

    const part = body.slice(idx + boundary.length + 2, nextIdx - 2); // skip \r\n and trailing \r\n
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) { idx = nextIdx; continue; }

    const headerStr = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4);

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerStr.match(/Content-Type:\s*(.+)/i);

    if (nameMatch) {
      if (filenameMatch && filenameMatch[1]) {
        files.push({
          fieldname: nameMatch[1],
          originalname: filenameMatch[1],
          mimetype: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
          buffer: content,
          size: content.length
        });
      } else {
        fields[nameMatch[1]] = content.toString().trim();
      }
    }
    idx = nextIdx;
  }

  return { fields, files };
}

// --- API route handlers ---

async function handleAuth(req, res, method, pathParts) {
  if (method === 'POST' && pathParts[2] === 'login') {
    const data = await parseJSON(req);
    if (!data || !data.username || !data.password) {
      return sendError(res, 'Username and password required');
    }
    const user = db.verifyAdmin(data.username, data.password);
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }
    const token = createToken({ id: user.id, username: user.username });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=' + token + '; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict'
    });
    res.end(JSON.stringify({ success: true, user: { username: user.username } }));
    return;
  }

  if (method === 'POST' && pathParts[2] === 'logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=; HttpOnly; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (method === 'GET' && pathParts[2] === 'check') {
    const user = requireAuth(req);
    if (!user) return sendError(res, 'Not authenticated', 401);
    return sendJSON(res, { authenticated: true, user: { username: user.username } });
  }

  if (method === 'POST' && pathParts[2] === 'change-password') {
    const user = requireAuth(req);
    if (!user) return sendError(res, 'Not authenticated', 401);
    const data = await parseJSON(req);
    if (!data || !data.newPassword || data.newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters');
    }
    db.changeAdminPassword(user.username, data.newPassword);
    return sendJSON(res, { success: true });
  }

  sendError(res, 'Not found', 404);
}

async function handleSubscribers(req, res, method, pathParts) {
  // Public endpoint: newsletter signup
  if (method === 'POST' && !pathParts[2]) {
    const data = await parseJSON(req);
    if (!data || !data.email) return sendError(res, 'Email required');
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return sendError(res, 'Invalid email address');
    }
    const result = db.addSubscriber(data.email, data.name, data.source);
    if (!result.success) return sendError(res, result.error);
    return sendJSON(res, { success: true, message: 'Subscribed successfully' });
  }

  // Protected endpoints
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  if (method === 'GET' && !pathParts[2]) {
    const params = parseQueryString(req.url);
    const result = db.getSubscribers(
      parseInt(params.page) || 1,
      parseInt(params.limit) || 50,
      params.search
    );
    return sendJSON(res, result);
  }

  if (method === 'GET' && pathParts[2] === 'export') {
    const subscribers = db.exportSubscribers();
    const csv = 'email,name,source,subscribed_at,active\n' +
      subscribers.map(function(s) {
        return [s.email, s.name, s.source, s.subscribed_at, s.active].join(',');
      }).join('\n');
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=subscribers-' + new Date().toISOString().split('T')[0] + '.csv'
    });
    res.end(csv);
    return;
  }

  if (method === 'DELETE' && pathParts[2]) {
    db.deleteSubscriber(parseInt(pathParts[2]));
    return sendJSON(res, { success: true });
  }

  sendError(res, 'Not found', 404);
}

async function handleArticles(req, res, method, pathParts) {
  // Public: get published articles
  if (method === 'GET' && pathParts[2] === 'published') {
    const params = parseQueryString(req.url);
    const articles = db.getPublishedArticles(params.section, parseInt(params.limit) || 10);
    return sendJSON(res, { articles: articles });
  }

  if (method === 'GET' && pathParts[2] === 'slug' && pathParts[3]) {
    const article = db.getArticleBySlug(pathParts[3]);
    if (!article) return sendError(res, 'Article not found', 404);
    return sendJSON(res, article);
  }

  // Protected endpoints
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  if (method === 'GET' && !pathParts[2]) {
    const params = parseQueryString(req.url);
    const result = db.getArticles(
      parseInt(params.page) || 1,
      parseInt(params.limit) || 20,
      params.section,
      params.published !== undefined ? params.published === 'true' : undefined
    );
    return sendJSON(res, result);
  }

  if (method === 'GET' && pathParts[2] && pathParts[2] !== 'published' && pathParts[2] !== 'slug') {
    const article = db.getArticleById(parseInt(pathParts[2]));
    if (!article) return sendError(res, 'Article not found', 404);
    return sendJSON(res, article);
  }

  if (method === 'POST' && !pathParts[2]) {
    const data = await parseJSON(req);
    if (!data || !data.title || !data.author || !data.section || !data.body) {
      return sendError(res, 'Title, author, section, and body are required');
    }
    const validSections = ['faith', 'politics', 'culture', 'world', 'opinion', 'theology', 'church'];
    if (!validSections.includes(data.section.toLowerCase())) {
      return sendError(res, 'Invalid section. Must be one of: ' + validSections.join(', '));
    }
    data.section = data.section.toLowerCase();
    const result = db.createArticle(data);
    return sendJSON(res, { success: true, ...result }, 201);
  }

  if (method === 'PUT' && pathParts[2]) {
    const data = await parseJSON(req);
    if (!data) return sendError(res, 'Invalid data');
    db.updateArticle(parseInt(pathParts[2]), data);
    return sendJSON(res, { success: true });
  }

  if (method === 'DELETE' && pathParts[2]) {
    db.deleteArticle(parseInt(pathParts[2]));
    return sendJSON(res, { success: true });
  }

  sendError(res, 'Not found', 404);
}

async function handleUpload(req, res, method, pathParts) {
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  if (method === 'POST') {
    const rawBody = await parseBody(req);
    const { fields, files } = parseMultipart(req, rawBody);

    if (!files.length) return sendError(res, 'No file uploaded');

    const uploaded = [];
    for (const file of files) {
      // Validate file type
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowed.includes(file.mimetype)) {
        return sendError(res, 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG');
      }

      // Generate unique filename
      const ext = path.extname(file.originalname) || '.jpg';
      const filename = crypto.randomBytes(12).toString('hex') + ext;
      const filepath = path.join(__dirname, 'uploads', filename);

      fs.writeFileSync(filepath, file.buffer);
      const imageUrl = db.saveImageRecord(filename, file.originalname, file.mimetype, file.size);
      uploaded.push({ filename: filename, url: imageUrl, originalName: file.originalname });
    }

    return sendJSON(res, { success: true, files: uploaded }, 201);
  }

  if (method === 'GET' && !pathParts[2]) {
    const params = parseQueryString(req.url);
    const result = db.getImages(parseInt(params.page) || 1, parseInt(params.limit) || 30);
    return sendJSON(res, result);
  }

  if (method === 'DELETE' && pathParts[2]) {
    db.deleteImage(parseInt(pathParts[2]));
    return sendJSON(res, { success: true });
  }

  sendError(res, 'Not found', 404);
}

async function handlePayments(req, res, method, pathParts) {
  if (method === 'POST' && pathParts[2] === 'process') {
    const data = await parseJSON(req);
    if (!data || !data.sourceId || !data.email || !data.plan) {
      return sendError(res, 'sourceId, email, and plan are required');
    }

    const plans = {
      digital: { amount: 800, name: 'Digital' },
      premium: { amount: 1400, name: 'Premium' },
      patron: { amount: 3000, name: 'Patron' },
      digital_annual: { amount: 7680, name: 'Digital Annual' },
      premium_annual: { amount: 13440, name: 'Premium Annual' },
      patron_annual: { amount: 28800, name: 'Patron Annual' }
    };

    const plan = plans[data.plan];
    if (!plan) return sendError(res, 'Invalid plan');

    // If Square is configured, process real payment
    if (SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID) {
      try {
        const squareHost = SQUARE_ENV === 'production'
          ? 'connect.squareup.com'
          : 'connect.squareupsandbox.com';

        const paymentBody = JSON.stringify({
          source_id: data.sourceId,
          idempotency_key: crypto.randomUUID(),
          amount_money: {
            amount: plan.amount,
            currency: 'USD'
          },
          note: 'The Antioch Review - ' + plan.name + ' Subscription',
          buyer_email_address: data.email
        });

        const squareRes = await new Promise(function(resolve, reject) {
          const options = {
            hostname: squareHost,
            port: 443,
            path: '/v2/payments',
            method: 'POST',
            headers: {
              'Square-Version': '2024-12-18',
              'Authorization': 'Bearer ' + SQUARE_ACCESS_TOKEN,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(paymentBody)
            }
          };

          const request = require('https').request(options, function(response) {
            let body = '';
            response.on('data', function(chunk) { body += chunk; });
            response.on('end', function() {
              resolve({ status: response.statusCode, body: JSON.parse(body) });
            });
          });
          request.on('error', reject);
          request.write(paymentBody);
          request.end();
        });

        if (squareRes.status !== 200) {
          const errMsg = squareRes.body.errors
            ? squareRes.body.errors.map(function(e) { return e.detail; }).join(', ')
            : 'Payment failed';
          return sendError(res, errMsg);
        }

        db.recordPayment(data.email, data.plan, plan.amount, squareRes.body.payment.id);
        // Also add as subscriber
        db.addSubscriber(data.email, data.name || '', 'subscription-' + data.plan);

        return sendJSON(res, {
          success: true,
          payment: {
            id: squareRes.body.payment.id,
            status: squareRes.body.payment.status,
            plan: plan.name,
            amount: plan.amount
          }
        });
      } catch (e) {
        console.error('Square payment error:', e);
        return sendError(res, 'Payment processing error', 500);
      }
    }

    // Demo mode — no Square configured
    db.recordPayment(data.email, data.plan, plan.amount, 'demo-' + crypto.randomUUID());
    db.addSubscriber(data.email, data.name || '', 'subscription-' + data.plan);
    return sendJSON(res, {
      success: true,
      demo: true,
      message: 'Payment recorded (demo mode — configure Square credentials for live payments)',
      plan: plan.name,
      amount: plan.amount
    });
  }

  // Get payment config (public - returns app ID for frontend SDK)
  if (method === 'GET' && pathParts[2] === 'config') {
    return sendJSON(res, {
      appId: SQUARE_APP_ID || 'sandbox-sq0idb-DEMO',
      locationId: SQUARE_LOCATION_ID || 'DEMO',
      environment: SQUARE_ENV
    });
  }

  // Admin: view payments
  if (method === 'GET' && !pathParts[2]) {
    const user = requireAuth(req);
    if (!user) return sendError(res, 'Not authenticated', 401);
    const params = parseQueryString(req.url);
    const result = db.getPayments(parseInt(params.page) || 1, parseInt(params.limit) || 50);
    return sendJSON(res, result);
  }

  sendError(res, 'Not found', 404);
}

async function handleDashboard(req, res, method) {
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);
  if (method === 'GET') {
    return sendJSON(res, db.getDashboardStats());
  }
  sendError(res, 'Not found', 404);
}

// --- Static file server ---
function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    const headers = { 'Content-Type': contentType };
    if (ext === '.html') {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
    } else if (['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

// --- URL rewrite map (mirrors vercel.json) ---
const REWRITES = {
  '/faith': '/pages/category.html?cat=faith',
  '/politics': '/pages/category.html?cat=politics',
  '/culture': '/pages/category.html?cat=culture',
  '/world': '/pages/category.html?cat=world',
  '/opinion': '/pages/category.html?cat=opinion',
  '/theology': '/pages/category.html?cat=theology',
  '/church': '/pages/category.html?cat=church',
  '/subscribe': '/pages/subscribe.html',
  '/merch': '/pages/merch.html',
  '/about': '/pages/about.html',
  '/admin': '/pages/admin.html',
};

// --- Main request handler ---
const server = http.createServer(async function(req, res) {
  // CORS headers for API
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const parsedUrl = new URL(req.url, 'http://localhost');
  let pathname = parsedUrl.pathname;
  const method = req.method;

  // API routes
  if (pathname.startsWith('/api/')) {
    const pathParts = pathname.split('/').filter(Boolean); // ['api', 'resource', 'id']
    try {
      switch (pathParts[1]) {
        case 'auth': return await handleAuth(req, res, method, pathParts);
        case 'subscribers': return await handleSubscribers(req, res, method, pathParts);
        case 'articles': return await handleArticles(req, res, method, pathParts);
        case 'upload': return await handleUpload(req, res, method, pathParts);
        case 'payments': return await handlePayments(req, res, method, pathParts);
        case 'dashboard': return await handleDashboard(req, res, method);
        default: return sendError(res, 'API route not found', 404);
      }
    } catch (e) {
      console.error('API error:', e);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // URL rewrites
  if (REWRITES[pathname]) {
    const dest = REWRITES[pathname];
    const qIdx = dest.indexOf('?');
    if (qIdx > -1) {
      pathname = dest.substring(0, qIdx);
      // For rewrites with query strings, serve the file
    } else {
      pathname = dest;
    }
  }

  // Serve uploaded files
  if (pathname.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, pathname);
    return serveStatic(res, filePath);
  }

  // Clean URLs — try adding .html
  let filePath = path.join(__dirname, pathname);
  if (!path.extname(pathname) && pathname !== '/') {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  // Serve index.html for root
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, 'index.html');
  }

  // Check file exists
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Try index.html in directory
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveStatic(res, indexPath);
    }
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 Not Found</h1>');
    return;
  }

  serveStatic(res, filePath);
});

// Initialize database on startup
db.getDb();

server.listen(PORT, function() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║          The Antioch Review — Server             ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log('  ║  Site:    http://localhost:' + PORT + '                  ║');
  console.log('  ║  Admin:   http://localhost:' + PORT + '/admin             ║');
  console.log('  ║                                                  ║');
  console.log('  ║  Default admin login:                            ║');
  console.log('  ║    Username: admin                               ║');
  console.log('  ║    Password: admin123                            ║');
  console.log('  ║                                                  ║');
  console.log('  ║  Square payments: ' + (SQUARE_ACCESS_TOKEN ? 'CONFIGURED' : 'Demo mode    ') + '              ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
});
