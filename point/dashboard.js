
// ── SESIÓN ────────────────────────────────────
const sesionRaw = sessionStorage.getItem('pz_taller');
if (!sesionRaw) { window.location.href = 'index.html'; }
const sesion = JSON.parse(sesionRaw);
const TALLER_ID = sesion.id;

document.getElementById('sidebar-nombre').textContent = sesion.nombre;
document.getElementById('dash-fecha').textContent =
  new Date().toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

function cerrarSesion() {
  sessionStorage.removeItem('pz_taller');
  window.location.href = 'index.html';
}

// ── NAVEGACIÓN ────────────────────────────────
function verPanel(nombre) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('activo'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('activo'));
  document.getElementById('panel-' + nombre).classList.add('activo');
  const nav = document.getElementById('nav-' + nombre);
  if (nav) nav.classList.add('activo');

  const acciones = {
    'dashboard':          cargarDashboard,
    'calendario':         renderAgendaSemanal,
    'turnos':             cargarTurnos,
    'nuevo-turno':        prepararFormTurno,
    'presupuestos':       cargarPresupuestos,
    'estadisticas':       cargarEstadisticas,
    'servicios':          cargarServicios,
    'perfil':             cargarPerfil,
    'clientes':              cargarClientes,
    'clientes-frecuentes':   cargarClientesFrecuentes,
    'catalogo-piezauto':     cargarCatalogoPiezauto,
    'mensajes':              cargarMensajes,
    'finanzas':              cargarFinanzas,
    'repuestos':             cargarRepuestos,
  };
  if (acciones[nombre]) acciones[nombre]();
}

// ── HELPERS ───────────────────────────────────
function badgeEstado(e) {
  const map = {
    pendiente:  'badge-pendiente',
    confirmado: 'badge-confirmado',
    cancelado:  'badge-cancelado',
    completado: 'badge-completado',
  };
  const labels = {
    pendiente: 'Pendiente', confirmado: 'Confirmado',
    cancelado: 'Cancelado', completado: 'Completado'
  };
  return `<span class="badge ${map[e] || ''}">${labels[e] || e}</span>`;
}

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

