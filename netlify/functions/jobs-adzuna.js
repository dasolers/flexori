exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const APP_ID = 'c13f4e2a';
    const APP_KEY = 'e7adff87e35fc03da08e06fcac691425';
    const cats = ['customer services', 'sales', 'admin', 'marketing', 'accounting', 'hr', 'operations'];

    const results = await Promise.allSettled(cats.map(async cat => {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=10&what=${encodeURIComponent(cat)}&full_time=1&content-type=application/json`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.results || []).map(j => ({
        id: 'az_' + j.id,
        title: j.title,
        company: j.company?.display_name || '',
        logo: '',
        category: cat,
        type: 'Full-time',
        location: j.location?.display_name || 'USA',
        salary: j.salary_min ? `$${Math.round(j.salary_min/1000)}k–$${Math.round((j.salary_max||j.salary_min)/1000)}k` : '',
        date: j.created || new Date().toISOString(),
        url: j.redirect_url || '',
        description: (j.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
        source: 'Adzuna'
      }));
    }));

    const jobs = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs: [], error: err.message })
    };
  }
};
