// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT = 5; // max 5 requests per IP per minute
const WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - record.start > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  rateLimitMap.set(ip, record);
  return true;
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://flexori.work',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Rate limit por IP
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  if (!checkRateLimit(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests. Please wait a moment.' }) };
  }

  try {
    const { priceId, email, successUrl, cancelUrl } = JSON.parse(event.body);
    const SK = process.env.STRIPE_SECRET_KEY;

    if (!SK) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured' }) };
    if (!priceId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'priceId required' }) };

    const validPrices = [
      'price_1TcGCbKCK5PGV3GQgiqLL0wd',
      'price_1TcGCcKCK5PGV3GQNjQWywcy'
    ];
    if (!validPrices.includes(priceId)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid price' }) };
    }

    const params = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl || 'https://flexori.work/dashboard.html?upgraded=true',
      'cancel_url': cancelUrl || 'https://flexori.work/cv-optimizer.html',
      'allow_promotion_codes': 'true',
      'billing_address_collection': 'auto',
    });

    if (email) params.append('customer_email', email);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SK}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await response.json();
    if (session.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: session.error.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url, sessionId: session.id }) };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
