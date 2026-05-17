// Checkout B2C — Piezauto
// Depende de: js/auth-b2c.js (dbB2C, getClienteActual), js/carrito.js (cargarCarritoLocal, calcularTotales)

const PAGO_INFO = {
  manual:      '📋 <strong>Transferencia bancaria:</strong> te enviamos el CBU/alias por WhatsApp al confirmar. El pedido se activa una vez que confirmamos el pago.',
  efectivo:    '💵 <strong>Efectivo:</strong> abonás al retirar la pieza en el local. Dirección: te la enviamos al confirmar.',
  mercadopago: '📱 <strong>MercadoPago:</strong> serás redirigido al checkout seguro de MercadoPago. Podés pagar con tarjeta, débito o dinero en cuenta.',
  debito:      '⏳ <strong>Débito/Crédito directo:</strong> próximamente. Por ahora usá MercadoPago o transferencia.',
};

let _cliente       = null;
let _talleres      = [];
let _tallerSel     = null;
let _metodoPago    = 'mercadopago';
let _operacionId   = null;
let _walletSaldo   = 0;
let _walletUsar    = 0;
let _necesitaTaller = true;

// ── Init ─────────────────────────────────────────────────────────────

async function initCheckout() {
  let session = null;
  try {
    const { data } = await dbB2C.auth.getSession();
    session = data?.session;
  } catch {}
  if (!session) {
    window.location.href = '/login?redirect=/checkout-b2c';
    return;
  }

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
  seleccionarPago('mercadopago');

  document.getElementById('loading-wrap').style.display   = 'none';
  document.getElementById('checkout-contenido').style.display = 'grid';
}

// ── Datos del cliente ────────────────────────────────────────────────

async function cargarDatosCliente() {
  if (!_cliente) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('f-nombre',    _cliente.nombre);
  set('f-apellido',  _cliente.apellido);
  set('f-telefono',  _cliente.telefono);
  set('f-email',     _cliente.email);
  if (_cliente.localidad) {
    const dir = document.getElementById('f-direccion');
    if (dir && !dir.value) dir.placeholder = `Dirección en ${_cliente.localidad}`;
  }
}

// ── Talleres del Paquete (top 3 por distancia) ──────────────────────

async function cargarTalleres() {
  // Si el cliente tiene lat/lng usamos la función SQL, sino fallback client-side
  let data, error;

  if (_cliente?.lat && _cliente?.lng) {
    const res = await dbB2C.rpc('talleres_cercanos_paquete', {
      p_lat:   _cliente.lat,
      p_lng:   _cliente.lng,
      p_limit: 3,
    });
    data  = res.data;
    error = res.error;
  }

  // Fallback: traer paquete_socio y calcular distancia client-side
  if (error || !data?.length) {
    const res = await dbB2C
      .from('cat_recomendaciones_talleres')
      .select('id, nombre, razon_social, direccion, localidad, whatsapp, telefono, lat, lng, logo_url')
      .eq('activo', true)
      .eq('paquete_socio', true)
      .limit(10);
    data  = res.data || [];
    error = res.error;

    if (_cliente?.lat && _cliente?.lng) {
      data = data
        .map(t => ({ ...t, distancia_km: haversine(_cliente.lat, _cliente.lng, t.lat, t.lng) }))
        .sort((a, b) => a.distancia_km - b.distancia_km)
        .slice(0, 3);
    } else {
      data = data.slice(0, 3);
    }
  }

  _talleres = data || [];
  renderTallerList(_talleres);
}

function haversine(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return 9999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
}

