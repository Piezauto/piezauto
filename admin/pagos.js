// ══════════════════════════════════════════════════════
// MÓDULO DE PAGOS A PROVEEDORES
// ══════════════════════════════════════════════════════

let _proveedoresPagos    = [];
let _facturaActualId     = null;
let _filtroEstadoPagos   = '';
let _filtroProveedorPagos = '';

const CONDICION_DIAS = {
  contado: 0, '15': 15, '30': 30, '45': 45, '60': 60, '90': 90,
  cta_cte: 30, consignacion: 0
};

async function cargarPagos() {
  await actualizarVencidas();
  await Promise.all([
    cargarProveedoresSelectPagos(),
    cargarDashboardPagos(),
  ]);
  await cargarTablaFacturas();
}

async function actualizarVencidas() {
  const hoy = new Date().toISOString().split('T')[0];
  await db.from('facturas_proveedor')
    .update({ estado: 'vencida' })
    .lt('fecha_vencimiento', hoy)
    .in('estado', ['pendiente', 'parcial']);
}

async function cargarDashboardPagos() {
  const { data: facturas } = await db.from('facturas_proveedor').select('estado, saldo_pendiente, fecha_vencimiento');
  if (!facturas) return;

  const hoy     = new Date().toISOString().split('T')[0];
  const en7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  let totalPendiente = 0, totalVencido = 0, cantVencidas = 0, cantPorVencer = 0;
  facturas.forEach(f => {
    if (f.estado === 'pagada') return;
    const saldo = parseFloat(f.saldo_pendiente) || 0;
    if (f.estado === 'vencida') { totalVencido += saldo; cantVencidas++; }
    else {
      totalPendiente += saldo;
      if (f.fecha_vencimiento && f.fecha_vencimiento <= en7dias) cantPorVencer++;
    }
  });

  const fmt = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('pag-total-pendiente').textContent = '$ ' + fmt(totalPendiente);
  document.getElementById('pag-total-vencido').textContent   = '$ ' + fmt(totalVencido);
  document.getElementById('pag-cant-vencidas').textContent   = cantVencidas;
  document.getElementById('pag-por-vencer').textContent      = cantPorVencer;

  const alertasEl = document.getElementById('pag-alertas');
  let alertas = '';
  if (cantVencidas > 0)  alertas += `<div class="pag-alerta roja">⚠️ Tenés <strong>${cantVencidas}</strong> factura${cantVencidas > 1 ? 's' : ''} vencida${cantVencidas > 1 ? 's' : ''} por $ ${fmt(totalVencido)}</div>`;
  if (cantPorVencer > 0) alertas += `<div class="pag-alerta amarilla">🔔 <strong>${cantPorVencer}</strong> factura${cantPorVencer > 1 ? 's' : ''} vence${cantPorVencer > 1 ? 'n' : ''} en los próximos 7 días</div>`;
  alertasEl.innerHTML = alertas;
}

async function cargarProveedoresSelectPagos() {
  const { data } = await db.from('proveedores').select('id, nombre, condicion_pago').order('nombre');
  _proveedoresPagos = data || [];
  const sel = document.getElementById('pag-filtro-proveedor');
  const selForm = document.getElementById('fact-proveedor');
  [sel, selForm].forEach(s => {
    if (!s) return;
    const isForm = s.id === 'fact-proveedor';
    s.innerHTML = (isForm ? '<option value="">— Seleccioná proveedor —</option>' : '<option value="">Todos los proveedores</option>')
      + _proveedoresPagos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  });
}

async function cargarTablaFacturas() {
  const tbody = document.getElementById('pag-tabla-body');
  tbody.innerHTML = '<tr><td colspan="8" style="padding:20px;text-align:center;color:#aaa">Cargando...</td></tr>';

  let q = db.from('facturas_proveedor')
    .select('*, proveedores!proveedor_id(nombre)')
    .order('fecha_vencimiento', { ascending: true });

  if (_filtroEstadoPagos)    q = q.eq('estado', _filtroEstadoPagos);
  if (_filtroProveedorPagos) q = q.eq('proveedor_id', _filtroProveedorPagos);

  const { data, error } = await q;
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="8" style="padding:20px;text-align:center;color:#e63946">Error al cargar facturas</td></tr>'; return; }

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:20px;text-align:center;color:#aaa">No hay facturas</td></tr>';
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];
  const fmt = n => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtFecha = f => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR') : '—';

  const estadoBadge = e => {
    const map = { pendiente: '#f59e0b', parcial: '#3b82f6', pagada: '#22c55e', vencida: '#e63946' };
    const label = { pendiente: 'Pendiente', parcial: 'Parcial', pagada: 'Pagada', vencida: 'Vencida' };
    return `<span style="background:${map[e]||'#aaa'};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">${label[e]||e}</span>`;
  };

  tbody.innerHTML = data.map(f => {
    const vencida = f.fecha_vencimiento && f.fecha_vencimiento < hoy && f.estado !== 'pagada';
    const rowStyle = vencida ? 'background:#fff5f5' : '';
    return `<tr style="${rowStyle};cursor:pointer" onclick="abrirModalFactura('${f.id}')">
      <td style="padding:10px 12px;font-weight:700;color:#333">${f.numero_factura}</td>
      <td style="padding:10px 12px;color:#555">${f.tipo || '—'}</td>
      <td style="padding:10px 12px;color:#555">${f.proveedores?.nombre || '—'}</td>
      <td style="padding:10px 12px;color:#555">${fmtFecha(f.fecha_emision)}</td>
      <td style="padding:10px 12px;color:${vencida ? '#e63946' : '#555'};font-weight:${vencida ? '700' : '400'}">${fmtFecha(f.fecha_vencimiento)}</td>
      <td style="padding:10px 12px;text-align:right;color:#333">$ ${fmt(f.monto_total)}</td>
      <td style="padding:10px 12px;text-align:right;font-weight:700;color:${f.saldo_pendiente > 0 ? '#e63946' : '#22c55e'}">$ ${fmt(f.saldo_pendiente)}</td>
      <td style="padding:10px 12px;text-align:center">${estadoBadge(f.estado)}</td>
    </tr>`;
  }).join('');
}

