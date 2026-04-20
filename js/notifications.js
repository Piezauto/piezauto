(function () {
  const style = document.createElement('style');
  style.textContent = `
    .header-bell { position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; cursor: pointer; border-radius: 8px; transition: background 0.15s; text-decoration: none; flex-shrink: 0; }
    .header-bell:hover { background: rgba(255,255,255,0.1); }
    .header-bell svg { width: 22px; height: 22px; stroke: #ccc; fill: none; transition: stroke 0.15s; }
    .header-bell:hover svg { stroke: #fff; }
    .header-bell-badge { position: absolute; top: 4px; right: 4px; background: #E63946; color: #fff; border-radius: 50%; min-width: 16px; height: 16px; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 2px solid #1a1a1a; animation: bell-pop 0.3s ease; }
    @keyframes bell-pop { from { transform: scale(0); } to { transform: scale(1); } }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    const usuario = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
    if (!usuario) return;

    const header = document.querySelector('.header');
    if (!header) return;

    // Determinar path correcto según ubicación del archivo
    const enSubdir = window.location.pathname.includes('/admin') || window.location.pathname.includes('/point');
    const href = enSubdir ? '../usuario.html?tab=notificaciones' : 'usuario.html?tab=notificaciones';

    const bell = document.createElement('a');
    bell.className = 'header-bell';
    bell.href = href;
    bell.title = 'Notificaciones';
    bell.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

    // Insertar antes del botón hamburguesa o al final del header
    const hamburger = header.querySelector('.menu-hamburguesa');
    if (hamburger) {
      header.insertBefore(bell, hamburger);
    } else {
      header.appendChild(bell);
    }

    cargarBadgeNotificaciones(bell, usuario.id);
    setInterval(() => cargarBadgeNotificaciones(bell, usuario.id), 60000);
  });

  async function cargarBadgeNotificaciones(bellEl, usuarioId) {
    if (typeof db === 'undefined') return;

    const { count } = await db
      .from('notificaciones_usuario')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('leido', false);

    const n = count || 0;
    let badge = bellEl.querySelector('.header-bell-badge');

    if (n > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'header-bell-badge';
        bellEl.appendChild(badge);
      }
      badge.textContent = n > 9 ? '9+' : n;
      bellEl.querySelector('svg').style.stroke = '#E63946';
    } else {
      if (badge) badge.remove();
      const svg = bellEl.querySelector('svg');
      if (svg) svg.style.stroke = '';
    }
  }
})();
