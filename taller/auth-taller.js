// auth-taller.js — Middleware de autenticación para panel de talleres
// Incluir en TODAS las páginas /taller/* (excepto login.html)
// Depende de: js/auth-b2c.js (dbB2C ya inicializado globalmente)

let _tallerSession = null;
let _tallerMeta    = null; // { role, taller_id, taller_nombre }

async function requireTallerAuth() {
  let session = null;
  try {
    const { data } = await dbB2C.auth.getSession();
    session = data?.session;
  } catch {}

  if (!session) {
    window.location.href = '/taller/login';
    return null;
  }

  const meta = session.user?.user_metadata || {};
  if (meta.role !== 'taller' || !meta.taller_id) {
    await dbB2C.auth.signOut();
    window.location.href = '/taller/login?error=no_autorizado';
    return null;
  }

  _tallerSession = session;
  _tallerMeta    = meta;
  return { session, meta };
}

function getTallerMeta() { return _tallerMeta; }

async function tallerLogout() {
  await dbB2C.auth.signOut();
  window.location.href = '/taller/login';
}

// ─────────────────────────────────────────────────────────────
// Header completo con los 8 módulos + notificaciones
// ─────────────────────────────────────────────────────────────
async function initTallerHeader() {
  const meta = _tallerMeta;
  if (!meta) return;
  const wrap = document.getElementById('taller-header');
  if (!wrap) return;

  // Conteo de notificaciones no leídas
  let unread = 0;
  try {
    const { data: notifs } = await dbB2C
      .from('cat_notificaciones_talleres')
      .select('id', { count: 'exact' })
      .eq('taller_id', meta.taller_id)
      .eq('leida', false);
    unread = notifs?.length || 0;
  } catch {}

  // Página activa
  const path = window.location.pathname;

  const navItems = [
    { href: '/taller/index.html',        label: 'Inicio',       icon: '🏠' },
    { href: '/taller/operaciones.html',  label: 'Operaciones',  icon: '📋', badge: unread },
    { href: '/taller/catalogo.html',     label: 'Catálogo',     icon: '🔍' },
    { href: '/taller/presupuestos.html', label: 'Presupuestos', icon: '📄' },
    { href: '/taller/pedidos.html',      label: 'Pedidos',      icon: '📦' },
    { href: '/taller/clientes.html',     label: 'Clientes',     icon: '👥' },
    { href: '/taller/inventario.html',   label: 'Inventario',   icon: '🏪' },
    { href: '/taller/finanzas.html',     label: 'Finanzas',     icon: '💰' },
    { href: '/taller/perfil.html',       label: 'Perfil',       icon: '⚙️' },
  ];

  const navHTML = navItems.map(item => {
    const isActive = path.includes(item.href.replace('.html',''));
    const badgeHTML = item.badge > 0
      ? '<span style="position:absolute;top:0;right:0;background:var(--rojo);color:#fff;font-size:9px;font-weight:700;min-width:15px;height:15px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:0 2px">' + item.badge + '</span>'
      : '';
    const activeStyle = isActive ? 'rgba(255,255,255,.18)' : 'none';
    const activeColor = isActive ? '#fff' : '#bbb';
    const activeFw    = isActive ? '800' : '600';
    return '<a href="' + item.href + '" style="color:' + activeColor + ';text-decoration:none;font-size:12px;font-weight:' + activeFw + ';padding:6px 10px;border-radius:6px;background:' + activeStyle + ';transition:background .2s;position:relative;white-space:nowrap" onmouseover="this.style.background=\'rgba(255,255,255,.12)\'" onmouseout="this.style.background=\'' + activeStyle + '\'">' + item.icon + ' ' + item.label + badgeHTML + '</a>';
  }).join('');

  wrap.innerHTML =
    '<div style="background:var(--negro);color:#fff;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px;position:sticky;top:0;z-index:200;box-shadow:0 2px 12px rgba(0,0,0,.3)">' +
      '<a href="/taller/index.html" style="font-weight:900;font-size:14px;color:#fff;text-decoration:none;white-space:nowrap;flex-shrink:0">🔧 ' + escTH(meta.taller_nombre || 'Taller') + '</a>' +
      '<nav id="taller-nav" style="display:flex;gap:2px;align-items:center;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:8px 0;flex:1;justify-content:center">' + navHTML + '</nav>' +
      '<button onclick="tallerLogout()" style="background:rgba(255,255,255,.12);color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0" onmouseover="this.style.background=\'rgba(255,255,255,.22)\'" onmouseout="this.style.background=\'rgba(255,255,255,.12)\'">Salir</button>' +
    '</div>';

  // Ocultar scrollbar webkit del nav
  const s = document.createElement('style');
  s.textContent = '#taller-nav::-webkit-scrollbar{display:none}';
  document.head.appendChild(s);
}

function escTH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
