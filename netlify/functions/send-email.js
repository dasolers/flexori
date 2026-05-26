const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod!== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, score, lang = 'es', gaps } = JSON.parse(event.body);

  // Subject dinámico que duele
  const subjects = {
    es: `Tu Score de Flexori: ${score}/100 + Plan para subir a 80`,
    en: `Your Flexori Score: ${score}/100 + Plan to reach 80+`,
    fr: `Votre Score Flexori: ${score}/100 + Plan pour atteindre 80`,
    pt: `Seu Score Flexori: ${score}/100 + Plano para chegar a 80`
  };

  // Gaps por defecto si no llegan del form
  const defaultGaps = [
    { name: 'Async Communication', score: 4, desc: 'No tienes evidencia de trabajo escrito en LinkedIn/GitHub', fix: 'Publica 1 update semanal de proyecto' },
    { name: 'Portfolio', score: 5, desc: 'Tu CV no muestra proyectos ejecutados solo', fix: 'Documenta 1 side project en Notion con timeline' },
    { name: 'Tools', score: 6, desc: 'No mencionas Notion/Slack/Linear en tu perfil', fix: 'Curso gratis 2h en YouTube + agrégalo a LinkedIn' }
  ];

  const finalGaps = gaps || defaultGaps;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0D1321;color:#FFFFFF;font-family:'DM Sans',sans-serif;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#131B2E;border-radius:12px;overflow:hidden;border:1px solid #1D9E75">
    <div style="padding:40px 30px">
      <h1 style="font-family:'Syne',sans-serif;color:#1D9E75;margin:0 0 20px;font-size:24px">Flexori</h1>
      <h2 style="font-size:28px;margin:0 0 10px">Tu Remote Score</h2>
      <div style="font-size:72px;font-weight:800;color:#1D9E75;margin:20px 0">${score}/100</div>

      <p style="color:#A8A69E;font-size:16px;margin:30px 0 20px">
        ${score >= 80? 'Estás listo para remoto. Solo optimiza estos detalles:' : 'Te están rechazando por estas 3 cosas:'}
      </p>

      <div style="background:rgba(29,158,117,0.1);padding:20px;border-radius:8px;margin:16px 0;border-left:3px solid #1D9E75">
        <strong style="font-size:16px">1. ${finalGaps[0].name} - ${finalGaps[0].score}/10</strong><br>
        <span style="color:#A8A69E;font-size:14px">${finalGaps[0].desc}</span><br>
        <strong style="color:#24C48F;font-size:14px">→ Fix: ${finalGaps[0].fix}</strong>
      </div>

      <div style="background:rgba(29,158,117,0.1);padding:20px;border-radius:8px;margin:16px 0;border-left:3px solid #1D9E75">
        <strong style="font-size:16px">2. ${finalGaps[1].name} - ${finalGaps[1].score}/10</strong><br>
        <span style="color:#A8A69E;font-size:14px">${finalGaps[1].desc}</span><br>
        <strong style="color:#24C48F;font-size:14px">→ Fix: ${finalGaps[1].fix}</strong>
      </div>

      <div style="background:rgba(29,158,117,0.1);padding:20px;border-radius:8px;margin:16px 0;border-left:3px solid #1D9E75">
        <strong style="font-size:16px">3. ${finalGaps[2].name} - ${finalGaps[2].score}/10</strong><br>
        <span style="color:#A8A69E;font-size:14px">${finalGaps[2].desc}</span><br>
        <strong style="color:#24C48F;font-size:14px">→ Fix: ${finalGaps[2].fix}</strong>
      </div>

      <div style="margin-top:40px;padding-top:30px;border-top:1px solid rgba(29,158,117,0.2)">
        <p style="color:#FFFFFF;font-size:16px;margin:0 0 10px">
          <strong>¿Quieres plan completo 30 días para subir a 80+?</strong>
        </p>
        <p style="color:#A8A69E;font-size:14px;margin:0">
          Responde "PLAN" a este correo y te lo mando gratis. Sin venta.
        </p>
      </div>

      <p style="font-size:12px;color:#A8A69E;margin-top:40px;text-align:center">
        Flexori - Remote Digital Passport<br>
        Beta privado. Primeros 100 usuarios tienen Score Pro gratis de por vida.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await resend.emails.send({
      from: 'Flexori <hola@flexori.work>',
      to: email,
      subject: subjects[lang] || subjects.es,
      html: html
    });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
