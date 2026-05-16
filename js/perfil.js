// Página /perfil.html — datos del cliente + vehículos

async function iniciarPerfil() {
  const cliente = await getClienteActual();
  if (!cliente) {
    window.location.href = '/login?redirect=/perfil';
    return;
  }
  renderPerfil(cliente);
  await cargarVehiculos(cliente.id);
  renderPreferencias(cliente);
  cargarComprasWidget(cliente.id);
  cargarWalletWidget(cliente.id);
  cargarPresupuestosWidget(cliente.id);
}

function renderPerfil(cliente) {
  document.getElementById('perfil-nombre-display').textContent =
    (cliente.nombre || '') + ' ' + (cliente.apellido || '');
  document.getElementById('perfil-email-display').textContent = cliente.email || '';

  if (cliente.credito_saldo && parseFloat(cliente.credito_saldo) > 0) {
    document.getElementById('creditos-wrap').style.display = 'flex';
    document.getElementById('creditos-monto').textContent =
      '$' + parseFloat(cliente.credito_saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 });
  }

  const campos = ['nombre', 'apellido', 'telefono', 'localidad'];
  campos.forEach(c => {
    const el = document.getElementById('edit-' + c);
    if (el) el.value = cliente[c] || '';
  });
  const prov = document.getElementById('edit-provincia');
  if (prov) prov.value = cliente.provincia || '';
}

