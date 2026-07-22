// Captura la respuesta del email de seguimiento a 14 días.
// Se llama vía enlace: /.netlify/functions/followup-response?email=X&r=hired|searching|not_useful
exports.handler = async function(event) {
  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const params = event.queryStringParameters || {};
  const email = params.email;
  const response = params.r;

  const validResponses = ['hired', 'searching', 'not_useful'];

  // Página de agradecimiento que ve el usuario tras hacer clic
  function thankYouPage(message, emoji) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gracias — Flexori</title>
<style>
body{margin:0;background:#0D1321;color:#F0EEE6;font-family:-apple-system,'DM Sans',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
.card{max-width:440px}
.emoji{font-size:64px;margin-bottom:20px}
h1{font-size:26px;margin-bottom:12px;font-weight:700}
p{color:#A8A69E;font-size:16px;line-height:1.6;margin-bottom:28px}
a{display:inline-block;background:#1D9E75;color:#0D1321;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px}
</style></head><body><div class="card">
<div class="emoji">${emoji}</div>
<h1>${message}</h1>
<p>Gracias por tu respuesta. Nos ayuda muchísimo a mejorar Flexori para todos.</p>
<a href="https://flexori.work">Volver a Flexori →</a>
</div></body></html>`;
  }

  const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8' };

  if (!email || !validResponses.includes(response)) {
    return { statusCode: 400, headers: htmlHeaders, body: thankYouPage('Enlace no válido', '🤔') };
  }

  try {
    // Guardar la respuesta
    await fetch(`${SUPABASE_URL}/rest/v1/followup_responses`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email, response })
    });

    // Mensaje personalizado según la respuesta
    let message, emoji;
    if (response === 'hired') {
      message = '¡Felicidades por tu nuevo trabajo! 🎉';
      emoji = '🎉';
    } else if (response === 'searching') {
      message = '¡Sigamos buscando juntos!';
      emoji = '💪';
    } else {
      message = 'Gracias por tu honestidad';
      emoji = '🙏';
    }

    return { statusCode: 200, headers: htmlHeaders, body: thankYouPage(message, emoji) };
  } catch (err) {
    return { statusCode: 500, headers: htmlHeaders, body: thankYouPage('Ocurrió un error', '😕') };
  }
};
