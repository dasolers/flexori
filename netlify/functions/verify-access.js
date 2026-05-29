exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_JWT = process.env.SUPABASE_JWT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtra2d0d3JpcHlheGdtbWRzcWhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk4ODI0MSwiZXhwIjoyMDk0NTY0MjQxfQ.5MyM-1gMnXGDr55CVNE9ca-sTZS8WpVgKoYE1tvwSVM';

  try {
    let token = null;
    if (event.httpMethod === 'POST') {
      try { token = JSON.parse(event.body || '{}').token; } catch(e) {}
    } else {
      token = event.queryStringParameters && event.queryStringParameters.token;
    }

    if (!token) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false, plan: 'free' }) };
    }

    const url = SUPABASE_URL + '/rest/v1/subscribers?access_token=eq.' + encodeURIComponent(token) + '&select=email,plan,status,token_expires_at';
    
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_JWT,
        'Authorization': 'Bearer ' + SUPABASE_JWT
      }
    });

    const data = await res.json();
    console.log('Supabase response:', res.status, JSON.stringify(data).slice(0,200));

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false, plan: 'free' }) };
    }

    const subscriber = data[0];
    const isExpired = subscriber.token_expires_at ? new Date(subscriber.token_expires_at) < new Date() : false;
    const isActive = subscriber.status === 'active' && !isExpired;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: isActive,
        plan: isActive ? subscriber.plan : 'free',
        email: subscriber.email,
        expires_at: subscriber.token_expires_at
      })
    };
  } catch(err) {
    console.log('Error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ valid: false, plan: 'free', error: err.message }) };
  }
};
