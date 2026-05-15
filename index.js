import 'dotenv/config';
import express from 'express';
import { procesarMensaje } from './chatbot.js';
import { listAppointments } from './appointments.js';

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Verificación del webhook (Meta llama a esto al configurarlo)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WEBHOOK] Verificado por Meta ✅');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Recibir mensajes entrantes de WhatsApp
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Responder inmediato a Meta

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value.messages) continue;

        for (const msg of value.messages) {
          if (msg.type !== 'text') continue;

          const phone = msg.from;
          const texto = msg.text.body;
          const contacto = value.contacts?.find(c => c.wa_id === phone);
          const nombre = contacto?.profile?.name || null;

          console.log(`[MSG] ${phone} (${nombre}): ${texto}`);
          await procesarMensaje(phone, texto, nombre);
        }
      }
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
  }
});

// Panel simple de citas agendadas
app.get('/citas', (req, res) => {
  res.json(listAppointments());
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'BarberFlow Chatbot', ts: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`\n🤖 BarberFlow Chatbot corriendo en http://localhost:${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
  console.log(`   Citas:   http://localhost:${PORT}/citas\n`);
});
