const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtra2d0d3JpcHlheGdtbWRzcWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5ODgyNDEsImV4cCI6MjA5NDU2NDI0MX0.XKDKt1jAR7kCLktP19olgTuhzT9s2PkknqBWwIAkiRU';
const AUDIENCE_ID = '6e26b2aa-f4b4-4214-8b62-201be98e1a25';

exports.handler = async function(event, context) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const RESEND_KEY = process.env.RESEND_API_KEY_FULL;

    // Obtener todos los emails de Supabase waitlist
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=email`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const waitlist = await supaRes.json();
    const emails = [...new Set(waitlist.map(r => r.email).filter(Boolean))];

    // Agregar cada email al Audience de Resend
    const results = [];
    for (const email of emails) {
      const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, unsubscribed: false })
      });
      const data = await res.json();
      results.push({ email, ok: !!data.id, data });
    }

    const ok = results.filter(r => r.ok).length;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total: emails.length,
        synced: ok,
        results
      })
    };
  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
