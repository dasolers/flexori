// Proxy seguro de IA — usa Google Gemini (free tier)
// Recibe requests en formato Anthropic-style y responde en el mismo formato,
// así cv-optimizer.html y services.html no necesitan cambios.
exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const KEY = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'AI no configurada aún' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.messages || !Array.isArray(body.messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }
    if (JSON.stringify(body.messages).length > 80000) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'Request too large' }) };
    }

    // Convertir mensajes formato Anthropic → Gemini
    const contents = body.messages.map(function(m) {
      var parts = [];
      if (typeof m.content === 'string') {
        parts.push({ text: m.content });
      } else if (Array.isArray(m.content)) {
        m.content.forEach(function(block) {
          if (block.type === 'text') parts.push({ text: block.text });
          else if (block.type === 'document' && block.source && block.source.type === 'base64') {
            parts.push({ inline_data: { mime_type: block.source.media_type, data: block.source.data } });
          } else if (block.type === 'image' && block.source && block.source.type === 'base64') {
            parts.push({ inline_data: { mime_type: block.source.media_type, data: block.source.data } });
          }
        });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: parts };
    });

    const payload = {
      contents: contents,
      generationConfig: { maxOutputTokens: Math.min(body.max_tokens || 1500, 4000) }
    };
    if (body.system) {
      payload.system_instruction = { parts: [{ text: body.system }] };
    }

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + KEY,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: (data.error && data.error.message) || 'Gemini error' }) };
    }

    // Convertir respuesta Gemini → formato Anthropic (lo que esperan las páginas)
    var text = '';
    try {
      text = data.candidates[0].content.parts.map(function(p){ return p.text || ''; }).join('');
    } catch(e) {}

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: [{ type: 'text', text: text }] })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
