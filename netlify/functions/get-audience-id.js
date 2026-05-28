// Función temporal para obtener el Audience ID
exports.handler = async function(event, context) {
  const RESEND_KEY = process.env.RESEND_API_KEY_FULL || 're_j34jvzpu_KpL4VdQqX312qqzUiaiwLsEC';
  
  const response = await fetch('https://api.resend.com/audiences', {
    headers: { 'Authorization': `Bearer ${RESEND_KEY}` }
  });
  const data = await response.json();
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
