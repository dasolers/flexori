// Proxy seguro para llamadas a Anthropic API — la key vive solo en Netlify env
exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'AI no configurada aún' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // Validaciones básicas anti-abuso
    if (!body.messages || !Array.isArray(body.messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }
    const totalChars = JSON.stringify(body.messages).length;
    if (totalChars > 60000) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'Request too large' }) };
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: Math.min(body.max_tokens || 1500, 2000),
        system: body.system || undefined,
        messages: body.messages
      })
    });

    const data = await res.json();
    return { statusCode: res.status, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
