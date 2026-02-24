module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.status(200).json({
    appId: process.env.SQUARE_APP_ID || 'sandbox-sq0idb-DEMO',
    locationId: process.env.SQUARE_LOCATION_ID || 'DEMO',
    environment: process.env.SQUARE_ENV || 'sandbox'
  });
};
