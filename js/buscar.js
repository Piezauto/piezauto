// Búsqueda de SKUs — Fase 2 Piezauto
// Depende de: dbB2C (auth-b2c.js), getClienteActual (auth-b2c.js)

const PAGE_SIZE = 20;
let _pagina = 1;
let _totalPaginas = 1;
let _queryActual = '';
let _filtros = { familia: '', marca: '' };
let _familias = [];
let _marcas = [];
let _vehiculoPrincipal = null;

async function initBuscar() {
  await cargarFiltros();

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || '';
  const familia = params.get('familia') || '';
  const marca = params.get('marca') || '';

  if (q) _queryActual = q;
  if (familia) _filtros.familia = familia;
  if (marca) _filtros.marca = marca;

  const cliente = await getClienteActual();
  if (cliente) {
    await cargarVehiculoPrincipal(cliente.id);
  }

  aplicarFiltrosMarcas();
  actualizarSelectFamilia();
  actualizarSelectMarca();

  if (q || familia || marca) {
    await ejecutarBusqueda();
  } else {
    mostrarEstadoVacio();
  }

  document.getElementById('sel-familia').addEventListener('change', e => {
    _filtros.familia = e.target.value;
    _pagina = 1;
    ejecutarBusqueda();
  });
  document.getElementById('sel-marca').addEventListener('change', e => {
    _filtros.marca = e.target.value;
    _pagina = 1;
    ejecutarBusqueda();
  });
  document.getElementById('btn-limpiar-filtros').addEventListener('click', limpiarFiltros);
}

async function cargarFiltros() {
  const { data: fams } = await dbB2C
    .from('cat_familias')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');
  _familias = fams || [];

  const { data: marcas } = await dbB2C
    .from('cat_marcas_terminales')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');
  _marcas = marcas || [];
}

async function cargarVehiculoPrincipal(clienteId) {
  const { data } = await dbB2C
    .from('cat_clientes_vehiculos')
    .select('id, marca_terminal_id, cat_marcas_terminales!marca_terminal_id(id, nombre), modelo, anio')
    .eq('cliente_id', clienteId)
    .eq('principal', true)
    .limit(1);

  if (data?.[0]) {
    _vehiculoPrincipal = data[0];
    const marcaNombre = data[0].cat_marcas_terminales?.nombre;
    if (marcaNombre && !_filtros.marca) {
      _filtros.marca = data[0].marca_terminal_id;
      mostrarBannerVehiculo(marcaNombre, data[0].modelo, data[0].anio);
    }
  }
}

