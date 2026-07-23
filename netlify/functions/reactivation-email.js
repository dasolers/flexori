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
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="42" valign="top" style="font-size:24px;line-height:1.2;">${emoji}</td>
        <td valign="top">
          <div style="color:#0D1321;font-size:16px;font-weight:bold;padding-bottom:4px;">${title}</div>
          <div style="color:#4A5568;font-size:14px;line-height:1.6;">${text}</div>
        </td>
      </tr></table>
    </td></tr>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head>
<body style="margin:0;padding:0;background-color:#F4F6F9;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F6F9" style="background-color:#F4F6F9;padding:32px 12px;"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width:580px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4E8EF;">

  <tr><td bgcolor="#1D5FA3" style="background-color:#1D5FA3;background-image:linear-gradient(135deg,#1D5FA3,#1D9E75);padding:36px 40px;text-align:center;">
    <div style="font-size:30px;font-weight:bold;color:#FFFFFF;letter-spacing:-0.5px;">Flexori</div>
    <div style="color:#E8F5EF;font-size:14px;padding-top:6px;">Tu GPS de carrera remota</div>
  </td></tr>

  <tr><td style="padding:36px 40px 8px;">
    <p style="color:#0D1321;font-size:22px;font-weight:bold;margin:0 0 14px;">Hola 👋</p>
    <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 28px;">
      Hace un tiempo te uniste a Flexori, y queremos contarte que <strong style="color:#0D1321;">la plataforma cambió mucho</strong> desde entonces.
    </p>
    <p style="color:#1D9E75;font-size:13px;font-weight:bold;letter-spacing:1.5px;margin:0 0 20px;">ESTO ES LO NUEVO</p>
  </td></tr>

  <tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${item('🔍','Directorio de Talento','Ahora publicas tu perfil gratis y son las empresas las que te encuentran a ti. Sin intermediarios, sin comisiones.')}
      ${item('✏️','Tu perfil, editable siempre','Créalo una vez, actualízalo cuando quieras. Agrega tus habilidades, links y portafolio.')}
      ${item('🌎','Para todas las profesiones','Ya no es solo tech. Diseño, contabilidad, marketing, asistentes virtuales, soporte, educación, salud y más.')}
      ${item('⭐','Tu Score de Empleabilidad','Tu carta de presentación ante las empresas.')}
    </table>
  </td></tr>

  <tr><td style="padding:6px 40px 28px;">
    <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 26px;">
      Y por supuesto, <strong style="color:#0D1321;">empleos remotos nuevos cada día</strong> de más de 8 fuentes internacionales.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
      <a href="https://flexori.work" style="display:inline-block;background-color:#1D9E75;color:#FFFFFF;text-decoration:none;padding:16px 40px;border-radius:100px;font-weight:bold;font-size:16px;">Entra y mira qué hay nuevo →</a>
    </td></tr></table>
  </td></tr>

  <tr><td style="padding:0 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #E4E8EF;padding-top:28px;text-align:center;">
      <p style="color:#0D1321;font-size:17px;font-weight:bold;margin:0 0 8px;">¿Nos sigues en Instagram? 📲</p>
      <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Ahí publicamos empleos, consejos para conseguir trabajo remoto y novedades antes que nadie.
      </p>
      <a href="https://instagram.com/flexoriwork" style="display:inline-block;border:2px solid #1D9E75;color:#1D9E75;text-decoration:none;padding:12px 30px;border-radius:100px;font-weight:bold;font-size:15px;">→ Síguenos en @flexoriwork</a>
    </td></tr></table>
  </td></tr>

  <tr><td style="padding:32px 40px 36px;">
    <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 22px;">Gracias por ser parte de esto desde el principio 💚</p>
    <p style="color:#0D1321;font-size:15px;font-weight:bold;margin:0;">Alejandro Soler</p>
    <p style="color:#6B7280;font-size:13px;margin:2px 0 0;">Fundador · Flexori</p>
  </td></tr>

  <tr><td bgcolor="#F9FAFC" style="background-color:#F9FAFC;padding:22px 40px;border-top:1px solid #E4E8EF;text-align:center;">
    <p style="color:#6B7280;font-size:12px;margin:0 0 8px;">© 2026 Flexori · Tu GPS de carrera remota</p>
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9CA3AF;font-size:11px;">Darse de baja</a>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}
