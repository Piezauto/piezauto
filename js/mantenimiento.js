;(function () {
  'use strict';

  // No aplicar en admin, point ni en la misma página de mantenimiento
  const ruta = window.location.pathname.toLowerCase();
  if (ruta.includes('/admin') || ruta.includes('/point') || ruta.includes('mantenimiento')) return;

  async function verificarMantenimiento() {
    try {
      if (!window.db) return;
      const { data } = await window.db
        .from('configuracion')
        .select('clave, valor')
        .eq('clave', 'modo_mantenimiento')
        .single();

      if (data?.valor === 'true') {
        window.location.replace('/mantenimiento');
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarMantenimiento);
  } else {
    verificarMantenimiento();
  }
})();
