// Función temporal para obtener el Audience ID
exports.handler = async function(event, context) {
  const RESEND_KEY = process.env.RESEND_API_KEY_FULL || process.env.RESEND_API_KEY_FULL || '';
  
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
