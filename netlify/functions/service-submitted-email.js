const RESEND_KEY = process.env.RESEND_API_KEY;

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { name, email, title, category } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing email' }) };

    const categoryNames = {
      dev: 'Desarrollo de Software', design: 'Diseño UI/UX', marketing: 'Marketing Digital',
      sales: 'Ventas / Closer / Setter', support: 'Soporte / Atención al cliente',
      writing: 'Redacción / Copywriting', data: 'Datos / IA / Analytics',
      va: 'Asistente Virtual', video: 'Video / Edición / Multimedia',
      finance: 'Finanzas / Contabilidad', hr: 'Recursos Humanos', other: 'Otro'
    };

    const catName = categoryNames[category] || category;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Flexori <hola@flexori.work>',
        to: email,
        subject: '¡Tu perfil está en revisión! — Flexori',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0D1321;color:#F0EEE6;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#131B2E;border-radius:16px;overflow:hidden;border:1px solid rgba(29,158,117,0.2)">
    <div style="background:linear-gradient(135deg,#1D5FA3,#1D9E75);padding:32px;text-align:center">
      <div style="background:rgba(255,255,255,0.15);width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;margin-bottom:12px">F</div>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff">¡Perfil recibido!</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;margin-bottom:16px">Hola <strong>${name}</strong> 👋</p>
      <p style="color:#A8A69E;line-height:1.7;margin-bottom:20px">
        Recibimos tu perfil de servicios en la categoría <strong style="color:#1D9E75">${catName}</strong>. 
        Nuestro equipo lo revisará en las próximas <strong style="color:#fff">24-48 horas</strong> para garantizar 
        la calidad y confianza que Flexori le ofrece a las empresas.
      </p>
      <div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.2);border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:13px;color:#A8A69E;text-transform:uppercase;letter-spacing:.5px;font-weight:600">Tu servicio</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#fff">${title}</p>
      </div>
      <p style="color:#A8A69E;font-size:14px;line-height:1.7;margin-bottom:24px">
        Cuando tu perfil sea aprobado, te enviaremos otro email de confirmación y las empresas podrán encontrarte y contactarte directamente en Flexori.
      </p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="https://flexori.work/jobs.html" style="background:#1D9E75;color:#0D1321;border-radius:100px;padding:14px 32px;font-weight:800;font-size:14px;text-decoration:none;display:inline-block">Ver empleos disponibles →</a>
      </div>
      <p style="font-size:12px;color:#A8A69E;text-align:center">¿Tienes preguntas? Escríbenos a <a href="mailto:hola@flexori.work" style="color:#1D9E75">hola@flexori.work</a></p>
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