async function cargarVehiculos(clienteId) {
  const wrap = document.getElementById('vehiculos-lista');
  wrap.innerHTML = '<p style="color:var(--gris-text);font-size:13px;">Cargando vehículos...</p>';

  const { data, error } = await dbB2C
    .from('cat_clientes_vehiculos')
    .select('id, marca_terminal_id, cat_marcas_terminales!marca_terminal_id(nombre), modelo, anio, version, patente, color, principal')
    .eq('cliente_id', clienteId)
    .order('principal', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--gris-text);">
        <div style="font-size:32px;margin-bottom:8px;">🚗</div>
        <p style="font-size:14px;">Todavía no cargaste ningún vehículo.</p>
        <a href="vehiculos.html" class="btn btn-rojo" style="margin-top:14px;display:inline-block;">
          Agregar vehículo
        </a>
      </div>`;
    return;
  }

  wrap.innerHTML = data.map(v => `
    <div class="vehiculo-card ${v.principal ? 'principal' : ''}">
      <div class="vehiculo-info">
        <div class="vehiculo-nombre">
          ${v.cat_marcas_terminales?.nombre || ''} ${v.modelo || ''} ${v.anio ? v.anio : ''}
          ${v.version ? `<span class="vehiculo-version">${v.version}</span>` : ''}
          ${v.principal ? '<span class="badge-principal">Principal</span>' : ''}
        </div>
        ${v.patente ? `<div class="vehiculo-meta">Patente: <strong>${v.patente}</strong></div>` : ''}
        ${v.color ? `<div class="vehiculo-meta">Color: ${v.color}</div>` : ''}
      </div>
      <div class="vehiculo-acciones">
        <a href="/mi-vehiculo?v=${v.id}" class="btn btn-rojo" style="font-size:12px;padding:7px 12px;">📋 Carnet</a>
        <a href="vehiculos.html?editar=${v.id}" class="btn btn-blanco" style="font-size:12px;padding:7px 12px;">Editar</a>
        <button onclick="eliminarVehiculo('${v.id}')" class="btn" style="font-size:12px;padding:7px 12px;background:#fff0f0;color:var(--rojo);border:1px solid #ffd0d0;">Eliminar</button>
      </div>
    </div>
  `).join('');

  document.getElementById('vehiculos-count').textContent = data.length;
}

async function eliminarVehiculo(id) {
  mostrarConfirm('¿Seguro que querés eliminar este vehículo?', async function() {
    const { error } = await dbB2C.from('cat_clientes_vehiculos').delete().eq('id', id);
    if (error) {
      mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
      return;
    }
    const cliente = await getClienteActual();
    if (cliente) await cargarVehiculos(cliente.id);
  });
}

async function guardarPerfil(e) {
  e.preventDefault();
  const btnGuardar = document.getElementById('btn-guardar');
  const alertaError = document.getElementById('alerta-perfil-error');
  const alertaOk    = document.getElementById('alerta-perfil-ok');

  alertaError.classList.remove('visible');
  alertaOk.classList.remove('visible');

  const datos = {
    nombre:   document.getElementById('edit-nombre').value.trim(),
    apellido: document.getElementById('edit-apellido').value.trim(),
    telefono: document.getElementById('edit-telefono').value.trim() || null,
    localidad:document.getElementById('edit-localidad').value.trim() || null,
    provincia:document.getElementById('edit-provincia').value || null,
  };

  if (!datos.nombre || !datos.apellido) {
    alertaError.textContent = 'El nombre y apellido son obligatorios.';
    alertaError.classList.add('visible');
    return;
  }

  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  const cliente = await getClienteActual();
  if (!cliente) { window.location.href = '/login'; return; }

  const { error } = await dbB2C
    .from('cat_clientes_finales')
    .update(datos)
    .eq('auth_user_id', cliente.auth_user_id);

  if (error) {
    alertaError.textContent = 'Error al guardar: ' + error.message;
    alertaError.classList.add('visible');
  } else {
    alertaOk.textContent = '¡Datos actualizados correctamente!';
    alertaOk.classList.add('visible');
    document.getElementById('perfil-nombre-display').textContent =
      datos.nombre + ' ' + datos.apellido;
  }

  btnGuardar.disabled = false;
  btnGuardar.textContent = 'Guardar cambios';
}

// ── Preferencias ─────────────────────────────────────────────
function renderPreferencias(cliente) {
  const wrap = document.getElementById('prefs-wrap');
  if (!wrap) return;

  const autoaprobar = !!cliente.autoaprobar_trabajos;
  const canal       = cliente.notif_canal || 'app';

  wrap.innerHTML = `
    <div class="pref-row">
      <div class="pref-info">
        <div class="pref-label">Aprobar trabajos automáticamente</div>
        <div class="pref-sub">Los trabajos registrados por talleres se agregan al historial sin requerir tu aprobación.</div>
      </div>
      <label class="toggle-wrap">
        <input type="checkbox" id="pref-autoaprobar" ${autoaprobar ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="pref-row" style="border-top:1px solid #f0f0f0;padding-top:14px;margin-top:0">
      <div class="pref-info">
        <div class="pref-label">Canal de notificaciones</div>
        <div class="pref-sub">Cómo querés recibir recordatorios y avisos.</div>
      </div>
      <select id="pref-canal" style="border:1.5px solid #ddd;border-radius:8px;padding:7px 10px;font-size:13px;font-family:inherit;outline:none">
        <option value="app"      ${canal==='app'       ? 'selected' : ''}>En la app</option>
        <option value="whatsapp" ${canal==='whatsapp'  ? 'selected' : ''}>WhatsApp</option>
        <option value="email"    ${canal==='email'     ? 'selected' : ''}>Email</option>
      </select>
    </div>
    <button onclick="guardarPreferencias()" id="btn-guardar-prefs" style="margin-top:14px;width:100%;padding:11px;background:var(--rojo);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Guardar preferencias</button>
    <div id="prefs-msg" style="font-size:12px;text-align:center;margin-top:8px;min-height:16px;color:#888"></div>`;
}

async function guardarPreferencias() {
  const btn  = document.getElementById('btn-guardar-prefs');
  const msg  = document.getElementById('prefs-msg');
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  const cliente = await getClienteActual();
  if (!cliente) { window.location.href = '/login'; return; }

  const { error } = await dbB2C
    .from('cat_clientes_finales')
    .update({
      autoaprobar_trabajos: document.getElementById('pref-autoaprobar').checked,
      notif_canal:          document.getElementById('pref-canal').value,
    })
    .eq('id', cliente.id);

  if (error) {
    msg.style.color = '#c00';
    msg.textContent = 'Error: ' + error.message;
  } else {
    msg.style.color = '#059669';
    msg.textContent = '¡Preferencias guardadas!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  btn.disabled = false;
  btn.textContent = 'Guardar preferencias';
}

async function cargarComprasWidget(clienteId) {
  const card = document.getElementById('compras-card');
  if (!card) return;
  const { data } = await dbB2C
    .from('cat_oportunidades_compra_programada')
    .select('id, estado')
    .eq('cliente_id', clienteId)
    .in('estado', ['detectada','notificada','vista_cliente'])
    .gt('fecha_expiracion', new Date().toISOString());
  const count = data?.length || 0;
  if (!count) return;
  card.style.display = 'block';
  document.getElementById('compras-count').textContent = count;
  const noVistas = data.filter(o => o.estado === 'detectada' || o.estado === 'notificada').length;
  if (noVistas > 0) document.getElementById('compras-badge').style.display = 'inline';
}

async function cargarPresupuestosWidget(clienteId) {
  const card = document.getElementById('presupuestos-card');
  if (!card) return;
  const { data } = await dbB2C
    .from('cat_solicitudes_presupuesto')
    .select('estado')
    .eq('cliente_id', clienteId)
    .in('estado', ['abierta','recibiendo_presupuestos']);
  const count = data?.length || 0;
  card.style.display = 'block';
  document.getElementById('pres-activas-count').textContent = count;
  document.getElementById('pres-activas-sub').textContent =
    count === 1 ? 'solicitud activa' : 'solicitudes activas';
}

async function cargarWalletWidget(clienteId) {
  const card = document.getElementById('wallet-card');
  if (!card) return;
  const { data } = await dbB2C
    .from('cat_wallet_b2c')
    .select('saldo')
    .eq('cliente_id', clienteId)
    .maybeSingle();
  if (!data) return;
  const saldo = parseFloat(data.saldo || 0);
  card.style.display = 'block';
  document.getElementById('wallet-saldo-perfil').textContent =
    '$' + saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 });
  if (saldo === 0) {
    document.getElementById('wallet-sub-perfil').textContent = 'Comprá para ganar cashback';
  }
}

async function cerrarSesion() {
  await logoutCliente();
  window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarPerfil();

  const formPerfil = document.getElementById('form-perfil');
  if (formPerfil) formPerfil.addEventListener('submit', guardarPerfil);

  const btnSalir = document.getElementById('btn-logout');
  if (btnSalir) btnSalir.addEventListener('click', cerrarSesion);
});
