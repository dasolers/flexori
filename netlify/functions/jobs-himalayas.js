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
    const response = await fetch('https://himalayas.app/jobs/api?limit=100', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error('Himalayas API error: ' + response.status);
    const data = await response.json();

    const jobs = (data.jobs || []).map(j => ({
      id: 'hm_' + j.id,
      title: j.title,
      company: j.companyName || j.company || '',
      logo: j.companyLogo || '',
      category: j.categories ? j.categories[0] : '',
      type: 'Full-time',
      location: 'Worldwide',
      salary: '',
      date: j.createdAt || new Date().toISOString(),
      url: j.applicationLink || j.url || '',
      description: j.description ? j.description.replace(/<[^>]+>/g, '').slice(0, 300) : '',
      source: 'Himalayas'
    }));

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
