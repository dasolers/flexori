// Correo de reactivación a la audiencia de Flexori.
// Uso:
//   ?test=tu@email.com   → envía SOLO a esa dirección (prueba)
//   ?send=true           → envía a TODA la audiencia (irreversible)
const AUDIENCE_ID = '6e26b2aa-f4b4-4214-8b62-201be98e1a25';

exports.handler = async function(event) {
  const RESEND_KEY = process.env.RESEND_API_KEY_FULL || process.env.RESEND_API_KEY;
  const headers = { 'Content-Type': 'application/json' };
  const params = (event && event.queryStringParameters) || {};

  const subject = 'Flexori se renovó — y hay algo nuevo para ti 👀';
  const html = buildEmail();

  if (!RESEND_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Falta RESEND_API_KEY_FULL en las variables de entorno' }) };
  }

  try {
    // ── MODO PRUEBA: enviar solo a una dirección ──
    if (params.test) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Flexori <hola@flexori.work>',
          to: params.test,
          subject: '[PRUEBA] ' + subject,
          html: html
        })
      });
      const data = await res.json();
      return {
        statusCode: res.ok ? 200 : 400,
        headers,
        body: JSON.stringify({ mode: 'TEST', sentTo: params.test, ok: res.ok, data })
      };
    }

    // ── MODO REAL: broadcast a toda la audiencia ──
    if (params.send === 'true') {
      const createRes = await fetch('https://api.resend.com/broadcasts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience_id: AUDIENCE_ID,
          from: 'Flexori <hola@flexori.work>',
          subject: subject,
          html: html
        })
      });
      const createData = await createRes.json();
      if (createData.error || !createData.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: createData.error || 'No se pudo crear el broadcast', details: createData }) };
      }

      // Enviar el broadcast recién creado
      const sendRes = await fetch(`https://api.resend.com/broadcasts/${createData.id}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const sendData = await sendRes.json();

      return {
        statusCode: sendRes.ok ? 200 : 400,
        headers,
        body: JSON.stringify({ mode: 'BROADCAST', broadcast_id: createData.id, ok: sendRes.ok, data: sendData })
      };
    }

    // ── Sin parámetros: mostrar instrucciones ──
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Correo de reactivación listo. Elige un modo:',
        prueba: '?test=tu@email.com   (envía solo a ti)',
        real: '?send=true            (envía a TODA la audiencia — irreversible)'
      }, null, 2)
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

function buildEmail() {
  const item = (emoji, title, text) => `
    <tr><td style="padding:0 0 22px;">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="42" valign="top" style="font-size:24px;line-height:1.2;">${emoji}</td>
        <td valign="top">
          <div style="color:#ffffff;font-size:16px;font-weight:700;margin-bottom:4px;">${title}</div>
          <div style="color:#C8D8F0;font-size:14px;line-height:1.6;">${text}</div>
        </td>
      </tr></table>
    </td></tr>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1321;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1321;padding:40px 16px;"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#131B2E;border-radius:20px;overflow:hidden;">

  <tr><td style="background:linear-gradient(135deg,#1D5FA3,#1D9E75);padding:38px 40px;text-align:center;">
    <div style="font-family:'Syne',Helvetica,Arial,sans-serif;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Flexori</div>
    <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px;">Tu GPS de carrera remota</div>
  </td></tr>

  <tr><td style="padding:40px 40px 10px;">
    <p style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 14px;">Hola 👋</p>
    <p style="color:#C8D8F0;font-size:15px;line-height:1.7;margin:0 0 30px;">
      Hace un tiempo te uniste a Flexori, y queremos contarte que <strong style="color:#fff;">la plataforma cambió mucho</strong> desde entonces.
    </p>
    <p style="color:#1D9E75;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 20px;">Esto es lo nuevo</p>
  </td></tr>

  <tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" width="100%">
      ${item('🔍','Directorio de Talento','Ahora publicas tu perfil gratis y son las empresas las que te encuentran a ti. Sin intermediarios, sin comisiones.')}
      ${item('✏️','Tu perfil, editable siempre','Créalo una vez, actualízalo cuando quieras. Agrega tus habilidades, links y portafolio.')}
      ${item('🌎','Para todas las profesiones','Ya no es solo tech. Diseño, contabilidad, marketing, asistentes virtuales, soporte, educación, salud y más.')}
      ${item('⭐','Tu Score de Empleabilidad','Tu carta de presentación ante las empresas.')}
    </table>
  </td></tr>

  <tr><td style="padding:6px 40px 30px;">
    <p style="color:#C8D8F0;font-size:15px;line-height:1.7;margin:0 0 26px;">
      Y por supuesto, <strong style="color:#fff;">empleos remotos nuevos cada día</strong> de más de 8 fuentes internacionales.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="https://flexori.work" style="display:inline-block;background:#1D9E75;color:#0D1321;text-decoration:none;padding:16px 40px;border-radius:100px;font-weight:700;font-size:16px;font-family:'Syne',Helvetica,Arial,sans-serif;">Entra y mira qué hay nuevo →</a>
    </td></tr></table>
  </td></tr>

  <tr><td style="padding:0 40px;">
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:28px;text-align:center;">
      <p style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 8px;">¿Nos sigues en Instagram? 📲</p>
      <p style="color:#A8A69E;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Ahí publicamos empleos, consejos para conseguir trabajo remoto y novedades antes que nadie.
      </p>
      <a href="https://instagram.com/flexoriwork" style="display:inline-block;border:1.5px solid #1D9E75;color:#1D9E75;text-decoration:none;padding:13px 32px;border-radius:100px;font-weight:700;font-size:15px;">→ Síguenos en @flexoriwork</a>
    </div>
  </td></tr>

  <tr><td style="padding:34px 40px 40px;">
    <p style="color:#C8D8F0;font-size:15px;line-height:1.7;margin:0 0 22px;">Gracias por ser parte de esto desde el principio 💚</p>
    <p style="color:#ffffff;font-size:15px;font-weight:700;margin:0;">Alejandro Soler</p>
    <p style="color:#888780;font-size:13px;margin:2px 0 0;">Fundador · Flexori</p>
  </td></tr>

  <tr><td style="padding:22px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;background:rgba(0,0,0,0.15);">
    <p style="color:#888780;font-size:12px;margin:0 0 8px;">© 2026 Flexori · Tu GPS de carrera remota</p>
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:rgba(168,166,158,0.5);font-size:11px;">Darse de baja</a>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}
