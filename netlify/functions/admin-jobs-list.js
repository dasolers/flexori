// Netlify Function — lista TODAS las vacantes (pending/approved/rejected) para el panel admin
// Usa la secret key porque la anon key pública solo puede leer vacantes 'approved' (por RLS)

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { adminPassword } = JSON.parse(event.body);

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/job_postings?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify({ jobs: data }) };
    } else {
      const errText = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: errText }) };
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