function mostrarBannerVehiculo(marca, modelo, anio) {
  const banner = document.getElementById('banner-vehiculo');
  if (!banner) return;
  banner.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    Mostrando resultados para <strong>${marca} ${modelo} ${anio || ''}</strong>
    <button onclick="quitarFiltroVehiculo()" class="banner-quitar">Quitar filtro</button>
  `;
  banner.style.display = 'flex';
}

function quitarFiltroVehiculo() {
  _filtros.marca = '';
  _vehiculoPrincipal = null;
  document.getElementById('banner-vehiculo').style.display = 'none';
  actualizarSelectMarca();
  _pagina = 1;
  ejecutarBusqueda();
}

function aplicarFiltrosMarcas() {
  // Mostrar banner si se pre-cargó el vehículo
  if (_filtros.marca && _vehiculoPrincipal) {
    const marca = _vehiculoPrincipal.cat_marcas_terminales?.nombre || '';
    mostrarBannerVehiculo(marca, _vehiculoPrincipal.modelo, _vehiculoPrincipal.anio);
  }
}

function actualizarSelectFamilia() {
  const sel = document.getElementById('sel-familia');
  sel.innerHTML = '<option value="">Todas las familias</option>';
  _familias.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.nombre;
    if (f.id === _filtros.familia) opt.selected = true;
    sel.appendChild(opt);
  });
}

function actualizarSelectMarca() {
  const sel = document.getElementById('sel-marca');
  sel.innerHTML = '<option value="">Todas las marcas</option>';
  _marcas.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nombre;
    if (m.id === _filtros.marca) opt.selected = true;
    sel.appendChild(opt);
  });
}

function limpiarFiltros() {
  _filtros = { familia: '', marca: '' };
  _vehiculoPrincipal = null;
  document.getElementById('banner-vehiculo').style.display = 'none';
  actualizarSelectFamilia();
  actualizarSelectMarca();
  _pagina = 1;
  ejecutarBusqueda();
}

function actualizarURL() {
  const params = new URLSearchParams();
  if (_queryActual) params.set('q', _queryActual);
  if (_filtros.familia) params.set('familia', _filtros.familia);
  if (_filtros.marca) params.set('marca', _filtros.marca);
  window.history.replaceState({}, '', `/buscar${params.toString() ? '?' + params : ''}`);
}

async function ejecutarBusqueda() {
  const contenedor = document.getElementById('resultados');
  const loader = document.getElementById('loader-busqueda');
  const sinResultados = document.getElementById('sin-resultados');
  const paginacion = document.getElementById('paginacion');

  loader.style.display = 'flex';
  contenedor.innerHTML = '';
  sinResultados.style.display = 'none';
  paginacion.style.display = 'none';

  const desde = (_pagina - 1) * PAGE_SIZE;
  const hasta = desde + PAGE_SIZE - 1;

  let query = dbB2C
    .from('cat_skus')
    .select(`
      id, codigo_piezauto, descripcion, descripcion_corta,
      precio_lista, precio_neto, lado, activo_venta,
      familia_id, cat_familias!familia_id(nombre),
      recomendado_digital, cat_proveedores!recomendado_digital(nombre)
    `, { count: 'exact' })
    .eq('activo', true)
    .eq('activo_venta', true)
    .range(desde, hasta);

  if (_queryActual) {
    query = query.textSearch('descripcion', _queryActual, { type: 'plain', config: 'spanish' });
  }

  if (_filtros.familia) {
    query = query.eq('familia_id', _filtros.familia);
  }

  if (_filtros.marca) {
    query = query.ilike('aplicaciones', `%${await nombreMarca(_filtros.marca)}%`);
  }

  if (!_queryActual) {
    query = query.order('precio_lista', { ascending: true, nullsFirst: false });
  }

  let { data, error, count } = await query;
  if (error && (error.message.includes('timeout') || error.message.includes('canceling'))) {
    ({ data, error, count } = await query);
  }
  loader.style.display = 'none';

  if (error) {
    const esTimeout = error.message.includes('timeout') || error.message.includes('canceling');
    contenedor.innerHTML = `<p class="error-msg">${esTimeout ? 'La búsqueda tardó demasiado. Intentá de nuevo.' : 'Error al buscar: ' + error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    sinResultados.style.display = 'block';
    document.getElementById('stats-busqueda').textContent = '';
    return;
  }

  _totalPaginas = Math.ceil((count || data.length) / PAGE_SIZE);

  document.getElementById('stats-busqueda').textContent =
    `${count?.toLocaleString('es-AR') || data.length} resultados${_queryActual ? ` para "${_queryActual}"` : ''}`;

  data.forEach(sku => {
    contenedor.insertAdjacentHTML('beforeend', renderTarjeta(sku));
  });

  if (_totalPaginas > 1) {
    renderPaginacion(paginacion);
    paginacion.style.display = 'flex';
  }
}

async function nombreMarca(marcaId) {
  const marca = _marcas.find(m => m.id === marcaId);
  return marca?.nombre || '';
}

function renderTarjeta(sku) {
  const precio = sku.precio_lista
    ? `$${Number(sku.precio_lista).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'Consultar';
  const familia = sku.cat_familias?.nombre || '';
  const proveedor = sku.cat_proveedores?.nombre || '';
  const lado = sku.lado && sku.lado !== 'N/A' ? `<span class="tag-lado">${sku.lado}</span>` : '';

  return `
    <a href="/producto.html?id=${sku.id}" class="tarjeta-sku">
      <div class="tarjeta-sku-body">
        <div class="tarjeta-sku-familia">${familia}</div>
        <div class="tarjeta-sku-desc">${sku.descripcion_corta || sku.descripcion}</div>
        <div class="tarjeta-sku-meta">
          ${proveedor ? `<span class="tarjeta-sku-prov">${proveedor}</span>` : ''}
          ${lado}
          <span class="tarjeta-sku-cod">${sku.codigo_piezauto}</span>
        </div>
      </div>
      <div class="tarjeta-sku-precio">${precio}</div>
    </a>
  `;
}

function renderPaginacion(contenedor) {
  const pagAnterior = _pagina > 1
    ? `<button onclick="irPagina(${_pagina - 1})" class="btn-pag">← Anterior</button>`
    : `<button class="btn-pag" disabled>← Anterior</button>`;
  const pagSiguiente = _pagina < _totalPaginas
    ? `<button onclick="irPagina(${_pagina + 1})" class="btn-pag">Siguiente →</button>`
    : `<button class="btn-pag" disabled>Siguiente →</button>`;

  contenedor.innerHTML = `
    ${pagAnterior}
    <span class="pag-info">Página ${_pagina} de ${_totalPaginas}</span>
    ${pagSiguiente}
  `;
}

function irPagina(n) {
  _pagina = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  ejecutarBusqueda();
}

function mostrarEstadoVacio() {
  document.getElementById('loader-busqueda').style.display = 'none';
  document.getElementById('stats-busqueda').textContent = '';
}
