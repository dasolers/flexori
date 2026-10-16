// Netlify Function — contacto con talento de Flexori
// El navegador nunca ve el email del profesional: esta función lo busca con la service key
// y le reenvía el mensaje por Resend, con reply_to = email (verificado) de quien contacta.
const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const MAX_PER_DAY = 10;

const ALLOWED = ['https://flexori.work', 'https://www.flexori.work'];

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

exports.handler = async function (event) {
  const origin = event.headers.origin || '';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  const reply = (code, obj) => ({ statusCode: code, headers, body: JSON.stringify(obj) });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Método no permitido' });
  if (!SERVICE_KEY || !RESEND_KEY) return reply(500, { error: 'Configuración incompleta del servidor' });

  // 1. Verificar sesión del usuario que contacta
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return reply(401, { error: 'Inicia sesión para contactar' });

  let sender;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` }
    });
    if (!r.ok) return reply(401, { error: 'Sesión inválida o expirada' });
    sender = await r.json();
  } catch (e) {
    return reply(502, { error: 'No pudimos verificar tu sesión' });
  }
  if (!sender || !sender.email) return reply(401, { error: 'Sesión inválida' });

  // 2. Validar datos
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { error: 'Datos inválidos' }); }
  const profileId = String(body.profile_id || '').trim();
  const senderName = String(body.sender_name || '').trim().slice(0, 80);
  const message = String(body.message || '').trim().slice(0, 2000);
  if (!profileId || !/^[0-9a-zA-Z-]{1,64}$/.test(profileId)) return reply(400, { error: 'Perfil inválido' });
  if (!senderName) return reply(400, { error: 'Falta tu nombre' });
  if (message.length < 30) return reply(400, { error: 'El mensaje es muy corto' });

  const sb = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  // 3. Límite diario por remitente (si la tabla de registro existe)
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const r = await fetch(`${SUPABASE_URL}/rest/v1/talent_contacts?sender_email=eq.${encodeURIComponent(sender.email)}&created_at=gte.${since}&select=id`, {
      headers: { ...sb, Prefer: 'count=exact' }
    });
    if (r.ok) {
      const range = r.headers.get('content-range') || '';
      const total = parseInt(range.split('/')[1] || '0', 10);
      if (total >= MAX_PER_DAY) return reply(429, { error: 'Llegaste al límite de mensajes por hoy. Intenta mañana.' });
    }
  } catch (e) { /* si falla el conteo, no bloqueamos */ }

  // 4. Buscar al profesional (solo perfiles aprobados)
  let profile;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/service_profiles?id=eq.${encodeURIComponent(profileId)}&status=eq.approved&select=id,name,email,title,user_id&limit=1`, { headers: sb });
    const rows = await r.json();
    profile = Array.isArray(rows) ? rows[0] : null;
  } catch (e) {
    return reply(502, { error: 'No pudimos encontrar el perfil' });
  }
  if (!profile || !profile.email) return reply(404, { error: 'Este perfil ya no está disponible' });
  if (profile.email.toLowerCase() === sender.email.toLowerCase()) return reply(400, { error: 'No puedes contactarte a ti mismo' });

  // 5. Enviar email al profesional
  const firstName = esc((profile.name || '').split(' ')[0] || 'hola');
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0D1321;color:#F0EEE6;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#131B2E;border-radius:16px;overflow:hidden;border:1px solid rgba(29,158,117,0.2)">
    <div style="background:linear-gradient(135deg,#1D5FA3,#1D9E75);padding:28px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">✉️</div>
      <h1 style="margin:0;font-size:21px;font-weight:800;color:#fff">Tienes un nuevo contacto en Flexori</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;margin:0 0 16px">Hola <strong>${firstName}</strong> 👋</p>
      <p style="color:#A8A69E;line-height:1.7;margin:0 0 20px">
        <strong style="color:#fff">${esc(senderName)}</strong> vio tu perfil <strong style="color:#1D9E75">${esc(profile.title || '')}</strong> y te escribió:
      </p>
      <div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.2);border-radius:12px;padding:20px;margin-bottom:24px;white-space:pre-wrap;line-height:1.7;color:#F0EEE6">${esc(message)}</div>
      <p style="color:#A8A69E;line-height:1.7;margin:0 0 8px">
        Para responder, solo contesta este email: le llegará directamente a <strong style="color:#fff">${esc(sender.email)}</strong>.
      </p>
      <p style="font-size:12px;color:#A8A69E;line-height:1.6;margin:20px 0 0">
        🔒 Flexori no comparte tu email: esta persona solo lo verá si le respondes. Nunca pagues por adelantado ni compartas datos bancarios con alguien que no conoces.
      </p>
    </div>
    <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
      <p style="font-size:11px;color:#A8A69E;margin:0">© 2026 Flexori · <a href="https://flexori.work/services.html" style="color:#1D9E75">Gestionar mi perfil</a></p>
    </div>
  </div>
</body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Flexori <hola@flexori.work>',
        to: profile.email,
        reply_to: sender.email,
        subject: `${senderName} quiere contactarte por tu servicio en Flexori`,
        html
      })
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('Resend error', r.status, t);
      return reply(502, { error: 'No pudimos enviar el mensaje. Intenta de nuevo.' });
    }
  } catch (e) {
    return reply(502, { error: 'No pudimos enviar el mensaje. Intenta de nuevo.' });
  }

  // 6. Registrar el contacto (para métricas); si falla, no afecta al usuario
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/talent_contacts`, {
      method: 'POST',
      headers: { ...sb, Prefer: 'return=minimal' },
      body: JSON.stringify({
        profile_id: profile.id,
        sender_email: sender.email,
        sender_name: senderName,
        message_length: message.length
      })
    });
  } catch (e) { /* sin bloqueo */ }

  return reply(200, { ok: true });
};