function renderTallerList(talleres) {
  const wrap = document.getElementById('taller-list');
  if (!wrap) return;

  let html = '';
  talleres.forEach((t, i) => {
    const dist = t.distancia_km && t.distancia_km < 9999
      ? `<span style="font-size:11px;color:#888;margin-left:6px;font-weight:600">📍 ${t.distancia_km} km</span>`
      : '';
    const wa = t.whatsapp
      ? `<a class="taller-wa" href="https://wa.me/54${String(t.whatsapp).replace(/\D/g,'')}" target="_blank" onclick="event.stopPropagation()">WhatsApp</a>`
      : '';
    const perfilLink = `<a href="/taller-perfil?taller_id=${t.id}" target="_blank" onclick="event.stopPropagation()" style="font-size:11px;color:#2563eb;font-weight:600;text-decoration:none;margin-left:8px">Ver perfil →</a>`;
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

  if (!talleres.length) {
    html = '<div style="font-size:13px;color:#888;padding:12px 0">No hay talleres del Paquete disponibles en tu zona por ahora.</div>';
  }

  wrap.innerHTML = html;
}

function toggleNecesitaTaller(necesita) {
  _necesitaTaller = necesita;
  const listWrap = document.getElementById('taller-list-wrap');
  const msgWrap  = document.getElementById('taller-aprobacion-msg');
  if (listWrap) listWrap.style.display = necesita ? 'block' : 'none';
  if (!necesita) {
    _tallerSel = null;
    document.querySelectorAll('.taller-card').forEach(el => el.classList.remove('selected'));
    if (msgWrap) msgWrap.style.display = 'none';
  }
}

function seleccionarTaller(idx) {
  document.querySelectorAll('.taller-card').forEach(el => el.classList.remove('selected'));
  document.getElementById(`taller-card-${idx}`)?.classList.add('selected');
  document.getElementById(`taller-radio-${idx}`).checked = true;
  const t = _talleres[idx];
  _tallerSel = { id: t.id, nombre: t.nombre, direccion: t.direccion, localidad: t.localidad, whatsapp: t.whatsapp };

  const msgWrap = document.getElementById('taller-aprobacion-msg');
  if (msgWrap) msgWrap.style.display = 'block';
}

// ── Pago ─────────────────────────────────────────────────────────────

function seleccionarPago(tipo) {
  document.querySelectorAll('.pago-btn').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById(`pago-${tipo}`);
  if (el) el.classList.add('selected');
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
  const txt = document.getElementById('compras-prog-banner-txt');
  if (txt) txt.textContent = `Tenés ${count} descuento${count !== 1 ? 's' : ''} programado${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''}`;
}

// ── Wallet ────────────────────────────────────────────────────────────

async function cargarWalletDisponible() {
  if (!_cliente?.id) return;
  const { data } = await dbB2C
    .from('cat_clientes_finales')
    .select('credito_saldo')
    .eq('id', _cliente.id)
    .maybeSingle();
  _walletSaldo = parseFloat(data?.credito_saldo || 0);
  if (_walletSaldo < 0.01) return;
  const box = document.getElementById('wallet-checkout-box');
  if (box) box.classList.add('visible');
  const txt = document.getElementById('wallet-disp-txt');
  if (txt) txt.textContent = '$' + _walletSaldo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    txt.textContent   = '-$' + val.toLocaleString('es-AR', { minimumFractionDigits: 2 });
    document.getElementById('res-total').textContent = '$' + (total - val).toLocaleString('es-AR', { minimumFractionDigits: 2 });
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
  if (!wrap) return;
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
  if (!_cliente || !_cliente.id) {
    mostrarMsg('Necesitás iniciar sesión para confirmar el pedido.', 'error');
    setTimeout(() => window.location.href = '/login?redirect=/checkout-b2c', 1500);
    return;
  }

  if (_metodoPago === 'debito') {
    mostrarMsg('Ese medio de pago estará disponible próximamente. Elegí MercadoPago o transferencia.', 'error');
    return;
  }

  const nombre       = document.getElementById('f-nombre')?.value?.trim()   || '';
  const apellido     = document.getElementById('f-apellido')?.value?.trim() || '';
  const telefono     = document.getElementById('f-telefono')?.value?.trim() || '';
  const direccion    = document.getElementById('f-direccion')?.value?.trim() || '';
  const notasCliente = document.getElementById('f-notas')?.value?.trim()    || null;

  if (!nombre || !apellido) { mostrarMsg('Completá tu nombre y apellido.', 'error'); return; }
  if (!telefono)            { mostrarMsg('Completá tu teléfono de contacto.', 'error'); return; }
  if (!direccion)           { mostrarMsg('Completá la dirección de entrega.', 'error'); return; }

  const items = cargarCarritoLocal();
  if (!items || !items.length) { mostrarMsg('El carrito está vacío.', 'error'); return; }

  const btn = document.getElementById('btn-confirmar');
  if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }
  mostrarMsg('Procesando pedido...', 'info');

  try {
    // Actualizar teléfono si cambió
    if (telefono !== _cliente.telefono) {
      await dbB2C.from('cat_clientes_finales').update({ telefono }).eq('id', _cliente.id);
    }

    const { subtotal, total } = calcularTotales();
    const walletAplicado = Math.min(_walletUsar, _walletSaldo, total);
    const totalFinal = Math.max(0, total - walletAplicado);

    const esMercadoPago = _metodoPago === 'mercadopago';

    const opPayload = {
      cliente_id:                  _cliente.id,
      taller_id:                   (_necesitaTaller && _tallerSel?.id) ? _tallerSel.id : null,
      metodo_pago:                 _metodoPago,
      canal_pago:                  _metodoPago,
      estado:                      esMercadoPago ? 'pendiente_pago' : 'pendiente',
      subtotal,
      descuento:                   0,
      credito_aplicado:            walletAplicado,
      // Para MP: wallet_usado = 0 hasta que webhook confirme; para manual: debitamos inmediato
      wallet_usado:                esMercadoPago ? 0 : walletAplicado,
      total:                       totalFinal,
      direccion_entrega:           direccion,
      pendiente_aprobacion_taller: !esMercadoPago && !!((_necesitaTaller && _tallerSel)),
      notas: JSON.stringify({
        taller:        (_necesitaTaller && _tallerSel) ? _tallerSel : null,
        notas_cliente: notasCliente,
        metodo_pago:   _metodoPago,
      }),
    };

    // Buscar borrador existente o crear operación nueva
    const { data: borradores } = await dbB2C
      .from('cat_operaciones_b2c')
      .select('id')
      .eq('cliente_id', _cliente.id)
      .in('estado', ['pendiente', 'pendiente_pago'])
      .order('created_at', { ascending: false })
      .limit(1);

    let opId = borradores?.[0]?.id;

    if (opId) {
      await dbB2C.from('cat_operaciones_b2c')
        .update({ ...opPayload, updated_at: new Date().toISOString() })
        .eq('id', opId);
      await dbB2C.from('cat_operaciones_b2c_items').delete().eq('operacion_id', opId);
    } else {
      const { data: op, error: opError } = await dbB2C
        .from('cat_operaciones_b2c')
        .insert(opPayload)
        .select('id')
        .single();
      if (opError || !op) throw new Error(opError?.message || 'Error al crear el pedido.');
      opId = op.id;
    }

    // Insertar items
    const lineas = items.map(i => ({
      operacion_id:    opId,
      sku_id:          i.id,
      cantidad:        i.cantidad,
      precio_unitario: i.precio || 0,
      subtotal:        (i.precio || 0) * i.cantidad,
    }));
    if (lineas.length) await dbB2C.from('cat_operaciones_b2c_items').insert(lineas);

    _operacionId = opId;

    // Para pagos no-MP: debitar wallet inmediatamente si corresponde
    if (!esMercadoPago && walletAplicado > 0) {
      await dbB2C.rpc('wallet_movimiento', {
        p_cliente_id:   _cliente.id,
        p_tipo:         'debito',
        p_monto:        walletAplicado,
        p_concepto:     `Pago operación #${opId.slice(0, 8)} vía ${_metodoPago}`,
        p_operacion_id: opId,
      }).catch(err => console.warn('[wallet] Error debitando:', err));
    }

    // Notificar taller (para pagos no-MP el taller se notifica al confirmar el pedido)
    if (!esMercadoPago && _necesitaTaller && _tallerSel?.id) {
      await dbB2C.from('cat_notificaciones_talleres').insert({
        taller_id:    _tallerSel.id,
        operacion_id: opId,
        tipo:         'nueva_operacion',
        mensaje:      `Nueva operación asignada — $${totalFinal.toLocaleString('es-AR')} · ${direccion}`,
        leida:        false,
      }).catch(() => {});
    }

    // Flujo MercadoPago
    if (esMercadoPago) {
      mostrarMsg('Generando link de pago con MercadoPago...', 'info');
      try {
        // Si hay wallet aplicado, pasamos un único item con el monto neto
        let mpItems;
        if (walletAplicado > 0) {
          mpItems = [{
            descripcion:     'Compra Piezauto (crédito wallet aplicado)',
            cantidad:        1,
            precio_unitario: Math.max(1, Math.round(totalFinal)),
          }];
        } else {
          mpItems = items.map(i => ({
            descripcion:     i.descripcion || 'Autoparte Piezauto',
            cantidad:        i.cantidad    || 1,
            precio_unitario: Math.round(i.precio || 0),
          }));
        }

        const mpData = await mpCrearPreferencia({
          operacionId: opId,
          items: mpItems,
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
        console.error('[MP] Error:', mpErr);
      }
      // MP falló — pedido registrado
      mostrarMsg('MercadoPago no disponible ahora. Tu pedido fue registrado — te contactamos por WhatsApp.', 'info');
      localStorage.removeItem('piezauto_carrito_b2c');
      if (typeof actualizarBadgeCarrito === 'function') actualizarBadgeCarrito();
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido →'; }
      return;
    }

    // Flujo manual (transferencia / efectivo)
    localStorage.removeItem('piezauto_carrito_b2c');
    if (typeof actualizarBadgeCarrito === 'function') actualizarBadgeCarrito();
    window.location.href = `/gracias?op=${opId}`;

  } catch (err) {
    console.error('[checkout] Error:', err);
    mostrarMsg(err.message || 'Error al confirmar el pedido. Intentá de nuevo.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido →'; }
  }
}

// ── Utils ─────────────────────────────────────────────────────────────

function mostrarMsg(txt, tipo) {
  const el = document.getElementById('checkout-msg');
  if (!el) return;
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
