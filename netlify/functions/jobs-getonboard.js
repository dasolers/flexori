exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // Palabras españolas comunes en títulos de empleo
  const spanishWords = ['desarrollador','diseñador','gerente','analista','coordinador',
    'asistente','ventas','soporte','atención','cliente','proyecto','español','bilingüe',
    'ingeniero','programador','director','jefe','líder','ejecutivo','agente','técnico',
    'consultor','especialista','arquitecto','producto','marketing','contenido','redactor',
    'contador','finanzas','recursos','humanos','operaciones','logística','educación'];

  function detectLang(title, description) {
    const txt = (title + ' ' + (description||'')).toLowerCase();
    if (spanishWords.some(w => txt.includes(w))) return 'es';
    return 'en';
  }

  try {
    const url = 'https://www.getonbrd.com/api/v0/search/jobs?query=&per_page=100&expand[]=company';

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Flexori/1.0' }
    });

    if (!res.ok) throw new Error(`Get on Board API error: ${res.status}`);

    const data = await res.json();
    const jobs = data.data || [];

    const normalized = jobs
      .filter(j => j.attributes)
      .map(j => {
        const a = j.attributes;
        const company = a.company && a.company.data ? a.company.data.attributes : {};
        const lang = detectLang(a.title || '', a.description || '');

        return {
          id: 'gob' + j.id,
          title: a.title || '',
          company: company.name || '',
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
          description: (a.description || '').slice(0, 500),
          source: 'GetOnBoard',
          language: lang
        };
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs: normalized })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, jobs: [] })
    };
  }
};
