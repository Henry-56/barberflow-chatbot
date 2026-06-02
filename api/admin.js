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
.interactive-bubble{padding:0;overflow:hidden;background:#1a2a3a;border:1px solid #2a3a4a}
.interactive-header{background:#1e3a5a;color:#7ec8f0;font-size:12px;font-weight:700;padding:8px 12px;letter-spacing:0.3px}
.slot-section{padding:6px 0}
.slot-section:not(:last-child){border-bottom:1px solid #2a3a4a}
.slot-day{color:#888;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:6px 12px 4px}
.slot-row{color:#c8e6f0;font-size:13px;padding:4px 12px;display:flex;align-items:center;gap:6px}
.slot-row:last-child{padding-bottom:8px}

/* ── PROSPECT CHAT ── */
#vista-prospect-chat{display:none;flex-direction:column;height:100dvh}
.pc-status{font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;display:inline-block;margin-top:3px}

/* ── TAB BAR ── */
#tab-bar{position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #222;display:flex;height:56px;z-index:200}
.tab-btn{flex:1;border:none;background:none;color:#555;font-size:11px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-family:inherit;transition:color .15s}
.tab-btn.active{color:#D4AF37}
.tab-icon{font-size:20px;line-height:1}
#vista-lista,#vista-outreach{padding-bottom:56px}

/* ── OUTREACH ── */
#vista-outreach{display:none;flex-direction:column;height:100dvh;overflow-y:auto}
.ptable tbody tr{cursor:pointer;transition:background .15s}
.ptable tbody tr:hover{background:#1a1a1a}
.out-header{background:#111;border-bottom:1px solid #222;padding:11px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;position:sticky;top:0;z-index:10}
.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 16px;flex-shrink:0}
.stat-card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:10px;text-align:center}
.stat-card .n{font-size:20px;font-weight:700;color:#D4AF37}
.stat-card .l{font-size:10px;color:#888;margin-top:2px}
.out-section{padding:14px 16px}
.out-section h3{font-size:14px;font-weight:600;margin-bottom:10px;color:#D4AF37}
.out-sub{color:#888;font-size:12px;margin-bottom:8px}
textarea.csv-ta{width:100%;background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:10px;color:#F5F5F0;font-size:13px;font-family:inherit;resize:vertical;min-height:80px;outline:none}
textarea.csv-ta:focus{border-color:#D4AF37}
.out-btn{background:#D4AF37;color:#0A0A0A;border:none;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
.out-btn:active{opacity:.8}
.import-result{font-size:13px;margin-top:8px}
.ptable{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
.ptable th{background:#1a1a1a;color:#888;padding:8px 10px;text-align:left;border-bottom:1px solid #2a2a2a;font-weight:600;white-space:nowrap}
.ptable td{padding:8px 10px;border-bottom:1px solid #1e1e1e;vertical-align:top}
.nav-btn{background:none;border:1px solid #333;border-radius:20px;color:#888;font-size:12px;padding:5px 12px;cursor:pointer;flex-shrink:0}
.nav-btn:active{background:#2a2a2a}
.bs{padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600}
.bs-pending{background:#88888822;color:#888}
.bs-sent_msg1{background:#3b82f622;color:#3b82f6}
.bs-sent_msg2{background:#f59e0b22;color:#f59e0b}
.bs-sent_msg3{background:#f9731622;color:#f97316}
.bs-replied{background:#2ECC7122;color:#2ECC71}
.bs-converted{background:#D4AF3722;color:#D4AF37}
.bs-not_interested,.bs-invalid{background:#ef444422;color:#ef4444}
</style>
</head>
<body>

<!-- CAMPAÑA -->
<div id="vista-lista">
  <div class="header">
    <div class="header-logo">📱 Campaña</div>
    <div class="header-sub">Leads de Meta Ads</div>
  </div>
  <div class="stats" id="stats-bar"></div>
  <div id="leads-list"><div class="loading">Cargando...</div></div>
</div>

<!-- PROSPECTOS -->
<div id="vista-outreach">
  <div class="out-header">
    <div style="flex:1">
      <div class="header-logo">📊 Prospectos</div>
      <div class="header-sub" id="out-header-sub">Cargando...</div>
    </div>
    <button class="out-btn" style="padding:6px 12px;font-size:12px" onclick="loadOutreach()">↺</button>
  </div>
  <div class="stats-grid" id="out-stats"></div>
  <div class="out-section">
    <h3>Importar prospectos (CSV)</h3>
    <p class="out-sub">Formato: nombre,telefono,ciudad — una barbería por línea</p>
    <textarea class="csv-ta" id="csv-input" placeholder="Barbería Ríos,987654321,Huancayo&#10;Barber Kings,912345678,Lima"></textarea>
    <button class="out-btn" onclick="importarCSV()">Importar</button>
    <div class="import-result" id="import-result"></div>
  </div>
  <div class="out-section">
    <h3>Prospectos</h3>
    <div style="overflow-x:auto">
      <table class="ptable">
        <thead><tr><th>Barbería</th><th>Ciudad</th><th>Estado</th><th>Msgs</th><th>Último contacto</th><th></th></tr></thead>
        <tbody id="prospects-body"><tr><td colspan="5" style="color:#555;text-align:center;padding:20px">Cargando...</td></tr></tbody>
      </table>
    </div>
  </div>
</div>

<!-- PROSPECT CHAT -->
<div id="vista-prospect-chat">
  <div class="chat-header">
    <span class="back-btn" onclick="volverDesdeProspectChat()">‹</span>
    <div class="chat-avatar">💈</div>
    <div class="chat-info">
      <div class="chat-name" id="pc-name"></div>
      <div class="chat-sub" id="pc-sub"></div>
    </div>
    <span class="pc-status" id="pc-status-badge"></span>
  </div>
  <div class="messages" id="pc-messages"></div>
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

<!-- TAB BAR -->
<div id="tab-bar">
  <button class="tab-btn active" id="tab-campaign" onclick="switchTab('campaign')">
    <span class="tab-icon">📱</span><span>Campaña</span>
  </button>
  <button class="tab-btn" id="tab-prospects" onclick="switchTab('prospects')">
    <span class="tab-icon">📊</span><span>Prospectos</span>
  </button>
</div>

<script>
const KEY = ${JSON.stringify(key)};
const ESTADOS = ${JSON.stringify(ESTADO_LABELS)};
let currentLead = null;
let currentProspect = null;
let activeTab = 'campaign';

function switchTab(tab){
  activeTab=tab;
  document.getElementById('tab-campaign').className='tab-btn'+(tab==='campaign'?' active':'');
  document.getElementById('tab-prospects').className='tab-btn'+(tab==='prospects'?' active':'');
  if(tab==='campaign'){
    document.getElementById('vista-lista').style.display='flex';
    document.getElementById('vista-outreach').style.display='none';
    loadLeads();
  } else {
    document.getElementById('vista-lista').style.display='none';
    const v=document.getElementById('vista-outreach');
    v.style.display='flex';v.style.flexDirection='column';
    loadOutreach();
  }
  document.getElementById('tab-bar').style.display='flex';
}
function showTabBar(){document.getElementById('tab-bar').style.display='flex';}
function hideTabBar(){document.getElementById('tab-bar').style.display='none';}

const TMPL = {
  'barberflow_outreach_m1b': (n,c) => \`Hola \${n} 👋\\n\\nLes ofrezco 21 días gratis de BarberFlow para su barbería en \${c}.\\n\\nEs un sistema que fideliza clientes automáticamente por WhatsApp — los que no vuelven reciben un mensaje y regresan.\\n\\n¿Les interesa que les muestre cómo funciona? Son solo 15 minutos.\`,
  'barberflow_outreach_m2':   (n)   => \`Hola de nuevo \${n} 👋\\n\\nTe escribi hace unos dias sobre BarberFlow, el sistema que ayuda a barberias a retener clientes automaticamente por WhatsApp.\\n\\n¿Pudiste verlo? ¿Te interesa una demo gratis?\`,
  'barberflow_outreach_m3': (n,c) => \`Hola \${n}, ultimo mensaje de mi parte 🙏\\n\\nSi en algun momento quieren mejorar la retencion de clientes en su barberia de \${c}, BarberFlow puede ayudarles con fidelizacion automatica por WhatsApp.\\n\\n¡Mucho exito y hasta pronto!\`,
};
let chatPollInterval = null;
let lastMsgId = 0;
let isManual = false;
let lastRenderedDate = null;

/* ── UTILS ── */
function fmtTime(iso){if(!iso)return '';const d=new Date(iso);const now=new Date();const diff=now-d;if(diff<60000)return 'ahora';if(diff<3600000)return Math.floor(diff/60000)+'m';if(diff<86400000)return d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString('es',{day:'2-digit',month:'2-digit'});}
function fmtHour(iso){if(!iso)return '';return new Date(iso).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});}
function escHtml(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');}
function avatarEmoji(e){return {inicio:'👤',esperando_dolor:'💬',esperando_decision:'🤔',eligiendo_horario:'📅',agendado:'✅'}[e]||'👤';}
const DIAS_ES=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES_ES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fmtDateHour(iso){if(!iso)return '';const d=new Date(iso);const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());const yest=new Date(+today-86400000);const msgDay=new Date(d.getFullYear(),d.getMonth(),d.getDate());const h=d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});if(+msgDay===+today)return 'Hoy, '+h;if(+msgDay===+yest)return 'Ayer, '+h;return d.getDate()+' '+MESES_ES[d.getMonth()]+', '+h;}
function fmtDaySep(iso){const d=new Date(iso);const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());const yest=new Date(+today-86400000);const msgDay=new Date(d.getFullYear(),d.getMonth(),d.getDate());if(+msgDay===+today)return 'Hoy';if(+msgDay===+yest)return 'Ayer';return d.getDate()+' de '+MESES_ES[d.getMonth()];}
function fmtSlotDate(slotId){if(!slotId)return '';const m=slotId.match(/^slot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);if(!m)return '';const[,y,mo,d,hh,mm]=m;const date=new Date(Date.UTC(+y,+mo-1,+d));const dia=DIAS_ES[date.getUTCDay()];const diaC=dia[0].toUpperCase()+dia.slice(1);const h=+hh;const min=+mm;const minS=min>0?':'+String(min).padStart(2,'0'):'';const hl=h<12?h+minS+' am':h===12?'12'+minS+' m':(h-12)+minS+' pm';return diaC+' '+parseInt(d)+' de '+MESES_ES[+mo-1]+' — '+hl;}

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
        <span class="lead-time">\${fmtTime(l.last_message_at||l.updated_at)}</span>
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
  lastRenderedDate=null;
  document.getElementById('vista-lista').style.display='none';
  hideTabBar();
  const chatEl=document.getElementById('vista-chat');
  chatEl.style.display='flex';
  const est=ESTADOS[lead.estado]||{label:lead.estado,color:'#888'};
  document.getElementById('cv-avatar').textContent=avatarEmoji(lead.estado);
  document.getElementById('cv-name').textContent=lead.nombre||lead.phone;
  const slotInfo=lead.slot_id?' · 📅 '+fmtSlotDate(lead.slot_id):'';
  document.getElementById('cv-sub').innerHTML=
    lead.phone+' · <span style="color:'+est.color+'">'+est.label+'</span>'+slotInfo;
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
    lastRenderedDate=null;
    container.innerHTML=msgs.map(renderBubble).join('');
  } else {
    newMsgs.forEach(m=>container.insertAdjacentHTML('beforeend',renderBubble(m)));
  }
  container.scrollTop=container.scrollHeight;
}

function renderBubble(m){
  const msgDate=new Date(m.created_at).toDateString();
  let sep='';
  if(msgDate!==lastRenderedDate){lastRenderedDate=msgDate;sep=\`<div class="day-sep">\${fmtDaySep(m.created_at)}</div>\`;}
  if(m.msg_type==='interactive') return sep+renderInteractiveBubble(m);
  return sep+\`<div class="bubble-wrap \${m.direction}">
    <div class="bubble \${m.direction}">\${escHtml(m.content)}</div>
    <div class="btime">\${fmtHour(m.created_at)}</div>
  </div>\`;
}

function renderInteractiveBubble(m){
  let sections=[];
  try{ sections=JSON.parse(m.content); }catch(e){}
  let body='';
  if(!sections.length){
    body='<div style="padding:10px 12px;color:#888;font-size:13px">📅 Horarios enviados</div>';
  } else {
    body=sections.map(s=>\`
      <div class="slot-section">
        <div class="slot-day">\${escHtml(s.title)}</div>
        \${s.rows.map(r=>\`<div class="slot-row">🕐 \${escHtml(r.title)}</div>\`).join('')}
      </div>\`).join('');
  }
  return \`<div class="bubble-wrap out">
    <div class="bubble out interactive-bubble">
      <div class="interactive-header">📅 Horarios enviados al cliente</div>
      \${body}
    </div>
    <div class="btime">\${fmtHour(m.created_at)}</div>
  </div>\`;
}

function volverLista(){
  clearInterval(chatPollInterval);
  currentLead=null;
  document.getElementById('vista-chat').style.display='none';
  document.getElementById('vista-lista').style.display='flex';
  showTabBar();
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

/* ── PROSPECT CHAT ── */
function openProspectChatById(id){
  const p=window._prospects&&window._prospects.find(x=>x.id===id);
  if(p) openProspectChat(p);
}

function openProspectChat(p){
  currentProspect=p;
  document.getElementById('vista-outreach').style.display='none';
  hideTabBar();
  const v=document.getElementById('vista-prospect-chat');
  v.style.display='flex';
  document.getElementById('pc-name').textContent=p.name;
  document.getElementById('pc-sub').textContent=p.city+' · '+p.phone;
  const badge=document.getElementById('pc-status-badge');
  badge.textContent=p.status;
  badge.style.cssText='background:#'+statusColor(p.status)+'22;color:#'+statusColor(p.status);
  document.getElementById('pc-messages').innerHTML='<div class="loading">Cargando mensajes...</div>';
  loadProspectMessages(p);
}

function statusColor(s){
  return {pending:'888888',sent_msg1:'3b82f6',sent_msg2:'f59e0b',sent_msg3:'f97316',replied:'2ECC71',converted:'D4AF37',not_interested:'ef4444',invalid:'ef4444'}[s]||'888888';
}

async function loadProspectMessages(p){
  const url='/api/admin-data?key='+encodeURIComponent(KEY)
    +'&prospect_id='+encodeURIComponent(p.id)
    +'&prospect_phone='+encodeURIComponent(p.phone);
  const r=await fetch(url);
  if(!r.ok) return;
  const {sent,replies}=await r.json();

  const all=[
    ...sent.map(m=>({...m,direction:'out'})),
    ...replies,
  ].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));

  const container=document.getElementById('pc-messages');
  if(!all.length){
    container.innerHTML='<div class="empty">Sin mensajes aún.</div>';
    return;
  }
  let lastDate=null;
  container.innerHTML=all.map(m=>{
    const msgDate=new Date(m.created_at).toDateString();
    let sep='';
    if(msgDate!==lastDate){lastDate=msgDate;sep=\`<div class="day-sep">\${fmtDaySep(m.created_at)}</div>\`;}
    let content;
    if(m.template_name){
      const fn=TMPL[m.template_name];
      content=fn?fn(p.name,p.city):m.message_preview||m.template_name;
    } else {
      content=m.content||'';
    }
    const tick=m.direction==='out'?' ✓✓':'';
    return sep+\`<div class="bubble-wrap \${m.direction}">
      <div class="bubble \${m.direction}">\${escHtml(content)}</div>
      <div class="btime" style="color:#777">\${fmtDateHour(m.created_at)}\${tick}</div>
    </div>\`;
  }).join('');
  container.scrollTop=container.scrollHeight;
}

function volverDesdeProspectChat(){
  document.getElementById('vista-prospect-chat').style.display='none';
  const v=document.getElementById('vista-outreach');
  v.style.display='flex';
  v.style.flexDirection='column';
  showTabBar();
}

/* ── OUTREACH ── */
async function loadOutreach(){
  const r=await fetch('/api/outreach-stats?key='+encodeURIComponent(KEY));
  if(!r.ok)return;
  const data=await r.json();
  const s=data.stats;
  document.getElementById('out-header-sub').textContent='Hoy: '+data.sentToday+'/'+data.dailyLimit+' mensajes';
  document.getElementById('out-stats').innerHTML=[
    [s.pending,'Pendientes'],[s.sent_msg1,'Msg1 env.'],[s.sent_msg2,'Msg2 env.'],
    [s.sent_msg3,'Msg3 env.'],[s.replied,'Resp.'],[s.converted,'Conv.']
  ].map(([n,l])=>\`<div class="stat-card"><div class="n">\${n||0}</div><div class="l">\${l}</div></div>\`).join('');
  const rows=data.prospects;
  window._prospects=rows;
  document.getElementById('prospects-body').innerHTML=rows.length
    ?rows.map(p=>\`<tr onclick='openProspectChatById("\${p.id}")'>
        <td>\${escHtml(p.name)}</td>
        <td>\${escHtml(p.city)}</td>
        <td><span class="bs bs-\${p.status}">\${p.status}</span></td>
        <td>\${p.message_count||0}</td>
        <td>\${p.last_message_at?new Date(p.last_message_at).toLocaleDateString('es-PE'):'—'}</td>
        <td style="color:#555;font-size:16px">›</td>
      </tr>\`).join('')
    :'<tr><td colspan="6" style="color:#555;text-align:center;padding:20px">Sin prospectos aún. Importa un CSV para empezar.</td></tr>';
}
async function importarCSV(){
  const text=document.getElementById('csv-input').value.trim();
  if(!text)return;
  const rows=text.split('\\n').map(line=>{
    const parts=line.split(',');
    return{name:(parts[0]||'').trim(),phone:(parts[1]||'').trim(),city:(parts[2]||'').trim()};
  }).filter(r=>r.name&&r.phone&&r.city);
  const resEl=document.getElementById('import-result');
  if(!rows.length){resEl.style.color='#f59e0b';resEl.textContent='⚠️ Ninguna fila válida encontrada';return;}
  const r=await fetch('/api/import-prospects',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+KEY},
    body:JSON.stringify({rows})
  });
  const data=await r.json();
  if(data.success){
    resEl.style.color='#2ECC71';
    resEl.textContent='✅ Importados: '+data.imported+' | Omitidos (duplicados): '+data.skipped;
    document.getElementById('csv-input').value='';
    loadOutreach();
  } else {
    resEl.style.color='#ef4444';
    resEl.textContent='❌ Error: '+data.error;
  }
}

/* ── INIT ── */
switchTab('campaign');
setInterval(()=>{
  if(activeTab==='campaign'&&document.getElementById('vista-lista').style.display!=='none') loadLeads();
},30000);
</script>
</body></html>`;
}
