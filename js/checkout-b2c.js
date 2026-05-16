// Checkout B2C — Fase 3 Piezauto
// Depende de: js/auth-b2c.js (dbB2C, getClienteActual), js/carrito.js (cargarCarritoLocal, calcularTotales)

const PAGO_INFO = {
  manual:       '📋 <strong>Transferencia bancaria:</strong> te enviamos el CBU/alias por WhatsApp al confirmar. El pedido se activa una vez que confirmamos el pago.',
  efectivo:     '💵 <strong>Efectivo:</strong> abonás al retirar la pieza en el local. Dirección: te la enviamos al confirmar.',
  mercadopago:  '📱 <strong>MercadoPago:</strong> serás redirigido al checkout de MercadoPago para completar el pago de forma segura.',
  debito:       '⏳ <strong>Débito/Crédito:</strong> próximamente. Por ahora usá transferencia o efectivo.',
};

let _cliente      = null;
let _talleres     = [];
let _tallerSel    = null;
let _metodoPago   = 'manual';
let _operacionId  = null;
let _walletSaldo  = 0;
let _walletUsar   = 0;

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
    cargarWalletDisponible(),
    cargarBannerComprasProgramadas(),
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
    const wa      = t.whatsapp ? `<a class="taller-wa" href="https://wa.me/54${t.whatsapp.replace(/\D/g,'')}" target="_blank">WhatsApp</a>` : '';
    const perfilLink = `<a href="/taller-perfil.html?taller_id=${t.id}" target="_blank" onclick="event.stopPropagation()" style="font-size:11px;color:#2563eb;font-weight:600;text-decoration:none;margin-left:8px">Ver perfil →</a>`;
    html += `<div class="taller-card" id="taller-card-${i}" onclick="seleccionarTaller(${i})">
      <input type="radio" name="taller" id="taller-radio-${i}">
      <div class="taller-info">
        <div class="taller-nombre">${escHtml(t.nombre)}${dist}${perfilLink}</div>
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

// ── Banner compras programadas ────────────────────────────────────────

async function cargarBannerComprasProgramadas() {
  if (!_cliente?.id) return;
  const { data } = await dbB2C
    .from('cat_oportunidades_compra_programada')
    .select('id')
    .eq('cliente_id', _cliente.id)
    .in('estado', ['detectada','notificada','vista_cliente'])
    .gt('fecha_expiracion', new Date().toISOString());
  const count = data?.length || 0;
  if (!count) return;
  const banner = document.getElementById('compras-prog-banner');
  if (!banner) return;
  banner.style.display = 'block';
  document.getElementById('compras-prog-banner-txt').textContent =
    `Tenés ${count} descuento${count !== 1 ? 's' : ''} programado${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''}`;
}

// ── Wallet en checkout ────────────────────────────────────────────────

async function cargarWalletDisponible() {
  if (!_cliente?.id) return;
  const { data } = await dbB2C
    .from('cat_wallet_b2c')
    .select('saldo')
    .eq('cliente_id', _cliente.id)
    .maybeSingle();
  _walletSaldo = parseFloat(data?.saldo || 0);
  if (_walletSaldo < 0.01) return;
  const box = document.getElementById('wallet-checkout-box');
  if (box) box.classList.add('visible');
  const txt = document.getElementById('wallet-disp-txt');
  if (txt) txt.textContent = '$' + _walletSaldo.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

function actualizarWalletDescuento() {
  const input = document.getElementById('wallet-usar-monto');
  const row   = document.getElementById('wallet-descuento-row');
  const txt   = document.getElementById('wallet-descuento-txt');
  const { total } = calcularTotales();

  let val = parseFloat(input.value) || 0;
  val = Math.min(val, _walletSaldo, total);
  val = Math.max(val, 0);
  _walletUsar = val;

  if (val > 0) {
    row.style.display = 'flex';
    txt.textContent = '-$' + val.toLocaleString('es-AR', { minimumFractionDigits: 2 });
    const totalFinal = total - val;
    document.getElementById('res-total').textContent = '$' + totalFinal.toLocaleString('es-AR');
  } else {
    row.style.display = 'none';
    renderResumen();
  }
}

function aplicarMaxWallet() {
  const { total } = calcularTotales();
  const max = Math.min(_walletSaldo, total);
  const input = document.getElementById('wallet-usar-monto');
  if (input) { input.value = max.toFixed(2); actualizarWalletDescuento(); }
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
  // 1. Validar sesión
  if (!_cliente || !_cliente.id) {
    mostrarMsg('Necesitás iniciar sesión para confirmar el pedido.', 'error');
    setTimeout(() => window.location.href = '/login?redirect=/checkout-b2c', 1500);
    return;
  }

  // 2. Método de pago no disponible
  if (_metodoPago === 'debito') {
    mostrarMsg('Ese medio de pago estará disponible próximamente. Elegí transferencia o efectivo.', 'error');
    return;
  }

  // 3. Validar campos obligatorios
  const nombre       = document.getElementById('f-nombre')?.value?.trim()   || '';
  const apellido     = document.getElementById('f-apellido')?.value?.trim() || '';
  const telefono     = document.getElementById('f-telefono')?.value?.trim() || '';
  const direccion    = document.getElementById('f-direccion')?.value?.trim() || '';
  const notasCliente = document.getElementById('f-notas')?.value?.trim()    || null;

  if (!nombre || !apellido) { mostrarMsg('Completá tu nombre y apellido.', 'error'); return; }
  if (!telefono)            { mostrarMsg('Completá tu teléfono de contacto.', 'error'); return; }
  if (!direccion)           { mostrarMsg('Completá la dirección de entrega.', 'error'); return; }

  // 4. Validar carrito
  const items = cargarCarritoLocal();
  if (!items || !items.length) {
    mostrarMsg('El carrito está vacío.', 'error');
    return;
  }

  // 5. Deshabilitar botón
  const btn = document.getElementById('btn-confirmar');
  if (btn) { btn.disabled = true; btn.textContent = 'Confirmando pedido...'; }
  mostrarMsg('Confirmando pedido...', 'info');

  try {
    // 6. Actualizar teléfono si cambió
    if (telefono !== _cliente.telefono) {
      await dbB2C.from('cat_clientes_finales').update({ telefono }).eq('id', _cliente.id);
    }

    // 7. Calcular totales
    const { subtotal, total } = calcularTotales();
    const walletAplicado = Math.min(_walletUsar, _walletSaldo, total);
    const totalFinal = total - walletAplicado;

    const opPayload = {
      cliente_id:                  _cliente.id,
      taller_id:                   _tallerSel?.id || null,
      metodo_pago:                 _metodoPago,
      estado:                      'pendiente',
      subtotal,
      total:                       totalFinal,
      descuento:                   walletAplicado,
      wallet_usado:                walletAplicado,
      direccion_entrega:           direccion,
      pendiente_aprobacion_taller: !!_tallerSel,
      notas: JSON.stringify({
        taller:        _tallerSel    || null,
        notas_cliente: notasCliente,
      }),
    };

    // 8. Buscar borrador existente (creado por carrito.js) o crear operación nueva
    const { data: borradores } = await dbB2C
      .from('cat_operaciones_b2c')
      .select('id')
      .eq('cliente_id', _cliente.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(1);

    let opId = borradores?.[0]?.id;

    if (opId) {
      // Actualizar borrador existente
      await dbB2C.from('cat_operaciones_b2c')
        .update({ ...opPayload, updated_at: new Date().toISOString() })
        .eq('id', opId);
      // Reemplazar items: borrar los anteriores e insertar los del carrito actual
      await dbB2C.from('cat_operaciones_b2c_items').delete().eq('operacion_id', opId);
    } else {
      // Crear operación nueva
      const { data: op, error: opError } = await dbB2C
        .from('cat_operaciones_b2c')
        .insert(opPayload)
        .select('id')
        .single();
      if (opError || !op) throw new Error(opError?.message || 'Error al crear el pedido.');
      opId = op.id;
    }

    // Insertar items (tanto para borrador actualizado como para operación nueva)
    const lineas = items.map(i => ({
      operacion_id:    opId,
      sku_id:          i.id,
      cantidad:        i.cantidad,
      precio_unitario: i.precio || 0,
      subtotal:        (i.precio || 0) * i.cantidad,
    }));
    if (lineas.length) await dbB2C.from('cat_operaciones_b2c_items').insert(lineas);

    _operacionId = opId;

    // 8b. Debitar wallet si corresponde
    if (walletAplicado > 0) {
      await dbB2C.rpc('fn_aplicar_movimiento_wallet', {
        p_cliente_id:   _cliente.id,
        p_tipo:         'debito',
        p_concepto:     'Pago operación #' + opId.slice(0, 8),
        p_monto:        walletAplicado,
        p_operacion_id: opId,
        p_vence_at:     null,
      }).catch(() => {});
    }

    // 9. Notificar al taller
    if (_tallerSel?.id) {
      await dbB2C.from('cat_notificaciones_talleres').insert({
        taller_id:    _tallerSel.id,
        operacion_id: opId,
        tipo:         'nueva_operacion',
        mensaje:      `Nueva operación asignada — $${total.toLocaleString('es-AR')} · ${direccion}`,
        leida:        false,
      }).catch(() => {});
    }

    // 10. Flujo MercadoPago
    if (_metodoPago === 'mercadopago') {
      mostrarMsg('Generando link de pago con MercadoPago...', 'info');
      try {
        const mpData = await mpCrearPreferencia({
          operacionId: opId,
          items: items.map(i => ({
            descripcion:     i.descripcion || 'Autoparte Piezauto',
            cantidad:        i.cantidad    || 1,
            precio_unitario: i.precio      || 0,
          })),
          pagador: {
            nombre:   `${nombre} ${apellido}`.trim(),
            email:    _cliente.email || '',
            telefono,
          },
          backUrls: {
            success: `${window.location.origin}/gracias?op=${opId}&pago=aprobado`,
            failure: `${window.location.origin}/gracias?op=${opId}&pago=fallido`,
            pending: `${window.location.origin}/gracias?op=${opId}&pago=pendiente`,
          },
        });
        if (mpData?.init_point) {
          await mpGuardarPreferencia(dbB2C, opId, mpData.preference_id);
          localStorage.removeItem('piezauto_carrito_b2c');
          if (typeof actualizarBadgeCarrito === 'function') actualizarBadgeCarrito();
          window.location.href = mpData.init_point;
          return;
        }
      } catch (mpErr) {
        console.error('[MP] Error creando preferencia:', mpErr);
      }
      // MP falló — pedido registrado, coordinar manualmente
      mostrarMsg('MercadoPago no disponible ahora. Tu pedido fue registrado — te contactamos por WhatsApp.', 'info');
      localStorage.removeItem('piezauto_carrito_b2c');
      if (typeof actualizarBadgeCarrito === 'function') actualizarBadgeCarrito();
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
      return;
    }

    // 11. Limpiar y redirigir (transferencia / efectivo / manual)
    localStorage.removeItem('piezauto_carrito_b2c');
    if (typeof actualizarBadgeCarrito === 'function') actualizarBadgeCarrito();
    window.location.href = `/gracias?op=${opId}`;

  } catch (err) {
    console.error('[checkout] Error:', err);
    mostrarMsg(err.message || 'Error al confirmar el pedido. Intentá de nuevo.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
  }
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
