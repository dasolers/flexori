// Netlify Function — lista y gestiona service_profiles con service key (bypassa RLS)
exports.handler = async function(event) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { action, id, status, adminPassword } = JSON.parse(event.body || '{}');

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
    const KEY = process.env.SUPABASE_SERVICE_KEY;
    const sbHeaders = {
      'Content-Type': 'application/json',
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    };

    if (action === 'list') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/service_profiles?order=created_at.desc&limit=100`, { headers: sbHeaders });
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (action === 'update') {
      if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid params' }) };
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/service_profiles?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({ status })
      });
      const rows = await res.json();
      // Enviar email de aprobación
      if (status === 'approved' && rows && rows[0]) {
        try {
          const base = process.env.URL || 'https://flexori.work';
          await fetch(`${base}/.netlify/functions/service-approved-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: rows[0].name, email: rows[0].email,
              title: rows[0].title, category: rows[0].category
            })
          });
        } catch(e) {}
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
