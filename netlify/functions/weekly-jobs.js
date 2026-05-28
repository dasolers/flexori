const AUDIENCE_ID = '6e26b2aa-f4b4-4214-8b62-201be98e1a25';

async function fetchJobs() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=20', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    return (data.jobs || []).slice(0, 5).map(j => ({
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Worldwide',
      salary: j.salary || '',
      url: j.url,
      type: j.job_type || 'Full-time'
    }));
  } catch(e) {
    return [
      { title: 'Virtual Assistant', company: 'Remote Team', location: 'Worldwide', salary: '$800/mes', url: 'https://flexori.work/jobs.html', type: 'Part-time' },
      { title: 'Customer Support Agent', company: 'Global SaaS', location: 'LATAM', salary: '$1,200/mes', url: 'https://flexori.work/jobs.html', type: 'Full-time' },
      { title: 'Community Manager', company: 'Tech Startup', location: 'Remote', salary: '$1,500/mes', url: 'https://flexori.work/jobs.html', type: 'Full-time' },
      { title: 'Content Writer', company: 'Digital Agency', location: 'Worldwide', salary: '$1,000/mes', url: 'https://flexori.work/jobs.html', type: 'Freelance' },
      { title: 'Data Entry Specialist', company: 'DataCorp', location: 'Worldwide', salary: '$600/mes', url: 'https://flexori.work/jobs.html', type: 'Part-time' }
    ];
  }
}

function buildEmailHTML(jobs, lang) {
  const t = {
    es: { subject: '🌍 Empleos Remotos de la Semana — Flexori', title: 'Los mejores empleos remotos', subtitle: 'de esta semana', intro: 'Seleccionamos los mejores empleos remotos para ti. Actualizados cada lunes.', apply: 'Ver empleo →', more: 'Ver todos los empleos →', unsub: 'Cancelar suscripción', footer: 'Eres parte de la comunidad Flexori' },
    en: { subject: '🌍 Remote Jobs of the Week — Flexori', title: 'Best remote jobs', subtitle: 'this week', intro: 'We handpicked the best remote jobs for you. Updated every Monday.', apply: 'View job →', more: 'View all jobs →', unsub: 'Unsubscribe', footer: 'You are part of the Flexori community' },
    fr: { subject: '🌍 Emplois à Distance de la Semaine — Flexori', title: 'Meilleurs emplois à distance', subtitle: 'cette semaine', intro: 'Nous avons sélectionné les meilleurs emplois à distance pour vous.', apply: 'Voir l\'emploi →', more: 'Voir tous les emplois →', unsub: 'Se désabonner', footer: 'Vous faites partie de la communauté Flexori' },
    pt: { subject: '🌍 Vagas Remotas da Semana — Flexori', title: 'Melhores vagas remotas', subtitle: 'desta semana', intro: 'Selecionamos as melhores vagas remotas para você. Atualizadas toda segunda-feira.', apply: 'Ver vaga →', more: 'Ver todas as vagas →', unsub: 'Cancelar inscrição', footer: 'Você faz parte da comunidade Flexori' }
  }[lang] || { subject: '🌍 Remote Jobs of the Week — Flexori', title: 'Best remote jobs', subtitle: 'this week', intro: 'We handpicked the best remote jobs for you. Updated every Monday.', apply: 'View job →', more: 'View all jobs →', unsub: 'Unsubscribe', footer: 'You are part of the Flexori community' };

  const jobCards = jobs.map(j => `
    <div style="background:#1A2338;border:1px solid rgba(29,158,117,0.2);border-radius:14px;padding:20px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">${j.title}</div>
          <div style="font-size:13px;color:#A8A69E;">${j.company} · ${j.location}</div>
        </div>
        ${j.salary ? `<span style="background:rgba(29,158,117,0.15);color:#1D9E75;border:1px solid rgba(29,158,117,0.3);border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;white-space:nowrap;">${j.salary}</span>` : ''}
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

  // Verificar que sea lunes o que sea una llamada manual autorizada
  const now = new Date();
  const isMonday = now.getDay() === 1;
  const isManual = event.queryStringParameters?.manual === 'true';

  if (!isMonday && !isManual) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Not Monday, skipping. Use ?manual=true to force.' })
    };
  }

  try {
    const RESEND_KEY_FULL = process.env.RESEND_API_KEY_FULL;
    const RESEND_KEY = process.env.RESEND_API_KEY;

    // 1. Obtener lista de contactos del Audience
    const contactsRes = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
      headers: { 'Authorization': `Bearer ${RESEND_KEY_FULL}` }
    });
    const contactsData = await contactsRes.json();
    const contacts = (contactsData.data || []).filter(c => !c.unsubscribed);

    if (contacts.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No contacts yet', count: 0 })
      };
    }

    // 2. Obtener empleos frescos
    const jobs = await fetchJobs();

    // 3. Crear y enviar Broadcast via Resend
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        broadcast_id: broadcastData.id,
        contacts_count: contacts.length,
        jobs_count: jobs.length,
        message: `Weekly email sent to ${contacts.length} contacts`
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
