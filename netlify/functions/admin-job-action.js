// Netlify Function — gestiona approve/reject de vacantes usando la secret key
// La secret key vive SOLO en variables de entorno de Netlify, nunca en el código del repo

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { id, status, adminPassword } = JSON.parse(event.body);

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (!id || !status || !['approved', 'rejected', 'pending'].includes(status)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid params' }) };
    }

    const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/job_postings?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status })
    });

    if (res.ok || res.status === 204) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
      const errText = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: errText }) };
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
