exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const query = params.query || '';
    const page = params.page || 1;

    // Get on Board API pública — empleos remotos LATAM en español
    const url = `https://www.getonbrd.com/api/v0/search/jobs?query=${encodeURIComponent(query)}&per_page=50&page=${page}&expand[]=company&expand[]=modality`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Flexori/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Get on Board API error: ${res.status}`);
    }

    const data = await res.json();
    const jobs = data.data || [];

    // Normalizar al formato de Flexori
    const normalized = jobs
      .filter(j => j.attributes)
      .map(j => {
        const a = j.attributes;
        const company = a.company && a.company.data ? a.company.data.attributes : {};
        
        return {
          id: 'gob' + j.id,
          title: a.title || '',
          company: company.name || a.company_name || '',
          logo: company.logo_url || '',
          category: a.category_name || '',
          tags: (a.functions || []).slice(0, 4),
          type: a.modality_name || 'full_time',
          url: a.applications_url || `https://www.getonbrd.com/jobs/${j.id}`,
          date: a.published_at || new Date().toISOString(),
          salary: a.min_salary && a.max_salary
            ? `$${a.min_salary} - $${a.max_salary}`
            : (a.min_salary ? `Desde $${a.min_salary}` : ''),
          location: a.country || 'LATAM',
          description: a.description || a.functions || '',
          source: 'GetOnBoard',
          language: 'es'
        };
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs: normalized, total: data.meta?.total || normalized.length })
    };

  } catch (err) {
    // Fallback: intentar con el endpoint alternativo
    try {
      const fallbackUrl = 'https://www.getonbrd.com/api/v0/jobs?per_page=50&expand[]=company';
      const res = await fetch(fallbackUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Flexori/1.0' }
      });
      
      if (!res.ok) throw new Error('Fallback also failed');
      
      const data = await res.json();
      const jobs = (data.data || []).filter(j => j.attributes).map(j => {
        const a = j.attributes;
        const company = a.company && a.company.data ? a.company.data.attributes : {};
        return {
          id: 'gob' + j.id,
          title: a.title || '',
          company: company.name || '',
          logo: company.logo_url || '',
          category: a.category_name || '',
          tags: [],
          type: 'full_time',
          url: a.applications_url || `https://www.getonbrd.com/jobs/${j.id}`,
          date: a.published_at || new Date().toISOString(),
          salary: '',
          location: a.country || 'LATAM',
          description: a.description || '',
          source: 'GetOnBoard',
          language: 'es'
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jobs, total: jobs.length })
      };

    } catch (err2) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message, jobs: [] })
      };
    }
  }
};