function filtrarFacturas() {
  _filtroEstadoPagos    = document.getElementById('pag-filtro-estado').value;
  _filtroProveedorPagos = document.getElementById('pag-filtro-proveedor').value;
  cargarTablaFacturas();
}

function abrirFormFactura() {
  document.getElementById('pag-form-card').style.display = 'block';
  document.getElementById('fact-proveedor').value    = '';
  document.getElementById('fact-numero').value       = '';
  document.getElementById('fact-tipo').value         = 'A';
  document.getElementById('fact-emision').value      = new Date().toISOString().split('T')[0];
  document.getElementById('fact-vencimiento').value  = '';
  document.getElementById('fact-monto').value        = '';
  document.getElementById('fact-notas').value        = '';
  document.getElementById('fact-proveedor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cerrarFormFactura() {
  document.getElementById('pag-form-card').style.display = 'none';
}

function calcularVencimientoAuto() {
  const provId = document.getElementById('fact-proveedor').value;
  const emision = document.getElementById('fact-emision').value;
  if (!provId || !emision) return;

  const prov = _proveedoresPagos.find(p => p.id === provId);
  if (!prov) return;

  const dias = CONDICION_DIAS[prov.condicion_pago] ?? null;
  if (dias === null || dias === undefined) return;

  const fecha = new Date(emision + 'T00:00:00');
  fecha.setDate(fecha.getDate() + dias);
  document.getElementById('fact-vencimiento').value = fecha.toISOString().split('T')[0];
}

async function guardarFactura() {
  const provId    = document.getElementById('fact-proveedor').value;
  const numero    = document.getElementById('fact-numero').value.trim();
  const tipo      = document.getElementById('fact-tipo').value;
  const emision   = document.getElementById('fact-emision').value;
  const venc      = document.getElementById('fact-vencimiento').value;
  const monto     = parseFloat(document.getElementById('fact-monto').value);
  const notas     = document.getElementById('fact-notas').value.trim();

  if (!provId || !numero || !emision || !monto || monto <= 0) {
    alert('Completá los campos obligatorios: proveedor, número, fecha de emisión y monto.');
    return;
  }

  const btn = document.getElementById('btn-guardar-factura');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const { error } = await db.from('facturas_proveedor').insert({
    proveedor_id:     provId,
    numero_factura:   numero,
    tipo:             tipo || null,
    fecha_emision:    emision,
    fecha_vencimiento: venc || null,
    monto_total:      monto,
    notas:            notas || null,
  });

  btn.disabled = false;
  btn.textContent = 'Guardar factura';

  if (error) { alert('Error al guardar: ' + error.message); return; }

  cerrarFormFactura();
  await cargarDashboardPagos();
  await cargarTablaFacturas();
}

// ── MODAL DETALLE ─────────────────────────────────────

async function abrirModalFactura(facturaId) {
  _facturaActualId = facturaId;
  const modal = document.getElementById('modal-factura');
  modal.style.display = 'flex';

  const { data: f } = await db.from('facturas_proveedor')
    .select('*, proveedores!proveedor_id(nombre, condicion_pago)')
    .eq('id', facturaId)
    .single();

  if (!f) return;

  const fmt = n => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtFecha = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '—';

  document.getElementById('mf-titulo').textContent       = `Factura ${f.tipo || ''} ${f.numero_factura}`;
  document.getElementById('mf-proveedor').textContent    = f.proveedores?.nombre || '—';
  document.getElementById('mf-emision').textContent      = fmtFecha(f.fecha_emision);
  document.getElementById('mf-vencimiento').textContent  = fmtFecha(f.fecha_vencimiento);
  document.getElementById('mf-total').textContent        = '$ ' + fmt(f.monto_total);
  document.getElementById('mf-pagado').textContent       = '$ ' + fmt(f.monto_pagado);
  document.getElementById('mf-saldo').textContent        = '$ ' + fmt(f.saldo_pendiente);
  document.getElementById('mf-estado').textContent       = f.estado;

  const btnMarcar = document.getElementById('btn-marcar-pagada');
  btnMarcar.style.display = f.estado === 'pagada' ? 'none' : 'inline-block';

  document.getElementById('pago-fecha').value  = new Date().toISOString().split('T')[0];
  document.getElementById('pago-monto').value  = f.saldo_pendiente > 0 ? f.saldo_pendiente : '';
  document.getElementById('pago-metodo').value = 'transferencia';
  document.getElementById('pago-cheque').value = '';
  document.getElementById('pago-banco').value  = '';
  document.getElementById('pago-notas').value  = '';
  onMetodoPagoChange();

  await cargarHistorialPagos(facturaId);
}

function cerrarModalFactura() {
  document.getElementById('modal-factura').style.display = 'none';
  _facturaActualId = null;
  cargarDashboardPagos();
  cargarTablaFacturas();
}

async function cargarHistorialPagos(facturaId) {
  const { data } = await db.from('pagos_proveedor')
    .select('*')
    .eq('factura_id', facturaId)
    .order('fecha_pago', { ascending: false });

  const contenedor = document.getElementById('mf-historial');
  if (!data || data.length === 0) {
    contenedor.innerHTML = '<div style="color:#aaa;font-size:13px;padding:12px 0">Sin pagos registrados</div>';
    return;
  }

  const fmt = n => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtFecha = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '—';
  const metodoLabel = { transferencia: 'Transferencia', cheque: 'Cheque', efectivo: 'Efectivo', debito: 'Débito' };

  contenedor.innerHTML = data.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0">
      <div>
        <div style="font-weight:700;color:#333">$ ${fmt(p.monto)}</div>
        <div style="font-size:12px;color:#888">${fmtFecha(p.fecha_pago)} · ${metodoLabel[p.metodo] || p.metodo}${p.numero_cheque ? ' · Cheque ' + p.numero_cheque : ''}${p.banco ? ' · ' + p.banco : ''}</div>
        ${p.notas ? `<div style="font-size:12px;color:#aaa;margin-top:2px">${p.notas}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function onMetodoPagoChange() {
  const metodo = document.getElementById('pago-metodo').value;
  const chequeRow = document.getElementById('pago-cheque-row');
  if (chequeRow) chequeRow.style.display = metodo === 'cheque' ? 'grid' : 'none';
}

async function registrarPago() {
  if (!_facturaActualId) return;
  const fecha  = document.getElementById('pago-fecha').value;
  const monto  = parseFloat(document.getElementById('pago-monto').value);
  const metodo = document.getElementById('pago-metodo').value;
  const cheque = document.getElementById('pago-cheque').value.trim();
  const banco  = document.getElementById('pago-banco').value.trim();
  const notas  = document.getElementById('pago-notas').value.trim();

  if (!fecha || !monto || monto <= 0) {
    alert('Ingresá fecha y monto del pago.');
    return;
  }

  const { data: f } = await db.from('facturas_proveedor')
    .select('proveedor_id, monto_total, monto_pagado')
    .eq('id', _facturaActualId)
    .single();

  if (!f) return;

  const nuevoMontoPagado = (parseFloat(f.monto_pagado) || 0) + monto;
  const nuevoEstado      = nuevoMontoPagado >= f.monto_total ? 'pagada' : 'parcial';

  const btn = document.getElementById('btn-registrar-pago');
  btn.disabled = true;
  btn.textContent = 'Registrando...';

  const { error: errPago } = await db.from('pagos_proveedor').insert({
    factura_id:    _facturaActualId,
    proveedor_id:  f.proveedor_id,
    fecha_pago:    fecha,
    monto:         monto,
    metodo:        metodo || null,
    numero_cheque: cheque || null,
    banco:         banco  || null,
    notas:         notas  || null,
  });

  if (errPago) {
    btn.disabled = false;
    btn.textContent = 'Registrar pago';
    alert('Error al registrar pago: ' + errPago.message);
    return;
  }

  await db.from('facturas_proveedor')
    .update({ monto_pagado: nuevoMontoPagado, estado: nuevoEstado })
    .eq('id', _facturaActualId);

  btn.disabled = false;
  btn.textContent = 'Registrar pago';

  await abrirModalFactura(_facturaActualId);
}

async function marcarPagadaDesdeModal() {
  if (!_facturaActualId) return;
  await db.from('facturas_proveedor')
    .update({ estado: 'pagada' })
    .eq('id', _facturaActualId);
  await abrirModalFactura(_facturaActualId);
}
