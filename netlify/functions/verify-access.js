exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_JWT = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9','eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtra2d0d3JpcHlheGdtbWRzcWhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk4ODI0MSwiZXhwIjoyMDk0NTY0MjQxfQ','5MyM-1gMnXGDr55CVNE9ca-sTZS8WpVgKoYE1tvwSVM'].join('.');

  try {
    let token = null;
    if (event.httpMethod === 'POST') {
      try { token = JSON.parse(event.body || '{}').token; } catch(e) {}
    } else {
      token = event.queryStringParameters && event.queryStringParameters.token;
    }

    if (!token) return { statusCode: 200, headers, body: JSON.stringify({ valid: false, plan: 'free' }) };

    // 5 second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = SUPABASE_URL + '/rest/v1/subscribers?access_token=eq.' + encodeURIComponent(token) + '&select=email,plan,status,token_expires_at&limit=1';
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'apikey': SUPABASE_JWT,
        'Authorization': 'Bearer ' + SUPABASE_JWT
      }
    });
    clearTimeout(timeout);

    const data = await res.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false, plan: 'free' }) };
    }

    const s = data[0];
    const isExpired = s.token_expires_at ? new Date(s.token_expires_at) < new Date() : false;
    const isActive = s.status === 'active' && !isExpired;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: isActive,
        plan: isActive ? s.plan : 'free',
        email: s.email
      })
    };
  } catch(err) {
    // On timeout or error - return free but don't crash
    return { statusCode: 200, headers, body: JSON.stringify({ valid: false, plan: 'free', error: err.message }) };
  }
};
