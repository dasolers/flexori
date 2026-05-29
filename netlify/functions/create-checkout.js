exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { priceId, email, successUrl, cancelUrl } = JSON.parse(event.body);
    const SK = process.env.STRIPE_SECRET_KEY;

    if (!SK) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured' }) };
    if (!priceId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'priceId required' }) };

    // Crear sesión de Stripe Checkout via API REST
    const params = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl || 'https://flexori.work/success.html?session_id={CHECKOUT_SESSION_ID}',
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url, sessionId: session.id })
    };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
