const https = require('https');
const crypto = require('crypto');
const db = require('../_lib/db');
const { sendJSON, sendError } = require('../_lib/auth');

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || '';
const SQUARE_ENV = process.env.SQUARE_ENV || 'sandbox';

const plans = {
  digital: { amount: 800, name: 'Digital' },
  premium: { amount: 1400, name: 'Premium' },
  patron: { amount: 3000, name: 'Patron' },
  digital_annual: { amount: 7680, name: 'Digital Annual' },
  premium_annual: { amount: 13440, name: 'Premium Annual' },
  patron_annual: { amount: 28800, name: 'Patron Annual' }
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { sourceId, email, name, plan: planKey } = req.body || {};
  if (!sourceId || !email || !planKey) {
    return sendError(res, 'sourceId, email, and plan are required');
  }

  const plan = plans[planKey];
  if (!plan) return sendError(res, 'Invalid plan');

  // If Square is configured, process real payment
  if (SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID) {
    try {
      const squareHost = SQUARE_ENV === 'production'
        ? 'connect.squareup.com'
        : 'connect.squareupsandbox.com';

      const paymentBody = JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: { amount: plan.amount, currency: 'USD' },
        note: 'The Antioch Review - ' + plan.name + ' Subscription',
        buyer_email_address: email
      });

      const squareRes = await new Promise(function (resolve, reject) {
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
        const request = https.request(options, function (response) {
          let body = '';
          response.on('data', function (chunk) { body += chunk; });
          response.on('end', function () {
            resolve({ status: response.statusCode, body: JSON.parse(body) });
          });
        });
        request.on('error', reject);
        request.write(paymentBody);
        request.end();
      });

      if (squareRes.status !== 200) {
        const errMsg = squareRes.body.errors
          ? squareRes.body.errors.map(function (e) { return e.detail; }).join(', ')
          : 'Payment failed';
        return sendError(res, errMsg);
      }

      await db.recordPayment(email, planKey, plan.amount, squareRes.body.payment.id);
      await db.addSubscriber(email, name || '', 'subscription-' + planKey);

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

  // Demo mode
  await db.recordPayment(email, planKey, plan.amount, 'demo-' + crypto.randomUUID());
  await db.addSubscriber(email, name || '', 'subscription-' + planKey);
  sendJSON(res, {
    success: true,
    demo: true,
    message: 'Payment recorded (demo mode — configure Square credentials for live payments)',
    plan: plan.name,
    amount: plan.amount
  });
};
