exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { email } = JSON.parse(event.body);
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_API_KEY_FULL = process.env.RESEND_API_KEY_FULL;
    const AUDIENCE_ID = '6e26b2aa-f4b4-4214-8b62-201be98e1a25';

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email requerido' }) };
    }

    // Agregar a audiencia Resend
    if (RESEND_API_KEY_FULL) {
      await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY_FULL}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, unsubscribed: false })
      }).catch(() => {});
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Bienvenido a Flexori</title>
</head>
<body style="margin:0;padding:0;background:#0D1321;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1321;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="padding:32px 40px;background:#131B2E;border-radius:16px 16px 0 0;border-bottom:1px solid rgba(29,158,117,0.2);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;width:36px;height:36px;background:#1D9E75;border-radius:8px;text-align:center;line-height:36px;font-size:18px;font-weight:800;color:#0D1321;vertical-align:middle;margin-right:10px;">F</div>
                  <span style="font-size:20px;font-weight:700;color:#1D9E75;vertical-align:middle;">Flexori</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px;background:#131B2E;">
            <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">
              ¡Bienvenido a Flexori! 🎉
            </h1>
            <p style="margin:0 0 24px;font-size:16px;color:#888780;line-height:1.6;">
              Tu cuenta está lista. Ahora tienes acceso a todo lo que necesitas para construir tu carrera remota.
            </p>

            <!-- PASOS -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="padding:16px;background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.2);border-radius:12px;margin-bottom:12px;display:block;">
                  <p style="margin:0 0 4px;font-size:13px;color:#1D9E75;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">PASO 1</p>
                  <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">⚡ Calcula tu Remote Score</p>
                  <p style="margin:0;font-size:14px;color:#888780;">Descubre tu nivel de empleabilidad remota en 8 dimensiones. Toma 5 minutos y te da un diagnóstico real de dónde estás parado.</p>
                </td>
              </tr>
              <tr><td style="height:12px;"></td></tr>
              <tr>
                <td style="padding:16px;background:rgba(29,95,163,0.08);border:1px solid rgba(29,95,163,0.2);border-radius:12px;display:block;">
                  <p style="margin:0 0 4px;font-size:13px;color:#1D5FA3;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">PASO 2</p>
                  <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">🌍 Explora empleos remotos</p>
                  <p style="margin:0;font-size:14px;color:#888780;">Más de 300 vacantes reales de empresas globales, actualizadas diariamente. Sin intermediarios, sin comisiones.</p>
                </td>
              </tr>
              <tr><td style="height:12px;"></td></tr>
              <tr>
                <td style="padding:16px;background:rgba(29,158,117,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;display:block;">
                  <p style="margin:0 0 4px;font-size:13px;color:#888780;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">PASO 3</p>
                  <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">📄 Optimiza tu CV con IA</p>
                  <p style="margin:0;font-size:14px;color:#888780;">Sube tu CV y recibe análisis personalizado con recomendaciones concretas para el mercado remoto.</p>
                </td>
              </tr>
            </table>

            <!-- CTA PRINCIPAL -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="https://flexori.work/dashboard.html" style="display:inline-block;background:#1D9E75;color:#0D1321;text-decoration:none;font-weight:800;font-size:16px;padding:16px 40px;border-radius:100px;">
                    Ir a mi Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#888780;text-align:center;">
              Flexori es 100% gratuito · Sin tarjeta · Sin comisiones
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:24px 40px;background:#0D1321;border-radius:0 0 16px 16px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0 0 8px;font-size:13px;color:#888780;text-align:center;">
              Recibiste este email porque te registraste en <a href="https://flexori.work" style="color:#1D9E75;text-decoration:none;">flexori.work</a>
            </p>
            <p style="margin:0;font-size:12px;color:#555;text-align:center;">
              Flexori · Remote Careers Platform · Round Rock, TX
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    // Enviar email de bienvenida
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Alejandro de Flexori <hola@flexori.work>',
        to: [email],
        subject: '¡Bienvenido a Flexori! Tu cuenta está lista 🚀',
        html: html
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: data.id })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
