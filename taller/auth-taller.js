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

// Inyecta el header del taller (nombre + badge notificaciones + logout)
async function initTallerHeader() {
  const meta = _tallerMeta;
  if (!meta) return;
  const wrap = document.getElementById('taller-header');
  if (!wrap) return;

  // Contar notificaciones no leídas
  const { data: notifs } = await dbB2C
    .from('cat_notificaciones_talleres')
    .select('id', { count: 'exact' })
    .eq('taller_id', meta.taller_id)
    .eq('leida', false);
  const unread = notifs?.length || 0;

  wrap.innerHTML = `
    <div style="background:var(--negro);color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div style="display:flex;align-items:center;gap:14px">
        <span style="font-weight:800;font-size:15px">🔧 ${escTH(meta.taller_nombre || 'Taller')}</span>
        <nav style="display:flex;gap:4px">
          <a href="/taller/dashboard.html" style="color:#ddd;text-decoration:none;font-size:13px;padding:6px 12px;border-radius:6px;transition:background .2s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'">Dashboard</a>
          <a href="/taller/operaciones.html" style="color:#ddd;text-decoration:none;font-size:13px;padding:6px 12px;border-radius:6px;position:relative;transition:background .2s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'">
            Operaciones
            ${unread > 0 ? `<span style="position:absolute;top:2px;right:2px;background:var(--rojo);color:#fff;font-size:10px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center">${unread}</span>` : ''}
          </a>
        </nav>
      </div>
      <button onclick="tallerLogout()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;transition:background .2s" onmouseover="this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">Salir</button>
    </div>`;
}

function escTH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
