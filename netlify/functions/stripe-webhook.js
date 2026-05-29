const crypto = require('crypto');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const STRIPE_SK = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  // Verify Stripe signature
  if (STRIPE_WEBHOOK_SECRET) {
    const sig = event.headers['stripe-signature'];
    const payload = event.body;
    try {
      const parts = sig.split(',');
      const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
      const signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.split('=')[1]);
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSig = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signedPayload).digest('hex');
      if (!signatures.includes(expectedSig)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
      }
    } catch(e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Signature verification failed' }) };
    }
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Helper: generate secure token
  function generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Helper: upsert subscriber in Supabase
  async function upsertSubscriber(data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });
    return res;
  }

  // Helper: send welcome email via Resend
  async function sendWelcomeEmail(email, plan, token) {
    const accessUrl = `https://flexori.work/access?token=${token}`;
    const planName = plan === 'plus' ? 'Flexori Plus' : 'Flexori Pro';
    const planEmoji = plan === 'plus' ? '⚡' : '🚀';
    const weeks = plan === 'plus' ? 'las 4 semanas completas + CV Optimizer ilimitado' : 'las semanas 2, 3 y 4 + artículos exclusivos';

    const htmlES = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1321;color:#F0EEE6;border-radius:16px;overflow:hidden">
      <div style="height:4px;background:linear-gradient(90deg,#1D5FA3,#1D9E75)"></div>
      <div style="padding:40px 36px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#1D5FA3,#1D9E75);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff">F</div>
          <span style="font-size:18px;font-weight:700;color:#fff">Flexori</span>
        </div>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;color:#fff;line-height:1.2">${planEmoji} Bienvenido a ${planName}</h1>
        <p style="color:#1D9E75;font-size:14px;font-weight:600;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px">Acceso activado</p>
        <p style="color:#A8A69E;font-size:15px;line-height:1.7;margin:0 0 24px">Tu suscripción está activa. Ahora tienes acceso a ${weeks} de tu ruta de carrera remota.</p>
        <div style="background:#131B2E;border:1px solid rgba(29,158,117,0.3);border-radius:12px;padding:20px;margin:0 0 28px">
          <p style="color:#A8A69E;font-size:13px;margin:0 0 6px">Tu enlace de acceso personal (válido 30 días):</p>
          <p style="color:#1D9E75;font-size:12px;word-break:break-all;margin:0">${accessUrl}</p>
        </div>
        <a href="${accessUrl}" style="display:block;background:#1D9E75;color:#0D1321;border-radius:100px;padding:14px 24px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;margin:0 0 32px">Activar mi acceso →</a>
        <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:24px">
          <p style="color:#A8A69E;font-size:13px;line-height:1.6;margin:0">Este enlace expira en 30 días y se renueva automáticamente con tu suscripción. Si tienes preguntas, responde a este email.<br><br>— El equipo de Flexori 🌎</p>
        </div>
      </div>
    </div>`;

    const htmlEN = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1321;color:#F0EEE6;border-radius:16px;overflow:hidden">
      <div style="height:4px;background:linear-gradient(90deg,#1D5FA3,#1D9E75)"></div>
      <div style="padding:40px 36px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#1D5FA3,#1D9E75);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff">F</div>
          <span style="font-size:18px;font-weight:700;color:#fff">Flexori</span>
        </div>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;color:#fff;line-height:1.2">${planEmoji} Welcome to ${planName}</h1>
        <p style="color:#1D9E75;font-size:14px;font-weight:600;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px">Access activated</p>
        <p style="color:#A8A69E;font-size:15px;line-height:1.7;margin:0 0 24px">Your subscription is active. You now have access to your complete remote career roadmap.</p>
        <a href="${accessUrl}" style="display:block;background:#1D9E75;color:#0D1321;border-radius:100px;padding:14px 24px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;margin:0 0 32px">Activate my access →</a>
        <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:24px">
          <p style="color:#A8A69E;font-size:13px;line-height:1.6;margin:0">This link expires in 30 days and renews automatically with your subscription.<br><br>— The Flexori Team 🌎</p>
        </div>
      </div>
    </div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Flexori <hola@flexori.work>',
        to: email,
        subject: `${planEmoji} Tu acceso a ${planName} está listo — Flexori`,
        html: htmlES + '<br><br><hr><br>' + htmlEN
      })
    });
  }

  // ── HANDLE EVENTS ──
  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const email = session.customer_email || session.customer_details?.email;
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      if (!email) return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

      // Get subscription to determine plan
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SK}` }
      });
      const sub = await subRes.json();
      const priceId = sub.items?.data?.[0]?.price?.id;
      const plan = priceId === 'price_1TcGCcKCK5PGV3GQNjQWywcy' ? 'plus' : 'pro';

      // Generate access token (30 days)
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await upsertSubscriber({
        email,
        plan,
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        access_token: token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      });

      await sendWelcomeEmail(email, plan, token);
    }

    if (stripeEvent.type === 'customer.subscription.deleted' || 
        stripeEvent.type === 'customer.subscription.paused') {
      const sub = stripeEvent.data.object;
      const customerId = sub.customer;

      // Get customer email
      const custRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SK}` }
      });
      const customer = await custRes.json();
      const email = customer.email;

      if (email) {
        await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ status: 'cancelled', plan: 'free', updated_at: new Date().toISOString() })
        });
      }
    }

    if (stripeEvent.type === 'invoice.payment_succeeded') {
      // Renew token on successful recurring payment
      const invoice = stripeEvent.data.object;
      const customerId = invoice.customer;
      const subscriptionId = invoice.subscription;
      if (invoice.billing_reason === 'subscription_cycle') {
        const custRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SK}` }
        });
        const customer = await custRes.json();
        const email = customer.email;
        if (email) {
          const newToken = generateToken();
          const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ access_token: newToken, token_expires_at: newExpiry, status: 'active', updated_at: new Date().toISOString() })
          });
        }
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

  } catch(err) {
    console.error('Webhook error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
