exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    const { token } = event.httpMethod === 'POST' 
      ? JSON.parse(event.body || '{}')
      : { token: event.queryStringParameters?.token };

    if (!token) return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'No token' }) };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?access_token=eq.${token}&select=email,plan,status,token_expires_at`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const data = await res.json();

    if (!data || data.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false, plan: 'free' }) };
    }

    const subscriber = data[0];
    const isExpired = new Date(subscriber.token_expires_at) < new Date();
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
    return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: err.message }) };
  }
};
