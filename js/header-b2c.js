// Header dinámico B2C — inyecta nav en páginas nuevas Fase 2
// Uso: incluir DESPUÉS de auth-b2c.js. Llama a initHeaderB2C() al final del script.

async function initHeaderB2C() {
  const cliente = await getClienteActual();
  const carritoData = cargarCarritoLocal();
  const cant = carritoData.reduce((s, i) => s + i.cantidad, 0);

  const header = document.getElementById('header-b2c');
  if (!header) return;

  header.innerHTML = `
    <div class="hb2c-inner">
      <a href="/buscar.html" class="hb2c-logo">
        <span class="hb2c-logo-pz">Pieza</span><span class="hb2c-logo-auto">auto</span>
      </a>
      <div class="hb2c-search">
        <input type="text" id="hb2c-q" placeholder="Buscar pieza, código OEM…" autocomplete="off">
        <button onclick="hb2cBuscar()" aria-label="Buscar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
      </div>
      <div class="hb2c-actions">
        <a href="/carrito.html" class="hb2c-carrito" aria-label="Carrito">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          ${cant > 0 ? `<span class="hb2c-badge">${cant > 99 ? '99+' : cant}</span>` : ''}
        </a>
        ${cliente
          ? `<a href="/perfil.html" class="hb2c-user">
               <span class="hb2c-avatar">${(cliente.nombre||'U')[0].toUpperCase()}</span>
               <span class="hb2c-nombre">${cliente.nombre}</span>
             </a>`
          : `<a href="/login.html" class="hb2c-btn-login">Ingresar</a>`
        }
      </div>
    </div>
  `;

  const input = document.getElementById('hb2c-q');
  if (input) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) input.value = q;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') hb2cBuscar(); });
  }
}

function hb2cBuscar() {
  const q = (document.getElementById('hb2c-q')?.value || '').trim();
  if (!q) return;
  window.location.href = `/buscar.html?q=${encodeURIComponent(q)}`;
}

function cargarCarritoLocal() {
  try { return JSON.parse(localStorage.getItem('piezauto_carrito_b2c') || '[]'); }
  catch { return []; }
}

function actualizarBadgeCarrito() {
  const cant = cargarCarritoLocal().reduce((s, i) => s + i.cantidad, 0);
  const badge = document.querySelector('.hb2c-badge');
  const carrito = document.querySelector('.hb2c-carrito');
  if (!carrito) return;
  if (cant > 0) {
    if (badge) { badge.textContent = cant > 99 ? '99+' : cant; }
    else { carrito.insertAdjacentHTML('beforeend', `<span class="hb2c-badge">${cant > 99 ? '99+' : cant}</span>`); }
  } else {
    badge?.remove();
  }
}