// ── DASHBOARD ─────────────────────────────────
async function cargarDashboard() {
  const hoy = new Date().toISOString().split('T')[0];
  const lunes = new Date();
  lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const [resHoy, resSemana, resPend, resPresup] = await Promise.all([
    db.from('turnos').select('id', { count:'exact' }).eq('taller_id', TALLER_ID).eq('fecha', hoy),
    db.from('turnos').select('id', { count:'exact' }).eq('taller_id', TALLER_ID)
      .gte('fecha', lunes.toISOString().split('T')[0])
      .lte('fecha', domingo.toISOString().split('T')[0]),
    db.from('turnos').select('id', { count:'exact' }).eq('taller_id', TALLER_ID).eq('estado', 'pendiente'),
    db.from('presupuestos').select('id', { count:'exact' }).eq('taller_id', TALLER_ID).eq('estado', 'pendiente'),
  ]);

  document.getElementById('stat-hoy').textContent        = resHoy.count ?? 0;
  document.getElementById('stat-semana').textContent     = resSemana.count ?? 0;
  document.getElementById('stat-pendientes').textContent = resPend.count ?? 0;
  document.getElementById('stat-presup').textContent     = resPresup.count ?? 0;

  actualizarBadge('badge-presupuestos', resPresup.count ?? 0);

  await Promise.all([cargarIngresos(), verificarNotificaciones()]);

  // Turnos de hoy
  const { data: turnosHoy } = await db
    .from('turnos')
    .select('*')
    .eq('taller_id', TALLER_ID)
    .eq('fecha', hoy)
    .order('hora');

  const listaHoy = document.getElementById('turnos-hoy-lista');
  if (!turnosHoy || !turnosHoy.length) {
    listaHoy.innerHTML = '<p style="color:#aaa;font-size:14px">No hay turnos programados para hoy.</p>';
  } else {
    listaHoy.innerHTML = `
      <table class="tabla">
        <thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${turnosHoy.map(t => `
            <tr>
              <td><strong>${t.hora?.slice(0,5)}</strong></td>
              <td>${t.nombre_cliente || '—'}<br><span style="font-size:11px;color:#aaa">${t.telefono_cliente || ''}</span></td>
              <td>${t.descripcion || '—'}</td>
              <td>${badgeEstado(t.estado)}</td>
              <td>
                ${t.estado === 'pendiente'
                  ? `<button class="btn btn-rojo" style="padding:5px 12px;font-size:12px" onclick="cambiarEstado('${t.id}','confirmado')">Confirmar</button>`
                  : t.estado === 'confirmado'
                  ? `<button class="btn btn-blanco" style="padding:5px 12px;font-size:12px" onclick="cambiarEstado('${t.id}','completado')">Completar</button>`
                  : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Próximos turnos (incluye hoy+1 para mostrar recordatorios)
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const mananaISO = manana.toISOString().split('T')[0];

  const { data: proximos } = await db
    .from('turnos')
    .select('*')
    .eq('taller_id', TALLER_ID)
    .gte('fecha', mananaISO)
    .in('estado', ['pendiente','confirmado'])
    .order('fecha')
    .order('hora')
    .limit(10);

  const listaProx = document.getElementById('proximos-lista');
  if (!proximos || !proximos.length) {
    listaProx.innerHTML = '<p style="color:#aaa;font-size:14px">No hay próximos turnos.</p>';
  } else {
    listaProx.innerHTML = proximos.map(t => {
      const esManana = t.fecha === mananaISO;
      const wspBtn = (esManana && t.telefono_cliente)
        ? `<a href="${buildWspRecordatorio(t)}" target="_blank"
              style="display:inline-flex;align-items:center;gap:5px;background:#25d366;color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap">
              💬 Recordatorio
           </a>`
        : '';
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">${t.nombre_cliente || 'Cliente'}
              ${esManana ? '<span style="background:#fff3cd;color:#856404;font-size:10px;font-weight:800;border-radius:20px;padding:1px 7px;margin-left:6px">MAÑANA</span>' : ''}
            </div>
            <div style="font-size:12px;color:#888">${formatFecha(t.fecha)} a las ${t.hora?.slice(0,5) || '—'}</div>
            ${t.descripcion ? `<div style="font-size:12px;color:#aaa;margin-top:2px">${t.descripcion}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            ${badgeEstado(t.estado)}
            ${t.estado === 'pendiente'
              ? `<button class="btn btn-rojo" style="padding:4px 10px;font-size:12px" onclick="cambiarEstado('${t.id}','confirmado')">Confirmar</button>`
              : ''}
            ${wspBtn}
          </div>
        </div>
      `;
    }).join('');
  }
}

function buildWspRecordatorio(t) {
  const tel     = t.telefono_cliente.replace(/\D/g, '');
  const hora    = t.hora?.slice(0, 5) || '';
  const taller  = sesion.nombre || 'nuestro taller';
  const msg     = encodeURIComponent(
    `Hola ${t.nombre_cliente || ''}! 👋 Te recordamos tu turno en ${taller} mañana a las ${hora}. ¡Te esperamos!`
  );
  return `https://wa.me/549${tel}?text=${msg}`;
}

// ── TURNOS ────────────────────────────────────
async function cargarTurnos() {
  const estado = document.getElementById('filtro-estado-turno')?.value || '';
  let query = db.from('turnos').select('*').eq('taller_id', TALLER_ID).order('fecha', { ascending: false }).order('hora');
  if (estado) query = query.eq('estado', estado);

  const { data } = await query;
  const tbody = document.getElementById('tbody-turnos');

  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="vacio" style="text-align:center;padding:30px;color:#aaa">No hay turnos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(t => {
    const wspBtn = t.telefono_cliente
      ? `<a href="${buildWspRecordatorio(t)}" target="_blank"
            style="display:inline-flex;align-items:center;gap:4px;background:#25d366;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;margin-left:4px">
            💬
         </a>`
      : '';
    return `
    <tr>
      <td>
        <strong>${formatFecha(t.fecha)}</strong>
        <span style="color:#888;font-size:12px;margin-left:6px">${t.hora?.slice(0,5) || ''}</span>
      </td>
      <td>
        ${t.nombre_cliente || '—'}
        ${t.telefono_cliente ? `<br><a href="tel:${t.telefono_cliente}" style="font-size:11px;color:var(--rojo)">${t.telefono_cliente}</a>` : ''}
      </td>
      <td style="font-size:13px">
        <div style="font-size:12px;color:#888;margin-bottom:4px">${t.descripcion || '—'}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="text" id="nota-${t.id}" value="${(t.notas_internas || '').replace(/"/g,'&quot;')}"
            placeholder="Nota interna..."
            style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none;flex:1;min-width:120px">
          <button onclick="guardarNota('${t.id}')"
            style="padding:4px 8px;background:#e8f0fe;color:#1a56c4;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
            Guardar nota
          </button>
        </div>
      </td>
      <td>${badgeEstado(t.estado)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <select
            style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none"
            onchange="cambiarEstado('${t.id}', this.value)"
          >
            <option value="pendiente"  ${t.estado==='pendiente'  ? 'selected':''}>Pendiente</option>
            <option value="confirmado" ${t.estado==='confirmado' ? 'selected':''}>Confirmado</option>
            <option value="completado" ${t.estado==='completado' ? 'selected':''}>Completado</option>
            <option value="cancelado"  ${t.estado==='cancelado'  ? 'selected':''}>Cancelado</option>
          </select>
          ${wspBtn}
          <button class="accion-btn accion-eliminar" style="padding:4px 10px;border-radius:6px;border:none;background:#fce8e8;color:#c00;font-size:11px;font-weight:700;cursor:pointer" onclick="eliminarTurno('${t.id}')">✕</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

async function cambiarEstado(id, nuevoEstado) {
  await db.from('turnos').update({ estado: nuevoEstado }).eq('id', id);
  cargarTurnos();
  if (document.getElementById('panel-dashboard').classList.contains('activo')) cargarDashboard();
}

async function guardarNota(id) {
  const nota = document.getElementById('nota-' + id)?.value.trim() || null;
  const { error } = await db.from('turnos').update({ notas_internas: nota }).eq('id', id);
  if (!error) {
    const input = document.getElementById('nota-' + id);
    if (input) {
      input.style.borderColor = '#1a7a3f';
      setTimeout(() => { if (input) input.style.borderColor = '#ddd'; }, 1500);
    }
  }
}

async function eliminarTurno(id) {
  if (!confirm('¿Eliminás este turno?')) return;
  await db.from('turnos').delete().eq('id', id);
  cargarTurnos();
}

// ── NUEVO TURNO ───────────────────────────────
let editandoTurnoId = null;

async function prepararFormTurno() {
  // Poner fecha de hoy por defecto
  if (!document.getElementById('t-fecha').value) {
    document.getElementById('t-fecha').value = new Date().toISOString().split('T')[0];
  }

  // Cargar servicios en el select
  const { data } = await db.from('servicios_taller').select('*').eq('taller_id', TALLER_ID).eq('activo', true);
  const sel = document.getElementById('t-servicio');
  sel.innerHTML = '<option value="">Sin especificar</option>';
  if (data) data.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.nombre}${s.precio ? ' — $' + Number(s.precio).toLocaleString('es-AR') : ''}</option>`);
}

async function guardarTurno() {
  const nombre = document.getElementById('t-nombre').value.trim();
  const fecha  = document.getElementById('t-fecha').value;
  const hora   = document.getElementById('t-hora').value;
  const msg    = document.getElementById('turno-msg');

  if (!nombre || !fecha || !hora) {
    msg.style.color = '#c00';
    msg.textContent = '⚠️ Nombre, fecha y hora son obligatorios.';
    return;
  }

  const datos = {
    taller_id:        TALLER_ID,
    nombre_cliente:   nombre,
    telefono_cliente: document.getElementById('t-telefono').value.trim() || null,
    fecha,
    hora,
    servicio_id:      document.getElementById('t-servicio').value || null,
    estado:           document.getElementById('t-estado').value,
    descripcion:      document.getElementById('t-descripcion').value.trim() || null,
  };

  msg.textContent = 'Guardando...'; msg.style.color = '#888';

  let error;
  if (editandoTurnoId) {
    ({ error } = await db.from('turnos').update(datos).eq('id', editandoTurnoId));
  } else {
    ({ error } = await db.from('turnos').insert([datos]));
  }

  if (error) {
    msg.style.color = '#c00'; msg.textContent = '❌ Error: ' + error.message;
  } else {
    msg.style.color = '#1a7a3f'; msg.textContent = '✅ Turno guardado.';
    limpiarTurno();
    setTimeout(() => verPanel('turnos'), 800);
  }
}

function limpiarTurno() {
  editandoTurnoId = null;
  document.getElementById('turno-form-titulo').textContent = 'Nuevo turno';
  ['t-nombre','t-telefono','t-fecha','t-hora','t-descripcion'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('t-estado').value = 'pendiente';
  document.getElementById('turno-msg').textContent = '';
}

// ── PRESUPUESTOS ──────────────────────────────
async function cargarPresupuestos() {
  const { data } = await db
    .from('presupuestos')
    .select('*')
    .eq('taller_id', TALLER_ID)
    .order('creado_en', { ascending: false });

  const cont = document.getElementById('presupuestos-lista');

  if (!data || !data.length) {
    cont.innerHTML = '<div class="card"><p style="color:#aaa;font-size:14px;text-align:center;padding:20px">No hay solicitudes de presupuesto aún.</p></div>';
    return;
  }

  cont.innerHTML = data.map(p => `
    <div class="presup-card">
      <div style="flex:1">
        <div class="presup-titulo">${p.nombre_cliente || 'Cliente'}</div>
        <div class="presup-info">${new Date(p.creado_en).toLocaleDateString('es-AR')} · ${badgeEstado(p.estado)}</div>
        <div style="margin-top:8px;font-size:14px;color:#444">${p.descripcion_trabajo}</div>
        ${p.monto_estimado
          ? `<div style="margin-top:6px;font-size:15px;font-weight:700;color:var(--rojo)">$${Number(p.monto_estimado).toLocaleString('es-AR')}</div>`
          : ''}
        ${p.respuesta_taller
          ? `<div style="margin-top:8px;font-size:13px;color:#555;background:#f8f8f8;border-radius:6px;padding:8px">Respuesta: ${p.respuesta_taller}</div>`
          : ''}
      </div>
      ${p.estado === 'pendiente' ? `
        <div style="display:flex;flex-direction:column;gap:8px;min-width:180px">
          <input type="number" id="monto-${p.id}" placeholder="Monto ($)" style="padding:8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;outline:none">
          <textarea id="resp-${p.id}" rows="2" placeholder="Tu respuesta..." style="padding:8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;outline:none;resize:none"></textarea>
          <button class="btn btn-rojo" style="font-size:13px;padding:8px" onclick="responderPresupuesto('${p.id}')">Enviar respuesta</button>
          <button class="btn btn-blanco" style="font-size:13px;padding:8px" onclick="convertirEnTurno('${escHtml(p.nombre_cliente)}','${escHtml(p.telefono_cliente || '')}')">📅 Convertir en turno</button>
        </div>
      ` : `
        <div style="min-width:180px;display:flex;align-items:flex-start">
          <button class="btn btn-blanco" style="font-size:13px;padding:8px;width:100%" onclick="convertirEnTurno('${escHtml(p.nombre_cliente)}','${escHtml(p.telefono_cliente || '')}')">📅 Convertir en turno</button>
        </div>
      `}
    </div>
  `).join('');
}

function escHtml(str) {
  return (str || '').replace(/'/g, "\\'");
}

function convertirEnTurno(nombre, tel) {
  verPanel('nuevo-turno');
  setTimeout(() => {
    const fn = document.getElementById('t-nombre');
    const ft = document.getElementById('t-telefono');
    if (fn) fn.value = nombre;
    if (ft) ft.value = tel;
  }, 120);
}

async function responderPresupuesto(id) {
  const monto = parseFloat(document.getElementById('monto-' + id)?.value);
  const resp  = document.getElementById('resp-' + id)?.value.trim();
  if (!resp) { alert('Escribí una respuesta antes de enviar.'); return; }

  await db.from('presupuestos').update({
    estado: 'enviado',
    monto_estimado: isNaN(monto) ? null : monto,
    respuesta_taller: resp,
  }).eq('id', id);

  cargarPresupuestos();
}

// ── SERVICIOS ─────────────────────────────────
// Nota: para destacado y orden ejecutar en Supabase:
// ALTER TABLE servicios_taller ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false;
// ALTER TABLE servicios_taller ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
async function cargarServicios() {
  const { data } = await db
    .from('servicios_taller')
    .select('*')
    .eq('taller_id', TALLER_ID)
    .order('destacado', { ascending: false })
    .order('orden', { ascending: true });

  const lista = document.getElementById('servicios-lista');
  if (!data || !data.length) {
    lista.innerHTML = '<p style="color:#aaa;font-size:14px">No hay servicios publicados aún.</p>';
    return;
  }

  lista.innerHTML = data.map(s => `
    <div class="servicio-row" data-id="${s.id}">
      <div style="display:flex;align-items:center;gap:4px;flex:1">
        <span class="drag-handle" title="Arrastrar para reordenar">⠿</span>
        <div>
          <div style="font-weight:600;font-size:14px">
            ${s.nombre}
            ${s.destacado ? '<span class="servicio-destacado-badge">★ Destacado</span>' : ''}
          </div>
          <div style="font-size:12px;color:#888">${s.descripcion || ''} ${s.duracion_minutos ? '· ' + s.duracion_minutos + ' min' : ''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:16px;font-weight:800;color:var(--rojo)">${s.precio ? '$' + Number(s.precio).toLocaleString('es-AR') : 'Sin precio'}</div>
        <button onclick="duplicarServicio('${s.id}')" title="Duplicar servicio" class="btn-icon-servicio btn-duplicar">⧉</button>
        <button onclick="toggleDestacado('${s.id}', ${!!s.destacado})" title="${s.destacado ? 'Quitar destacado' : 'Marcar como destacado'}" class="btn-icon-servicio btn-destacar ${s.destacado ? 'activo' : ''}">★</button>
        <button onclick="eliminarServicio('${s.id}')" style="background:#fce8e8;color:#c00;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">✕</button>
      </div>
    </div>
  `).join('');

  initSortableServicios();
}

async function guardarServicio() {
  const nombre = document.getElementById('s-nombre').value.trim();
  const msg    = document.getElementById('s-msg');
  if (!nombre) { msg.style.color='#c00'; msg.textContent='⚠️ El nombre es obligatorio.'; return; }

  const { error } = await db.from('servicios_taller').insert([{
    taller_id:        TALLER_ID,
    nombre,
    precio:           parseFloat(document.getElementById('s-precio').value) || null,
    duracion_minutos: parseInt(document.getElementById('s-duracion').value) || null,
    descripcion:      document.getElementById('s-descripcion').value.trim() || null,
    activo:           true,
  }]);

  if (error) { msg.style.color='#c00'; msg.textContent='❌ '+error.message; }
  else {
    msg.style.color='#1a7a3f'; msg.textContent='✅ Servicio agregado.';
    ['s-nombre','s-precio','s-duracion','s-descripcion'].forEach(id => document.getElementById(id).value='');
    cargarServicios();
  }
}

async function eliminarServicio(id) {
  if (!confirm('¿Eliminás este servicio?')) return;
  await db.from('servicios_taller').delete().eq('id', id);
  cargarServicios();
}

async function duplicarServicio(id) {
  const taller = JSON.parse(sessionStorage.getItem('pz_taller') || '{}');
  const { data: original } = await db.from('servicios_taller').select('*').eq('id', id).single();
  if (!original) return;

  const { error } = await db.from('servicios_taller').insert({
    taller_id: taller.id,
    nombre: original.nombre + ' (copia)',
    descripcion: original.descripcion,
    precio: original.precio,
    duracion_minutos: original.duracion_minutos,
    activo: original.activo,
    destacado: false,
    orden: (original.orden || 0) + 1,
  });

  if (!error) await cargarServicios();
}

async function toggleDestacado(id, estadoActual) {
  await db.from('servicios_taller').update({ destacado: !estadoActual }).eq('id', id);
  await cargarServicios();
}

async function guardarOrdenServicios(ids) {
  const updates = ids.map((id, i) =>
    db.from('servicios_taller').update({ orden: i }).eq('id', id)
  );
  await Promise.all(updates);
}

function initSortableServicios() {
  const lista = document.getElementById('servicios-lista');
  if (!lista || typeof Sortable === 'undefined') return;

  new Sortable(lista, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: () => {
      const ids = [...lista.querySelectorAll('[data-id]')].map(el => el.dataset.id);
      guardarOrdenServicios(ids);
    },
  });
}

// ── PERFIL ────────────────────────────────────
function actualizarPreview() {
  const nombre = document.getElementById('p-nombre')?.value || 'Nombre del taller';
  const desc   = document.getElementById('p-descripcion')?.value || 'Descripción del taller...';
  const tel    = document.getElementById('p-telefono')?.value || 'Sin teléfono';
  const zona   = document.getElementById('p-zona')?.value || '';
  const loc    = document.getElementById('p-localidad')?.value || '';
  const dir    = document.getElementById('p-direccion')?.value || '';

  const ubicacion = [dir, zona, loc].filter(Boolean).join(', ') || 'Dirección';

  document.getElementById('prev-nombre').textContent    = nombre || 'Nombre del taller';
  document.getElementById('prev-desc').textContent      = desc || 'Descripción del taller...';
  document.getElementById('prev-tel').textContent       = '📞 ' + (tel || 'Sin teléfono');
  document.getElementById('prev-ubicacion').textContent = '📍 ' + ubicacion;
  document.getElementById('prev-logo').textContent      = (nombre || 'P').charAt(0).toUpperCase();
}

async function cargarPerfil() {
  const { data: t } = await db.from('talleres').select('*').eq('id', TALLER_ID).single();
  if (!t) return;

  document.getElementById('p-nombre').value     = t.nombre || '';
  document.getElementById('p-telefono').value   = t.telefono || '';
  document.getElementById('p-whatsapp').value   = t.whatsapp || '';
  document.getElementById('p-direccion').value  = t.direccion || '';
  document.getElementById('p-zona').value       = t.zona || '';
  document.getElementById('p-localidad').value  = t.localidad || '';
  document.getElementById('p-descripcion').value= t.descripcion || '';
  document.getElementById('p-logo').value       = t.logo_url || '';
  document.getElementById('p-apertura').value   = t.horario_apertura || '';
  document.getElementById('p-cierre').value     = t.horario_cierre || '';

  const iniciales = t.nombre.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('perfil-avatar').textContent = iniciales;

  if (t.dias_atencion) {
    const dias = t.dias_atencion.split(',').map(d => d.trim());
    document.querySelectorAll('.dia-chk').forEach(chk => {
      chk.checked = dias.includes(chk.value);
    });
  }

  actualizarPreview();
  actualizarPreviewDias();

  ['p-nombre','p-descripcion','p-telefono','p-direccion','p-zona','p-localidad'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', actualizarPreview);
  });
}

function actualizarPreviewDias() {
  const dias = [...document.querySelectorAll('.dia-chk:checked')].map(c => c.value);
  const el = document.getElementById('prev-dias');
  if (!el) return;
  el.textContent = dias.length ? `📅 ${dias.join(', ')}` : '';
}

async function guardarPerfil() {
  const msg = document.getElementById('p-msg');
  msg.textContent = 'Guardando...'; msg.style.color = '#888';

  const { error } = await db.from('talleres').update({
    nombre:            document.getElementById('p-nombre').value.trim(),
    telefono:          document.getElementById('p-telefono').value.trim() || null,
    whatsapp:          document.getElementById('p-whatsapp').value.trim() || null,
    direccion:         document.getElementById('p-direccion').value.trim() || null,
    zona:              document.getElementById('p-zona').value.trim() || null,
    localidad:         document.getElementById('p-localidad').value.trim() || null,
    descripcion:       document.getElementById('p-descripcion').value.trim() || null,
    logo_url:          document.getElementById('p-logo').value.trim() || null,
    horario_apertura:  document.getElementById('p-apertura').value || null,
    horario_cierre:    document.getElementById('p-cierre').value || null,
    dias_atencion:     [...document.querySelectorAll('.dia-chk:checked')].map(c => c.value).join(', ') || null,
  }).eq('id', TALLER_ID);

  if (error) { msg.style.color='#c00'; msg.textContent='❌ '+error.message; }
  else {
    msg.style.color='#1a7a3f'; msg.textContent='✅ Perfil actualizado.';
    // Actualizar nombre en sidebar
    const nombre = document.getElementById('p-nombre').value.trim();
    document.getElementById('sidebar-nombre').textContent = nombre;
    const sesionActual = JSON.parse(sessionStorage.getItem('pz_taller'));
    sesionActual.nombre = nombre;
    sessionStorage.setItem('pz_taller', JSON.stringify(sesionActual));
  }
}

// ── INGRESOS ESTIMADOS ────────────────────────
async function cargarIngresos() {
  const ahora   = new Date();
  const primerMes  = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const primerAnt  = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString();
  const ultimoAnt  = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString();

  // Turnos completados con su servicio (precio)
  const [{ data: turnosMes }, { data: turnosAnt }] = await Promise.all([
    db.from('turnos')
      .select('id, servicio_id, servicios_taller(precio)')
      .eq('taller_id', TALLER_ID)
      .eq('estado', 'completado')
      .gte('creado_en', primerMes),
    db.from('turnos')
      .select('id, servicio_id, servicios_taller(precio)')
      .eq('taller_id', TALLER_ID)
      .eq('estado', 'completado')
      .gte('creado_en', primerAnt)
      .lte('creado_en', ultimoAnt),
  ]);

  const sumar = arr => (arr || []).reduce((acc, t) => acc + (t.servicios_taller?.precio || 0), 0);
  const ingresosMes = sumar(turnosMes);
  const ingresosAnt = sumar(turnosAnt);
  const completadosMes = (turnosMes || []).length;

  document.getElementById('stat-ingresos-mes').textContent =
    '$' + ingresosMes.toLocaleString('es-AR');
  document.getElementById('stat-completados-mes').textContent = completadosMes;
  document.getElementById('stat-promedio-servicio').textContent =
    completadosMes > 0
      ? '$' + Math.round(ingresosMes / completadosMes).toLocaleString('es-AR')
      : '$0';

  // Comparativa con mes anterior
  const flecha = document.getElementById('stat-ingresos-flecha');
  const vs     = document.getElementById('stat-ingresos-vs');
  if (ingresosAnt === 0) {
    flecha.textContent = '';
    vs.textContent = 'sin datos del mes anterior';
  } else {
    const diff = Math.round(((ingresosMes - ingresosAnt) / ingresosAnt) * 100);
    if (diff > 0) {
      flecha.className = 'ingreso-up';
      flecha.textContent = '▲ ' + diff + '%';
    } else if (diff < 0) {
      flecha.className = 'ingreso-down';
      flecha.textContent = '▼ ' + Math.abs(diff) + '%';
    } else {
      flecha.className = 'ingreso-igual';
      flecha.textContent = '→ igual';
    }
    vs.textContent = 'vs. mes anterior ($' + ingresosAnt.toLocaleString('es-AR') + ')';
  }
}

// ── NOTIFICACIONES ────────────────────────────
let ultimaVerificacion = sessionStorage.getItem('pz_notif_last') || null;
let notificacionesCache = [];

async function verificarNotificaciones() {
  const desde = ultimaVerificacion || new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const [{ data: nuevosPresup }, { data: nuevosTurnos }] = await Promise.all([
    db.from('presupuestos')
      .select('id, nombre_cliente, creado_en, descripcion_trabajo')
      .eq('taller_id', TALLER_ID)
      .eq('estado', 'pendiente')
      .gte('creado_en', desde)
      .order('creado_en', { ascending: false }),
    db.from('turnos')
      .select('id, nombre_cliente, fecha, hora, creado_en')
      .eq('taller_id', TALLER_ID)
      .eq('estado', 'pendiente')
      .gte('creado_en', desde)
      .order('creado_en', { ascending: false }),
  ]);

  notificacionesCache = [
    ...(nuevosPresup || []).map(p => ({
      tipo:  'presupuesto',
      id:    p.id,
      texto: `Nuevo presupuesto de ${p.nombre_cliente || 'un cliente'}`,
      sub:   p.descripcion_trabajo?.slice(0, 60) || '',
      fecha: p.creado_en,
      panel: 'presupuestos',
    })),
    ...(nuevosTurnos || []).map(t => ({
      tipo:  'turno',
      id:    t.id,
      texto: `Nuevo turno: ${t.nombre_cliente || 'cliente'}`,
      sub:   formatFecha(t.fecha) + (t.hora ? ' a las ' + t.hora.slice(0,5) : ''),
      fecha: t.creado_en,
      panel: 'turnos',
    })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const total = notificacionesCache.length;
  const badge = document.getElementById('notif-badge');
  badge.textContent = total;
  badge.classList.toggle('visible', total > 0);

  // Mostrar card de novedades en el dashboard si hay notificaciones
  const dashCard = document.getElementById('dash-notif-card');
  const dashLista = document.getElementById('dash-notif-lista');
  const dashCount = document.getElementById('dash-notif-count');
  if (total > 0) {
    dashCard.style.display = 'block';
    dashCount.textContent  = total;
    dashLista.innerHTML = notificacionesCache.slice(0, 5).map(n => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f5f5f5;cursor:pointer" onclick="verPanel('${n.panel}')">
        <span style="font-size:20px">${n.tipo === 'presupuesto' ? '📋' : '📅'}</span>
        <div>
          <div style="font-size:13px;font-weight:700">${n.texto}</div>
          <div style="font-size:11px;color:#888">${n.sub}</div>
        </div>
      </div>
    `).join('');
  } else {
    dashCard.style.display = 'none';
  }
}

function abrirNotificaciones() {
  const lista = document.getElementById('notif-lista');
  if (!notificacionesCache.length) {
    lista.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-size:14px">Sin notificaciones nuevas ✅</div>';
  } else {
    lista.innerHTML = notificacionesCache.map(n => `
      <div class="notif-item ${n.tipo === 'presupuesto' ? 'presup' : 'nueva'}"
           onclick="cerrarNotificaciones(); verPanel('${n.panel}')">
        <span class="notif-icono">${n.tipo === 'presupuesto' ? '📋' : '📅'}</span>
        <div>
          <div class="notif-texto">${n.texto}</div>
          <div class="notif-sub">${n.sub}</div>
          <div class="notif-sub" style="margin-top:3px">${new Date(n.fecha).toLocaleString('es-AR')}</div>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('notif-panel').classList.add('visible');
  document.getElementById('notif-overlay').classList.add('visible');
}

function cerrarNotificaciones() {
  document.getElementById('notif-panel').classList.remove('visible');
  document.getElementById('notif-overlay').classList.remove('visible');
}

function marcarTodasLeidas() {
  ultimaVerificacion = new Date().toISOString();
  sessionStorage.setItem('pz_notif_last', ultimaVerificacion);
  notificacionesCache = [];
  const badge = document.getElementById('notif-badge');
  badge.classList.remove('visible');
  document.getElementById('notif-lista').innerHTML =
    '<div style="text-align:center;padding:40px;color:#aaa;font-size:14px">Sin notificaciones nuevas ✅</div>';
  document.getElementById('dash-notif-card').style.display = 'none';
}

// ── AGENDA SEMANAL ────────────────────────────
let semanaOffset = 0;
let agendaTurnoActual = null;

function toISO(d) { return d.toISOString().split('T')[0]; }

function navegarAgenda(dir, resetear) {
  if (resetear) semanaOffset = 0;
  else semanaOffset += dir;
  renderAgendaSemanal();
}

async function renderAgendaSemanal() {
  const contenedor = document.getElementById('agenda-contenido');
  contenedor.innerHTML = '<div class="loader">Cargando agenda...</div>';

  const hoy = new Date();
  hoy.setDate(hoy.getDate() + semanaOffset * 7);
  const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diaSemana);
  lunes.setHours(0, 0, 0, 0);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const fmt = d => d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' });
  document.getElementById('agenda-rango').textContent = `Semana del ${fmt(lunes)} al ${fmt(domingo)}`;

  const { data: turnos } = await db.from('turnos')
    .select('*, servicios_taller(nombre)')
    .eq('taller_id', TALLER_ID)
    .gte('fecha', toISO(lunes))
    .lte('fecha', toISO(domingo))
    .order('hora');

  const mapa = {};
  (turnos || []).forEach(t => {
    if (!mapa[t.fecha]) mapa[t.fecha] = [];
    mapa[t.fecha].push(t);
  });

  const horas = [];
  for (let h = 8; h <= 20; h++) horas.push(`${String(h).padStart(2,'0')}:00`);

  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    dias.push(d);
  }
  const nombresDias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const hoyISO = toISO(new Date());

  const coloresEstado = {
    pendiente:  { bg: '#fef3c7', color: '#92400e' },
    confirmado: { bg: '#dbeafe', color: '#1e40af' },
    completado: { bg: '#dcfce7', color: '#166534' },
    cancelado:  { bg: '#f1f5f9', color: '#64748b' },
  };

  const headerCells = `<div class="agenda-header-cell" style="border-right:1px solid #333"></div>` +
    dias.map((d, i) => {
      const esHoy    = toISO(d) === hoyISO;
      const fechaStr = toISO(d);
      const cantDia  = (mapa[fechaStr] || []).length;
      return `<div class="agenda-header-cell" style="${esHoy ? 'background:var(--rojo);' : ''}cursor:pointer" onclick="expandirDia('${fechaStr}','${nombresDias[i]} ${d.getDate()}')" title="Ver todos los turnos del día">
        ${nombresDias[i]}<br><span style="font-size:14px;font-weight:900">${d.getDate()}</span>
        ${cantDia ? `<br><span style="font-size:10px;opacity:.8">${cantDia} turno${cantDia !== 1 ? 's' : ''}</span>` : ''}
      </div>`;
    }).join('');

  const filas = horas.map(hora => {
    const celdas = dias.map(d => {
      const fechaStr = toISO(d);
      const turnosDia = (mapa[fechaStr] || []).filter(t => t.hora && t.hora.startsWith(hora.slice(0, 2)));
      const bloques = turnosDia.map(t => {
        const c = coloresEstado[t.estado] || coloresEstado.pendiente;
        return `<div class="agenda-turno-bloque" style="background:${c.bg};color:${c.color}" onclick="event.stopPropagation();verDetalleTurnoAgenda('${t.id}')" title="${t.nombre_cliente || 'Cliente'} — ${t.hora?.slice(0,5) || ''}">${t.nombre_cliente || 'Cliente'}</div>`;
      }).join('');
      return `<div class="agenda-cell" onclick="agendaClickCelda('${fechaStr}','${hora}')">${bloques}</div>`;
    }).join('');
    return `<div class="agenda-hour-row"><div class="agenda-hour-label">${hora}</div>${celdas}</div>`;
  }).join('');

  contenedor.innerHTML = `
    <div class="agenda-wrap">
      <div class="agenda-grid">
        <div class="agenda-header-row">${headerCells}</div>
        ${filas}
      </div>
    </div>`;

  // Guardar turnos en cache para el modal
  agendaTurnosCache = turnos || [];
}

let agendaTurnosCache = [];

async function verDetalleTurnoAgenda(id) {
  let turno = agendaTurnosCache.find(t => t.id === id || String(t.id) === String(id));
  if (!turno) {
    const { data } = await db.from('turnos').select('*').eq('id', id).single();
    turno = data;
  }
  if (!turno) return;

  agendaTurnoActual = turno;
  document.getElementById('mta-nombre').textContent = turno.nombre_cliente || 'Cliente';
  document.getElementById('mta-info').textContent =
    `${formatFecha(turno.fecha)} a las ${turno.hora?.slice(0,5) || '—'} · ${turno.descripcion || 'Sin descripción'}`;
  document.getElementById('mta-estado').value = turno.estado || 'pendiente';

  const modal = document.getElementById('modal-turno-agenda');
  modal.style.display = 'flex';
}

async function guardarEstadoAgenda() {
  if (!agendaTurnoActual) return;
  const nuevoEstado = document.getElementById('mta-estado').value;
  await db.from('turnos').update({ estado: nuevoEstado }).eq('id', agendaTurnoActual.id);
  document.getElementById('modal-turno-agenda').style.display = 'none';
  agendaTurnoActual = null;
  renderAgendaSemanal();
}

async function expandirDia(fecha, labelDia) {
  const modal = document.getElementById('modal-dia-completo');
  if (!modal) return;
  document.getElementById('mdc-titulo').textContent = labelDia;
  document.getElementById('mdc-contenido').innerHTML = '<div class="loader" style="padding:20px">Cargando...</div>';
  modal.style.display = 'flex';

  const { data: turnos } = await db.from('turnos')
    .select('*, servicios_taller(nombre)')
    .eq('taller_id', TALLER_ID)
    .eq('fecha', fecha)
    .order('hora');

  if (!turnos?.length) {
    document.getElementById('mdc-contenido').innerHTML =
      '<p style="text-align:center;color:#aaa;padding:24px">No hay turnos para este día.</p>';
    return;
  }

  const coloresEstado = {
    pendiente:  { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
    confirmado: { bg: '#dbeafe', color: '#1e40af', label: 'Confirmado' },
    completado: { bg: '#dcfce7', color: '#166534', label: 'Completado' },
    cancelado:  { bg: '#f1f5f9', color: '#64748b', label: 'Cancelado'  },
  };

  document.getElementById('mdc-contenido').innerHTML = turnos.map(t => {
    const c = coloresEstado[t.estado] || coloresEstado.pendiente;
    const servicio = t.servicios_taller?.nombre || t.descripcion || 'Sin servicio';
    const telefono = t.telefono_cliente;
    const waMsg = encodeURIComponent(`Hola ${t.nombre_cliente || ''}, te confirmamos tu turno del ${fecha} a las ${(t.hora||'').slice(0,5)} en nuestro taller.`);
    return `
      <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid #f0f0f0">
        <div style="font-size:18px;font-weight:900;color:#333;min-width:52px;text-align:center;line-height:1.1">
          ${(t.hora || '—').slice(0,5)}
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px;color:#222">${t.nombre_cliente || 'Sin nombre'}</div>
          <div style="font-size:12px;color:#666;margin-top:2px">${servicio}</div>
          ${telefono ? `<div style="font-size:12px;color:#888;margin-top:1px">📞 ${telefono}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span style="background:${c.bg};color:${c.color};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700">${c.label}</span>
          ${telefono ? `<a href="https://wa.me/${telefono.replace(/\D/g,'')}?text=${waMsg}" target="_blank" style="font-size:11px;background:#25d366;color:#fff;padding:3px 10px;border-radius:10px;text-decoration:none">📤 WA</a>` : ''}
        </div>
      </div>`;
  }).join('');
}

function agendaClickCelda(fecha, hora) {
  verPanel('nuevo-turno');
  setTimeout(() => {
    const fFecha = document.getElementById('t-fecha');
    const fHora  = document.getElementById('t-hora');
    if (fFecha) fFecha.value = fecha;
    if (fHora)  fHora.value  = hora;
  }, 120);
}

// ── ESTADÍSTICAS ──────────────────────────────
async function cargarEstadisticas() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
  const inicioUltimoMes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().split('T')[0];

  const [
    { data: turnosMes },
    { data: presupuestosMes },
    { data: servicios },
  ] = await Promise.all([
    db.from('turnos')
      .select('id, fecha, estado, servicio_id')
      .eq('taller_id', TALLER_ID)
      .gte('fecha', inicioUltimoMes),
    db.from('presupuestos')
      .select('id, estado, creado_en')
      .eq('taller_id', TALLER_ID)
      .gte('creado_en', new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()),
    db.from('servicios_taller')
      .select('id, precio')
      .eq('taller_id', TALLER_ID),
  ]);

  // Ingresos estimados: turnos completados este mes × precio promedio de servicios
  const precioPromedio = servicios && servicios.length
    ? servicios.reduce((a, s) => a + (s.precio || 0), 0) / servicios.length
    : 0;
  const completadosMes = (turnosMes || []).filter(t =>
    t.estado === 'completado' && t.fecha >= inicioMes
  ).length;
  const ingresos = completadosMes * precioPromedio;

  document.getElementById('est-ingresos').textContent = '$' + Math.round(ingresos).toLocaleString('es-AR');
  document.getElementById('est-completados').textContent = completadosMes;

  // Tasa de conversión presupuestos
  const totalPresup = (presupuestosMes || []).length;
  const enviadosPresup = (presupuestosMes || []).filter(p => p.estado === 'enviado').length;
  const tasaConv = totalPresup > 0 ? Math.round((enviadosPresup / totalPresup) * 100) : 0;
  document.getElementById('est-conversion').textContent = tasaConv + '%';
  document.getElementById('est-conversion-detalle').innerHTML = `
    <strong>${enviadosPresup}</strong> respondidos de <strong>${totalPresup}</strong> totales
    ${totalPresup > 0 ? `— tasa de respuesta: <strong>${tasaConv}%</strong>` : ''}
    <br><span style="font-size:12px;color:#aaa">Últimos 2 meses</span>`;

  // Turnos por día de semana (último mes)
  const diasNombres = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const contDias = [0,0,0,0,0,0,0];
  (turnosMes || []).forEach(t => {
    if (t.fecha) {
      const d = new Date(t.fecha + 'T00:00:00');
      contDias[d.getDay()]++;
    }
  });
  // Ordenar Lunes→Domingo
  const ordenLunes = [1,2,3,4,5,6,0];
  const labelsOrdenados = ordenLunes.map(i => diasNombres[i]);
  const datosOrdenados = ordenLunes.map(i => contDias[i]);

  const ctx = document.getElementById('chart-dias-semana');
  if (ctx) {
    if (window._chartDias) window._chartDias.destroy();
    window._chartDias = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labelsOrdenados,
        datasets: [{
          label: 'Turnos',
          data: datosOrdenados,
          backgroundColor: datosOrdenados.map(v => v === Math.max(...datosOrdenados) ? '#E63946' : '#1a1a1a'),
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }
}

// ── BADGES SIDEBAR ────────────────────────────
function actualizarBadge(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  if (n > 0) {
    el.textContent = n > 9 ? '9+' : n;
    el.style.display = 'inline-flex';
  } else {
    el.style.display = 'none';
  }
}

async function cargarBadgesNotificacion() {
  if (!TALLER_ID) return;
  const hoy    = new Date().toISOString().slice(0, 10);
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [turnosRes, presupRes] = await Promise.all([
    db.from('turnos')
      .select('id', { count: 'exact' })
      .eq('taller_id', TALLER_ID)
      .eq('estado', 'pendiente')
      .gte('fecha', hoy)
      .lte('fecha', manana),
    db.from('presupuestos')
      .select('id', { count: 'exact' })
      .eq('taller_id', TALLER_ID)
      .eq('estado', 'pendiente'),
  ]);

  actualizarBadge('badge-turnos', turnosRes.count ?? 0);
  actualizarBadge('badge-presupuestos', presupRes.count ?? 0);
  await cargarBadgeMensajes();
}

// ── MENSAJERÍA ────────────────────────────────
let _msgChannel = null;

async function cargarMensajes() {
  const taller = JSON.parse(sessionStorage.getItem('pz_taller') || '{}');
  const container = document.getElementById('chat-mensajes');

  const { data, error } = await db
    .from('mensajes_internos')
    .select('*')
    .eq('de_taller_id', taller.id)
    .order('creado_en', { ascending: true });

  if (error || !data) {
    container.innerHTML = '<div class="chat-sin-mensajes">Error al cargar mensajes.</div>';
    return;
  }

  const noLeidos = data.filter(m => !m.para_admin && !m.leido).map(m => m.id);
  if (noLeidos.length) {
    await db.from('mensajes_internos').update({ leido: true }).in('id', noLeidos);
    actualizarBadge('badge-mensajes', 0);
  }

  renderMensajes(data);

  if (_msgChannel) db.removeChannel(_msgChannel);
  _msgChannel = db.channel('mensajes-taller-' + taller.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_internos', filter: `de_taller_id=eq.${taller.id}` }, payload => {
      renderMensajeNuevo(payload.new);
    })
    .subscribe();
}

function renderMensajes(mensajes) {
  const container = document.getElementById('chat-mensajes');
  if (!mensajes || mensajes.length === 0) {
    container.innerHTML = '<div class="chat-sin-mensajes">Aún no hay mensajes. ¡Mandanos tu primera consulta!</div>';
    return;
  }
  container.innerHTML = mensajes.map(m => renderBurbuja(m)).join('');
  container.scrollTop = container.scrollHeight;
}

function renderBurbuja(m) {
  const lado = m.para_admin ? 'enviado' : 'recibido';
  const hora = new Date(m.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date(m.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  return `<div class="chat-burbuja-wrap ${lado}">
    <div class="chat-burbuja ${lado}">${m.mensaje}</div>
    <div class="chat-hora">${fecha} ${hora}${m.para_admin ? '' : ' · Piezauto'}</div>
  </div>`;
}

function renderMensajeNuevo(m) {
  const container = document.getElementById('chat-mensajes');
  const sinMsg = container.querySelector('.chat-sin-mensajes');
  if (sinMsg) sinMsg.remove();
  container.insertAdjacentHTML('beforeend', renderBurbuja(m));
  container.scrollTop = container.scrollHeight;
}

async function enviarMensaje() {
  const taller = JSON.parse(sessionStorage.getItem('pz_taller') || '{}');
  const texto = document.getElementById('chat-texto').value.trim();
  if (!texto) return;

  const btn = document.querySelector('.btn-enviar-msg');
  btn.disabled = true;

  const { error } = await db.from('mensajes_internos').insert({
    de_taller_id: taller.id,
    para_admin: true,
    mensaje: texto,
    leido: false,
  });

  btn.disabled = false;
  if (!error) {
    document.getElementById('chat-texto').value = '';
  }
}

async function cargarBadgeMensajes() {
  const taller = JSON.parse(sessionStorage.getItem('pz_taller') || '{}');
  const { count } = await db
    .from('mensajes_internos')
    .select('id', { count: 'exact', head: true })
    .eq('de_taller_id', taller.id)
    .eq('para_admin', false)
    .eq('leido', false);
  actualizarBadge('badge-mensajes', count || 0);
}

// ── INIT ──────────────────────────────────────
cargarDashboard();
cargarBadgesNotificacion();
setInterval(cargarBadgesNotificacion, 60000);
setInterval(verificarNotificaciones, 30000);
iniciarRealtime();
if (Notification.permission === 'default') Notification.requestPermission();

cargarClientesFrecuentes_badge();

async function cargarClientesFrecuentes_badge() {
  if (!TALLER_ID) return;
  const { data } = await db
    .from('turnos')
    .select('nombre_cliente, telefono_cliente')
    .eq('taller_id', TALLER_ID)
    .not('nombre_cliente', 'is', null);

  if (!data) return;
  const grupos = {};
  data.forEach(t => {
    const key = (t.nombre_cliente||'').toLowerCase() + '|' + (t.telefono_cliente||'');
    grupos[key] = (grupos[key] || 0) + 1;
  });
  const count = Object.values(grupos).filter(n => n >= 3).length;
  actualizarBadge('badge-frecuentes', count);
}

// ── MIS CLIENTES ──────────────────────────────
let todosLosClientes = [];

async function cargarClientes() {
  const el = document.getElementById('clientes-lista');
  el.innerHTML = '<div class="loader" style="padding:60px;text-align:center">Cargando...</div>';

  const { data, error } = await db
    .from('turnos')
    .select('nombre_cliente, telefono_cliente, creado_en, servicios_taller(nombre)')
    .eq('taller_id', TALLER_ID)
    .order('creado_en', { ascending: false });

  if (error || !data) {
    el.innerHTML = '<p style="color:#c00;padding:20px">Error al cargar clientes.</p>';
    return;
  }

  const mapa = {};
  data.forEach(t => {
    const key = (t.telefono_cliente || t.nombre_cliente || 'anonimo').toLowerCase().replace(/\s/g, '');
    if (!mapa[key]) {
      mapa[key] = {
        nombre: t.nombre_cliente || 'Sin nombre',
        telefono: t.telefono_cliente || '',
        visitas: 0,
        ultimoServicio: null,
        ultimaFecha: null,
      };
    }
    mapa[key].visitas++;
    if (!mapa[key].ultimaFecha || t.creado_en > mapa[key].ultimaFecha) {
      mapa[key].ultimaFecha = t.creado_en;
      mapa[key].ultimoServicio = t.servicios_taller?.nombre || 'Consulta general';
    }
  });

  todosLosClientes = Object.values(mapa).sort((a, b) => b.visitas - a.visitas);
  renderClientes(todosLosClientes);
}

function renderClientes(lista) {
  const el = document.getElementById('clientes-lista');
  if (!lista.length) {
    el.innerHTML = '<p style="color:#888;padding:60px;text-align:center">No hay clientes registrados aún.</p>';
    return;
  }
  el.innerHTML = lista.map(c => {
    const wsp = c.telefono
      ? `<a href="https://wa.me/549${c.telefono.replace(/\D/g,'')}" target="_blank"
           style="display:inline-flex;align-items:center;gap:6px;background:#25d366;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0">
           💬 WhatsApp
         </a>`
      : '';
    return `
      <div class="card" style="display:flex;align-items:center;gap:16px;padding:14px 20px;margin-bottom:10px">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--rojo);color:#fff;font-size:17px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${c.nombre.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:15px">${c.nombre}</div>
          <div style="font-size:12px;color:#888;margin-top:3px">
            ${c.telefono || 'Sin teléfono registrado'} &nbsp;·&nbsp;
            <strong>${c.visitas}</strong> visita${c.visitas !== 1 ? 's' : ''}
          </div>
          <div style="font-size:12px;color:#aaa;margin-top:2px">
            Último servicio: <strong style="color:#555">${c.ultimoServicio}</strong>
            ${c.ultimaFecha ? ' · ' + new Date(c.ultimaFecha).toLocaleDateString('es-AR') : ''}
          </div>
        </div>
        ${wsp}
      </div>
    `;
  }).join('');
}

function filtrarClientes(q) {
  const term = (q !== undefined ? q : document.getElementById('buscar-cliente').value).trim().toLowerCase();
  const filtered = term
    ? todosLosClientes.filter(c =>
        (c.nombre || '').toLowerCase().includes(term) ||
        (c.telefono || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term)
      )
    : todosLosClientes;
  renderClientes(filtered);
}

// ── REALTIME ──────────────────────────────────
function iniciarRealtime() {
  db.channel('point-' + TALLER_ID)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'turnos',
      filter: `taller_id=eq.${TALLER_ID}`
    }, payload => {
      const t = payload.new;
      mostrarNotifBrowser(`Nuevo turno: ${t.nombre_cliente || 'cliente'} — ${t.fecha} ${t.hora}`);
      const badge = document.getElementById('notif-badge');
      if (badge) {
        const actual = parseInt(badge.textContent || '0');
        badge.textContent = actual + 1;
        badge.classList.add('visible');
      }
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'presupuestos',
      filter: `taller_id=eq.${TALLER_ID}`
    }, payload => {
      const p = payload.new;
      mostrarNotifBrowser(`Nuevo presupuesto de ${p.nombre_cliente || 'cliente'}`);
    })
    .subscribe();
}

function mostrarNotifBrowser(texto) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:20px;right:20px;background:#1a1a1a;color:#fff;padding:14px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);border-left:4px solid var(--rojo);max-width:300px;animation:slideInNotif .3s ease';
  div.textContent = '🔔 ' + texto;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 6000);
  if (Notification.permission === 'granted')
    new Notification('Piezauto Point', { body: texto });
}

// ── CATÁLOGO PIEZAUTO ─────────────────────────
let _catalogoPzData = [];

async function cargarCatalogoPiezauto() {
  const el = document.getElementById('catalogo-piezauto-lista');
  el.innerHTML = '<div class="loader" style="padding:40px;text-align:center">Cargando novedades compatibles...</div>';

  // Obtener todos los modelo_id de vehículos de los clientes del taller
  const { data: turnos } = await db.from('turnos')
    .select('modelo_id')
    .eq('taller_id', TALLER_ID)
    .not('modelo_id', 'is', null);

  const modeloIds = [...new Set((turnos || []).map(t => t.modelo_id).filter(Boolean))];

  let data, error;
  if (modeloIds.length) {
    // Buscar compatibilidades → productos activos con esos modelos
    const { data: compats } = await db.from('compatibilidades')
      .select('producto_id')
      .in('modelo_id', modeloIds);

    const prodIds = [...new Set((compats || []).map(c => c.producto_id))];

    if (prodIds.length) {
      ({ data, error } = await db.from('productos')
        .select('id, nombre, codigo_pieza, precio, precio_oferta, imagenes, fecha_fin_oferta, creado_en, marca_vehiculo, vehiculo')
        .eq('activo', true)
        .gt('stock', 0)
        .in('id', prodIds.slice(0, 100))
        .order('creado_en', { ascending: false })
        .limit(40));
    }
  }

  if (!data || !data.length) {
    // Fallback: últimos productos del catálogo sin filtro de compatibilidad
    ({ data, error } = await db.from('productos')
      .select('id, nombre, codigo_pieza, precio, precio_oferta, imagenes, fecha_fin_oferta, creado_en, marca_vehiculo, vehiculo')
      .eq('activo', true)
      .gt('stock', 0)
      .order('creado_en', { ascending: false })
      .limit(30));
  }

  if (error || !data) {
    el.innerHTML = '<p style="text-align:center;color:#aaa;padding:40px">Error al cargar productos.</p>';
    return;
  }

  _catalogoPzData = data;
  renderCatalogoPiezauto(data);
  if (modeloIds.length) {
    const nota = document.createElement('div');
    nota.style.cssText = 'font-size:12px;color:#1a56c4;background:#e8f0fe;border-radius:8px;padding:8px 14px;margin-bottom:12px';
    nota.textContent = `🚗 Mostrando productos compatibles con los autos de tus clientes (${modeloIds.length} modelos detectados)`;
    el.prepend(nota);
  }
}

function renderCatalogoPiezauto(lista) {
  const el = document.getElementById('catalogo-piezauto-lista');
  if (!lista.length) {
    el.innerHTML = '<p style="text-align:center;color:#aaa;padding:40px">No hay productos disponibles.</p>';
    return;
  }

  el.innerHTML = lista.map(p => {
    const ahora = new Date();
    const tieneOferta = p.precio_oferta && (!p.fecha_fin_oferta || new Date(p.fecha_fin_oferta) >= ahora);
    const precio = tieneOferta ? p.precio_oferta : p.precio;
    const img = p.imagenes && p.imagenes[0] ? p.imagenes[0] : null;
    const url = `https://piezauto.com.ar/producto.html?id=${p.id}`;
    const msgWa = encodeURIComponent(`Hola! Te recomiendo este repuesto de Piezauto:\n\n*${p.nombre}* — $${Number(precio).toLocaleString('es-AR')}\n\nLo podés ver acá: ${url}`);

    return `
      <div class="catalogo-pz-item">
        ${img
          ? `<img class="catalogo-pz-img" src="${img}" alt="${p.nombre}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''
        }
        <div class="catalogo-pz-img-placeholder" ${img ? 'style="display:none"' : ''}>🔩</div>
        <div class="catalogo-pz-info">
          <div class="catalogo-pz-nombre">${p.nombre}</div>
          ${p.codigo_pieza ? `<div class="catalogo-pz-codigo">Cód: ${p.codigo_pieza}</div>` : ''}
          <div class="catalogo-pz-precio">$${Number(precio).toLocaleString('es-AR')}${tieneOferta ? ' <small style="color:#22c55e;font-size:11px">OFERTA</small>' : ''}</div>
        </div>
        <a href="https://wa.me/?text=${msgWa}" target="_blank" class="catalogo-pz-btn">📤 WhatsApp</a>
      </div>
    `;
  }).join('');
}

function filtrarCatalogoPiezauto() {
  const q = document.getElementById('catalogo-buscar').value.toLowerCase();
  const filtrado = _catalogoPzData.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.codigo_pieza || '').toLowerCase().includes(q)
  );
  renderCatalogoPiezauto(filtrado);
}

// ── CLIENTES FRECUENTES ───────────────────────
let _clientesFrecuentes = [];

async function cargarClientesFrecuentes() {
  if (!TALLER_ID) return;
  const el = document.getElementById('frecuentes-lista');
  el.innerHTML = '<div class="loader" style="padding:60px;text-align:center">Cargando...</div>';

  const { data, error } = await db
    .from('turnos')
    .select('id, nombre_cliente, telefono_cliente, fecha, hora, estado, descripcion, servicios_taller(nombre)')
    .eq('taller_id', TALLER_ID)
    .not('nombre_cliente', 'is', null)
    .order('fecha', { ascending: false });

  if (error || !data) {
    el.innerHTML = '<p style="text-align:center;color:#aaa;padding:60px">Error al cargar datos.</p>';
    return;
  }

  const grupos = {};
  data.forEach(t => {
    const nombre = (t.nombre_cliente || '').trim();
    if (!nombre) return;
    const key = nombre.toLowerCase() + '|' + (t.telefono_cliente || '');
    if (!grupos[key]) {
      grupos[key] = {
        nombre,
        telefono: t.telefono_cliente || '',
        turnos: []
      };
    }
    grupos[key].turnos.push(t);
  });

  _clientesFrecuentes = Object.values(grupos)
    .filter(c => c.turnos.length >= 3)
    .sort((a, b) => b.turnos.length - a.turnos.length);

  actualizarBadge('badge-frecuentes', _clientesFrecuentes.length);

  const statsEl = document.getElementById('stats-frecuentes');
  const totalVisitas = _clientesFrecuentes.reduce((sum, c) => sum + c.turnos.length, 0);
  const topCliente = _clientesFrecuentes[0];
  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-num">${_clientesFrecuentes.length}</div><div class="stat-label">Clientes frecuentes</div></div>
    <div class="stat-card"><div class="stat-num">${totalVisitas}</div><div class="stat-label">Visitas totales</div></div>
    ${topCliente ? `<div class="stat-card"><div class="stat-num">${topCliente.turnos.length}</div><div class="stat-label">Récord: ${topCliente.nombre}</div></div>` : ''}
  `;

  if (!_clientesFrecuentes.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#aaa">
      <div style="font-size:40px;margin-bottom:12px">⭐</div>
      <p style="font-size:15px;font-weight:600;color:#555">Aún no hay clientes con 3 o más visitas.</p>
      <p style="font-size:13px;margin-top:6px">Seguí sumando clientes y van a aparecer acá.</p>
    </div>`;
    return;
  }

  el.innerHTML = _clientesFrecuentes.map((c, idx) => {
    const inicial = c.nombre[0].toUpperCase();
    const ultimaVisita = c.turnos[0]?.fecha || '';
    const turnosHTML = c.turnos.slice(0, 5).map(t => {
      const servicio = t.servicios_taller?.nombre || t.descripcion || 'Servicio general';
      const fecha = t.fecha ? new Date(t.fecha + 'T00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : '—';
      return `<div class="frecuente-turno-row">
        <span class="frecuente-turno-fecha">${fecha} ${t.hora || ''}</span>
        <span class="frecuente-turno-servicio">${servicio}</span>
        <span class="badge-${t.estado || 'pendiente'}" style="font-size:11px;padding:2px 8px">${t.estado || '—'}</span>
      </div>`;
    }).join('');
    const masH = c.turnos.length > 5 ? `<p style="font-size:12px;color:#aaa;padding:6px 0">... y ${c.turnos.length - 5} visita${c.turnos.length - 5 !== 1 ? 's' : ''} más</p>` : '';

    const telLimpio = (c.telefono || '').replace(/\D/g, '');
    const msgWa = encodeURIComponent(`Hola ${c.nombre}! 👋 Te contactamos desde el taller. Tenemos una oferta especial para vos por ser cliente frecuente. Escribinos para más info!`);
    const waLink = telLimpio
      ? `https://wa.me/549${telLimpio.replace(/^0/, '')}?text=${msgWa}`
      : `https://wa.me/?text=${msgWa}`;

    return `<div class="frecuente-card">
      <div class="frecuente-header" id="frec-header-${idx}" onclick="toggleFrecuente(${idx})">
        <div class="frecuente-avatar">${inicial}</div>
        <div class="frecuente-info">
          <div class="frecuente-nombre">${c.nombre}</div>
          ${c.telefono ? `<div class="frecuente-tel">📱 ${c.telefono}</div>` : ''}
          ${ultimaVisita ? `<div class="frecuente-tel">Última visita: ${new Date(ultimaVisita + 'T00:00').toLocaleDateString('es-AR')}</div>` : ''}
        </div>
        <span class="frecuente-visitas">${c.turnos.length} visita${c.turnos.length !== 1 ? 's' : ''}</span>
        <div class="frecuente-acciones">
          <a href="${waLink}" target="_blank" class="frecuente-oferta-btn" onclick="event.stopPropagation()">📤 Oferta WA</a>
        </div>
      </div>
      <div class="frecuente-historial" id="frec-hist-${idx}">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;color:#555">Historial de visitas:</p>
        ${turnosHTML}
        ${masH}
      </div>
    </div>`;
  }).join('');
}

function toggleFrecuente(idx) {
  const header = document.getElementById('frec-header-' + idx);
  const hist   = document.getElementById('frec-hist-' + idx);
  if (!header || !hist) return;
  header.classList.toggle('abierto');
  hist.classList.toggle('abierto');
}

// ── AGENDA MÓVIL ─────────────────────────────
let diaOffset = 0;

function navegarDia(dir) {
  diaOffset += dir;
  renderAgendaSemanal();
}

// Parcha renderAgendaSemanal para mostrar 1 día en mobile
const _renderAgendaSemanalOriginal = renderAgendaSemanal;
async function renderAgendaSemanal() {
  if (window.innerWidth >= 700) {
    diaOffset = 0;
    return _renderAgendaSemanalOriginal();
  }
  // Vista mobile: un solo día
  const contenedor = document.getElementById('agenda-contenido');
  contenedor.innerHTML = '<div class="loader">Cargando...</div>';

  const base = new Date();
  base.setDate(base.getDate() + diaOffset);
  base.setHours(0, 0, 0, 0);
  const fechaISO = toISO(base);
  const labelDia = base.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' });
  document.getElementById('agenda-rango').textContent = labelDia.charAt(0).toUpperCase() + labelDia.slice(1);

  const { data: turnos } = await db.from('turnos')
    .select('*, servicios_taller(nombre)')
    .eq('taller_id', TALLER_ID)
    .eq('fecha', fechaISO)
    .order('hora');

  const horas = [];
  for (let h = 8; h <= 20; h++) horas.push(`${String(h).padStart(2,'0')}:00`);

  const coloresEstado = {
    pendiente:  { bg: '#fef3c7', color: '#92400e' },
    confirmado: { bg: '#dbeafe', color: '#1e40af' },
    completado: { bg: '#dcfce7', color: '#166534' },
    cancelado:  { bg: '#f1f5f9', color: '#64748b' },
  };

  const filas = horas.map(hora => {
    const turnosDia = (turnos || []).filter(t => t.hora && t.hora.startsWith(hora.slice(0, 2)));
    const bloques = turnosDia.map(t => {
      const c = coloresEstado[t.estado] || coloresEstado.pendiente;
      return `<div class="agenda-turno-bloque" style="background:${c.bg};color:${c.color};padding:6px 10px;margin-bottom:4px;border-radius:6px;font-size:13px;cursor:pointer" onclick="verDetalleTurnoAgenda('${t.id}')">${t.nombre_cliente || 'Cliente'} · ${t.hora?.slice(0,5) || ''}</div>`;
    }).join('');
    const celdaVacia = !turnosDia.length ? `<div style="color:#ddd;font-size:12px;cursor:pointer;padding:4px 0" onclick="agendaClickCelda('${fechaISO}','${hora}')">+ Agregar turno</div>` : '';
    return `<div style="display:grid;grid-template-columns:60px 1fr;border-bottom:1px solid #f0f0f0;min-height:44px;align-items:center">
      <div style="font-size:11px;color:#aaa;padding:4px 8px">${hora}</div>
      <div style="padding:4px 8px">${bloques}${celdaVacia}</div>
    </div>`;
  }).join('');

  contenedor.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn-blanco" onclick="navegarDia(-1)">← Ayer</button>
      <button class="btn btn-blanco" onclick="diaOffset=0;renderAgendaSemanal()">Hoy</button>
      <button class="btn btn-blanco" onclick="navegarDia(1)">Mañana →</button>
    </div>
    <div style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:var(--sombra)">
      <div style="background:var(--negro);color:#fff;padding:10px 14px;font-weight:700;font-size:14px">${labelDia.charAt(0).toUpperCase() + labelDia.slice(1)}</div>
      ${filas}
    </div>`;

  agendaTurnosCache = turnos || [];
}

// Mejora el modal de turno para mostrar más info
const _verDetalleTurnoAgendaOriginal = verDetalleTurnoAgenda;
async function verDetalleTurnoAgenda(id) {
  let turno = agendaTurnosCache.find(t => String(t.id) === String(id));
  if (!turno) {
    const { data } = await db.from('turnos').select('*, servicios_taller(nombre)').eq('id', id).single();
    turno = data;
  }
  if (!turno) return;

  agendaTurnoActual = turno;
  document.getElementById('mta-nombre').textContent = turno.nombre_cliente || 'Cliente';
  document.getElementById('mta-estado').value = turno.estado || 'pendiente';

  const servicio = turno.servicios_taller?.nombre || turno.descripcion || 'Sin descripción';
  const fechaLabel = formatFecha(turno.fecha);
  const hora = turno.hora?.slice(0, 5) || '—';
  document.getElementById('mta-info').innerHTML = `
    <div style="display:grid;gap:6px;font-size:13px">
      <div>📅 <strong>${fechaLabel}</strong> a las <strong>${hora}</strong></div>
      ${turno.telefono ? `<div>📱 <a href="tel:${turno.telefono}" style="color:var(--rojo)">${turno.telefono}</a></div>` : ''}
      ${turno.telefono ? `<div><a href="https://wa.me/${turno.telefono.replace(/\D/g,'')}" target="_blank" style="color:#25d366;font-weight:600">💬 WhatsApp</a></div>` : ''}
      <div>🔧 ${servicio}</div>
    </div>`;

  const modal = document.getElementById('modal-turno-agenda');
  modal.style.display = 'flex';
}

// ── FINANZAS ─────────────────────────────────
let finanzasData = null;
let chartFinanzas = null;

async function cargarFinanzas() {
  const ahora = new Date();
  const mesLabel = ahora.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const el = document.getElementById('finanzas-mes-label');
  if (el) el.textContent = 'Mes de ' + mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
  const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0];

  const [turnosRes, serviciosRes] = await Promise.all([
    db.from('turnos')
      .select('id, fecha, estado, servicio_id, servicios_taller(nombre, precio)')
      .eq('taller_id', TALLER_ID)
      .eq('estado', 'completado')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes),
    db.from('servicios_taller')
      .select('id, nombre, precio')
      .eq('taller_id', TALLER_ID),
  ]);

  const turnos    = turnosRes.data || [];
  const servicios = serviciosRes.data || [];

  const totalIngresos = turnos.reduce((sum, t) => sum + (t.servicios_taller?.precio || 0), 0);
  const promedio      = turnos.length ? Math.round(totalIngresos / turnos.length) : 0;

  document.getElementById('fin-ingresos').textContent  = totalIngresos ? '$' + Number(totalIngresos).toLocaleString('es-AR') : '$0';
  document.getElementById('fin-atendidos').textContent = turnos.length;
  document.getElementById('fin-promedio').textContent  = promedio ? '$' + Number(promedio).toLocaleString('es-AR') : '—';

  // Ingresos por semana del mes
  const semanas = [0, 0, 0, 0, 0];
  turnos.forEach(t => {
    const dia = parseInt(t.fecha?.split('-')[2] || 1);
    const idx = Math.min(Math.floor((dia - 1) / 7), 4);
    semanas[idx] += (t.servicios_taller?.precio || 0);
  });
  const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'].filter((_, i) => semanas[i] !== undefined);

  if (chartFinanzas) chartFinanzas.destroy();
  const ctx = document.getElementById('chart-finanzas-semanas');
  if (ctx) {
    chartFinanzas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Ingresos estimados ($)',
          data: semanas.slice(0, labels.length),
          backgroundColor: '#E63946cc',
          borderColor: '#E63946',
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => '$' + Number(v).toLocaleString('es-AR') } },
        },
      },
    });
  }

  // Top servicios
  const conteo = {};
  const ingrSrv = {};
  turnos.forEach(t => {
    const nombre = t.servicios_taller?.nombre || 'Sin servicio';
    const precio = t.servicios_taller?.precio || 0;
    conteo[nombre]  = (conteo[nombre]  || 0) + 1;
    ingrSrv[nombre] = (ingrSrv[nombre] || 0) + precio;
  });
  const tops = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const topEl = document.getElementById('fin-top-servicios');
  if (!tops.length) {
    topEl.innerHTML = '<p style="color:#aaa;font-size:14px;padding:12px 0">No hay servicios completados este mes.</p>';
    return;
  }
  topEl.innerHTML = `<table class="tabla">
    <thead><tr><th>Servicio</th><th>Cantidad</th><th>Total estimado</th></tr></thead>
    <tbody>${tops.map(([nombre, cant]) =>
      `<tr><td>${nombre}</td><td>${cant}</td><td>$${Number(ingrSrv[nombre]).toLocaleString('es-AR')}</td></tr>`
    ).join('')}</tbody>
  </table>`;

  finanzasData = { turnos, semanas, tops, totalIngresos, promedio };
}

function exportarFinanzasCSV() {
  if (!finanzasData) return;
  const { tops } = finanzasData;
  const ahora = new Date();
  const mes = ahora.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const lineas = [
    ['Piezauto Point — Resumen financiero', mes],
    [],
    ['Ingresos estimados', finanzasData.totalIngresos],
    ['Turnos completados', finanzasData.turnos.length],
    ['Promedio por turno', finanzasData.promedio],
    [],
    ['Servicio', 'Cantidad', 'Total estimado'],
    ...tops.map(([nombre, cant]) => [nombre, cant, finanzasData.turnos
      .filter(t => (t.servicios_taller?.nombre || 'Sin servicio') === nombre)
      .reduce((s, t) => s + (t.servicios_taller?.precio || 0), 0)
    ]),
  ];

  const csv = lineas.map(row => Array.isArray(row) ? row.join(',') : '').join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `finanzas-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── INVENTARIO / MIS REPUESTOS ────────────────
async function cargarRepuestos() {
  const { data } = await db.from('inventario_taller')
    .select('*')
    .eq('taller_id', TALLER_ID)
    .eq('activo', true)
    .order('descripcion');

  const items = data || [];
  const bajoStock = items.filter(i => i.cantidad < 2);

  const alertaEl  = document.getElementById('repuesto-alerta-stock');
  const alertaTxt = document.getElementById('repuesto-alerta-texto');
  if (bajoStock.length) {
    alertaEl.style.display = 'block';
    alertaTxt.textContent  = `${bajoStock.length} pieza${bajoStock.length > 1 ? 's' : ''} con stock bajo (< 2 unidades): ${bajoStock.map(i => i.descripcion).join(', ')}`;
    const badge = document.getElementById('badge-repuestos-bajo');
    if (badge) { badge.style.display = 'inline-flex'; badge.textContent = bajoStock.length; }
  } else {
    alertaEl.style.display = 'none';
    const badge = document.getElementById('badge-repuestos-bajo');
    if (badge) badge.style.display = 'none';
  }

  const tbody = document.getElementById('tbody-repuestos');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:#aaa">No tenés piezas registradas. Usá el botón + Agregar pieza.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(i => `
    <tr>
      <td>${i.descripcion}</td>
      <td style="color:#888;font-size:13px">${i.codigo || '—'}</td>
      <td>
        <span style="font-weight:700;color:${i.cantidad < 2 ? '#E63946' : i.cantidad < 5 ? '#e67e22' : '#1a7a3f'}">${i.cantidad}</span>
        <span style="font-size:12px;color:#aaa"> ${i.unidad || 'u.'}</span>
        ${i.cantidad < 2 ? '<span style="font-size:10px;font-weight:700;background:#fce8e8;color:#c00;padding:1px 6px;border-radius:10px;margin-left:4px">BAJO</span>' : ''}
      </td>
      <td style="font-size:13px;color:#555">${i.precio_costo ? '$' + Number(i.precio_costo).toLocaleString('es-AR') : '—'}</td>
      <td style="font-weight:700">${i.precio_venta ? '$' + Number(i.precio_venta).toLocaleString('es-AR') : '—'}</td>
      <td>
        <button onclick="editarRepuesto(${JSON.stringify(i).replace(/"/g,'&quot;')})" style="background:#e8f0fe;color:#1a56c4;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px">Editar</button>
        <button onclick="eliminarRepuesto('${i.id}')" style="background:#fce8e8;color:#c00;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">Eliminar</button>
      </td>
    </tr>`).join('');
}

function editarRepuesto(item) {
  document.getElementById('repuesto-form-card').style.display = 'block';
  document.getElementById('repuesto-form-titulo').textContent = 'Editar pieza';
  document.getElementById('r-id').value          = item.id;
  document.getElementById('r-codigo').value      = item.codigo || '';
  document.getElementById('r-descripcion').value = item.descripcion;
  document.getElementById('r-cantidad').value    = item.cantidad;
  document.getElementById('r-costo').value       = item.precio_costo || '';
  document.getElementById('r-venta').value       = item.precio_venta || '';
  document.getElementById('r-unidad').value      = item.unidad || 'unidad';
  document.getElementById('repuesto-form-card').scrollIntoView({ behavior: 'smooth' });
}

async function guardarRepuesto() {
  const msg    = document.getElementById('r-msg');
  const id     = document.getElementById('r-id').value;
  const desc   = document.getElementById('r-descripcion').value.trim();
  const cantRaw = document.getElementById('r-cantidad').value;

  if (!desc) { msg.style.color = '#E63946'; msg.textContent = 'Ingresá una descripción.'; return; }
  if (cantRaw === '') { msg.style.color = '#E63946'; msg.textContent = 'Ingresá la cantidad en stock.'; return; }

  const payload = {
    taller_id:    TALLER_ID,
    codigo:       document.getElementById('r-codigo').value.trim() || null,
    descripcion:  desc,
    cantidad:     parseInt(cantRaw),
    precio_costo: parseFloat(document.getElementById('r-costo').value) || null,
    precio_venta: parseFloat(document.getElementById('r-venta').value) || null,
    unidad:       document.getElementById('r-unidad').value,
    activo:       true,
  };

  let error;
  if (id) {
    ({ error } = await db.from('inventario_taller').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('inventario_taller').insert(payload));
  }

  if (error) {
    msg.style.color = '#E63946';
    msg.textContent = '❌ Error al guardar: ' + error.message;
  } else {
    document.getElementById('repuesto-form-card').style.display = 'none';
    document.getElementById('repuesto-form-titulo').textContent = 'Agregar pieza';
    ['r-id','r-codigo','r-descripcion','r-cantidad','r-costo','r-venta'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    msg.textContent = '';
    cargarRepuestos();
  }
}

async function eliminarRepuesto(id) {
  if (!confirm('¿Eliminás esta pieza del inventario?')) return;
  await db.from('inventario_taller').update({ activo: false }).eq('id', id);
  cargarRepuestos();
}

