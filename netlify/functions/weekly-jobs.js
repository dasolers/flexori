const AUDIENCE_ID = '6e26b2aa-f4b4-4214-8b62-201be98e1a25';

// Categorías operativas que queremos priorizar
const OPERATIVE_CATEGORIES = [
  'customer-support',
  'marketing', 
  'sales',
  'writing',
  'hr',
  'business'
];

// Keywords operativas para filtrar
const OPERATIVE_KEYWORDS = [
  'virtual assistant', 'customer support', 'customer service',
  'community manager', 'social media', 'content writer',
  'copywriter', 'data entry', 'administrative', 'marketing',
  'sales', 'account manager', 'support specialist', 'success manager',
  'bilingual', 'spanish', 'español', 'coordinator', 'operations',
  'recruiter', 'hr', 'human resources', 'project manager',
  'product manager', 'growth', 'email marketing', 'seo'
];

async function fetchOperativeJobs() {
  const jobs = [];

  // Buscar por cada categoría operativa en Remotive
  try {
    const promises = OPERATIVE_CATEGORIES.map(cat =>
      fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=10`, {
        headers: { 'Accept': 'application/json' }
      }).then(r => r.json()).catch(() => ({ jobs: [] }))
    );

    const results = await Promise.all(promises);
    results.forEach(data => {
      (data.jobs || []).forEach(j => {
        jobs.push({
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || 'Worldwide',
          salary: j.salary || '',
          url: j.url,
          type: (j.job_type || 'full_time').replace(/_/g, '-'),
          category: j.category || ''
        });
      });
    });
  } catch(e) {}

  // Filtrar por keywords operativas
  const filtered = jobs.filter(j => {
    const text = (j.title + ' ' + j.category).toLowerCase();
    return OPERATIVE_KEYWORDS.some(kw => text.includes(kw));
  });

  // Deduplicar por título + empresa
  const seen = new Set();
  const unique = filtered.filter(j => {
    const key = (j.title + j.company).toLowerCase().replace(/\s/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Si hay suficientes operativos, usar esos. Si no, completar con fallback
  if (unique.length >= 5) {
    return unique.slice(0, 5);
  }

  // Fallback con empleos operativos curados
  const fallback = [
    { title: 'Virtual Assistant', company: 'Remote Team Co', location: 'Worldwide', salary: '$800–$1,200/mes', url: 'https://flexori.work/jobs.html', type: 'part-time' },
    { title: 'Bilingual Customer Support', company: 'SupportHub', location: 'LATAM', salary: '$1,200–$1,800/mes', url: 'https://flexori.work/jobs.html', type: 'full-time' },
    { title: 'Community Manager', company: 'Tech Startup', location: 'Remote', salary: '$1,500–$2,000/mes', url: 'https://flexori.work/jobs.html', type: 'full-time' },
    { title: 'Content Writer (Spanish)', company: 'Digital Agency', location: 'Worldwide', salary: '$1,000–$1,500/mes', url: 'https://flexori.work/jobs.html', type: 'freelance' },
    { title: 'Data Entry Specialist', company: 'DataCorp', location: 'Worldwide', salary: '$600–$900/mes', url: 'https://flexori.work/jobs.html', type: 'part-time' }
  ];

  // Mezclar los únicos encontrados con fallback hasta tener 5
  const combined = [...unique, ...fallback];
  const seenFinal = new Set();
  return combined.filter(j => {
    const key = (j.title + j.company).toLowerCase().replace(/\s/g, '');
    if (seenFinal.has(key)) return false;
    seenFinal.add(key);
    return true;
  }).slice(0, 5);
}

function buildEmailHTML(jobs, lang) {
  const t = {
    es: {
      subject: '🌍 Empleos Remotos de la Semana — Flexori',
      title: 'Los mejores empleos remotos',
      subtitle: 'de esta semana',
      intro: 'Seleccionamos empleos para todos los perfiles — desde básicos hasta avanzados. Actualizados cada lunes.',
      apply: 'Ver empleo →',
      more: 'Ver todos los empleos →',
      unsub: 'Cancelar suscripción',
      footer: 'Eres parte de la comunidad Flexori'
    },
    en: {
      subject: '🌍 Remote Jobs of the Week — Flexori',
      title: 'Best remote jobs',
      subtitle: 'this week',
      intro: 'We handpicked remote jobs for all profiles — from entry level to senior. Updated every Monday.',
      apply: 'View job →',
      more: 'View all jobs →',
      unsub: 'Unsubscribe',
      footer: 'You are part of the Flexori community'
    },
    fr: {
      subject: '🌍 Emplois à Distance de la Semaine — Flexori',
      title: 'Meilleurs emplois à distance',
      subtitle: 'cette semaine',
      intro: 'Nous avons sélectionné des emplois pour tous les profils. Mis à jour chaque lundi.',
      apply: "Voir l'emploi →",
      more: 'Voir tous les emplois →',
      unsub: 'Se désabonner',
      footer: 'Vous faites partie de la communauté Flexori'
    },
    pt: {
      subject: '🌍 Vagas Remotas da Semana — Flexori',
      title: 'Melhores vagas remotas',
      subtitle: 'desta semana',
      intro: 'Selecionamos vagas para todos os perfis. Atualizadas toda segunda-feira.',
      apply: 'Ver vaga →',
      more: 'Ver todas as vagas →',
      unsub: 'Cancelar inscrição',
      footer: 'Você faz parte da comunidade Flexori'
    }
  }[lang] || {};

  const jobCards = jobs.map(j => `
    <div style="background:#1A2338;border:1px solid rgba(29,158,117,0.2);border-radius:14px;padding:20px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">${j.title}</div>
          <div style="font-size:13px;color:#A8A69E;">${j.company} · ${j.location}</div>
        </div>
        ${j.salary ? `<span style="background:rgba(29,158,117,0.15);color:#1D9E75;border:1px solid rgba(29,158,117,0.3);border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0;">${j.salary}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="background:rgba(107,163,214,0.15);color:#6ba3d6;border:1px solid rgba(107,163,214,0.3);border-radius:100px;padding:3px 10px;font-size:11px;">${j.type}</span>
        <a href="${j.url}" style="color:#1D9E75;font-size:13px;font-weight:600;text-decoration:none;">${t.apply}</a>
      </div>
    </div>
  `).join('');

  return {
    subject: t.subject,
    html: `<div style="background:#0D1321;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-flex;align-items:center;gap:10px;background:#131B2E;border:1px solid rgba(29,158,117,0.25);border-radius:100px;padding:10px 24px;">
          <span style="font-size:22px;font-weight:900;color:#1D9E75;">F</span>
          <span style="font-size:16px;font-weight:700;color:#fff;">Flexori</span>
        </div>
      </div>
      <div style="background:#131B2E;border:1px solid rgba(29,158,117,0.2);border-radius:20px;overflow:hidden;">
        <div style="height:3px;background:linear-gradient(90deg,transparent,#1D9E75,transparent);"></div>
        <div style="padding:32px 28px;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-size:32px;margin-bottom:12px;">🌍</div>
            <h1 style="font-size:24px;font-weight:800;color:#fff;margin:0 0 6px;">${t.title}</h1>
            <p style="font-size:16px;color:#1D9E75;font-weight:600;margin:0 0 12px;">${t.subtitle}</p>
            <p style="font-size:14px;color:#A8A69E;margin:0;line-height:1.6;">${t.intro}</p>
          </div>
          ${jobCards}
          <div style="text-align:center;margin-top:24px;">
            <a href="https://flexori.work/jobs.html" style="display:inline-block;background:#1D9E75;color:#0D1321;border-radius:100px;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;">${t.more}</a>
          </div>
        </div>
      </div>

      <!-- CTA DASHBOARD Y PERFIL -->
      <div style="background:#131B2E;border:1px solid rgba(29,95,163,0.2);border-radius:16px;padding:24px;margin-top:16px;text-align:center;">
        <div style="font-size:14px;color:#A8A69E;margin-bottom:16px;">¿Ya completaste tu Remote Digital Passport?</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="https://flexori.work/dashboard.html" style="display:inline-block;background:#1D9E75;color:#0D1321;border-radius:100px;padding:10px 20px;font-size:13px;font-weight:700;text-decoration:none;">Mi Dashboard →</a>
          <a href="https://flexori.work/profile.html" style="display:inline-block;background:rgba(29,95,163,0.15);border:1px solid rgba(29,95,163,0.3);color:#6ba3d6;border-radius:100px;padding:10px 20px;font-size:13px;font-weight:700;text-decoration:none;">Completar Perfil →</a>
        </div>
      </div>

      <p style="text-align:center;margin-top:24px;font-size:12px;color:rgba(168,166,158,0.5);">
        ${t.footer} · <a href="https://flexori.work" style="color:rgba(168,166,158,0.5);">flexori.work</a><br>
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:rgba(168,166,158,0.4);">${t.unsub}</a>
      </p>
    </div>
  </div>`
  };
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Aceptar: llamada scheduled de Netlify, lunes, o ?manual=true
  const isScheduled = !event.httpMethod; // Netlify scheduled functions no tienen httpMethod
  const isMonday = new Date().getDay() === 1;
  const isManual = event.queryStringParameters?.manual === 'true';

  if (!isScheduled && !isMonday && !isManual) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Not Monday. Use ?manual=true to force.' })
    };
  }

  try {
    const RESEND_KEY_FULL = process.env.RESEND_API_KEY_FULL;

    // Obtener empleos operativos
    const jobs = await fetchOperativeJobs();

    // Crear y enviar Broadcast directo a la audiencia
    const emailContent = buildEmailHTML(jobs, 'es');

    const broadcastRes = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY_FULL}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audience_id: AUDIENCE_ID,
        from: 'Flexori <hola@flexori.work>',
        subject: emailContent.subject,
        html: emailContent.html,
        send: true
      })
    });

    const broadcastData = await broadcastRes.json();

    if (broadcastData.error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: broadcastData.error, details: broadcastData })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        broadcast_id: broadcastData.id,
        jobs_shown: jobs.map(j => j.title),
        message: 'Weekly email broadcast sent successfully'
      })
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
