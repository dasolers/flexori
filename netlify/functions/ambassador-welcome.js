exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://flexori.work',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { name, email, ref_code } = JSON.parse(event.body);
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY || !email || !ref_code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const refUrl = `https://flexori.work/?ref=${ref_code}`;
    const firstName = name ? name.split(' ')[0] : 'Embajador';

    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  
  <div style="background:#16a34a;padding:32px 40px;text-align:center;">
    <h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;">Flexori</h1>
    <p style="color:#bbf7d0;font-size:13px;margin:6px 0 0;">Tu GPS de carrera remota</p>
  </div>

  <div style="padding:40px;">
    <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">¡Bienvenido al programa, ${firstName}! 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Tu aplicación fue aprobada. Ya puedes empezar a compartir tu link único y ganar comisiones reales.</p>
    
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:12px;color:#15803d;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Tu link de embajador</div>
      <div style="font-size:16px;font-weight:800;color:#15803d;word-break:break-all;">${refUrl}</div>
    </div>

    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px;">
      <div style="font-weight:700;color:#111827;margin-bottom:12px;">💰 Tus comisiones</div>
      <div style="display:flex;gap:16px;">
        <div style="flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#16a34a;">$2 USD</div>
          <div style="font-size:12px;color:#6b7280;">por Plan Pro</div>
        </div>
        <div style="flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#d97706;">$3 USD</div>
          <div style="font-size:12px;color:#6b7280;">por Plan Plus</div>
        </div>
      </div>
      <div style="font-size:12px;color:#6b7280;margin-top:10px;text-align:center;">Pagado vía PayPal el 1 de cada mes. Mínimo $10 acumulado.</div>
    </div>

    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px;">
      <div style="font-weight:700;color:#111827;margin-bottom:12px;">📢 Cómo compartir</div>
      <ol style="color:#374151;font-size:14px;line-height:2;padding-left:18px;margin:0;">
        <li>Copia tu link: <strong>${refUrl}</strong></li>
        <li>Compártelo en grupos de Facebook, WhatsApp, TikTok o LinkedIn</li>
        <li>Cada persona que se registre con tu link cuenta</li>
        <li>Cuando alguno se suscriba a Pro o Plus, ganas tu comisión</li>
      </ol>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">¿Tienes preguntas? Responde a este email y te ayudamos.<br>Gracias por ser parte de Flexori.</p>
  </div>

  <div style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 Flexori · <a href="https://flexori.work" style="color:#16a34a;text-decoration:none;">flexori.work</a></p>
  </div>
</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Flexori <hola@flexori.work>',
        to: [email],
        subject: `¡Bienvenido al programa de embajadores, ${firstName}! 🎉`,
        html
      })
    });

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
