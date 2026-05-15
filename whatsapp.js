const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_URL = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

export async function sendMessage(to, text) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[WA ERROR]', JSON.stringify(data));
  }
  return data;
}
