/* Bloqueo con PIN compartido por todas las páginas de Generadores de Código. */
(function () {
  var PINKEY = 'cdg_pin_v1', OKKEY = 'cdg_ok';
  function readPin() { try { return JSON.parse(localStorage.getItem(PINKEY)); } catch (e) { return null; } }
  function isOpen() { try { return sessionStorage.getItem(OKKEY) === '1'; } catch (e) { return false; } }
  window.cdgLock = function () { try { sessionStorage.removeItem(OKKEY); } catch (e) {} location.href = './'; };
  if (isOpen()) return;

  async function hashPin(pin, salt) {
    var s = salt + ':' + pin;
    try {
      var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    } catch (e) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return 'x' + h; }
  }
  var css = document.createElement('style');
  css.textContent = '#cdg-lock{position:fixed;inset:0;z-index:2147483647;background:#0b1220;color:#e5ecf8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;font:16px/1.4 system-ui,Segoe UI,Roboto,sans-serif}' +
    '#cdg-lock h2{margin:0;font-size:26px}#cdg-lock h2 span{color:#f59e0b}' +
    '#cdg-lock p{margin:0;color:#93a4c3;text-align:center;min-height:22px}' +
    '#cdg-lock input{width:min(260px,100%);font:inherit;font-size:30px;letter-spacing:.5em;text-align:center;padding:12px;border:1px solid #24324f;border-radius:12px;background:#111a2e;color:#e5ecf8}' +
    '#cdg-lock button{width:min(260px,100%);font:inherit;font-weight:700;padding:12px;border-radius:10px;border:1px solid #24324f;background:#16213a;color:#e5ecf8;cursor:pointer}' +
    '#cdg-lock button.p{background:#f59e0b;border-color:#f59e0b;color:#1a1204}';
  document.documentElement.appendChild(css);
  var el = document.createElement('div'); el.id = 'cdg-lock';
  document.documentElement.appendChild(el);

  var rec = readPin(), setup = !rec, first = '', armed = false, fails = 0, blockedUntil = 0;
  function draw(msg) {
    el.innerHTML = '<h2>Generadores de <span>Código</span></h2><p id="cdg-msg"></p>' +
      '<input id="cdg-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="PIN">' +
      '<button class="p" id="cdg-ok">' + (setup ? (first ? 'Confirmar PIN' : 'Continuar') : 'Entrar') + '</button>' +
      (setup ? '' : '<button id="cdg-forgot">Olvidé mi PIN</button>');
    document.getElementById('cdg-msg').textContent = msg;
    var inp = document.getElementById('cdg-pin'); inp.focus();
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    document.getElementById('cdg-ok').onclick = submit;
    var f = document.getElementById('cdg-forgot');
    if (f) f.onclick = function () {
      if (!armed) { armed = true; document.getElementById('cdg-msg').textContent = 'Esto borra el PIN, la clave guardada de Datos en Vivo y el historial. Toca de nuevo para confirmar.'; f.textContent = 'Sí, borrar todo'; return; }
      try { ['cdg_pin_v1', 'cdv_sk', 'cdv_log', 'mk-hist', 'mk-fb', 'mk-url'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
      location.reload();
    };
  }
  function note(t) { document.getElementById('cdg-msg').textContent = t; var i = document.getElementById('cdg-pin'); i.value = ''; i.focus(); }
  function open() { try { sessionStorage.setItem(OKKEY, '1'); } catch (e) {} el.remove(); css.remove(); }
  async function submit() {
    var v = document.getElementById('cdg-pin').value.trim();
    if (!/^\d{4,6}$/.test(v)) { note('El PIN debe tener de 4 a 6 números'); return; }
    if (setup) {
      if (!first) { first = v; draw('Repite el PIN para confirmar'); return; }
      if (v !== first) { first = ''; draw('No coinciden. Crea el PIN otra vez'); return; }
      var salt = Math.random().toString(36).slice(2, 12), hash = await hashPin(v, salt);
      try { localStorage.setItem(PINKEY, JSON.stringify({ salt: salt, hash: hash })); } catch (e) {}
      open(); return;
    }
    if (Date.now() < blockedUntil) { note('Espera unos segundos e intenta de nuevo'); return; }
    if (await hashPin(v, rec.salt) === rec.hash) { fails = 0; open(); return; }
    fails++;
    if (fails >= 5) { blockedUntil = Date.now() + 30000; fails = 0; note('Demasiados intentos. Espera 30 segundos'); } else note('PIN incorrecto');
  }
  draw(setup ? 'Crea un PIN de 4 a 6 números' : 'Ingresa tu PIN');
})();
