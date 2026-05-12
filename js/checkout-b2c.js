// Checkout B2C — Fase 3 Piezauto
// Depende de: js/auth-b2c.js (dbB2C, getClienteActual), js/carrito.js (cargarCarritoLocal, calcularTotales)

const PAGO_INFO = {
  manual:       '📋 <strong>Transferencia bancaria:</strong> te enviamos el CBU/alias por WhatsApp al confirmar. El pedido se activa una vez que confirmamos el pago.',
  efectivo:     '💵 <strong>Efectivo:</strong> abonás al retirar la pieza en el local. Dirección: te la enviamos al confirmar.',
  mercadopago:  '⏳ <strong>MercadoPago:</strong> la integración estará disponible en los próximos días. Por ahora usá transferencia o efectivo.',
  debito:       '⏳ <strong>Débito/Crédito:</strong> próximamente. Por ahora usá transferencia o efectivo.',
};

let _cliente      = null;
let _talleres     = [];
let _tallerSel    = null; // { id, nombre, direccion, localidad, whatsapp }
let _metodoPago   = 'manual';
let _operacionId  = null;

// ── Init ────────────────────────────────────────────────────────────

async function initCheckout() {
  // Guard: sesión requerida
  let session = null;
  try {
    const { data } = await dbB2C.auth.getSession();
    session = data?.session;
  } catch {}
  if (!session) {
    window.location.href = '/login?redirect=/checkout-b2c';
    return;
  }

  // Guard: carrito no vacío
  const items = cargarCarritoLocal();
  if (!items.length) {
    window.location.href = '/buscar';
    return;
  }

  _cliente = await getClienteActual();

  await Promise.all([
    cargarDatosCliente(),
    cargarTalleres(),
  ]);

  renderResumen();
  document.getElementById('loading-wrap').style.display   = 'none';
  document.getElementById('checkout-contenido').style.display = 'grid';
}

// ── Datos del cliente ────────────────────────────────────────────────

async function cargarDatosCliente() {
  if (!_cliente) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('f-nombre',   _cliente.nombre);
  set('f-apellido', _cliente.apellido);
  set('f-telefono', _cliente.telefono);
  set('f-email',    _cliente.email);
}

// ── Talleres ─────────────────────────────────────────────────────────

async function cargarTalleres() {
  const { data, error } = await dbB2C
    .from('cat_recomendaciones_talleres')
    .select('id, nombre, razon_social, direccion, localidad, whatsapp, lat, lng')
    .eq('activo', true)
    .limit(6);

  if (error || !data?.length) {
    renderTallerList([]);
    return;
  }

  let lista = data;
  if (_cliente?.lat && _cliente?.lng) {
    lista = data
      .map(t => ({ ...t, _dist: haversine(_cliente.lat, _cliente.lng, t.lat, t.lng) }))
      .sort((a, b) => a._dist - b._dist);
  }

  _talleres = lista;
  renderTallerList(lista);
}

