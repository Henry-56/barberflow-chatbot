const ADMIN_KEY = process.env.ADMIN_KEY;

const ESTADO_LABELS = {
  inicio:             { label: 'Nuevo',            color: '#888' },
  esperando_dolor:    { label: 'Interesado',       color: '#f59e0b' },
  esperando_decision: { label: 'Evaluando',        color: '#f97316' },
  eligiendo_horario:  { label: 'Eligiendo hora',   color: '#3b82f6' },
  agendado:           { label: '✅ Demo agendada', color: '#2ECC71' },
};

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) {
    return res.status(200).setHeader('Content-Type', 'text/html').send(loginHTML());
  }
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(panelHTML(req.query.key));
}

function loginHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
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
function login(e){e.preventDefault();const k=document.getElementById('key').value.trim();if(k)window.location.href='/api/admin?key='+encodeURIComponent(k);}
</script>
</body></html>`;
}

function panelHTML(key) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>BarberFlow Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0A0A;color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;height:100dvh;overflow:hidden;display:flex;flex-direction:column}

/* ── LISTA ── */
#vista-lista{display:flex;flex-direction:column;height:100dvh}
.header{background:#111;border-bottom:1px solid #222;padding:14px 16px;flex-shrink:0}
.header-logo{color:#D4AF37;font-weight:700;font-size:17px}
.header-sub{color:#888;font-size:12px;margin-top:1px}
.stats{display:flex;gap:8px;padding:12px 16px;overflow-x:auto;flex-shrink:0}
.stat{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:10px 14px;min-width:90px;text-align:center;flex-shrink:0}
.stat-n{font-size:22px;font-weight:700;color:#D4AF37}
.stat-l{font-size:10px;color:#888;margin-top:2px}
#leads-list{flex:1;overflow-y:auto}
.lead-card{background:#111;border-bottom:1px solid #1e1e1e;padding:13px 16px;display:flex;align-items:center;gap:12px;cursor:pointer}
.lead-card:active{background:#1a1a1a}
.avatar{width:44px;height:44px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;position:relative}
.manual-dot{position:absolute;bottom:0;right:0;width:12px;height:12px;background:#f97316;border-radius:50%;border:2px solid #0A0A0A}
.lead-info{flex:1;min-width:0}
.lead-name{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lead-last{font-size:12px;color:#888;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lead-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.badge{font-size:10px;font-weight:600;padding:3px 7px;border-radius:20px;white-space:nowrap}
.lead-time{font-size:10px;color:#555}
.empty{color:#555;text-align:center;padding:60px 20px;font-size:14px}
.loading{color:#555;text-align:center;padding:60px;font-size:14px}

/* ── CHAT ── */
#vista-chat{display:none;flex-direction:column;height:100dvh}
.chat-header{background:#111;border-bottom:1px solid #222;padding:11px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0}
.back-btn{color:#D4AF37;font-size:26px;cursor:pointer;line-height:1;padding:0 4px;flex-shrink:0}
.chat-avatar{width:38px;height:38px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.chat-info{flex:1;min-width:0}
.chat-name{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chat-sub{font-size:11px;color:#888;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.toggle-btn{padding:6px 12px;border-radius:20px;border:none;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;white-space:nowrap}
.toggle-bot{background:#1a3a2a;color:#2ECC71}
.toggle-manual{background:#3a1a0a;color:#f97316}

.messages{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:4px}
.bubble-wrap{display:flex;flex-direction:column}
.bubble-wrap.in{align-items:flex-start}
.bubble-wrap.out{align-items:flex-end}
.bubble{max-width:78%;padding:9px 13px;border-radius:18px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.bubble.in{background:#2a2a2a;border-bottom-left-radius:4px}
.bubble.out{background:#1a3a2a;border-bottom-right-radius:4px;color:#d4f5d4}
.btime{font-size:10px;color:#444;margin-top:2px;padding:0 4px}
.day-sep{text-align:center;color:#444;font-size:11px;margin:10px 0}

/* ── INPUT ── */
.chat-input-bar{background:#111;border-top:1px solid #222;padding:10px 12px;display:flex;align-items:flex-end;gap:8px;flex-shrink:0}
.chat-input-bar textarea{flex:1;background:#1e1e1e;border:1px solid #333;border-radius:20px;padding:10px 14px;color:#F5F5F0;font-size:14px;font-family:inherit;resize:none;max-height:100px;outline:none;line-height:1.4}
.chat-input-bar textarea:focus{border-color:#D4AF37}
.send-btn{width:40px;height:40px;background:#D4AF37;border:none;border-radius:50%;cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.send-btn:disabled{background:#333;cursor:not-allowed}
.manual-banner{background:#3a1a0a;color:#f97316;text-align:center;font-size:12px;padding:6px;flex-shrink:0}
</style>
</head>
<body>

<!-- LISTA -->
<div id="vista-lista">
  <div class="header">
    <div class="header-logo">⚡ BarberFlow</div>
    <div class="header-sub">Conversaciones en vivo</div>
  </div>
  <div class="stats" id="stats-bar"></div>
  <div id="leads-list"><div class="loading">Cargando...</div></div>
</div>

<!-- CHAT -->
<div id="vista-chat">
  <div class="chat-header">
    <span class="back-btn" onclick="volverLista()">‹</span>
    <div class="chat-avatar" id="cv-avatar"></div>
    <div class="chat-info">
      <div class="chat-name" id="cv-name"></div>
      <div class="chat-sub" id="cv-sub"></div>
    </div>
    <button class="toggle-btn toggle-bot" id="toggle-btn" onclick="toggleManual()">🤖 Bot activo</button>
  </div>
  <div id="manual-banner" class="manual-banner" style="display:none">⚠️ Modo manual — el bot está silenciado. Tú controlas la conversación.</div>
  <div class="messages" id="messages"></div>
  <div class="chat-input-bar">
    <textarea id="msg-input" placeholder="Escribe un mensaje..." rows="1" oninput="autoResize(this)" onkeydown="handleKey(event)"></textarea>
    <button class="send-btn" id="send-btn" onclick="enviarMensaje()">➤</button>
  </div>
</div>

<script>
const KEY = ${JSON.stringify(key)};
const ESTADOS = ${JSON.stringify(ESTADO_LABELS)};
let currentLead = null;
let chatPollInterval = null;
let lastMsgId = 0;
let isManual = false;

/* ── UTILS ── */
function fmtTime(iso){if(!iso)return '';const d=new Date(iso);const now=new Date();const diff=now-d;if(diff<60000)return 'ahora';if(diff<3600000)return Math.floor(diff/60000)+'m';if(diff<86400000)return d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString('es',{day:'2-digit',month:'2-digit'});}
function fmtHour(iso){if(!iso)return '';return new Date(iso).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});}
function escHtml(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');}
function avatarEmoji(e){return {inicio:'👤',esperando_dolor:'💬',esperando_decision:'🤔',eligiendo_horario:'📅',agendado:'✅'}[e]||'👤';}

/* ── LISTA ── */
async function loadLeads(){
  const r=await fetch('/api/admin-data?key='+encodeURIComponent(KEY));
  if(!r.ok)return;
  const leads=await r.json();
  const total=leads.length;
  const agendados=leads.filter(l=>l.estado==='agendado').length;
  const activos=leads.filter(l=>l.estado!=='inicio').length;
  document.getElementById('stats-bar').innerHTML=
    stat(total,'Leads')+stat(activos,'En proceso')+stat(agendados,'Demos');
  if(!leads.length){document.getElementById('leads-list').innerHTML='<div class="empty">Aún no hay conversaciones.</div>';return;}
  document.getElementById('leads-list').innerHTML=leads.map(l=>{
    const est=ESTADOS[l.estado]||{label:l.estado,color:'#888'};
    const nombre=l.nombre||l.phone;
    const lastMsg=l.last_message?(l.last_direction==='in'?l.last_message:'🤖 '+l.last_message):'Sin mensajes aún';
    const manualDot=l.manual_mode?'<div class="manual-dot"></div>':'';
    return \`<div class="lead-card" onclick='openChat(\${JSON.stringify(l)})'>
      <div class="avatar">\${avatarEmoji(l.estado)}\${manualDot}</div>
      <div class="lead-info">
        <div class="lead-name">\${escHtml(nombre)}</div>
        <div class="lead-last">\${escHtml(lastMsg)}</div>
      </div>
      <div class="lead-meta">
        <span class="badge" style="background:\${est.color}22;color:\${est.color}">\${est.label}</span>
        <span class="lead-time">\${fmtTime(l.updated_at)}</span>
      </div>
    </div>\`;
  }).join('');
}
function stat(n,label){return \`<div class="stat"><div class="stat-n">\${n}</div><div class="stat-l">\${label}</div></div>\`;}

/* ── CHAT ── */
async function openChat(lead){
  currentLead=lead;
  isManual=!!lead.manual_mode;
  lastMsgId=0;
  document.getElementById('vista-lista').style.display='none';
  const chatEl=document.getElementById('vista-chat');
  chatEl.style.display='flex';
  const est=ESTADOS[lead.estado]||{label:lead.estado,color:'#888'};
  document.getElementById('cv-avatar').textContent=avatarEmoji(lead.estado);
  document.getElementById('cv-name').textContent=lead.nombre||lead.phone;
  document.getElementById('cv-sub').innerHTML=
    lead.phone+' · <span style="color:'+est.color+'">'+est.label+'</span>'+
    (lead.slot_label?' · 📅 '+lead.slot_label:'');
  updateToggleBtn();
  document.getElementById('messages').innerHTML='<div class="loading">Cargando chat...</div>';
  await cargarMensajes(true);
  clearInterval(chatPollInterval);
  chatPollInterval=setInterval(()=>cargarMensajes(false),5000);
}

async function cargarMensajes(initial){
  const url='/api/admin-data?key='+encodeURIComponent(KEY)+'&phone='+encodeURIComponent(currentLead.phone);
  const r=await fetch(url);
  if(!r.ok)return;
  const msgs=await r.json();
  const container=document.getElementById('messages');
  if(!msgs.length){
    if(initial)container.innerHTML='<div class="empty">Sin mensajes aún.<br>Llegarán cuando el lead escriba.</div>';
    return;
  }
  const newMsgs=msgs.filter(m=>m.id>lastMsgId);
  if(!newMsgs.length)return;
  lastMsgId=msgs[msgs.length-1].id;
  if(initial){
    container.innerHTML=msgs.map(renderBubble).join('');
  } else {
    newMsgs.forEach(m=>container.insertAdjacentHTML('beforeend',renderBubble(m)));
  }
  container.scrollTop=container.scrollHeight;
}

function renderBubble(m){
  return \`<div class="bubble-wrap \${m.direction}">
    <div class="bubble \${m.direction}">\${escHtml(m.content)}</div>
    <div class="btime">\${fmtHour(m.created_at)}</div>
  </div>\`;
}

function volverLista(){
  clearInterval(chatPollInterval);
  currentLead=null;
  document.getElementById('vista-chat').style.display='none';
  document.getElementById('vista-lista').style.display='flex';
  loadLeads();
}

/* ── ENVIAR MENSAJE ── */
async function enviarMensaje(){
  const input=document.getElementById('msg-input');
  const text=input.value.trim();
  if(!text||!currentLead)return;
  const btn=document.getElementById('send-btn');
  btn.disabled=true;
  input.value='';
  input.style.height='auto';
  try{
    const r=await fetch('/api/admin-send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({key:KEY,phone:currentLead.phone,message:text})
    });
    if(r.ok) await cargarMensajes(false);
  } finally {btn.disabled=false;}
}

function handleKey(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviarMensaje();}
}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px';}

/* ── TOGGLE MANUAL/BOT ── */
async function toggleManual(){
  isManual=!isManual;
  await fetch('/api/admin-toggle',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:KEY,phone:currentLead.phone,manual:isManual})
  });
  currentLead.manual_mode=isManual;
  updateToggleBtn();
}

function updateToggleBtn(){
  const btn=document.getElementById('toggle-btn');
  const banner=document.getElementById('manual-banner');
  if(isManual){
    btn.className='toggle-btn toggle-manual';
    btn.textContent='⚠️ Bot pausado';
    banner.style.display='block';
  } else {
    btn.className='toggle-btn toggle-bot';
    btn.textContent='🤖 Bot activo';
    banner.style.display='none';
  }
}

/* ── INIT ── */
loadLeads();
setInterval(()=>{
  if(document.getElementById('vista-lista').style.display!=='none') loadLeads();
},30000);
</script>
</body></html>`;
}
