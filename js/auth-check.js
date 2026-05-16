function logoutLimpio() {
  localStorage.removeItem('pz_usuario');
  localStorage.removeItem('pz_b2c_session');
  localStorage.removeItem('pz_admin_intentos');
  sessionStorage.clear();
  // Mantener piezauto_carrito_b2c (carrito persistente intencional)
  const carrito = localStorage.getItem('piezauto_carrito_b2c');
  if (carrito) {
    setTimeout(() => localStorage.setItem('piezauto_carrito_b2c', carrito), 0);
  }
  window.location.href = '/login.html';
}

function validarConsistenciaSesion() {
  const usuarioRaw = localStorage.getItem('pz_usuario');
  const sessionRaw = localStorage.getItem('pz_b2c_session');
  if (!usuarioRaw || !sessionRaw) return true;
  try {
    const usuario = JSON.parse(usuarioRaw);
    const session = JSON.parse(sessionRaw);
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    if (payload.email && usuario.email && payload.email !== usuario.email) {
      console.warn('[auth] Sesión inconsistente, forzando logout');
      logoutLimpio();
      return false;
    }
  } catch(e) {
    console.warn('[auth] Error validando sesión, limpiando:', e);
    logoutLimpio();
    return false;
  }
  return true;
}

window.logoutLimpio = logoutLimpio;
window.validarConsistenciaSesion = validarConsistenciaSesion;

(function autoLimpiezaLegacy() {
  try {
    const usuarioRaw = localStorage.getItem('pz_usuario');
    if (usuarioRaw) {
      const usuario = JSON.parse(usuarioRaw);
      if (usuario && (usuario.password_hash || usuario.password)) {
        console.warn('[auth] Detectada sesión legacy con campo password, limpiando');
        delete usuario.password_hash;
        delete usuario.password;
        localStorage.setItem('pz_usuario', JSON.stringify(usuario));
      }
    }
  } catch(e) {
    console.warn('[auth] Error en auto-limpieza legacy:', e);
  }
})();