function haversine(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return 9999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function renderTallerList(talleres) {
  const wrap = document.getElementById('taller-list');
  let html = '';

  talleres.forEach((t, i) => {
    const dist = t._dist && t._dist < 9999 ? `<span style="font-size:11px;color:#888;margin-left:6px">${t._dist.toFixed(1)} km</span>` : '';
    const wa   = t.whatsapp ? `<a class="taller-wa" href="https://wa.me/54${t.whatsapp.replace(/\D/g,'')}" target="_blank">WhatsApp</a>` : '';
    html += `<div class="taller-card" id="taller-card-${i}" onclick="seleccionarTaller(${i})">
      <input type="radio" name="taller" id="taller-radio-${i}">
      <div class="taller-info">
        <div class="taller-nombre">${escHtml(t.nombre)}${dist}</div>
        <div class="taller-dir">${escHtml(t.direccion || '')}</div>
        <div class="taller-loc">${escHtml(t.localidad || '')}</div>
        ${wa}
      </div>
    </div>`;
  });

  html += `<div class="taller-sin" id="taller-card-sin" onclick="seleccionarTaller(-1)">
    <label><input type="radio" name="taller" id="taller-radio-sin"> Comprar sin taller por ahora</label>
  </div>`;

  wrap.innerHTML = html;
}

function seleccionarTaller(idx) {
  document.querySelectorAll('.taller-card, .taller-sin').forEach(el => el.classList.remove('selected'));
  if (idx === -1) {
    document.getElementById('taller-card-sin').classList.add('selected');
    document.getElementById('taller-radio-sin').checked = true;
    _tallerSel = null;
    return;
  }
  document.getElementById(`taller-card-${idx}`).classList.add('selected');
  document.getElementById(`taller-radio-${idx}`).checked = true;
  const t = _talleres[idx];
  _tallerSel = { id: t.id, nombre: t.nombre, direccion: t.direccion, localidad: t.localidad, whatsapp: t.whatsapp };
}

// ── Pago ──────────────────────────────────────────────────────────────

function seleccionarPago(tipo) {
  document.querySelectorAll('.pago-btn').forEach(el => el.classList.remove('selected'));
  document.getElementById(`pago-${tipo}`).classList.add('selected');
  _metodoPago = tipo;
  document.getElementById('pago-info').innerHTML = PAGO_INFO[tipo] || '';
}

// ── Resumen ───────────────────────────────────────────────────────────

function renderResumen() {
  const { items, subtotal, total } = calcularTotales();
  const wrap = document.getElementById('resumen-items');
  wrap.innerHTML = items.map(i => `
    <div class="resumen-item">
      <div class="resumen-item-desc">
        ${escHtml(i.descripcion || 'Autoparte')}
        <div class="resumen-item-code">${escHtml(i.codigo_piezauto || '')}</div>
      </div>
      <div class="resumen-item-qty">x${i.cantidad}</div>
      <div class="resumen-item-precio">$${((i.precio || 0) * i.cantidad).toLocaleString('es-AR')}</div>
    </div>`).join('');
  document.getElementById('res-subtotal').textContent = '$' + subtotal.toLocaleString('es-AR');
  document.getElementById('res-total').textContent    = '$' + total.toLocaleString('es-AR');
}

// ── Confirmar pedido ─────────────────────────────────────────────────

async function confirmarPedido() {
  const btn = document.getElementById('btn-confirmar');
  const msg = document.getElementById('checkout-msg');

  const nombre    = document.getElementById('f-nombre').value.trim();
  const apellido  = document.getElementById('f-apellido').value.trim();
  const telefono  = document.getElementById('f-telefono').value.trim();
  const direccion = document.getElementById('f-direccion').value.trim();

  if (!nombre || !apellido) { mostrarMsg('Completá tu nombre y apellido.', 'error'); return; }
  if (!telefono)            { mostrarMsg('Completá tu teléfono de contacto.', 'error'); return; }
  if (!direccion)           { mostrarMsg('Completá la dirección de entrega.', 'error'); return; }

  if (_metodoPago === 'mercadopago' || _metodoPago === 'debito') {
    mostrarMsg('Ese medio de pago estará disponible próximamente. Elegí transferencia o efectivo.', 'error');
    return;
  }

  btn.disabled = true;
  mostrarMsg('Confirmando pedido...', 'info');

  // Actualizar datos del cliente si cambió el teléfono
  if (_cliente && telefono !== _cliente.telefono) {
    await dbB2C.from('cat_clientes_finales').update({ telefono }).eq('id', _cliente.id);
  }

  const { subtotal, total } = calcularTotales();
  const notasCliente = document.getElementById('f-notas').value.trim() || null;

  // notas JSON (solo para notas del cliente — taller_id y metodo_pago van en columnas propias)
  const notas = JSON.stringify({
    metodo_pago:   _metodoPago,
    taller:        _tallerSel || null,
    notas_cliente: notasCliente,
  });

  const updatePayload = {
    subtotal, total, descuento: 0,
    direccion_entrega: direccion,
    metodo_pago: _metodoPago,
    taller_id:   _tallerSel?.id || null,
    pendiente_aprobacion_taller: !!_tallerSel,
    notas,
    updated_at: new Date().toISOString(),
  };

  // Buscar operación pendiente existente (creada por carrito.js)
  const { data: borradores } = await dbB2C
    .from('cat_operaciones_b2c')
    .select('id')
    .eq('cliente_id', _cliente.id)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1);

  let operacionId = borradores?.[0]?.id;

  if (operacionId) {
    await dbB2C.from('cat_operaciones_b2c').update(updatePayload).eq('id', operacionId);
  } else {
    // Crear operación si no existe (ej: carrito nunca sincronizó)
    const items = cargarCarritoLocal();
    const { data: nueva } = await dbB2C
      .from('cat_operaciones_b2c')
      .insert({ cliente_id: _cliente.id, estado: 'pendiente', ...updatePayload })
      .select('id')
      .single();

    if (!nueva) {
      mostrarMsg('Error al crear el pedido. Intentá de nuevo.', 'error');
      btn.disabled = false;
      return;
    }

    operacionId = nueva.id;
    const lineas = items.map(i => ({
      operacion_id: operacionId,
      sku_id: i.id,
      cantidad: i.cantidad,
      precio_unitario: i.precio || 0,
      subtotal: (i.precio || 0) * i.cantidad,
    }));
    if (lineas.length) await dbB2C.from('cat_operaciones_b2c_items').insert(lineas);
  }

  _operacionId = operacionId;

  // Notificar al taller si fue seleccionado
  if (_tallerSel?.id) {
    await dbB2C.from('cat_notificaciones_talleres').insert({
      taller_id:    _tallerSel.id,
      operacion_id: operacionId,
      tipo:         'nueva_operacion',
      mensaje:      `Nueva operación asignada — $${total.toLocaleString('es-AR')} · ${direccion}`,
      leida:        false,
    });
  }

  // Limpiar carrito local
  localStorage.removeItem('piezauto_carrito_b2c');
  if (typeof actualizarBadgeCarrito === 'function') actualizarBadgeCarrito();

  // Redirect a página de gracias
  window.location.href = `/gracias?op=${operacionId}`;
}

// ── Utils ─────────────────────────────────────────────────────────────

function mostrarMsg(txt, tipo) {
  const el = document.getElementById('checkout-msg');
  el.style.color = tipo === 'error' ? '#c00' : '#888';
  el.textContent = txt;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initHeaderB2C === 'function') initHeaderB2C();
  initCheckout();
});
