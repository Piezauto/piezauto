// Página /vehiculos.html — alta, edición y listado de vehículos del cliente

let clienteActual = null;
let editandoId = null;

async function iniciarVehiculos() {
  clienteActual = await getClienteActual();
  if (!clienteActual) {
    window.location.href = 'login.html?redirect=vehiculos.html';
    return;
  }

  await cargarMarcas();
  await cargarListaVehiculos();

  // Si viene con ?editar=ID abrimos el modo edición
  const params = new URLSearchParams(window.location.search);
  const idEditar = params.get('editar');
  if (idEditar) abrirEdicion(idEditar);
}

async function cargarMarcas() {
  const select = document.getElementById('marca');
  const { data, error } = await dbB2C
    .from('cat_marcas_terminales')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');

  if (error || !data) return;

  data.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.nombre;
    opt.textContent = m.nombre;
    select.appendChild(opt);
  });
}

async function cargarListaVehiculos() {
  const wrap = document.getElementById('vehiculos-lista');
  wrap.innerHTML = '<p style="color:var(--gris-text);font-size:13px;padding:12px 0;">Cargando...</p>';

  const { data, error } = await dbB2C
    .from('cat_clientes_vehiculos')
    .select('id, marca_nombre, modelo, anio, version, patente, color, principal, created_at')
    .eq('cliente_id', clienteActual.id)
    .order('principal', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    wrap.innerHTML = `<p style="color:var(--rojo);font-size:13px;">Error al cargar vehículos: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:28px 0;color:var(--gris-text);">
        <div style="font-size:40px;margin-bottom:10px;">🚗</div>
        <p style="font-size:14px;font-weight:600;">Todavía no agregaste ningún vehículo.</p>
        <p style="font-size:13px;margin-top:4px;">Completá el formulario de arriba para agregar tu primer auto.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = data.map(v => `
    <div class="vehiculo-row" id="vrow-${v.id}">
      <div class="vehiculo-info">
        <div class="vehiculo-titulo">
          ${v.marca_nombre || ''} ${v.modelo || ''}
          ${v.version ? `<span class="vversion">${v.version}</span>` : ''}
          ${v.principal ? '<span class="badge-principal">Principal</span>' : ''}
        </div>
        <div class="vehiculo-detalles">
          ${v.anio ? `<span>📅 ${v.anio}</span>` : ''}
          ${v.patente ? `<span>🔖 ${v.patente}</span>` : ''}
          ${v.color ? `<span>🎨 ${v.color}</span>` : ''}
        </div>
      </div>
      <div class="vehiculo-acciones">
        <button onclick="abrirEdicion('${v.id}')" class="btn btn-blanco" style="font-size:12px;padding:7px 12px;">Editar</button>
        <button onclick="eliminarVehiculo('${v.id}')" class="btn" style="font-size:12px;padding:7px 12px;background:#fff0f0;color:var(--rojo);border:1px solid #ffd0d0;">Eliminar</button>
      </div>
    </div>
  `).join('');
}

async function abrirEdicion(id) {
  const { data, error } = await dbB2C
    .from('cat_clientes_vehiculos')
    .select('*')
    .eq('id', id)
    .eq('cliente_id', clienteActual.id)
    .single();

  if (error || !data) return;

  editandoId = id;

  const marcaSelect = document.getElementById('marca');
  // Intentar seleccionar la marca existente, si no existe agregarla temporalmente
  let marcaEncontrada = false;
  for (const opt of marcaSelect.options) {
    if (opt.value === data.marca_nombre) { marcaEncontrada = true; break; }
  }
  if (!marcaEncontrada && data.marca_nombre) {
    const opt = document.createElement('option');
    opt.value = data.marca_nombre;
    opt.textContent = data.marca_nombre;
    marcaSelect.appendChild(opt);
  }
  marcaSelect.value = data.marca_nombre || '';

  document.getElementById('modelo').value   = data.modelo || '';
  document.getElementById('anio').value     = data.anio || '';
  document.getElementById('version').value  = data.version || '';
  document.getElementById('patente').value  = data.patente || '';
  document.getElementById('color').value    = data.color || '';
  document.getElementById('principal').checked = data.principal || false;

  document.getElementById('form-titulo').textContent = 'Editar vehículo';
  document.getElementById('btn-cancelar-edicion').style.display = 'inline-block';
  document.getElementById('btn-submit').textContent = 'Guardar cambios';

  document.getElementById('form-vehiculo').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicion() {
  editandoId = null;
  document.getElementById('form-vehiculo').reset();
  document.getElementById('form-titulo').textContent = 'Agregar vehículo';
  document.getElementById('btn-cancelar-edicion').style.display = 'none';
  document.getElementById('btn-submit').textContent = 'Guardar vehículo';
  limpiarAlertasVehiculo();
}

function limpiarAlertasVehiculo() {
  document.getElementById('alerta-vehiculo-error').classList.remove('visible');
  document.getElementById('alerta-vehiculo-ok').classList.remove('visible');
}

async function guardarVehiculo(e) {
  e.preventDefault();
  limpiarAlertasVehiculo();

  const btnSubmit = document.getElementById('btn-submit');
  const alertaError = document.getElementById('alerta-vehiculo-error');
  const alertaOk    = document.getElementById('alerta-vehiculo-ok');

  const marca    = document.getElementById('marca').value;
  const modelo   = document.getElementById('modelo').value.trim();
  const anio     = parseInt(document.getElementById('anio').value, 10);
  const version  = document.getElementById('version').value.trim() || null;
  const patente  = document.getElementById('patente').value.trim().toUpperCase() || null;
  const color    = document.getElementById('color').value.trim() || null;
  const principal= document.getElementById('principal').checked;

  if (!marca) {
    alertaError.textContent = 'Seleccioná la marca.';
    alertaError.classList.add('visible');
    return;
  }
  if (!modelo) {
    alertaError.textContent = 'Ingresá el modelo.';
    alertaError.classList.add('visible');
    return;
  }
  if (!anio || anio < 1950 || anio > 2030) {
    alertaError.textContent = 'Ingresá un año válido (1950–2030).';
    alertaError.classList.add('visible');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = editandoId ? 'Guardando...' : 'Guardando...';

  // Si va a ser principal, quitar el flag del resto
  if (principal) {
    await dbB2C
      .from('cat_clientes_vehiculos')
      .update({ principal: false })
      .eq('cliente_id', clienteActual.id);
  }

  const payload = {
    cliente_id:   clienteActual.id,
    marca_nombre: marca,
    modelo,
    anio,
    version,
    patente,
    color,
    principal,
  };

  let error;
  if (editandoId) {
    const res = await dbB2C
      .from('cat_clientes_vehiculos')
      .update(payload)
      .eq('id', editandoId)
      .eq('cliente_id', clienteActual.id);
    error = res.error;
  } else {
    const res = await dbB2C
      .from('cat_clientes_vehiculos')
      .insert(payload);
    error = res.error;
  }

  if (error) {
    alertaError.textContent = 'Error al guardar: ' + error.message;
    alertaError.classList.add('visible');
    btnSubmit.disabled = false;
    btnSubmit.textContent = editandoId ? 'Guardar cambios' : 'Guardar vehículo';
    return;
  }

  alertaOk.textContent = editandoId ? '¡Vehículo actualizado!' : '¡Vehículo agregado!';
  alertaOk.classList.add('visible');

  cancelarEdicion();
  await cargarListaVehiculos();

  btnSubmit.disabled = false;
}

async function eliminarVehiculo(id) {
  if (!confirm('¿Seguro que querés eliminar este vehículo?')) return;
  const { error } = await dbB2C
    .from('cat_clientes_vehiculos')
    .delete()
    .eq('id', id)
    .eq('cliente_id', clienteActual.id);

  if (error) { alert('Error al eliminar: ' + error.message); return; }
  await cargarListaVehiculos();
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarVehiculos();

  document.getElementById('form-vehiculo').addEventListener('submit', guardarVehiculo);
  document.getElementById('btn-cancelar-edicion').addEventListener('click', cancelarEdicion);

  // Año: solo números
  document.getElementById('anio').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '');
  });

  // Patente: uppercase
  document.getElementById('patente').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
  });
});
