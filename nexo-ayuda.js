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
  function convKey(){ return acct ? 'nexo_chat_conv_acc' : 'nexo_chat_conv'; }
  function ensureAcctConv(){
    if(!acct || conv) return Promise.resolve();
    return fetch(CHAT_BASE + '/myconv', { headers: { 'Authorization': 'Bearer ' + acct.token } })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){ if(j && j.conv){ conv = j.conv; lsSet('nexo_chat_conv_acc', conv); seen = 0; } })
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
        if(j && j.ok && j.conv){ conv = j.conv; lsSet(convKey(), conv); seen = 0; return pollNow(); }
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
    nameBox.style.display = needName ? 'flex' : 'none';
    msgsEl.style.display = needName ? 'none' : 'flex';
    formEl.style.display = needName ? 'none' : 'flex';
  }
  function pollNow(){
    if(!conv) return Promise.resolve();
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
      })
      .catch(function(){ /* red caída: el siguiente sondeo reintenta solo */ });
  }
  function startPolling(){
    stopPolling();
    pollNow();
    pollTimer = setInterval(pollNow, 4000);
  }
  function stopPolling(){ if(pollTimer){ clearInterval(pollTimer); pollTimer = null; } }

  function openChat(){
    panel.classList.add('open');
    refreshNameGate();
    if(visitorName){ if(conv) startPolling(); else ensureOpen().then(function(){ if(panel.classList.contains('open')) startPolling(); }); }
    else if(acct){ if(conv) startPolling(); else ensureAcctConv().then(function(){ if(!panel.classList.contains('open')) return; if(conv) startPolling(); else ensureOpen().then(function(){ if(panel.classList.contains('open')) startPolling(); }); }); }
    var f = (visitorName || acct) ? inputEl : panel.querySelector('#nx-name-in');
    if(f) setTimeout(function(){ try{ f.focus(); }catch(e){} }, 60);
  }
  function closeChat(){ panel.classList.remove('open'); stopPolling(); }
  window.nxOpenChat = openChat;
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
    }).then(function(r){ if(!r.ok) throw new Error('send ' + r.status); return r.json(); })
      .then(function(j){
        if(!j || !j.ok) throw new Error('send');
        if(j.conv && j.conv !== conv){ conv = j.conv; lsSet(convKey(), conv); }
        inputEl.value = '';
        setStatus('');
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
