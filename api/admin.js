const ADMIN_KEY = process.env.ADMIN_KEY;

const ESTADO_LABELS = {
  inicio:             { label: 'Nuevo',         color: '#888' },
  esperando_dolor:    { label: 'Interesado',    color: '#f59e0b' },
  esperando_decision: { label: 'Evaluando',     color: '#f97316' },
  eligiendo_horario:  { label: 'Eligiendo hora',color: '#3b82f6' },
  agendado:           { label: '✅ Demo agendada', color: '#2ECC71' },
};

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) {
    return res.status(200).setHeader('Content-Type', 'text/html').send(loginHTML());
  }

  const key = req.query.key;
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(panelHTML(key));
}

function loginHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BarberFlow Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0A0A0A;color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:32px;width:90%;max-width:360px;text-align:center}
  .logo{color:#D4AF37;font-size:22px;font-weight:700;margin-bottom:8px}
  .sub{color:#888;font-size:13px;margin-bottom:28px}
  input{width:100%;background:#0A0A0A;border:1px solid #333;border-radius:10px;padding:14px;color:#F5F5F0;font-size:15px;margin-bottom:14px;outline:none}
  input:focus{border-color:#D4AF37}
  button{width:100%;background:#D4AF37;color:#0A0A0A;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<div class="card">
  <div class="logo">⚡ BarberFlow</div>
  <div class="sub">Panel de conversaciones</div>
  <form onsubmit="login(event)">
    <input type="password" id="key" placeholder="Clave de acceso" autocomplete="current-password">
    <button type="submit">Entrar</button>
  </form>
</div>
<script>
function login(e) {
  e.preventDefault();
  const k = document.getElementById('key').value.trim();
  if (k) window.location.href = '/api/admin?key=' + encodeURIComponent(k);
}
</script>
</body>
</html>`;
}

function panelHTML(key) {
  const estadoJSON = JSON.stringify(ESTADO_LABELS);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BarberFlow Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0A0A0A;color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}

  /* HEADER */
  .header{background:#111;border-bottom:1px solid #222;padding:14px 16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:10}
  .header-back{color:#D4AF37;font-size:20px;cursor:pointer;display:none}
  .header-logo{color:#D4AF37;font-weight:700;font-size:17px}
  .header-sub{color:#888;font-size:12px}

  /* STATS */
  .stats{display:flex;gap:10px;padding:14px 16px;overflow-x:auto}
  .stat{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:12px 16px;min-width:100px;text-align:center;flex-shrink:0}
  .stat-n{font-size:24px;font-weight:700;color:#D4AF37}
  .stat-l{font-size:11px;color:#888;margin-top:2px}

  /* LISTA */
  #lista{display:block}
  .lead-card{background:#111;border-bottom:1px solid #1e1e1e;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:background .15s}
  .lead-card:active{background:#1a1a1a}
  .avatar{width:44px;height:44px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .lead-info{flex:1;min-width:0}
  .lead-name{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lead-last{font-size:12px;color:#888;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lead-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
  .badge{font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;white-space:nowrap}
  .lead-time{font-size:10px;color:#555}

  /* CHAT */
  #chat{display:none;flex-direction:column;height:100vh}
  .chat-header{background:#111;border-bottom:1px solid #222;padding:14px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}
  .chat-back{color:#D4AF37;font-size:22px;cursor:pointer;padding:0 4px}
  .chat-name{font-size:16px;font-weight:600}
  .chat-estado{font-size:11px;color:#888;margin-top:1px}
  .messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}
  .bubble{max-width:80%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
  .bubble.in{background:#2a2a2a;align-self:flex-start;border-bottom-left-radius:4px}
  .bubble.out{background:#1a3a2a;align-self:flex-end;border-bottom-right-radius:4px;color:#d4f5d4}
  .bubble-time{font-size:10px;color:#555;margin-top:2px}
  .bubble-time.in{align-self:flex-start;margin-left:4px}
  .bubble-time.out{align-self:flex-end;margin-right:4px}
  .empty{color:#555;text-align:center;padding:40px 20px;font-size:14px}
  .loading{color:#555;text-align:center;padding:40px;font-size:14px}
</style>
</head>
<body>

<!-- VISTA: LISTA -->
<div id="lista">
  <div class="header">
    <div>
      <div class="header-logo">⚡ BarberFlow</div>
      <div class="header-sub">Conversaciones</div>
    </div>
  </div>
  <div class="stats" id="stats"></div>
  <div id="leads-list"><div class="loading">Cargando...</div></div>
</div>

<!-- VISTA: CHAT -->
<div id="chat">
  <div class="chat-header">
    <span class="chat-back" onclick="volverLista()">‹</span>
    <div>
      <div class="chat-name" id="chat-name"></div>
      <div class="chat-estado" id="chat-estado"></div>
    </div>
  </div>
  <div class="messages" id="messages"></div>
</div>

<script>
const KEY = ${JSON.stringify(key)};
const ESTADOS = ${estadoJSON};

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm';
  if (diff < 86400000) return d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('es',{day:'2-digit',month:'2-digit'});
}

function fmtFull(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
}

function avatarEmoji(estado) {
  const map = {inicio:'👤',esperando_dolor:'💬',esperando_decision:'🤔',eligiendo_horario:'📅',agendado:'✅'};
  return map[estado] || '👤';
}

async function loadLeads() {
  const r = await fetch('/api/admin-data?key=' + encodeURIComponent(KEY));
  if (!r.ok) { document.getElementById('leads-list').innerHTML = '<div class="empty">Error al cargar. Verifica la clave.</div>'; return; }
  const leads = await r.json();

  // Stats
  const total = leads.length;
  const agendados = leads.filter(l => l.estado === 'agendado').length;
  const activos = leads.filter(l => l.estado !== 'inicio').length;
  document.getElementById('stats').innerHTML =
    stat(total, 'Total leads') +
    stat(activos, 'En proceso') +
    stat(agendados, 'Demos agend.');

  if (leads.length === 0) {
    document.getElementById('leads-list').innerHTML = '<div class="empty">Aún no hay conversaciones.</div>';
    return;
  }

  document.getElementById('leads-list').innerHTML = leads.map(l => {
    const est = ESTADOS[l.estado] || {label: l.estado, color: '#888'};
    const nombre = l.nombre || l.phone;
    const lastMsg = l.last_message
      ? (l.last_direction === 'in' ? l.last_message : '🤖 ' + l.last_message)
      : 'Sin mensajes aún';
    return \`<div class="lead-card" onclick="openChat(\${JSON.stringify(l)})">
      <div class="avatar">\${avatarEmoji(l.estado)}</div>
      <div class="lead-info">
        <div class="lead-name">\${nombre}</div>
        <div class="lead-last">\${lastMsg}</div>
      </div>
      <div class="lead-meta">
        <span class="badge" style="background:\${est.color}22;color:\${est.color}">\${est.label}</span>
        <span class="lead-time">\${fmtTime(l.updated_at)}</span>
      </div>
    </div>\`;
  }).join('');
}

function stat(n, label) {
  return \`<div class="stat"><div class="stat-n">\${n}</div><div class="stat-l">\${label}</div></div>\`;
}

async function openChat(lead) {
  document.getElementById('lista').style.display = 'none';
  const chatEl = document.getElementById('chat');
  chatEl.style.display = 'flex';

  const est = ESTADOS[lead.estado] || {label: lead.estado, color: '#888'};
  document.getElementById('chat-name').textContent = lead.nombre || lead.phone;
  document.getElementById('chat-estado').innerHTML =
    \`\${lead.phone} · <span style="color:\${est.color}">\${est.label}</span>\` +
    (lead.slot_label ? \` · 📅 \${lead.slot_label}\` : '');

  document.getElementById('messages').innerHTML = '<div class="loading">Cargando mensajes...</div>';

  const r = await fetch(\`/api/admin-data?key=\${encodeURIComponent(KEY)}&phone=\${encodeURIComponent(lead.phone)}\`);
  const msgs = await r.json();

  if (!msgs.length) {
    document.getElementById('messages').innerHTML = '<div class="empty">Sin mensajes registrados.<br>Los nuevos mensajes aparecerán aquí.</div>';
    return;
  }

  document.getElementById('messages').innerHTML = msgs.map(m =>
    \`<div class="bubble \${m.direction}">\${escHtml(m.content)}</div>
     <div class="bubble-time \${m.direction}">\${fmtFull(m.created_at)}</div>\`
  ).join('');

  // scroll al final
  const el = document.getElementById('messages');
  el.scrollTop = el.scrollHeight;
}

function volverLista() {
  document.getElementById('chat').style.display = 'none';
  document.getElementById('lista').style.display = 'block';
}

function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

loadLeads();
// Auto-refresh cada 30s en la vista de lista
setInterval(() => {
  if (document.getElementById('lista').style.display !== 'none') loadLeads();
}, 30000);
</script>
</body>
</html>`;
}
