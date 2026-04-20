// Piezauto Analytics — GTM-ready event tracking
// No-bloqueante: todas las funciones usan try/catch
// Compatible con Google Tag Manager, GA4, y cualquier sistema que escuche dataLayer
;(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  function push(obj) {
    try {
      window.dataLayer.push(obj);
    } catch (_) {}
  }

  // ── VIEW ITEM — ver ficha de un producto ─────
  window.trackViewItem = function (producto) {
    try {
      push({
        event: 'view_item',
        ecommerce: {
          currency: 'ARS',
          value: Number(producto.precio_oferta || producto.precio || 0),
          items: [{
            item_id:       String(producto.id || ''),
            item_name:     producto.nombre || '',
            item_category: producto.categoria || '',
            price:         Number(producto.precio_oferta || producto.precio || 0),
            quantity:      1,
          }],
        },
      });
    } catch (_) {}
  };

  // ── ADD TO CART — agregar al carrito ─────────
  window.trackAddToCart = function (producto) {
    try {
      push({
        event: 'add_to_cart',
        ecommerce: {
          currency: 'ARS',
          value: Number(producto.precio || 0),
          items: [{
            item_id:   String(producto.id || ''),
            item_name: producto.nombre || '',
            price:     Number(producto.precio || 0),
            quantity:  producto.cantidad || 1,
          }],
        },
      });
    } catch (_) {}
  };

  // ── REMOVE FROM CART ─────────────────────────
  window.trackRemoveFromCart = function (producto) {
    try {
      push({
        event: 'remove_from_cart',
        ecommerce: {
          currency: 'ARS',
          items: [{
            item_id:   String(producto.id || ''),
            item_name: producto.nombre || '',
            price:     Number(producto.precio || 0),
            quantity:  producto.cantidad || 1,
          }],
        },
      });
    } catch (_) {}
  };

  // ── BEGIN CHECKOUT ────────────────────────────
  window.trackBeginCheckout = function (carrito, total) {
    try {
      push({
        event: 'begin_checkout',
        ecommerce: {
          currency: 'ARS',
          value: Number(total || 0),
          items: (carrito || []).map(p => ({
            item_id:   String(p.id || ''),
            item_name: p.nombre || '',
            price:     Number(p.precio || 0),
            quantity:  Number(p.cantidad || 1),
          })),
        },
      });
    } catch (_) {}
  };

  // ── PURCHASE — compra completada ──────────────
  window.trackPurchase = function (pedidoId, total, carrito) {
    try {
      push({
        event: 'purchase',
        ecommerce: {
          currency:     'ARS',
          transaction_id: String(pedidoId || ''),
          value:          Number(total || 0),
          items: (carrito || []).map(p => ({
            item_id:   String(p.id || ''),
            item_name: p.nombre || '',
            price:     Number(p.precio || 0),
            quantity:  Number(p.cantidad || 1),
          })),
        },
      });
    } catch (_) {}
  };

  // ── SEARCH — búsqueda realizada ───────────────
  window.trackSearch = function (termino) {
    try {
      if (!termino || termino.length < 2) return;
      push({
        event:       'search',
        search_term: String(termino).toLowerCase().trim(),
      });
    } catch (_) {}
  };

  // ── CONTACT / WHATSAPP ────────────────────────
  window.trackContactWA = function (origen) {
    try {
      push({ event: 'contact_wa', origen: origen || 'widget' });
    } catch (_) {}
  };

  // ── TALLER CLICK ──────────────────────────────
  window.trackVerTaller = function (tallerId, tallerNombre) {
    try {
      push({ event: 'view_taller', taller_id: tallerId, taller_nombre: tallerNombre });
    } catch (_) {}
  };

  // ── PAGE VIEW VIRTUAL (SPA-like) ──────────────
  window.trackPageView = function (pagina) {
    try {
      push({ event: 'virtual_page_view', page: pagina });
    } catch (_) {}
  };
})();
