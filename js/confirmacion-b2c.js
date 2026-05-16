// Confirmación B2C — Fase 3 Piezauto
// Depende de: js/auth-b2c.js (dbB2C)

const PAGO_INSTRUCCIONES = {
  manual:      '🏦 <strong>Transferencia bancaria:</strong> en breve te enviamos el CBU/alias por WhatsApp. El pedido queda activo una vez que confirmamos el pago.',
  efectivo:    '💵 <strong>Pago en efectivo:</strong> abonás al retirar la pieza. Te contactamos para coordinar fecha y lugar.',
  mercadopago: '📱 <strong>MercadoPago:</strong> te enviamos el link de pago por WhatsApp.',
  debito:      '💳 <strong>Tarjeta:</strong> te contactamos para coordinar el pago.',
};

async function initConfirmacion() {
  const params = new URLSearchParams(window.location.search);
  const opId   = params.get('op');

  if (!opId) {
    mostrarError('No se encontró el pedido.');
    return;
  }

  // Guard: sesión requerida
  let session = null;
  try {
    const { data } = await dbB2C.auth.getSession();
    session = data?.session;
  } catch {}
  if (!session) {
    window.location.href = `/login?redirect=/gracias?op=${opId}`;
    return;
  }

  // Cargar operación
  const { data: op, error } = await dbB2C
    .from('cat_operaciones_b2c')
    .select('id, estado, subtotal, total, descuento, notas, direccion_entrega, created_at, cliente_id')
    .eq('id', opId)
    .single();

  if (error || !op) {
    mostrarError('No pudimos encontrar tu pedido. Revisá tu perfil.');
    return;
  }

  // Cargar items con JOIN a cat_skus
  const { data: lineas } = await dbB2C
    .from('cat_operaciones_b2c_items')
    .select('cantidad, precio_unitario, subtotal, cat_skus!sku_id(codigo_piezauto, descripcion, descripcion_corta)')
    .eq('operacion_id', opId);

  renderConfirmacion(op, lineas || []);
  mostrarCashbackSiExiste(op);
}

function renderConfirmacion(op, lineas) {
  // Número legible
  document.getElementById('num-operacion').textContent = 'Pedido #' + op.id.slice(0,8).toUpperCase();

  // Items
  const itemsWrap = document.getElementById('items-lista');
  itemsWrap.innerHTML = lineas.map(l => {
    const sku  = l.cat_skus || {};
    const desc = sku.descripcion_corta || sku.descripcion || 'Autoparte';
    const code = sku.codigo_piezauto ? `<span style="font-size:11px;color:#aaa"> · ${escHtml(sku.codigo_piezauto)}</span>` : '';
    return `<div class="item-row">
      <div class="item-desc">${escHtml(desc)}${code}</div>
      <span class="item-qty">x${l.cantidad}</span>
      <span class="item-price">$${Number(l.subtotal || 0).toLocaleString('es-AR')}</span>
    </div>`;
  }).join('') || '<div style="color:#888;font-size:13px;padding:8px 0">Sin piezas cargadas.</div>';

  document.getElementById('total-op').textContent = '$' + Number(op.total || 0).toLocaleString('es-AR');

  // Info del pedido
  const notas = parseNotas(op.notas);
  const estadoLabel = { pendiente: 'Pendiente de confirmación', pagado: 'Pago confirmado', enviado: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };
  const filas = [
    ['Estado',        estadoLabel[op.estado] || op.estado],
    ['Dirección',     op.direccion_entrega || '—'],
    ['Fecha',         new Date(op.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' })],
    ['Medio de pago', notas.metodo_pago ? notas.metodo_pago.charAt(0).toUpperCase() + notas.metodo_pago.slice(1) : '—'],
  ];

  document.getElementById('info-pedido').innerHTML = filas.map(([label, val]) =>
    `<div class="info-row"><span class="info-label">${label}</span><span class="info-val">${escHtml(String(val))}</span></div>`
  ).join('');

  // Taller
  if (notas.taller?.nombre) {
    const t = notas.taller;
    document.getElementById('taller-nombre-notice').textContent = t.nombre;
    const partes = [t.direccion, t.localidad].filter(Boolean).join(', ');
    document.getElementById('taller-texto-notice').innerHTML =
      `${escHtml(partes)}${t.whatsapp ? ` · <a href="https://wa.me/54${t.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:#1a7a3f;font-weight:700">Escribirle por WhatsApp</a>` : ''}<br>
       <span style="font-size:11px;color:#555;margin-top:4px;display:block">El taller va a contactarte para coordinar el turno de instalación.</span>`;
    document.getElementById('taller-section').style.display = 'block';
  }

  // Instrucciones de pago
  const metodo = notas.metodo_pago || 'manual';
  document.getElementById('pago-notice').innerHTML = PAGO_INSTRUCCIONES[metodo] || PAGO_INSTRUCCIONES.manual;

  // Mostrar
  document.getElementById('loading-wrap').style.display    = 'none';
  document.getElementById('gracias-contenido').style.display = 'block';
}

async function mostrarCashbackSiExiste(op) {
  if (!op?.cliente_id) return;
  const cashback = Math.round(Number(op.total || 0) * 0.01 * 100) / 100;
  if (cashback < 0.01) return;
  const section = document.getElementById('cashback-section');
  const monto   = document.getElementById('cashback-monto');
  const btnWallet = document.getElementById('btn-wallet-gracias');
  if (!section) return;
  section.style.display = 'block';
  if (monto) monto.textContent = '$' + cashback.toLocaleString('es-AR', { minimumFractionDigits: 2 });
  if (btnWallet) btnWallet.style.display = 'block';
}

function parseNotas(notas) {
  if (!notas) return {};
  try { return JSON.parse(notas); } catch { return {}; }
}

function mostrarError(msg) {
  document.getElementById('loading-wrap').innerHTML = `
    <div style="text-align:center;padding:60px 16px;color:#888">
      <div style="font-size:40px;margin-bottom:12px">😕</div>
      <div style="font-size:16px;font-weight:700;color:#333;margin-bottom:8px">${escHtml(msg)}</div>
      <a href="buscar.html" style="color:var(--rojo);font-weight:600;text-decoration:none">Ir al catálogo</a>
    </div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initHeaderB2C === 'function') initHeaderB2C();
  initConfirmacion();
});
