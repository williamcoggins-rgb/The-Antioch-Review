const { put, list } = require('@vercel/blob');
const db = require('./_lib/db');
const { requireAuth, sendJSON, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req);
  if (!user) return sendError(res, 'Not authenticated', 401);

  if (req.method === 'POST') {
    // Handle file upload via Vercel Blob
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Parse the multipart form data manually from the raw body
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', resolve);
        req.on('error', reject);
      });
      const body = Buffer.concat(chunks);

      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) return sendError(res, 'Invalid form data');

      const boundary = '--' + boundaryMatch[1];
      const files = [];

      let idx = body.indexOf(boundary);
      while (idx !== -1) {
        const nextIdx = body.indexOf(boundary, idx + boundary.length);
        if (nextIdx === -1) break;
        const part = body.slice(idx + boundary.length + 2, nextIdx - 2);
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) { idx = nextIdx; continue; }
        const headerStr = part.slice(0, headerEnd).toString();
        const content = part.slice(headerEnd + 4);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const contentTypeMatch = headerStr.match(/Content-Type:\s*(.+)/i);
        if (filenameMatch && filenameMatch[1]) {
          files.push({
            originalname: filenameMatch[1],
            mimetype: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
            buffer: content,
            size: content.length
          });
        }
        idx = nextIdx;
      }

      if (!files.length) return sendError(res, 'No file uploaded');

      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      const uploaded = [];

      for (const file of files) {
        if (!allowed.includes(file.mimetype)) {
          return sendError(res, 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG');
        }
        const blob = await put(file.originalname, file.buffer, {
          access: 'public',
          contentType: file.mimetype
        });
        await db.saveImageRecord(blob.pathname, file.originalname, file.mimetype, file.size, blob.url);
        uploaded.push({ filename: blob.pathname, url: blob.url, originalName: file.originalname });
      }

      return sendJSON(res, { success: true, files: uploaded }, 201);
    }

    return sendError(res, 'Content type must be multipart/form-data');
  }

  if (req.method === 'GET') {
    const { page, limit } = req.query || {};
    const result = await db.getImages(parseInt(page) || 1, parseInt(limit) || 30);
    return sendJSON(res, result);
  }

  sendError(res, 'Method not allowed', 405);
};

// Disable body parsing so we can handle multipart manually
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
