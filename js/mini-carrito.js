// Mini carrito dropdown + animación fly al carrito
(function() {
  function initMiniCarrito() {
    const carritoEl = document.querySelector('.header-carrito');
    if (!carritoEl || carritoEl.parentElement?.classList.contains('carrito-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'carrito-wrapper';
    wrapper.style.cssText = 'position:relative;flex-shrink:0';
    carritoEl.parentNode.insertBefore(wrapper, carritoEl);
    wrapper.appendChild(carritoEl);

    const dropdown = document.createElement('div');
    dropdown.className = 'mini-carrito';
    dropdown.id = 'mini-carrito-dropdown';
    wrapper.appendChild(dropdown);

    // Hover abre el dropdown
    wrapper.addEventListener('mouseenter', () => {
      actualizarMiniCarrito();
      dropdown.style.display = 'block';
    });
    wrapper.addEventListener('mouseleave', () => {
      setTimeout(() => { if (!wrapper.matches(':hover')) dropdown.style.display = 'none'; }, 120);
    });

    // Click fuera cierra
    document.addEventListener('click', e => {
      if (!wrapper.contains(e.target)) dropdown.style.display = 'none';
    });

    // Sobreescribir onclick del carritoEl para no navegar si el dropdown está abierto
    carritoEl.addEventListener('click', e => {
      if (dropdown.style.display === 'block') {
        e.stopPropagation();
      } else {
        window.location.href = 'checkout.html';
      }
    });
  }

  function actualizarMiniCarrito() {
    const dropdown = document.getElementById('mini-carrito-dropdown');
    if (!dropdown) return;
    const carrito = JSON.parse(localStorage.getItem('piezauto_carrito_b2c') || '[]');

    if (!carrito.length) {
      dropdown.innerHTML = `
        <div class="mini-carrito-header">Tu carrito está vacío</div>
        <div class="mini-carrito-vacio">
          <div style="font-size:36px;margin-bottom:8px">🛒</div>
          <p style="font-size:13px;color:#888;margin-bottom:14px">No agregaste productos todavía.</p>
          <a href="catalogo.html" class="btn btn-rojo" style="font-size:12px;padding:8px 18px;display:inline-block">Ver productos</a>
        </div>`;
      return;
    }

    const precio = i => i.precio_lista ?? i.precio ?? 0;
    const total = carrito.reduce((s, i) => s + precio(i) * i.cantidad, 0);
    const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);

    dropdown.innerHTML = `
      <div class="mini-carrito-header">${totalItems} artículo${totalItems !== 1 ? 's' : ''} en el carrito</div>
      <div class="mini-carrito-items">
        ${carrito.map(i => `
          <div class="mini-carrito-item">
            <div class="mini-carrito-img">
              <div style="width:44px;height:44px;background:#f0f0f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔩</div>
            </div>
            <div class="mini-carrito-nombre">${i.descripcion || i.nombre || ''}</div>
            <div style="text-align:right;flex-shrink:0">
              <div class="mini-carrito-precio">$${Number((i.precio_lista ?? i.precio ?? 0) * i.cantidad).toLocaleString('es-AR')}</div>
              <div class="mini-carrito-qty">x${i.cantidad}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="mini-carrito-footer">
        <div>
          <div style="font-size:11px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Total</div>
          <div class="mini-carrito-total">$${Number(total).toLocaleString('es-AR')}</div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="checkout.html" style="font-size:12px;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-weight:700;color:#333;text-decoration:none;white-space:nowrap">Ver carrito</a>
          <a href="checkout.html" class="btn btn-rojo" style="font-size:12px;padding:8px 12px;white-space:nowrap">Finalizar compra →</a>
        </div>
      </div>`;
  }

  function flyAlCarrito(originEl) {
    const carritoEl = document.querySelector('.header-carrito');
    if (!carritoEl || !originEl) return;
    const origRect = originEl.getBoundingClientRect();
    const destRect = carritoEl.getBoundingClientRect();

    const fly = document.createElement('div');
    fly.className = 'fly-item';
    fly.textContent = '🛒';
    fly.style.top  = origRect.top  + window.scrollY + 'px';
    fly.style.left = origRect.left + window.scrollX + 'px';
    document.body.appendChild(fly);

    // Calcular desplazamiento hacia el carrito
    const dx = destRect.left - origRect.left;
    const dy = destRect.top  - origRect.top;
    fly.style.setProperty('--dx', dx + 'px');
    fly.style.setProperty('--dy', dy + 'px');
    fly.style.animation = 'fly-to-cart 0.55s cubic-bezier(.4,0,.2,1) forwards';

    fly.addEventListener('animationend', () => {
      fly.remove();
      // Bump contador
      const count = document.getElementById('carrito-count');
      if (count) {
        count.style.transform = 'scale(1.4)';
        setTimeout(() => { count.style.transform = ''; }, 250);
      }
    });
  }

  window.flyAlCarrito = flyAlCarrito;
  window.actualizarMiniCarrito = actualizarMiniCarrito;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMiniCarrito);
  } else {
    initMiniCarrito();
  }
})();
