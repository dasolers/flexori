// Cron diario: envía email de seguimiento a usuarios registrados hace ~14 días
// que aún no lo han recibido. Se programa en netlify.toml.
exports.handler = async function(event) {
  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY_FULL || process.env.RESEND_API_KEY;
  const FN_BASE = 'https://flexori.work/.netlify/functions/followup-response';

  const headers = { 'Content-Type': 'application/json' };

  try {
    // Ventana: usuarios registrados entre hace 14 y 21 días, sin followup enviado.
    // (rango de 7 días para no perder a nadie si el cron falla un día)
    const now = new Date();
    const from = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();
    const to   = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const query = `${SUPABASE_URL}/rest/v1/waitlist?select=email,name,created_at,followup_sent_at`
      + `&created_at=gte.${from}&created_at=lte.${to}`
      + `&followup_sent_at=is.null`;

    const res = await fetch(query, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'No users to follow up today', count: 0 }) };
    }

    let sent = 0;
    for (const user of users) {
      if (!user.email) continue;
      const firstName = (user.name || '').split(' ')[0] || '';
      const e = encodeURIComponent(user.email);
      const html = buildFollowupEmail(firstName, e, FN_BASE);

      // Enviar email individual
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Flexori <hola@flexori.work>',
          to: user.email,
          subject: firstName ? `${firstName}, ¿cómo te ha ido con tu búsqueda? 👀` : '¿Cómo te ha ido con tu búsqueda? 👀',
          html: html
        })
      });

      if (emailRes.ok) {
        // Marcar como enviado para no repetir
        await fetch(`${SUPABASE_URL}/rest/v1/waitlist?email=eq.${e}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ followup_sent_at: new Date().toISOString() })
        });
        sent++;
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Followups sent', count: sent, found: users.length }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

function buildFollowupEmail(firstName, encodedEmail, base) {
  const greeting = firstName ? `Hola ${firstName} 👋` : 'Hola 👋';
  const btn = (r, label, bg, color) =>
    `<a href="${base}?email=${encodedEmail}&r=${r}" style="display:block;background:${bg};color:${color};text-decoration:none;padding:16px;border-radius:12px;font-weight:700;font-size:16px;text-align:center;margin-bottom:12px;">${label}</a>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1321;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1321;padding:40px 20px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#131B2E;border-radius:20px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1D5FA3,#1D9E75);padding:36px 40px;text-align:center;">
    <div style="font-family:'Syne',Arial,sans-serif;font-size:26px;font-weight:800;color:#fff;">Flexori</div>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0 0 16px;">${greeting}</p>
    <p style="color:#C8D8F0;font-size:15px;line-height:1.7;margin:0 0 8px;">
      Hace dos semanas te uniste a Flexori, y queremos saber una sola cosa para poder ayudarte mejor:
    </p>
    <p style="color:#fff;font-size:17px;font-weight:600;line-height:1.6;margin:0 0 28px;">
      ¿Has conseguido empleo o algún proyecto?
    </p>
    ${btn('hired', '✅ Sí, conseguí algo', '#1D9E75', '#0D1321')}
    ${btn('searching', '🔍 Todavía estoy buscando', '#1D5FA3', '#ffffff')}
    ${btn('not_useful', '😕 No me ha servido aún', 'rgba(255,255,255,0.08)', '#C8D8F0')}
    <p style="color:#888780;font-size:13px;line-height:1.6;margin:24px 0 0;">
      Es un solo clic y nos ayuda muchísimo a mejorar Flexori para ti y para toda la comunidad. Gracias 💚
    </p>
  </td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
    <p style="color:#888780;font-size:12px;margin:0;">© 2026 Flexori · Tu GPS de carrera remota</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
