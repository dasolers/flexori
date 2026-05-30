const crypto = require('crypto');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '' };

  const STRIPE_SK = process.env.STRIPE_SECRET_KEY;
  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_JWT_KEY || process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY_FULL || process.env.RESEND_API_KEY;

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  console.log('Webhook received:', stripeEvent.type);

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const email = session.customer_email || (session.customer_details && session.customer_details.email);
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      console.log('Checkout completed for:', email);

      if (!email) {
        console.log('No email found');
        return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
      }

      // Get subscription to determine plan
      let plan = 'pro';
      if (subscriptionId && STRIPE_SK) {
        try {
          const subRes = await fetch('https://api.stripe.com/v1/subscriptions/' + subscriptionId, {
            headers: { 'Authorization': 'Bearer ' + STRIPE_SK }
          });
          const sub = await subRes.json();
          const priceId = sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.id;
          if (priceId === 'price_1TcGCcKCK5PGV3GQNjQWywcy') plan = 'plus';
          console.log('Plan:', plan, 'PriceId:', priceId);
        } catch(e) {
          console.log('Error getting subscription:', e.message);
        }
      }

      // Generate access token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Save to Supabase
      if (SUPABASE_KEY) {
        try {
          const sbRes = await fetch(SUPABASE_URL + '/rest/v1/subscribers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              email: email,
              plan: plan,
              status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              access_token: token,
              token_expires_at: expiresAt,
              updated_at: new Date().toISOString()
            })
          });
          console.log('Supabase response:', sbRes.status);
        } catch(e) {
          console.log('Supabase error:', e.message);
        }
      }

      // Send welcome email
      if (RESEND_KEY) {
        try {
          const accessUrl = 'https://flexori.work/access.html?token=' + token;
          const planName = plan === 'plus' ? 'Flexori Plus' : 'Flexori Pro';
          const planEmoji = plan === 'plus' ? '⚡' : '🚀';

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + RESEND_KEY
            },
            body: JSON.stringify({
              from: 'Flexori <hola@flexori.work>',
              to: email,
              subject: planEmoji + ' Tu acceso a ' + planName + ' está listo — Flexori',
              html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1321;color:#F0EEE6;border-radius:16px;overflow:hidden"><div style="height:4px;background:linear-gradient(90deg,#1D5FA3,#1D9E75)"></div><div style="padding:40px 32px"><div style="margin-bottom:28px"><span style="font-family:Arial;font-weight:700;font-size:20px;color:#fff">Flexori</span></div><h1 style="font-size:26px;font-weight:800;margin:0 0 8px;color:#fff">' + planEmoji + ' Bienvenido a ' + planName + '</h1><p style="color:#1D9E75;font-size:13px;font-weight:600;margin:0 0 20px;text-transform:uppercase;letter-spacing:1px">Acceso activado</p><p style="color:#A8A69E;font-size:15px;line-height:1.7;margin:0 0 24px">Tu suscripción está activa. Haz clic en el botón para activar tu acceso completo.</p><a href="' + accessUrl + '" style="display:block;background:#1D9E75;color:#0D1321;border-radius:100px;padding:14px 24px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;margin:0 0 24px">Activar mi acceso →</a><p style="color:#A8A69E;font-size:12px;line-height:1.6;margin:0">O copia este link: ' + accessUrl + '</p><p style="color:#A8A69E;font-size:12px;margin:16px 0 0">— El equipo de Flexori 🌎</p><p style="color:#A8A69E;font-size:11px;margin:4px 0 0">Welcome to ' + planName + '! <a href="' + accessUrl + '" style="color:#1D9E75">Click here to activate your access</a>.</p></div></div>'
            })
          });
          console.log('Email sent to:', email);
        } catch(e) {
          console.log('Email error:', e.message);
        }
      }
    }

    if (stripeEvent.type === 'customer.subscription.deleted') {
      const sub = stripeEvent.data.object;
      if (sub.customer && STRIPE_SK && SUPABASE_KEY) {
        try {
          const custRes = await fetch('https://api.stripe.com/v1/customers/' + sub.customer, {
            headers: { 'Authorization': 'Bearer ' + STRIPE_SK }
          });
          const customer = await custRes.json();
          if (customer.email) {
            await fetch(SUPABASE_URL + '/rest/v1/subscribers?email=eq.' + encodeURIComponent(customer.email), {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
              body: JSON.stringify({ status: 'cancelled', plan: 'free', updated_at: new Date().toISOString() })
            });
            console.log('Subscription cancelled for:', customer.email);
          }
        } catch(e) {
          console.log('Cancellation error:', e.message);
        }
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

  } catch(err) {
    console.log('Webhook error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
  }
};
