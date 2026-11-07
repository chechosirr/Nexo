/* ===== NEXO · Ayuda (chat propio en el VPS) + experiencia de administrador =====
   PREVIEW 2026-11-06. Contrato fijo del chat:
     POST https://puente.ragerservices.net/nexo/chat/send  {name, contact?, text, conv?} -> {ok, conv, total}
     GET  https://puente.ragerservices.net/nexo/chat/poll?conv=<id>&after=<n> -> {ok, total, messages:[{f:"v"|"a",t,ts}]}
     GET  https://puente.ragerservices.net/nexo/chat/health
     Panel del administrador: https://puente.ragerservices.net/nexo/chat/admin
   Estado local: localStorage nexo_chat_conv / nexo_chat_name (nombre la primera vez).
   La experiencia de administrador SOLO se activa si el perfil (Supabase, con la
   sesión del usuario) tiene es_admin=true. Sin sesión o con sesión normal no se
   toca nada más que la entrada pública «Ayuda». */
(function(){
  var CHAT_BASE = 'https://puente.ragerservices.net/nexo/chat';
  var CHAT_ADMIN_URL = CHAT_BASE + '/admin';
  var SUPABASE_URL = 'https://ywtmzkzcxnntvxvjcger.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_hm3dr-gmYE1loU-yXiZkow_uompYxYl';
  var OPTS = window.NX_AYUDA_OPTS || {};

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  /* ---------- estilos (azul metálico de NEXO) ---------- */
  var css = ''
  + '#nx-ayuda-btn{position:fixed;right:18px;bottom:18px;z-index:900;border:1px solid rgba(255,255,255,.45);cursor:pointer;font-family:inherit;font-weight:700;letter-spacing:.02em;font-size:15px;color:#fff;padding:12px 22px;border-radius:999px;background:rgba(24,20,16,.28);box-shadow:0 6px 18px rgba(0,0,0,.18);text-shadow:0 1px 3px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}'
  + '#nx-ayuda-btn:active{transform:scale(.97)}'
  + '#nx-chat{position:fixed;right:16px;bottom:86px;z-index:1500;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100dvh - 120px));background:#fff;border:1px solid #c7d6ea;border-radius:20px;box-shadow:0 24px 60px rgba(10,26,44,.35);display:none;flex-direction:column;overflow:hidden;font-family:inherit}'
  + '#nx-chat.open{display:flex}'
  + '#nx-chat .nx-ch-head{background:linear-gradient(180deg,#17334f,#0c1e33);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}'
  + '#nx-chat .nx-ch-head b{font-size:16px}'
  + '#nx-chat .nx-ch-head small{display:block;color:#b9cfe6;font-weight:600;font-size:12px}'
  + '#nx-chat .nx-ch-x{margin-left:auto;background:none;border:0;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px}'
  + '#nx-ch-msgs{flex:1;overflow-y:auto;padding:14px 12px;background:#eef3fa;display:flex;flex-direction:column;gap:8px}'
  + '.nx-msg{max-width:82%;padding:9px 13px;border-radius:16px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}'
  + '.nx-msg.v{align-self:flex-end;background:linear-gradient(135deg,#2a5f8f,#1d4568);color:#fff;border-bottom-right-radius:5px}'
  + '.nx-msg.a{align-self:flex-start;background:#fff;color:#111;border:1px solid #c7d6ea;border-bottom-left-radius:5px}'
  + '.nx-msg .nx-ts{display:block;font-size:10.5px;opacity:.65;margin-top:4px;text-align:right}'
  + '#nx-ch-empty{color:#47617e;font-size:14px;text-align:center;padding:18px 10px}'
  + '#nx-ch-status{display:none;padding:8px 14px;font-size:13px;background:#fdf1f1;color:#b3261e;border-top:1px solid #e5b4b4}'
  + '#nx-ch-name{padding:16px;display:none;flex-direction:column;gap:8px;background:#eef3fa;flex:1}'
  + '#nx-ch-name label{font-size:13px;font-weight:700;color:#142c47}'
  + '#nx-ch-name input{width:100%;border:1.5px solid #b7cadd;border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;box-sizing:border-box;background:#fff;color:#111}'
  + '#nx-ch-start{margin-top:6px;border:0;border-radius:12px;padding:13px;font-family:inherit;font-weight:800;font-size:15px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#3d7ab5 0%,#24567f 30%,#1d4568 50%,#2a5f8f 70%,#122a44 100%)}'
  + '#nx-ch-form{display:flex;gap:8px;padding:10px;border-top:1px solid #c7d6ea;background:#fff}'
  + '#nx-ch-input{flex:1;min-width:0;border:1.5px solid #b7cadd;border-radius:999px;padding:11px 15px;font-family:inherit;font-size:15px;color:#111;outline:none}'
  + '#nx-ch-send{border:0;border-radius:999px;padding:11px 18px;font-family:inherit;font-weight:800;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#3d7ab5 0%,#24567f 30%,#1d4568 50%,#2a5f8f 70%,#122a44 100%)}'
  + '#nx-ch-send:disabled{opacity:.55;cursor:default}'
  + '#nx-finbar{display:none;gap:8px;padding:9px 10px;border-top:1px solid #c7d6ea;background:#fff}'
  + '#nx-finbar.open{display:flex}'
  + '#nx-finbar button{flex:1;border:1px solid #e5b4b4;background:#fdf1f1;color:#b3261e;border-radius:10px;padding:9px;font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer}'
  + '#nx-closed{display:none;padding:22px 16px;text-align:center;background:#fff;border-top:1px solid #c7d6ea}'
  + '#nx-closed.open{display:block}'
  + '#nx-closed b{font-size:16px;color:#111}'
  + '#nx-closed p{color:#47617e;font-size:13.5px;margin:8px 0 14px}'
  + '#nx-closed button{border:0;border-radius:999px;padding:11px 20px;font-family:inherit;font-weight:800;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#3d7ab5 0%,#24567f 30%,#1d4568 50%,#2a5f8f 70%,#122a44 100%)}'
  + '#nx-hist{flex:1;overflow-y:auto;padding:12px;background:#eef3fa;display:none;flex-direction:column;gap:9px}'
  + '#nx-hist.open{display:flex}'
  + '.nx-hi{text-align:left;background:#fff;border:1px solid #c7d6ea;border-radius:14px;padding:11px 13px;font-family:inherit;cursor:pointer;width:100%}'
  + '.nx-hi .d{font-size:11.5px;color:#47617e}'
  + '.nx-hi .p{font-size:14px;color:#111;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.nx-tag{font-size:10.5px;font-weight:800;border-radius:999px;padding:1px 8px;margin-left:7px;background:#e3ebf5;color:#47617e}'
  + '.nx-tag.on{background:#d9f2dc;color:#1c5c26}'
  + '#nx-viewbar{display:none;align-items:center;gap:8px;padding:8px 12px;background:#fff;border-bottom:1px solid #c7d6ea;font-size:12.5px;color:#47617e}'
  + '#nx-viewbar.open{display:flex}'
  + '#nx-viewbar button{margin-left:auto;background:#e3ebf5;border:0;border-radius:8px;padding:6px 10px;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer;color:#142c47}'
  + '#nx-hist-back{align-self:flex-start;background:none;border:0;color:#142c47;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;padding:2px 0}'
  + '#nx-bienvenida{position:fixed;inset:0;z-index:2000;background:linear-gradient(160deg,#17334f,#0a1a2c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:24px;cursor:pointer}'
  + '#nx-bienvenida .nx-bw-k{color:#8fb4da;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase}'
  + '#nx-bienvenida .nx-bw-t{color:#fff;font-weight:900;font-size:clamp(40px,10vw,76px);line-height:1.05}'
  + '#nx-bienvenida .nx-bw-s{color:#b9cfe6;font-size:16px}'
  + '#nx-bienvenida .nx-bw-b{margin-top:18px;border:0;border-radius:999px;padding:14px 34px;font-family:inherit;font-weight:800;font-size:16px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#3d7ab5 0%,#24567f 30%,#1d4568 50%,#2a5f8f 70%,#122a44 100%)}'
  + '@media(max-width:640px){#nx-chat{right:12px;left:12px;width:auto;bottom:84px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- estado del chat ---------- */
  var conv = lsGet('nexo_chat_conv') || null;
  var visitorName = lsGet('nexo_chat_name') || '';
  var visitorContact = lsGet('nexo_chat_contact') || '';
  /* Cliente CON sesión (Supabase, clave nexo_session): entra
     DIRECTO al chat, sin el formulario de visitante, y sus
     mensajes van con su token para que el servidor asocie la
     conversación a su cuenta. Su conversación se guarda aparte. */
  var acct = null;
  try{
    var _sbS = JSON.parse(lsGet('nexo_session') || 'null');
    if(_sbS && _sbS.access_token && _sbS.user && _sbS.user.id){
      acct = {
        name: (_sbS.user.user_metadata && (_sbS.user.user_metadata.nombre || _sbS.user.user_metadata.name)) || _sbS.user.email || 'Cliente',
        email: _sbS.user.email || '',
        token: _sbS.access_token
      };
      conv = lsGet('nexo_chat_conv_acc') || null;
      fetch(SUPABASE_URL + '/rest/v1/profiles?user_id=eq.' + encodeURIComponent(_sbS.user.id) + '&select=nombre', {
        headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + acct.token }
      }).then(function(r){ return r.ok ? r.json() : []; })
        .then(function(rows){ if(rows && rows[0] && rows[0].nombre) acct.name = rows[0].nombre; })
        .catch(function(){});
    }
  }catch(e){}
  /* Registro local de conversaciones de ESTE dispositivo («Mis
     chats»): cada conversación que el cliente usa queda anotada;
     las finalizadas siguen en la lista para poder releerlas. */
  var convIds = [];
  try{ convIds = JSON.parse(lsGet('nexo_chat_convs') || '[]') || []; }catch(e){ convIds = []; }
  function noteConv(id){ if(!id) return; if(convIds.indexOf(id) < 0){ convIds.push(id); if(convIds.length > 30) convIds = convIds.slice(-30); lsSet('nexo_chat_convs', JSON.stringify(convIds)); } }
  if(conv) noteConv(conv);
  var finalizada = false;   /* la conversación actual quedó cerrada */
  var viewing = null;       /* conv abierta en solo lectura desde «Mis chats» */
  var histOpen = false;     /* la vista «Mis chats» está abierta */
  function convKey(){ return acct ? 'nexo_chat_conv_acc' : 'nexo_chat_conv'; }
  function ensureAcctConv(){
    if(!acct || conv) return Promise.resolve();
    return fetch(CHAT_BASE + '/myconv', { headers: { 'Authorization': 'Bearer ' + acct.token } })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){ if(j && j.conv){ conv = j.conv; noteConv(conv); lsSet('nexo_chat_conv_acc', conv); seen = 0; } })
      .catch(function(){});
  }
  var opening = false;
  /* El saludo existe DESDE que el cliente entra al chat (orden de
     Sergio): al entrar —con sesion, directo; el visitante, al tocar
     «Empezar chat»— la conversacion se crea en el servidor con su
     saludo ya puesto, sin esperar a su primer mensaje. */
  function ensureOpen(){
    if(conv || opening) return Promise.resolve();
    if(!visitorName && !acct) return Promise.resolve();
    opening = true;
    var body = acct ? { auth: acct.token } : { name: visitorName, contact: visitorContact };
    return fetch(CHAT_BASE + '/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){
        opening = false;
        if(j && j.ok && j.conv){ conv = j.conv; noteConv(conv); lsSet(convKey(), conv); seen = 0; refreshBars(); return pollNow(); }
      })
      .catch(function(){ opening = false; });
  }
  if(acct) ensureAcctConv();
  var seen = 0;              /* mensajes ya pintados (parámetro after del poll) */
  var pollTimer = null;
  var sending = false;

  /* ---------- botón fijo «Ayuda» ---------- */
  var btn = null;
  if(OPTS.fixedButton !== false){
    btn = document.createElement('button');
    btn.id = 'nx-ayuda-btn'; btn.type = 'button';
    btn.setAttribute('aria-label','Ayuda');
    btn.textContent = '💬 Ayuda';
    document.body.appendChild(btn);
    btn.addEventListener('click', function(){ openChat(); });
  }

  /* ---------- panel del chat ---------- */
  var panel = document.createElement('div');
  panel.id = 'nx-chat';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Chat de ayuda de Nexo');
  panel.innerHTML =
      '<div class="nx-ch-head"><div><b>Ayuda · Nexo</b><small>Te respondemos aquí mismo</small></div>'
    + '<button class="nx-ch-x" type="button" aria-label="Cerrar">✕</button></div>'
    + '<div id="nx-ch-name">'
    +   '<label for="nx-name-in">¿Cómo te llamas?</label>'
    +   '<input id="nx-name-in" type="text" autocomplete="name" placeholder="Tu nombre">'
    +   '<label for="nx-contact-in">Contacto <span style="color:#47617e;font-weight:600">(opcional: WhatsApp o correo)</span></label>'
    +   '<input id="nx-contact-in" type="text" autocomplete="email" placeholder="Opcional">'
    +   '<button id="nx-ch-start" type="button">Empezar chat</button>'
    + '</div>'
    + '<div id="nx-ch-msgs"><div id="nx-ch-empty">Escríbenos tu mensaje y te respondemos en este mismo chat.</div></div>'
    + '<div id="nx-ch-status"></div>'
    + '<div id="nx-viewbar"><span>Conversación finalizada · solo lectura</span><button id="nx-view-hist" type="button">← Mis chats</button></div>'
    + '<div id="nx-hist"><button id="nx-hist-back" type="button">← Volver al chat</button><div id="nx-hist-list"></div></div>'
    + '<div id="nx-finbar"><button id="nx-fin-btn" type="button">Finalizar chat</button></div>'
    + '<div id="nx-closed"><b>Chat finalizado. Gracias por escribirnos.</b><p>Si necesitas algo más, puedes empezar un chat nuevo.</p><button id="nx-again" type="button">Iniciar un chat nuevo</button></div>'
    + '<form id="nx-ch-form"><input id="nx-ch-input" type="text" placeholder="Escribe tu mensaje…" autocomplete="off">'
    + '<button id="nx-ch-send" type="submit">Enviar</button></form>';
  document.body.appendChild(panel);

  var msgsEl = panel.querySelector('#nx-ch-msgs');
  var emptyEl = panel.querySelector('#nx-ch-empty');
  var statusEl = panel.querySelector('#nx-ch-status');
  var nameBox = panel.querySelector('#nx-ch-name');
  var formEl = panel.querySelector('#nx-ch-form');
  var inputEl = panel.querySelector('#nx-ch-input');
  var sendBtn = panel.querySelector('#nx-ch-send');
  var finbarEl = panel.querySelector('#nx-finbar');
  var closedEl = panel.querySelector('#nx-closed');
  var histEl = panel.querySelector('#nx-hist');
  var histListEl = panel.querySelector('#nx-hist-list');
  var viewbarEl = panel.querySelector('#nx-viewbar');

  function setStatus(msg){
    if(msg){ statusEl.textContent = msg; statusEl.style.display = 'block'; }
    else { statusEl.style.display = 'none'; statusEl.textContent = ''; }
  }
  function hora(ts){
    if(!ts) return '';
    var d = new Date(ts);
    if(isNaN(d)) return '';
    return d.toLocaleTimeString('es', { hour:'numeric', minute:'2-digit' });
  }
  function addMsg(m){
    if(emptyEl && emptyEl.parentNode) emptyEl.remove();
    var d = document.createElement('div');
    d.className = 'nx-msg ' + (m.f === 'a' ? 'a' : 'v');
    d.textContent = m.t == null ? '' : String(m.t);
    var h = hora(m.ts);
    if(h){ var s = document.createElement('span'); s.className = 'nx-ts'; s.textContent = h; d.appendChild(s); }
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function refreshNameGate(){
    var needName = !visitorName && !acct;
    nameBox.style.display = (needName && !histOpen && !viewing) ? 'flex' : 'none';
    msgsEl.style.display = (needName || histOpen) ? 'none' : 'flex';
    formEl.style.display = needName ? 'none' : 'flex';
    refreshBars();
  }
  /* Barras según estado: «Finalizar chat» solo con la conversación
     viva abierta; el cierre sustituye al formulario al finalizar. */
  function refreshBars(){
    var started = !!visitorName || !!acct;
    if(started) formEl.style.display = (!finalizada && !viewing && !histOpen) ? 'flex' : 'none';
    finbarEl.classList.toggle('open', !!(started && conv && !finalizada && !viewing && !histOpen));
    closedEl.classList.toggle('open', !!(started && finalizada && !viewing && !histOpen));
    viewbarEl.classList.toggle('open', !!viewing);
  }
  function showClosed(){ finalizada = true; refreshBars(); }
  function pollNow(){
    if(!conv || viewing) return Promise.resolve();
    return fetch(CHAT_BASE + '/poll?conv=' + encodeURIComponent(conv) + '&after=' + seen)
      .then(function(r){
        if(r.status === 404){
          /* la conversación ya no existe en el servidor: empezar de cero */
          conv = null; seen = 0; lsSet('nexo_chat_conv','');
          try{ localStorage.removeItem('nexo_chat_conv'); }catch(e){}
          setStatus('La conversación anterior ya no está disponible. Escribe un mensaje para empezar una nueva.');
          return null;
        }
        if(!r.ok) throw new Error('poll ' + r.status);
        return r.json();
      })
      .then(function(j){
        if(!j || !j.ok) return;
        setStatus('');
        (j.messages || []).forEach(addMsg);
        if(typeof j.total === 'number') seen = j.total;
        else seen += (j.messages || []).length;
        if(j.finalizada) showClosed();
      })
      .catch(function(){ /* red caída: el siguiente sondeo reintenta solo */ });
  }
  function startPolling(){
    stopPolling();
    pollNow();
    pollTimer = setInterval(pollNow, 4000);
  }
  function stopPolling(){ if(pollTimer){ clearInterval(pollTimer); pollTimer = null; } }

  /* ----- Finalizar chat / chat nuevo / «Mis chats» (registro) ----- */
  function doFinalizar(){
    if(!conv || finalizada) return;
    fetch(CHAT_BASE + '/finalizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conv: conv }) })
      .catch(function(){})
      .then(function(){ showClosed(); });
  }
  function newChat(){
    finalizada = false; viewing = null; seen = 0;
    try{ localStorage.removeItem(convKey()); }catch(e){}
    conv = null;
    msgsEl.innerHTML = '<div id="nx-ch-empty">Escríbenos tu mensaje y te respondemos en este mismo chat.</div>';
    emptyEl = panel.querySelector('#nx-ch-empty');
    histOpen = false; histEl.classList.remove('open');
    refreshNameGate();
    if(acct){ ensureAcctConv().then(function(){ if(!conv) return ensureOpen(); }).then(function(){ if(panel.classList.contains('open')) startPolling(); }); }
    else if(visitorName){ ensureOpen().then(function(){ if(panel.classList.contains('open')) startPolling(); }); }
  }
  function fmtFecha(ts){
    if(!ts) return '';
    var d = new Date(ts < 1e12 ? ts * 1000 : ts);
    if(isNaN(d)) return '';
    try{ return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' }); }catch(e){ return ''; }
  }
  function loadHist(){
    histListEl.innerHTML = '<div style="color:#47617e;font-size:14px;text-align:center;padding:14px 6px">Cargando…</div>';
    var p = acct
      ? fetch(CHAT_BASE + '/myhistory', { headers: { 'Authorization': 'Bearer ' + acct.token } }).then(function(r){ return r.json(); })
      : fetch(CHAT_BASE + '/myhistory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: convIds }) }).then(function(r){ return r.json(); });
    p.then(function(j){
      var chats = (j && j.chats) || [];
      if(!chats.length){ histListEl.innerHTML = '<div style="color:#47617e;font-size:14px;text-align:center;padding:14px 6px">Todavía no tienes chats guardados.</div>'; return; }
      histListEl.innerHTML = '';
      chats.forEach(function(it){
        var b = document.createElement('button'); b.type = 'button'; b.className = 'nx-hi';
        var tag = it.finalizada ? '<span class="nx-tag">Finalizada</span>' : (it.activa ? '<span class="nx-tag on">Activa</span>' : '<span class="nx-tag">Anterior</span>');
        b.innerHTML = '<span class="d">' + esc(fmtFecha(it.updated || it.created)) + '</span>' + tag + '<div class="p">' + esc((it.last_f === 'v' ? 'Tú: ' : '') + (it.last || '')) + '</div>';
        b.addEventListener('click', function(){ openHistItem(it); });
        histListEl.appendChild(b);
      });
    }).catch(function(){ histListEl.innerHTML = '<div style="color:#47617e;font-size:14px;text-align:center;padding:14px 6px">No se pudo cargar tu registro.</div>'; });
  }
  function openHistory(){
    histOpen = true; viewing = null;
    panel.classList.add('open');
    histEl.classList.add('open');
    refreshNameGate();
    loadHist();
    startPolling();
  }
  function closeHistToChat(){
    histOpen = false; viewing = null;
    histEl.classList.remove('open');
    seen = 0; msgsEl.innerHTML = '';
    refreshNameGate();
    if(conv) pollNow();
  }
  function openHistItem(it){
    if(it.conv === conv && !it.finalizada){ closeHistToChat(); return; }
    viewing = it.conv; histOpen = false;
    histEl.classList.remove('open');
    msgsEl.style.display = 'flex';
    viewbarEl.querySelector('span').textContent = it.finalizada ? 'Conversación finalizada · solo lectura' : 'Conversación anterior · solo lectura';
    refreshBars();
    msgsEl.innerHTML = '';
    fetch(CHAT_BASE + '/poll?conv=' + encodeURIComponent(it.conv) + '&after=0')
      .then(function(r){ return r.json(); })
      .then(function(j){ if(j && j.ok){ (j.messages || []).forEach(addMsg); } })
      .catch(function(){});
  }

  function openChat(){
    histOpen = false; viewing = null;
    histEl.classList.remove('open');
    panel.classList.add('open');
    refreshNameGate();
    if(visitorName){ if(conv) startPolling(); else ensureOpen().then(function(){ if(panel.classList.contains('open')) startPolling(); }); }
    else if(acct){ if(conv) startPolling(); else ensureAcctConv().then(function(){ if(!panel.classList.contains('open')) return; if(conv) startPolling(); else ensureOpen().then(function(){ if(panel.classList.contains('open')) startPolling(); }); }); }
    var f = (visitorName || acct) ? inputEl : panel.querySelector('#nx-name-in');
    if(f) setTimeout(function(){ try{ f.focus(); }catch(e){} }, 60);
  }
  function closeChat(){ panel.classList.remove('open'); stopPolling(); }
  window.nxOpenChat = openChat;
  window.nxOpenHistory = openHistory;
  panel.querySelector('#nx-fin-btn').addEventListener('click', doFinalizar);
  panel.querySelector('#nx-again').addEventListener('click', newChat);
  panel.querySelector('#nx-hist-back').addEventListener('click', closeHistToChat);
  panel.querySelector('#nx-view-hist').addEventListener('click', openHistory);
  panel.querySelector('.nx-ch-x').addEventListener('click', closeChat);

  panel.querySelector('#nx-ch-start').addEventListener('click', function(){
    var n = panel.querySelector('#nx-name-in').value.trim();
    if(!n){ panel.querySelector('#nx-name-in').focus(); return; }
    visitorName = n; lsSet('nexo_chat_name', n);
    var c = panel.querySelector('#nx-contact-in').value.trim();
    if(c){ visitorContact = c; lsSet('nexo_chat_contact', c); }
    refreshNameGate();
    ensureOpen().then(function(){ if(panel.classList.contains('open')) startPolling(); });
    inputEl.focus();
  });

  formEl.addEventListener('submit', function(e){
    e.preventDefault();
    var text = inputEl.value.trim();
    if(!text || sending || (!visitorName && !acct)) return;
    sending = true; sendBtn.disabled = true;
    var body;
    if(acct){ body = { text: text, auth: acct.token }; if(conv) body.conv = conv; }
    else { body = { name: visitorName, text: text }; if(visitorContact) body.contact = visitorContact; if(conv) body.conv = conv; }
    fetch(CHAT_BASE + '/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json().then(function(j){ return { status: r.status, j: j }; }); })
      .then(function(res){
        if(res.status === 409){ inputEl.value = ''; setStatus(''); showClosed(); return; }
        var j = res.j;
        if(!j || !j.ok) throw new Error('send');
        if(j.conv && j.conv !== conv){ conv = j.conv; noteConv(conv); lsSet(convKey(), conv); }
        inputEl.value = '';
        setStatus('');
        refreshBars();
        return pollNow(); /* trae el saludo automático y el propio mensaje */
      })
      .catch(function(){
        setStatus('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');
      })
      .then(function(){ sending = false; sendBtn.disabled = false; inputEl.focus(); });
  });

  /* ---------- entrada «Ayuda» en el menú ☰ (válida para todos) ---------- */
  var menu = document.querySelector(OPTS.menuSelector || '#menu, #ddnav');
  if(menu && OPTS.menuAyuda !== false){
    var aA = document.createElement('a');
    aA.href = '#'; aA.textContent = 'Ayuda'; aA.className = 'nx-menu-ayuda';
    var logoutA = menu.querySelector('#menu-logout, #logout');
    if(logoutA) menu.insertBefore(aA, logoutA); else menu.appendChild(aA);
    aA.addEventListener('click', function(e){
      e.preventDefault();
      menu.classList.remove('open');
      openChat();
    });
    /* «Mis chats»: el registro de conversaciones del cliente */
    var aH = document.createElement('a');
    aH.href = '#'; aH.textContent = 'Mis chats'; aH.className = 'nx-menu-hist';
    if(logoutA) menu.insertBefore(aH, logoutA); else menu.appendChild(aH);
    aH.addEventListener('click', function(e){
      e.preventDefault();
      menu.classList.remove('open');
      openHistory();
    });
  }
  /* enlaces marcados en otras páginas del preview (p. ej. Políticas) */
  Array.prototype.forEach.call(document.querySelectorAll('[data-nx-ayuda]'), function(el){
    el.addEventListener('click', function(e){ e.preventDefault(); openChat(); });
  });

  /* abrir directo con index.html#ayuda (tras la apertura de 2,1 s) */
  if(location.hash === '#ayuda'){
    setTimeout(openChat, 2400);
  }

  /* ---------- experiencia de administrador (SOLO es_admin=true) ---------- */
  function session(){
    try{ var s = JSON.parse(localStorage.getItem('nexo_session') || 'null'); return (s && s.access_token && s.user && s.user.id) ? s : null; }
    catch(e){ return null; }
  }
  var s = session();
  if(!s) return;
  fetch(SUPABASE_URL + '/rest/v1/profiles?user_id=eq.' + encodeURIComponent(s.user.id) + '&select=es_admin', {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + s.access_token }
  }).then(function(r){ return r.ok ? r.json() : []; })
    .then(function(rows){
      var p = rows && rows[0];
      if(!p || p.es_admin !== true) return; /* sesión normal: el menú queda EXACTAMENTE como hoy */

      document.documentElement.classList.add('nx-is-admin');

      /* admin.html: botón «Chat» del panel, visible solo para el admin,
         entrando DIRECTO con el traspaso de su sesión (sin contraseña) */
      var acb = document.getElementById('admin-chat-btn');
      if(acb){ acb.style.display = ''; acb.href = CHAT_ADMIN_URL + '#t=' + encodeURIComponent(s.access_token); }

      /* el menú ☰ de administrador REEMPLAZA al menú normal (solo en
         sesión admin): los botones del panel de NEXO en su orden +
         Chat (con traspaso de sesión) + Cerrar sesión. Sin meter
         «Ajustes de cuenta» en el ☰, como manda la regla de NEXO. */
      if(menu){
        var before = menu.querySelector('#menu-logout, #logout');
        Array.prototype.slice.call(menu.children).forEach(function(el){ if(el !== before) el.remove(); });
        var items = [['Resumen', 'resumen'], ['Revendedores', 'revendedores'], ['Compradores', 'compradores'],
                     ['Inventario revendedores', 'inventario'], ['Ventas revendedores', 'ventas'],
                     ['Historial revendedores', 'historial'], ['Pedidos de hoy', 'pedidos']];
        items.forEach(function(it){
          var a = document.createElement('a');
          a.href = 'admin.html?tab=' + it[1]; a.textContent = it[0]; a.className = 'nx-menu-admin';
          if(before) menu.insertBefore(a, before); else menu.appendChild(a);
        });
        var aC = document.createElement('a');
        aC.href = CHAT_ADMIN_URL + '#t=' + encodeURIComponent(s.access_token); aC.target = '_blank'; aC.rel = 'noopener';
        aC.textContent = 'Chat'; aC.className = 'nx-menu-admin';
        if(before) menu.insertBefore(aC, before); else menu.appendChild(aC);
        if(before) before.style.display = '';
      }

      /* Sin pantalla pasajera de bienvenida: la página de inicio del
         administrador es el propio panel (admin.html), que abre en su
         vista «Bienvenido, señor.» con este mismo menú ya cambiado. */
    })
    .catch(function(){ /* sin red o sin perfil: no se activa nada de admin */ });
})();
