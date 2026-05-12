// Página /perfil.html — datos del cliente + vehículos

async function iniciarPerfil() {
  const cliente = await getClienteActual();
  if (!cliente) {
    window.location.href = '/login?redirect=/perfil';
    return;
  }
  renderPerfil(cliente);
  await cargarVehiculos(cliente.id);
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
