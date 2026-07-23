// Envío por lotes del correo de reactivación.
// Corre a diario y envía a los primeros N usuarios que aún no lo han recibido.
// Solo aplica a usuarios registrados ANTES de la fecha de corte (los "viejos").
//
// Uso manual: ?run=true        → ejecuta un lote ahora
//             ?status=true     → muestra cuántos faltan (no envía)
//             ?limit=50        → cambia el tamaño del lote (default 90)

const CUTOFF_DATE = '2026-07-24T00:00:00Z'; // incluye a todos los registrados hasta hoy (23 jul)
const DEFAULT_BATCH = 60; // margen amplio bajo el tope de 100/día: deja ~40 para bienvenidas y seguimientos

exports.handler = async function(event) {
  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY_FULL || process.env.RESEND_API_KEY;
  const headers = { 'Content-Type': 'application/json' };
  const params = (event && event.queryStringParameters) || {};

  const isScheduled = !event || !event.httpMethod; // llamada por cron de Netlify
  const batchSize = Math.min(parseInt(params.limit) || DEFAULT_BATCH, 100);

  if (!SUPABASE_KEY || !RESEND_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Faltan variables de entorno' }) };
  }

  try {
    // Pendientes: registrados antes del corte y sin correo de reactivación enviado
    const baseQuery = `${SUPABASE_URL}/rest/v1/waitlist`
      + `?select=email,name`
      + `&created_at=lt.${encodeURIComponent(CUTOFF_DATE)}`
      + `&reactivation_sent_at=is.null`
      + `&order=created_at.asc`;

    // Modo status: solo contar, no enviar
    if (params.status === 'true') {
      const countRes = await fetch(baseQuery + '&limit=2000', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const all = await countRes.json();
      const pending = Array.isArray(all) ? all.length : 0;

      // Diagnóstico: total en waitlist y cuántos ya tienen marca
      let total = 0, yaEnviados = 0;
      try {
        const totalRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=email&limit=2000`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const t = await totalRes.json();
        total = Array.isArray(t) ? t.length : 0;

        const sentRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=email&reactivation_sent_at=not.is.null&limit=2000`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const s = await sentRes.json();
        yaEnviados = Array.isArray(s) ? s.length : 0;
      } catch (e) {}

      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          pendientes: pending,
          dias_restantes_aprox: Math.ceil(pending / batchSize),
          tamano_lote: batchSize,
          _diagnostico: {
            total_en_waitlist: total,
            ya_enviados: yaEnviados,
            fecha_corte: CUTOFF_DATE,
            respuesta_cruda: Array.isArray(all) ? `array de ${all.length}` : JSON.stringify(all).slice(0, 200)
          }
        }, null, 2)
      };
    }

    // Requiere ?run=true si es llamada manual
    if (!isScheduled && params.run !== 'true') {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          message: 'Envío por lotes del correo de reactivación',
          uso: {
            estado: '?status=true  → ver cuántos faltan',
            ejecutar: '?run=true    → enviar un lote ahora'
          }
        }, null, 2)
      };
    }

    // Ajuste dinámico: si hoy hubo muchas inscripciones nuevas, reducimos el lote
    // para no topar el límite diario (cada inscripción nueva = 1 correo de bienvenida)
    let effectiveBatch = batchSize;
    try {
      const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
      const todayRes = await fetch(
        `${SUPABASE_URL}/rest/v1/waitlist?select=email&created_at=gte.${todayStart.toISOString()}&limit=200`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const todayUsers = await todayRes.json();
      const newToday = Array.isArray(todayUsers) ? todayUsers.length : 0;
      // Reservamos: 1 por inscripción nueva + 15 de colchón para seguimientos/confirmaciones
      const reserved = newToday + 15;
      effectiveBatch = Math.max(20, Math.min(batchSize, 100 - reserved));
    } catch (e) { /* si falla, usamos el lote por defecto */ }

    // Traer el lote del día
    const res = await fetch(baseQuery + `&limit=${effectiveBatch}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'No quedan usuarios pendientes. Campaña completada.', enviados: 0 }) };
    }

    const subject = 'Flexori se renovó — y hay algo nuevo para ti 👀';
    let sent = 0, failed = 0;

    for (const user of users) {
      if (!user.email) continue;
      const firstName = (user.name || '').split(' ')[0] || '';
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Flexori <hola@flexori.work>',
            to: user.email,
            subject: subject,
            html: buildEmail(firstName)
          })
        });

        if (emailRes.ok) {
          await fetch(`${SUPABASE_URL}/rest/v1/waitlist?email=eq.${encodeURIComponent(user.email)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json', 'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ reactivation_sent_at: new Date().toISOString() })
          });
          sent++;
        } else {
          failed++;
          // Si topamos el límite diario, cortamos el lote aquí
          const err = await emailRes.json().catch(() => ({}));
          if (emailRes.status === 429 || (err.message || '').includes('quota') || (err.message || '').includes('rate')) {
            return {
              statusCode: 200, headers,
              body: JSON.stringify({ message: 'Límite diario alcanzado, se continúa mañana', enviados: sent, fallidos: failed })
            };
          }
        }
      } catch (e) { failed++; }
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ message: 'Lote enviado', enviados: sent, fallidos: failed, lote_usado: effectiveBatch, encontrados: users.length })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

function buildEmail(firstName) {
  const UTM = '?utm_source=reactivacion&utm_medium=email&utm_campaign=novedades_julio';
  const greeting = firstName ? `Hola ${firstName} 👋` : 'Hola 👋';

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
    <p style="color:#0D1321;font-size:22px;font-weight:bold;margin:0 0 14px;">${greeting}</p>
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
      <a href="https://flexori.work${UTM}" style="display:inline-block;background-color:#1D9E75;color:#FFFFFF;text-decoration:none;padding:16px 40px;border-radius:100px;font-weight:bold;font-size:16px;">Entra y mira qué hay nuevo →</a>
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
    <p style="color:#6B7280;font-size:12px;margin:0;">© 2026 Flexori · Tu GPS de carrera remota</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}
