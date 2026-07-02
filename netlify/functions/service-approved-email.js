const RESEND_KEY = process.env.RESEND_API_KEY;

exports.handler = async function(event) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { name, email, title, category } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing email' }) };

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Flexori <hola@flexori.work>',
        to: email,
        subject: '¡Tu perfil fue aprobado! Ya eres visible en Flexori 🎉',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0D1321;color:#F0EEE6;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#131B2E;border-radius:16px;overflow:hidden;border:1px solid rgba(29,158,117,0.2)">
    <div style="background:linear-gradient(135deg,#1D5FA3,#1D9E75);padding:32px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">🎉</div>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff">¡Perfil aprobado!</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;margin-bottom:16px">Hola <strong>${name}</strong> 👋</p>
      <p style="color:#A8A69E;line-height:1.7;margin-bottom:20px">
        Buenas noticias — tu perfil de servicios fue revisado y <strong style="color:#1D9E75">aprobado por nuestro equipo</strong>. 
        A partir de ahora las empresas en Flexori pueden encontrarte, revisar tu trabajo y contactarte directamente.
      </p>
      <div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.2);border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:13px;color:#A8A69E;text-transform:uppercase;letter-spacing:.5px;font-weight:600">Tu servicio publicado</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#fff">${title}</p>
      </div>
      <div style="background:rgba(29,95,163,0.08);border:1px solid rgba(29,95,163,0.2);border-radius:12px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#A8A69E;line-height:1.6">
          💡 <strong style="color:#fff">Tip:</strong> Para recibir más contactos, asegúrate de tener tu perfil completo con enlaces de verificación (LinkedIn, GitHub, portafolio). Los perfiles con verificación alta reciben hasta 3x más contactos.
        </p>
      </div>
      <div style="text-align:center;margin-bottom:24px">
        <a href="https://flexori.work/services.html" style="background:#1D9E75;color:#0D1321;border-radius:100px;padding:14px 32px;font-weight:800;font-size:14px;text-decoration:none;display:inline-block">Ver mi perfil publicado →</a>
      </div>
      <p style="font-size:12px;color:#A8A69E;text-align:center">¿Preguntas? <a href="mailto:hola@flexori.work" style="color:#1D9E75">hola@flexori.work</a></p>
    </div>
    <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
      <p style="font-size:11px;color:#A8A69E;margin:0">© 2026 Flexori · Tu GPS de carrera remota</p>
    </div>
  </div>
</body>
</html>`
      })
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
