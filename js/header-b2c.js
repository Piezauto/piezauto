// Header dinámico B2C — inyecta nav en páginas nuevas Fase 2
// Uso: incluir DESPUÉS de auth-b2c.js. Llama a initHeaderB2C() al final del script
// o se auto-llama en DOMContentLoaded si la página no lo hace explícitamente.

let _hb2cInited = false;

async function initHeaderB2C() {
  if (_hb2cInited) return;
  _hb2cInited = true;

  const cliente = await getClienteActual();
  const carritoData = cargarCarritoLocal();
  const cant = carritoData.reduce((s, i) => s + i.cantidad, 0);

  // Soporta tanto id="header-b2c" como id="header-b2c-root"
  const header = document.getElementById('header-b2c') || document.getElementById('header-b2c-root');
  if (!header) return;

  const path = window.location.pathname;
  const navLinks = [
    { href: '/index',   label: 'Inicio',    active: path === '/' || path.includes('/index') },
    { href: '/buscar',  label: 'Catálogo',  active: path.includes('buscar') },
    { href: '/talleres',label: 'Talleres',  active: path.includes('taller') },
  ];
  const navHTML = navLinks.map(l =>
    `<a href="${l.href}" style="font-size:13px;font-weight:${l.active ? '800' : '600'};color:${l.active ? '#fff' : 'rgba(255,255,255,.7)'};text-decoration:none;padding:4px 2px;white-space:nowrap" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='${l.active ? '#fff' : 'rgba(255,255,255,.7)'}'">${l.label}</a>`
  ).join('');

  header.style.cssText = 'background:#1a1a1a;position:sticky;top:0;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.3)';
  header.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:16px;height:54px">
      <a href="/index" style="font-weight:900;font-size:16px;text-decoration:none;flex-shrink:0;white-space:nowrap">
        <span style="color:#E63946">Pieza</span><span style="color:#fff">auto</span>
      </a>
      <nav style="display:flex;gap:16px;align-items:center;flex-shrink:0">${navHTML}</nav>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;background:rgba(255,255,255,.1);border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.15)">
          <input type="text" id="hb2c-q" placeholder="Buscar pieza, código OEM…" autocomplete="off"
            style="flex:1;background:none;border:none;outline:none;padding:9px 12px;color:#fff;font-size:13px;min-width:0"
            placeholder="Buscar pieza, código OEM…">
          <button onclick="hb2cBuscar()" style="background:none;border:none;cursor:pointer;padding:9px 12px;color:rgba(255,255,255,.7);display:flex;align-items:center" aria-label="Buscar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
        <a href="/carrito" style="position:relative;color:rgba(255,255,255,.8);display:flex;align-items:center;text-decoration:none" aria-label="Carrito">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          ${cant > 0 ? `<span class="hb2c-badge" style="position:absolute;top:-6px;right:-8px;background:#E63946;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px">${cant > 99 ? '99+' : cant}</span>` : ''}
        </a>
        ${cliente
          ? `<div class="hb2c-user-menu" style="position:relative">
               <button onclick="hb2cToggleMenu(event)" style="background:rgba(255,255,255,.12);border:none;border-radius:8px;padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;color:#fff">
                 <span style="background:#E63946;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${(cliente.nombre||'U')[0].toUpperCase()}</span>
                 <span style="font-size:13px;font-weight:600;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(cliente.nombre||'').split(' ')[0]}</span>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
               </button>
               <div id="hb2c-dd" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:#fff;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.14);min-width:180px;z-index:300;overflow:hidden">
                 <a href="/perfil"          style="display:block;padding:11px 16px;font-size:13px;color:#333;text-decoration:none;border-bottom:1px solid #f5f5f5" onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background=''">👤 Mi perfil</a>
                 <a href="/operaciones"     style="display:block;padding:11px 16px;font-size:13px;color:#333;text-decoration:none;border-bottom:1px solid #f5f5f5" onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background=''">📦 Mis operaciones</a>
                 <a href="/mi-wallet"       style="display:block;padding:11px 16px;font-size:13px;color:#333;text-decoration:none;border-bottom:1px solid #f5f5f5" onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background=''">💰 Mi wallet</a>
                 <a href="/mis-presupuestos" style="display:block;padding:11px 16px;font-size:13px;color:#333;text-decoration:none;border-bottom:1px solid #f5f5f5" onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background=''">📄 Mis presupuestos</a>
                 <a href="#" onclick="hb2cLogout(event)" style="display:block;padding:11px 16px;font-size:13px;color:#c00;text-decoration:none" onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background=''">Cerrar sesión</a>
               </div>
             </div>`
          : `<div style="display:flex;gap:8px">
               <a href="/login" style="background:rgba(255,255,255,.12);color:#fff;text-decoration:none;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:600">Ingresar</a>
               <a href="/registro" style="background:#E63946;color:#fff;text-decoration:none;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:700">Registrarse</a>
             </div>`
        }
      </div>
    </div>
  `;

  document.addEventListener('click', e => {
    const dd = document.getElementById('hb2c-dd');
    if (!dd) return;
    if (!dd.parentElement?.contains(e.target)) dd.style.display = 'none';
  });

  const input = document.getElementById('hb2c-q');
  if (input) {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) input.value = q;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') hb2cBuscar(); });
  }
}

function hb2cToggleMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById('hb2c-dd');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

async function hb2cLogout(e) {
  e.preventDefault();
  await dbB2C.auth.signOut();
  if (typeof window.logoutLimpio === 'function') {
    window.logoutLimpio();
  } else {
    window.location.href = '/login';
  }
}

function hb2cBuscar() {
  const q = (document.getElementById('hb2c-q')?.value || '').trim();
  if (!q) return;
  window.location.href = `/buscar?q=${encodeURIComponent(q)}`;
}

function cargarCarritoLocal() {
  try { return JSON.parse(localStorage.getItem('piezauto_carrito_b2c') || '[]'); }
  catch { return []; }
}

function actualizarBadgeCarrito() {
  const cant = cargarCarritoLocal().reduce((s, i) => s + i.cantidad, 0);
  const badge = document.querySelector('.hb2c-badge');
  const carrito = document.querySelector('[href="/carrito"]');
  if (!carrito) return;
  if (cant > 0) {
    if (badge) { badge.textContent = cant > 99 ? '99+' : cant; }
    else { carrito.insertAdjacentHTML('beforeend', `<span class="hb2c-badge" style="position:absolute;top:-6px;right:-8px;background:#E63946;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px">${cant > 99 ? '99+' : cant}</span>`); }
  } else {
    badge?.remove();
  }
}

// Auto-init para páginas que no llaman explícitamente initHeaderB2C()
document.addEventListener('DOMContentLoaded', () => {
  if (!_hb2cInited) initHeaderB2C();
});
