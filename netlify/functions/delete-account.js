// Netlify Function — Eliminación de cuenta y datos (derecho de supresión / GDPR-LGPD)
// Borra al usuario de: waitlist, subscribers, employability_scores, referrals,
// Storage (bucket cvs) y Resend (audience). Usa la service key SOLO desde env vars.
//
// Dos modos de uso:
//   1) ADMIN: body { adminPassword, email }  -> borra cualquier email
//   2) USUARIO: body { accessToken }          -> borra SOLO la cuenta del propio token
//
// El usuario nunca puede borrar a otro: su email se deriva del token validado en Supabase Auth.

const SUPABASE_URL = 'https://kkkgtwripyaxgmmdsqhg.supabase.co';
const AUDIENCE_ID = '6e26b2aa-f4b4-4214-8b62-201be98e1a25';

exports.handler = async function(event) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY_FULL;

  try {
    const body = JSON.parse(event.body || '{}');
    let targetEmail = null;
    let mode = null;

    // ---- Determinar quién pide la baja y de quién ----
    if (body.adminPassword) {
      // Modo admin
      if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
      }
      if (!body.email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta email' }) };
      }
      targetEmail = String(body.email).trim().toLowerCase();
      mode = 'admin';
    } else if (body.accessToken) {
      // Modo usuario: validar el token contra Supabase Auth y derivar SU email
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${body.accessToken}` }
      });
      if (!authRes.ok) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sesión inválida' }) };
      }
      const user = await authRes.json();
      if (!user || !user.email) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'No se pudo verificar el usuario' }) };
      }
      targetEmail = String(user.email).trim().toLowerCase();
      mode = 'self';
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan credenciales' }) };
    }

    const supaHeaders = {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    };
    const enc = encodeURIComponent(targetEmail);
    const report = {};

    // ---- 1) Obtener el id en waitlist (para borrar CV del Storage) ----
    let waitlistId = null;
    try {
      const wRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id&email=eq.${enc}`, { headers: supaHeaders });
      const wRows = await wRes.json();
      if (Array.isArray(wRows) && wRows.length) waitlistId = wRows[0].id;
    } catch (e) { /* seguimos aunque falle la lectura */ }

    // ---- 2) Borrar de las tablas (hijas primero, luego waitlist) ----
    async function del(table, column) {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${enc}`, {
          method: 'DELETE',
          headers: { ...supaHeaders, 'Prefer': 'return=minimal' }
        });
        report[table] = (r.ok || r.status === 204) ? 'ok' : `error ${r.status}`;
      } catch (e) {
        report[table] = 'error: ' + e.message;
      }
    }
    await del('referrals', 'referred_email');
    await del('employability_scores', 'email');
    await del('subscribers', 'email');
    await del('waitlist', 'email');

    // ---- 3) Borrar CV del Storage (bucket cvs) si existe algo con el id o el email ----
    report.storage = 'sin archivos';
    try {
      const prefixes = [];
      if (waitlistId) prefixes.push(waitlistId);
      // Listar la raíz del bucket y filtrar por id/email en el nombre
      const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/cvs`, {
        method: 'POST',
        headers: supaHeaders,
        body: JSON.stringify({ limit: 1000, prefix: '' })
      });
      if (listRes.ok) {
        const objs = await listRes.json();
        const toDelete = (Array.isArray(objs) ? objs : [])
          .map(o => o.name)
          .filter(name => name && (
            (waitlistId && name.includes(waitlistId)) ||
            name.toLowerCase().includes(targetEmail)
          ));
        if (toDelete.length) {
          const rm = await fetch(`${SUPABASE_URL}/storage/v1/object/cvs`, {
            method: 'DELETE',
            headers: supaHeaders,
            body: JSON.stringify({ prefixes: toDelete })
          });
          report.storage = (rm.ok ? `borrados ${toDelete.length}` : `error ${rm.status}`);
        }
      }
    } catch (e) {
      report.storage = 'error: ' + e.message;
    }

    // ---- 4) Quitar de Resend (audience) ----
    report.resend = 'omitido';
    if (RESEND_KEY) {
      try {
        const rr = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts?email=${enc}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}` }
        });
        report.resend = rr.ok ? 'ok' : `error ${rr.status}`;
      } catch (e) {
        report.resend = 'error: ' + e.message;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, mode, email: targetEmail, report })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
