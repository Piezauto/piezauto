
// ── AUTH ADMIN ────────────────────────────────
function cerrarSesionAdmin() {
  sessionStorage.removeItem('pz_admin');
  window.location.href = 'login.html';
}

let editandoId       = null;
let editandoTallerId = null;
let pedidoActualId   = null;
let chartPedidos     = null;
let compatList       = []; // [{ modeloId, modeloNombre, marcaNombre, desde, hasta }]
let _tags            = [];

// ── NAVEGACIÓN ────────────────────────────────
function mostrarPanel(nombre) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('activo'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('activo'));
  document.getElementById('panel-' + nombre).classList.add('activo');
  document.getElementById('nav-' + nombre)?.classList.add('activo');

  const acciones = {
    'dashboard':     cargarDashboard,
    'productos':     () => { cargarTablaProductos(); cargarMarcasCompat(); },
    'nuevo-producto': () => { if (!editandoId) { cargarCategoriasFiltro(); cargarVendedoresFiltro(); } cargarMarcasCompat(); },
    'categorias':    cargarTablaCategorias,
    'modelos':       cargarPanelModelos,
    'talleres':      cargarTablaTalleres,
    'nuevo-taller':  () => {},
    'pedidos':       cargarTablaPedidos,
    'cupones':       cargarTablaCupones,
    'reportes':      cargarReportes,
    'inventario':    cargarInventario,
    'vendedores':    cargarTablaVendedores,
    'banners':       cargarBanners,
    'consultas':     cargarConsultas,
    'logistica':         cargarLogistica,
    'pagos':             cargarPagos,
    'marcas':            cargarMarcasPanel,
    'ofertas':           cargarOfertas,
    'mensajes-internos':   cargarMensajesInternos,
    'configuracion':       cargarConfiguracion,
    'estado-sistema':      cargarEstadoSistema,
    'facturacion-point':   cargarFacturacionPoint,
    'combos':              cargarCombos,
    'devoluciones':        cargarDevoluciones,
  };
  if (acciones[nombre]) acciones[nombre]();
}

// ── DASHBOARD ─────────────────────────────────
document.getElementById('dash-fecha').textContent =
  new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

async function cargarDashboard() {
  await Promise.all([
    cargarStats(),
    cargarChartPedidos(),
    cargarBajoStock(),
    cargarUltimosPedidos(),
    cargarHeatmap(),
  ]);
  iniciarRealtimeActividad();
}

async function cargarStats() {
  const [prod, tall, ped, usu] = await Promise.all([
    db.from('productos').select('id', { count: 'exact' }).eq('activo', true),
    db.from('talleres').select('id', { count: 'exact' }),
    db.from('pedidos').select('id', { count: 'exact' }),
    db.from('usuarios').select('id', { count: 'exact' }),
  ]);
  document.getElementById('stat-productos').textContent = prod.count ?? 0;
  document.getElementById('stat-talleres').textContent  = tall.count ?? 0;
  document.getElementById('stat-pedidos').textContent   = ped.count  ?? 0;
  document.getElementById('stat-usuarios').textContent  = usu.count  ?? 0;
}

async function cargarChartPedidos() {
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 29);
  const desde = hace30.toISOString().split('T')[0];

  const { data } = await db.from('pedidos')
    .select('creado_en')
    .gte('creado_en', desde)
    .order('creado_en');

  // Armar mapa fecha → cantidad
  const mapa = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    mapa[d.toISOString().split('T')[0]] = 0;
  }
  (data || []).forEach(p => {
    const dia = p.creado_en?.split('T')[0] || p.creado_en?.split(' ')[0];
    if (dia && mapa[dia] !== undefined) mapa[dia]++;
  });

  const labels = Object.keys(mapa).map(d => {
    const [, m, dd] = d.split('-');
    return `${dd}/${m}`;
  });
  const valores = Object.values(mapa);

  const ctx = document.getElementById('chart-pedidos');
  if (chartPedidos) chartPedidos.destroy();
  chartPedidos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Pedidos',
        data: valores,
        backgroundColor: '#E63946',
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { maxRotation: 0, font: { size: 9 }, maxTicksLimit: 10 },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 } },
        },
      },
    },
  });
}

async function cargarBajoStock() {
  const { data } = await db.from('productos')
    .select('id, nombre, stock, codigo_pieza')
    .eq('activo', true)
    .lt('stock', 5)
    .order('stock')
    .limit(8);

  const cont = document.getElementById('bajo-stock-lista');
  if (!data || !data.length) {
    cont.innerHTML = '<p style="color:#aaa;font-size:13px;text-align:center;padding:20px">Sin productos con bajo stock. ✅</p>';
    return;
  }
  cont.innerHTML = data.map(p => `
    <div class="bajo-stock-item">
      <div>
        <div style="font-size:13px;font-weight:600">${p.nombre}</div>
        ${p.codigo_pieza ? `<div style="font-size:11px;color:#aaa">Cód: ${p.codigo_pieza}</div>` : ''}
      </div>
      <span class="stock-badge ${p.stock === 0 ? 'stock-cero' : 'stock-poco'}">${p.stock}</span>
    </div>
  `).join('');
}

async function cargarUltimosPedidos() {
  const { data } = await db.from('pedidos')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(5);

  const tbody = document.getElementById('tbody-ultimos-pedidos');
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="vacio">No hay pedidos aún.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${new Date(p.creado_en).toLocaleDateString('es-AR')}</td>
      <td>${p.nombre_cliente || p.email_cliente || '—'}</td>
      <td style="font-weight:700;color:var(--rojo)">$${Number(p.total).toLocaleString('es-AR')}</td>
      <td><span class="badge-${p.estado || 'nuevo'}">${estadoLabel(p.estado)}</span></td>
      <td><button class="accion-btn accion-editar" onclick="abrirDetallePedido('${p.id}')">Ver detalle</button></td>
    </tr>
  `).join('');
}

// ── TABLA PRODUCTOS ───────────────────────────
async function cargarTablaProductos() {
  const { data } = await db.from('productos').select('*').order('creado_en', { ascending: false });
  const tbody = document.getElementById('tbody-productos');
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="vacio">No hay productos cargados.</td></tr>';
    return;
  }
  const productIds = (data || []).map(p => p.id);
  let compatCounts = {};
  if (productIds.length) {
    const { data: compat } = await db.from('compatibilidades').select('producto_id').in('producto_id', productIds);
    (compat || []).forEach(c => {
      compatCounts[c.producto_id] = (compatCounts[c.producto_id] || 0) + 1;
    });
  }
  tbody.innerHTML = data.map(p => {
    const cnt = compatCounts[p.id] || 0;
    const compatCell = p.universal
      ? `<td><span style="background:#e6f7ee;color:#1a7a3f;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">Universal</span></td>`
      : cnt > 0
        ? `<td><button onclick="verCompatProducto('${p.id}','${p.nombre.replace(/'/g,"\\'")}',${cnt})" style="background:#e8f0fe;color:#1a56c4;border:none;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer">${cnt} modelo${cnt===1?'':'s'}</button></td>`
        : `<td><span style="color:#aaa;font-size:12px">Sin asignar</span></td>`;
    return `
    <tr>
      <td>
        <strong>${p.nombre}</strong>
        ${p.codigo_propio ? `<div style="font-size:11px;color:#1a56c4;font-weight:600;margin-top:2px">${p.codigo_propio}</div>` : ''}
        ${p.fabricante ? `<div style="font-size:11px;color:#888">${p.fabricante}</div>` : ''}
      </td>
      <td>
        ${p.codigo_pieza ? `<code style="font-size:12px;background:#f0f0f0;padding:1px 5px;border-radius:3px">${p.codigo_pieza}</code>` : '—'}
      </td>
      <td>${p.precio_lista ? '$' + Number(p.precio_lista).toLocaleString('es-AR') : '—'}</td>
      <td style="font-weight:700;color:var(--rojo)">$${Number(p.precio).toLocaleString('es-AR')}</td>
      <td>${p.stock}</td>
      <td><span class="${p.activo ? 'badge-activo' : 'badge-inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
      ${compatCell}
      <td>
        <button class="accion-btn accion-editar"   onclick="editarProducto('${p.id}')">Editar</button>
        <button class="accion-btn accion-eliminar" onclick="eliminarProducto('${p.id}', '${p.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
        <button class="accion-btn" style="background:#e8f0fe;color:#1a56c4" onclick="window.open('../producto.html?id=${p.id}','_blank')">Ver en tienda</button>
      </td>
    </tr>
  `;
  }).join('');
}

// ── CATEGORÍAS PARA EL FORM ───────────────────
async function cargarCategoriasFiltro() {
  const { data } = await db.from('categorias').select('*').order('nombre');
  const sel = document.getElementById('f-categoria');
  sel.innerHTML = '<option value="">Seleccioná una categoría</option>';
  if (data) data.forEach(c => {
    sel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });
}

// ── GUARDAR PRODUCTO ──────────────────────────
async function guardarProducto() {
  const msg    = document.getElementById('form-mensaje');
  const nombre = document.getElementById('f-nombre').value.trim();
  const precio = parseFloat(document.getElementById('f-precio').value);
  const stock  = parseInt(document.getElementById('f-stock').value);

  if (!nombre) { msg.textContent = '⚠️ El nombre es obligatorio.'; msg.style.color = '#c00'; return; }
  if (isNaN(precio)) { msg.textContent = '⚠️ Ingresá un precio válido.'; msg.style.color = '#c00'; return; }

  const imagenes = document.getElementById('f-imagenes').value
    .split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));

  const esUniversal = document.getElementById('f-universal').checked;

  const codigosCruzadosRaw = document.getElementById('f-codigos-cruzados').value
    .split('\n').map(l => l.trim()).filter(Boolean);
  const ladoVal = document.getElementById('f-lado').value || null;

  const datos = {
    nombre,
    codigo_pieza:    document.getElementById('f-codigo').value.trim()        || null,
    codigo_propio:   document.getElementById('f-codigo-propio').value.trim() || null,
    fabricante:      document.getElementById('f-fabricante').value.trim()    || null,
    marca_producto:  document.getElementById('f-marca').value.trim()         || null,
    marca_vehiculo:  document.getElementById('f-marca-vehiculo').value.trim()|| null,
    vehiculo:        document.getElementById('f-vehiculo').value.trim()      || null,
    version_formato: document.getElementById('f-version-formato').value.trim()|| null,
    anio_desde:      parseInt(document.getElementById('f-anio-desde').value) || null,
    anio_hasta:      parseInt(document.getElementById('f-anio-hasta').value) || null,
    lado:            ladoVal,
    precio_lista:    parseFloat(document.getElementById('f-precio-lista').value) || null,
    codigos_cruzados: codigosCruzadosRaw.length ? codigosCruzadosRaw : null,
    categoria_id:    document.getElementById('f-categoria').value      || null,
    precio,
    precio_taller:   parseFloat(document.getElementById('f-precio-taller').value) || null,
    stock:           isNaN(stock) ? 0 : stock,
    activo:          document.getElementById('f-activo').value === 'true',
    descripcion:     document.getElementById('f-descripcion').value.trim() || null,
    imagenes:        imagenes.length ? imagenes : null,
    universal:       esUniversal,
    vendedor_id:     document.getElementById('f-vendedor').value || null,
    tags:            _tags.length ? _tags : null,
  };

  console.log('[guardarProducto] datos del producto:', datos);
  console.log('[guardarProducto] compatList a guardar:', JSON.parse(JSON.stringify(compatList)));

  msg.textContent = 'Guardando...'; msg.style.color = '#888';

  let productoId, errorProducto;

  if (editandoId) {
    const res = await db.from('productos').update(datos).eq('id', editandoId).select('id').single();
    errorProducto = res.error;
    productoId = res.data?.id || editandoId;
    console.log('[guardarProducto] UPDATE resultado:', res);
  } else {
    const res = await db.from('productos').insert([datos]).select('id').single();
    errorProducto = res.error;
    productoId = res.data?.id;
    console.log('[guardarProducto] INSERT resultado:', res);
  }

  if (errorProducto) {
    msg.textContent = '❌ Error al guardar producto: ' + errorProducto.message;
    msg.style.color = '#c00';
    console.error('[guardarProducto] Error producto:', errorProducto);
    return;
  }

  if (!productoId) {
    msg.textContent = '❌ No se obtuvo el ID del producto. Revisar permisos de la tabla.';
    msg.style.color = '#c00';
    console.error('[guardarProducto] productoId es null/undefined');
    return;
  }

  console.log('[guardarProducto] productoId obtenido:', productoId);

  const errorCompat = await guardarCompatibilidades(productoId);
  if (errorCompat) {
    msg.textContent = '⚠️ Producto guardado pero error en compatibilidades: ' + errorCompat;
    msg.style.color = '#856404';
    console.error('[guardarProducto] Error compatibilidades:', errorCompat);
    return;
  }

  await guardarReglasDescuento(productoId);

  msg.textContent = editandoId ? '✅ Producto actualizado.' : '✅ Producto guardado con éxito.';
  msg.style.color = '#1a7a3f';
  limpiarFormulario();
  setTimeout(() => mostrarPanel('productos'), 1200);
}

// ── EDITAR PRODUCTO ───────────────────────────
async function editarProducto(id) {
  // Cargar categorías primero (await) y setear editandoId antes de mostrarPanel
  // para que el acciones-map de 'nuevo-producto' sepa que está en modo edición
  // y NO relance cargarCategoriasFiltro(), evitando la race condition.
  await cargarCategoriasFiltro();
  const { data: p } = await db.from('productos').select('*').eq('id', id).single();
  if (!p) return;

  editandoId = id; // debe estar seteado ANTES de mostrarPanel
  mostrarPanel('nuevo-producto');

  // Setear campos después de mostrarPanel para que no haya otro async
  // que pueda pisar los valores.
  document.getElementById('form-titulo').textContent         = 'Editar producto';
  document.getElementById('f-nombre').value                  = p.nombre || '';
  document.getElementById('f-codigo').value                  = p.codigo_pieza || '';
  document.getElementById('f-codigo-propio').value           = p.codigo_propio || '';
  document.getElementById('f-fabricante').value              = p.fabricante || '';
  document.getElementById('f-marca').value                   = p.marca_producto || '';
  document.getElementById('f-marca-vehiculo').value          = p.marca_vehiculo || '';
  document.getElementById('f-vehiculo').value                = p.vehiculo || '';
  document.getElementById('f-version-formato').value         = p.version_formato || '';
  document.getElementById('f-anio-desde').value             = p.anio_desde || '';
  document.getElementById('f-anio-hasta').value             = p.anio_hasta || '';
  document.getElementById('f-lado').value                    = p.lado || '';
  document.getElementById('f-precio-lista').value            = p.precio_lista || '';
  document.getElementById('f-precio').value                  = p.precio || '';
  document.getElementById('f-precio-taller').value           = p.precio_taller || '';
  document.getElementById('f-stock').value                   = p.stock || 0;
  document.getElementById('f-activo').value                  = p.activo ? 'true' : 'false';
  document.getElementById('f-descripcion').value             = p.descripcion || '';
  document.getElementById('f-codigos-cruzados').value        = Array.isArray(p.codigos_cruzados) ? p.codigos_cruzados.join('\n') : '';
  document.getElementById('f-imagenes').value                = p.imagenes ? p.imagenes.join('\n') : '';
  document.getElementById('f-universal').checked             = p.universal || false;
  // categoria_id se setea al final — el select ya está cargado y nada lo va a pisar
  document.getElementById('f-categoria').value               = p.categoria_id || '';
  document.getElementById('f-vendedor').value                = p.vendedor_id || '';
  _tags = Array.isArray(p.tags) ? [...p.tags] : [];
  renderChips();
  console.log('[editarProducto] categoria_id seteado:', p.categoria_id, '→ select value:', document.getElementById('f-categoria').value);
  onToggleUniversal();
  await cargarCompatibilidades(id);
  await cargarReglasDescuento(id);
}

function limpiarFormulario() {
  editandoId = null;
  document.getElementById('form-titulo').textContent = 'Nuevo producto';
  [
    'f-nombre','f-codigo','f-codigo-propio','f-fabricante','f-marca',
    'f-marca-vehiculo','f-vehiculo','f-version-formato',
    'f-anio-desde','f-anio-hasta','f-precio-lista',
    'f-precio','f-precio-taller','f-stock',
    'f-descripcion','f-codigos-cruzados','f-imagenes'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('f-lado').value      = '';
  document.getElementById('f-categoria').value = '';
  document.getElementById('f-vendedor').value  = '';
  document.getElementById('f-activo').value    = 'true';
  document.getElementById('form-mensaje').textContent = '';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-label-text').textContent = 'Hacé click para seleccionar una imagen';
  if (document.getElementById('f-imagen-file')) document.getElementById('f-imagen-file').value = '';
  document.getElementById('f-universal').checked = false;
  onToggleUniversal();
  compatList = [];
  renderCompatBadges();
  const label = document.querySelector('.compat-section-title');
  if (label) label.textContent = 'Compatibilidad de vehículos';
  _tags = [];
  renderChips();
  reglasDescuento = [];
  renderReglasDescuento();
}

async function eliminarProducto(id, nombre) {
  if (!confirm(`¿Eliminás el producto "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from('productos').delete().eq('id', id);
  if (error) { alert('Error al eliminar: ' + error.message); } else { cargarTablaProductos(); }
}

// ── SUBIDA DE IMÁGENES ────────────────────────
function previsualizarImagen(input) {
  if (!input.files || !input.files[0]) return;
  const file   = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('upload-preview-img').src = e.target.result;
    document.getElementById('upload-preview').style.display = 'flex';
    document.getElementById('upload-label-text').textContent = file.name;
    document.getElementById('upload-estado').textContent = '';
  };
  reader.readAsDataURL(file);
}

async function subirImagen() {
  const file  = document.getElementById('f-imagen-file').files?.[0];
  const estado = document.getElementById('upload-estado');
  if (!file) { estado.textContent = '⚠️ Seleccioná una imagen primero.'; estado.style.color = '#c00'; return; }
  if (file.size > 5 * 1024 * 1024) { estado.textContent = '⚠️ La imagen supera los 5 MB.'; estado.style.color = '#c00'; return; }

  estado.textContent = 'Subiendo...'; estado.style.color = '#888';

  const ext       = file.name.split('.').pop();
  const nombreArch = `producto-${Date.now()}.${ext}`;

  const { data, error } = await db.storage
    .from('piezauto-imagenes')
    .upload(nombreArch, file, { upsert: false, contentType: file.type });

  if (error) {
    estado.textContent = '❌ Error: ' + error.message; estado.style.color = '#c00'; return;
  }

  const { data: urlData } = db.storage.from('piezauto-imagenes').getPublicUrl(nombreArch);
  const url = urlData?.publicUrl;

  // Agregar la URL al textarea de imágenes
  const textarea = document.getElementById('f-imagenes');
  textarea.value = (textarea.value ? textarea.value.trim() + '\n' : '') + url;

  estado.textContent = '✅ Imagen subida y URL agregada.'; estado.style.color = '#1a7a3f';
}

// ── TABLA CATEGORÍAS ──────────────────────────
async function cargarTablaCategorias() {
  const { data } = await db.from('categorias').select('*').order('nombre');
  const tbody = document.getElementById('tbody-categorias');
  tbody.innerHTML = data
    ? data.map(c => `<tr><td>${c.nombre}</td><td><code>${c.slug}</code></td></tr>`).join('')
    : '<tr><td colspan="2">Sin categorías.</td></tr>';
}

async function agregarCategoria() {
  const nombre = document.getElementById('cat-nombre').value.trim();
  const slug   = document.getElementById('cat-slug').value.trim().toLowerCase().replace(/\s+/g,'-');
  const msg    = document.getElementById('cat-mensaje');
  if (!nombre || !slug) { msg.textContent = '⚠️ Completá nombre y slug.'; msg.style.color='#c00'; return; }
  const { error } = await db.from('categorias').insert([{ nombre, slug }]);
  if (error) { msg.textContent = '❌ ' + error.message; msg.style.color='#c00'; }
  else {
    msg.textContent = '✅ Categoría agregada.'; msg.style.color='#1a7a3f';
    document.getElementById('cat-nombre').value = '';
    document.getElementById('cat-slug').value   = '';
    cargarTablaCategorias();
  }
}

// ── MODELOS DE AUTOS ──────────────────────────
async function cargarPanelModelos() {
  await Promise.all([cargarMarcasChips(), cargarSelectMarcas(), cargarTablaModelos()]);
}

async function cargarMarcasChips() {
  const { data } = await db.from('marcas_auto').select('*').order('nombre');
  const cont = document.getElementById('marcas-chips');
  cont.innerHTML = data && data.length
    ? data.map(m => `
        <span class="modelo-chip">
          ${m.nombre}
          <button onclick="eliminarMarca('${m.id}', '${m.nombre.replace(/'/g,"\\'")}')">✕</button>
        </span>`).join('')
    : '<span style="font-size:13px;color:#aaa">Aún no hay marcas cargadas.</span>';
}

async function cargarSelectMarcas() {
  const { data } = await db.from('marcas_auto').select('*').order('nombre');
  const sels = ['mod-marca', 'filtro-marca-modelos'];
  sels.forEach(selId => {
    const sel = document.getElementById(selId);
    const primero = selId === 'filtro-marca-modelos' ? '<option value="">Todas las marcas</option>' : '<option value="">Seleccioná una marca</option>';
    sel.innerHTML = primero;
    if (data) data.forEach(m => { sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`; });
  });
}

async function agregarMarca() {
  const nombre = document.getElementById('marca-nombre').value.trim();
  const msg    = document.getElementById('marca-mensaje');
  if (!nombre) { msg.textContent = '⚠️ Ingresá el nombre de la marca.'; msg.style.color='#c00'; return; }
  const { error } = await db.from('marcas_auto').insert([{ nombre }]);
  if (error) { msg.textContent = '❌ ' + error.message; msg.style.color='#c00'; }
  else {
    msg.textContent = '✅ Marca agregada.'; msg.style.color='#1a7a3f';
    document.getElementById('marca-nombre').value = '';
    cargarMarcasChips(); cargarSelectMarcas();
  }
}

async function eliminarMarca(id, nombre) {
  if (!confirm(`¿Eliminás la marca "${nombre}" y todos sus modelos?`)) return;
  await db.from('modelos_auto').delete().eq('marca_id', id);
  await db.from('marcas_auto').delete().eq('id', id);
  cargarMarcasChips(); cargarSelectMarcas(); cargarTablaModelos();
}

async function agregarModelo() {
  const marcaId   = document.getElementById('mod-marca').value;
  const nombre    = document.getElementById('mod-nombre').value.trim();
  const anioDesde = parseInt(document.getElementById('mod-anio-desde').value);
  const anioHasta = document.getElementById('mod-anio-hasta').value ? parseInt(document.getElementById('mod-anio-hasta').value) : null;
  const msg       = document.getElementById('mod-mensaje');

  if (!marcaId || !nombre || isNaN(anioDesde)) {
    msg.textContent = '⚠️ Marca, nombre y año desde son obligatorios.'; msg.style.color='#c00'; return;
  }
  const { error } = await db.from('modelos_auto').insert([{ marca_id: marcaId, nombre, anio_desde: anioDesde, anio_hasta: anioHasta }]);
  if (error) { msg.textContent = '❌ ' + error.message; msg.style.color='#c00'; }
  else {
    msg.textContent = '✅ Modelo agregado.'; msg.style.color='#1a7a3f';
    ['mod-nombre','mod-anio-desde','mod-anio-hasta'].forEach(id => { document.getElementById(id).value = ''; });
    cargarTablaModelos();
  }
}

async function cargarTablaModelos() {
  const marcaId = document.getElementById('filtro-marca-modelos')?.value || '';
  let query = db.from('modelos_auto').select('*, marcas_auto(nombre)').order('nombre');
  if (marcaId) query = query.eq('marca_id', marcaId);

  const { data } = await query;
  const tbody = document.getElementById('tbody-modelos');
  tbody.innerHTML = data && data.length
    ? data.map(m => `
        <tr>
          <td><strong>${m.marcas_auto?.nombre || '—'}</strong></td>
          <td>${m.nombre}</td>
          <td>${m.anio_desde}</td>
          <td>${m.anio_hasta || 'vigente'}</td>
          <td><button class="accion-btn accion-eliminar" onclick="eliminarModelo('${m.id}', '${m.nombre.replace(/'/g,"\\'")}')">Eliminar</button></td>
        </tr>`).join('')
    : '<tr><td colspan="5" class="vacio">No hay modelos cargados.</td></tr>';
}

async function eliminarModelo(id, nombre) {
  if (!confirm(`¿Eliminás el modelo "${nombre}"?`)) return;
  await db.from('modelos_auto').delete().eq('id', id);
  cargarTablaModelos();
}

// ── TABLA TALLERES ────────────────────────────
async function cargarTablaTalleres() {
  const { data } = await db.from('talleres').select('*').order('nombre');
  const tbody = document.getElementById('tbody-talleres');
  tbody.innerHTML = data && data.length
    ? data.map(t => `
        <tr>
          <td><strong>${t.nombre}</strong></td>
          <td>${t.localidad || '—'}</td>
          <td>${t.zona || '—'}</td>
          <td>${t.email}</td>
          <td><span class="${t.activo ? 'badge-activo' : 'badge-inactivo'}">${t.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td>
            <button class="accion-btn accion-editar"   onclick="editarTaller('${t.id}')">Editar</button>
            <button class="accion-btn accion-eliminar" onclick="eliminarTaller('${t.id}', '${t.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="vacio">No hay talleres registrados aún.</td></tr>';
}

async function guardarTaller() {
  const msg    = document.getElementById('taller-form-mensaje');
  const nombre = document.getElementById('t-nombre').value.trim();
  const email  = document.getElementById('t-email').value.trim();
  if (!nombre) { msg.textContent = '⚠️ El nombre es obligatorio.'; msg.style.color = '#c00'; return; }
  if (!email)  { msg.textContent = '⚠️ El email es obligatorio.';  msg.style.color = '#c00'; return; }

  let preciosRef = {};
  try { preciosRef = JSON.parse(document.getElementById('t-precios-ref').value.trim() || '{}'); } catch (_) {}

  const datos = {
    nombre, email,
    telefono:                    document.getElementById('t-telefono').value.trim()  || null,
    whatsapp:                    document.getElementById('t-whatsapp').value.trim()  || null,
    localidad:                   document.getElementById('t-localidad').value.trim() || null,
    zona:                        document.getElementById('t-zona').value.trim()      || null,
    direccion:                   document.getElementById('t-direccion').value.trim() || null,
    horario_apertura:            document.getElementById('t-apertura').value         || null,
    horario_cierre:              document.getElementById('t-cierre').value           || null,
    descripcion:                 document.getElementById('t-descripcion').value.trim()|| null,
    logo_url:                    document.getElementById('t-logo').value.trim()      || null,
    activo:                      document.getElementById('t-activo').value === 'true',
    tipo_establecimiento:        document.getElementById('t-tipo-establecimiento').value,
    duracion_turno_default:      parseInt(document.getElementById('t-duracion-turno').value) || 60,
    sin_turno_previo:            document.getElementById('t-sin-turno-previo').checked,
    atencion_express:            document.getElementById('t-sin-turno-previo').checked,
    rango_precios_referencial:   preciosRef,
  };
  const password = document.getElementById('t-password').value;
  if (password) datos.password_hash = password;

  msg.textContent = 'Guardando...'; msg.style.color = '#888';
  let error;
  if (editandoTallerId) {
    ({ error } = await db.from('talleres').update(datos).eq('id', editandoTallerId));
  } else {
    ({ error } = await db.from('talleres').insert([datos]));
  }
  if (error) { msg.textContent = '❌ Error: ' + error.message; msg.style.color = '#c00'; }
  else {
    msg.textContent = editandoTallerId ? '✅ Taller actualizado.' : '✅ Taller guardado con éxito.';
    msg.style.color = '#1a7a3f';
    limpiarFormularioTaller();
    setTimeout(() => mostrarPanel('talleres'), 1200);
  }
}

async function editarTaller(id) {
  const { data: t } = await db.from('talleres').select('*').eq('id', id).single();
  if (!t) return;
  editandoTallerId = id;
  document.getElementById('taller-form-titulo').textContent = 'Editar taller';
  document.getElementById('t-nombre').value    = t.nombre || '';
  document.getElementById('t-email').value     = t.email || '';
  document.getElementById('t-password').value  = '';
  document.getElementById('t-telefono').value  = t.telefono || '';
  document.getElementById('t-whatsapp').value  = t.whatsapp || '';
  document.getElementById('t-localidad').value = t.localidad || '';
  document.getElementById('t-zona').value      = t.zona || '';
  document.getElementById('t-direccion').value = t.direccion || '';
  document.getElementById('t-apertura').value  = t.horario_apertura || '';
  document.getElementById('t-cierre').value    = t.horario_cierre || '';
  document.getElementById('t-descripcion').value = t.descripcion || '';
  document.getElementById('t-logo').value      = t.logo_url || '';
  document.getElementById('t-activo').value                = t.activo ? 'true' : 'false';
  document.getElementById('t-tipo-establecimiento').value  = t.tipo_establecimiento || 'taller_chapa_pintura';
  document.getElementById('t-duracion-turno').value        = t.duracion_turno_default || 60;
  document.getElementById('t-sin-turno-previo').checked    = !!t.sin_turno_previo;
  document.getElementById('t-precios-ref').value           = t.rango_precios_referencial ? JSON.stringify(t.rango_precios_referencial, null, 2) : '';
  actualizarCamposTipo();
  mostrarPanel('nuevo-taller');
}

function limpiarFormularioTaller() {
  editandoTallerId = null;
  document.getElementById('taller-form-titulo').textContent = 'Nuevo taller';
  ['t-nombre','t-email','t-password','t-telefono','t-whatsapp',
   't-localidad','t-zona','t-direccion','t-apertura','t-cierre',
   't-descripcion','t-logo','t-precios-ref'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('t-activo').value                = 'true';
  document.getElementById('t-tipo-establecimiento').value  = 'taller_chapa_pintura';
  document.getElementById('t-duracion-turno').value        = '60';
  document.getElementById('t-sin-turno-previo').checked    = false;
  document.getElementById('taller-form-mensaje').textContent = '';
  actualizarCamposTipo();
}

function actualizarCamposTipo() {
  const tipo = document.getElementById('t-tipo-establecimiento').value;
  const expressWrap = document.getElementById('t-express-wrap');
  const showExpress = tipo === 'lubricentro' || tipo === 'gomeria' || tipo === 'mixto';
  expressWrap.style.display = showExpress ? 'block' : 'none';
  // Sugerir duración según tipo
  const durInput = document.getElementById('t-duracion-turno');
  if (!durInput.dataset.manualEdit) {
    const sugeridos = { lubricentro: 30, gomeria: 30, taller_mecanico: 90, taller_chapa_pintura: 60, mixto: 45 };
    if (sugeridos[tipo]) durInput.value = sugeridos[tipo];
  }
}

async function eliminarTaller(id, nombre) {
  if (!confirm(`¿Eliminás el taller "${nombre}"?`)) return;
  const { error } = await db.from('talleres').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); } else { cargarTablaTalleres(); }
}

// ── PEDIDOS ───────────────────────────────────
function estadoLabel(e) {
  const m = { nuevo:'Nuevo', confirmado:'Confirmado', preparando:'Preparando', enviado:'Enviado', entregado:'Entregado', cancelado:'Cancelado' };
  return m[e] || e || 'Nuevo';
}

function renderTablaPedidos(data) {
  const tbody = document.getElementById('tbody-pedidos');
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="vacio">No hay pedidos que coincidan con los filtros.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${new Date(p.creado_en).toLocaleDateString('es-AR')}</td>
      <td>
        <strong>${p.nombre_cliente || p.usuarios?.nombre || '—'}</strong>
        ${(p.email_cliente || p.usuarios?.email) ? `<br><span style="font-size:11px;color:#aaa">${p.email_cliente || p.usuarios?.email}</span>` : ''}
      </td>
      <td style="font-weight:700;color:var(--rojo)">$${Number(p.total).toLocaleString('es-AR')}</td>
      <td style="font-size:13px">${p.metodo_pago || '—'}</td>
      <td><span class="badge-${p.estado || 'nuevo'}">${estadoLabel(p.estado)}</span></td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="accion-btn accion-editar" onclick="abrirDetallePedido('${p.id}')">Ver detalle</button>
        <button class="accion-btn btn-imprimir-pedido" onclick="imprimirPedido('${p.id}')" style="background:#f0f0f0;color:#444">🖨️ Imprimir</button>
      </td>
    </tr>
  `).join('');
}

async function cargarTablaPedidos() {
  await aplicarFiltrosPedidos();
}

function cambiarPeriodo() {
  const v = document.getElementById('f-periodo').value;
  document.getElementById('rango-wrap').style.display = v === 'rango' ? 'flex' : 'none';
  aplicarFiltrosPedidos();
}

async function aplicarFiltrosPedidos() {
  const estado = document.getElementById('filtro-estado-pedido')?.value || '';
  const periodo = document.getElementById('f-periodo')?.value || 'todos';
  const metodo = document.getElementById('f-metodo-pago')?.value || '';
  const buscar = (document.getElementById('f-buscar-pedido')?.value || '').trim().toLowerCase();

  let q = db.from('pedidos').select('*, usuarios(nombre, email)').order('creado_en', { ascending: false });

  if (estado) q = q.eq('estado', estado);
  if (metodo) q = q.eq('metodo_pago', metodo);

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (periodo === 'hoy') {
    q = q.gte('creado_en', hoy.toISOString());
  } else if (periodo === 'semana') {
    const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - hoy.getDay());
    q = q.gte('creado_en', inicio.toISOString());
  } else if (periodo === 'mes') {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    q = q.gte('creado_en', inicio.toISOString());
  } else if (periodo === 'rango') {
    const desde = document.getElementById('f-desde')?.value;
    const hasta = document.getElementById('f-hasta')?.value;
    if (desde) q = q.gte('creado_en', desde);
    if (hasta) q = q.lte('creado_en', hasta + 'T23:59:59');
  }

  const { data } = await q;
  let filtrados = data || [];

  if (buscar) {
    filtrados = filtrados.filter(p =>
      (p.nombre_cliente || '').toLowerCase().includes(buscar) ||
      (p.usuarios?.nombre || '').toLowerCase().includes(buscar) ||
      p.id.toLowerCase().includes(buscar) ||
      (p.numero_pedido || '').toLowerCase().includes(buscar)
    );
  }

  renderTablaPedidos(filtrados);
}

function limpiarFiltrosPedidos() {
  const fPeriodo = document.getElementById('f-periodo');
  const fMetodo  = document.getElementById('f-metodo-pago');
  const fBuscar  = document.getElementById('f-buscar-pedido');
  const fEstado  = document.getElementById('filtro-estado-pedido');
  if (fPeriodo) fPeriodo.value = 'todos';
  if (fMetodo)  fMetodo.value  = '';
  if (fBuscar)  fBuscar.value  = '';
  if (fEstado)  fEstado.value  = '';
  document.getElementById('rango-wrap').style.display = 'none';
  aplicarFiltrosPedidos();
}

async function imprimirPedido(pedidoId) {
  const { data: pedido } = await db.from('pedidos')
    .select('*, usuarios(nombre, email), items_pedido(*, productos(nombre, codigo_pieza))')
    .eq('id', pedidoId)
    .single();
  if (!pedido) return;

  const ventana = window.open('', '_blank', 'width=800,height=600');
  const fecha = new Date(pedido.creado_en).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const items = (pedido.items_pedido || []).map(i =>
    `<tr><td>${i.productos?.nombre || '-'}</td><td>${i.productos?.codigo_pieza || '-'}</td><td>${i.cantidad}</td><td>$${(i.precio_unitario||0).toLocaleString('es-AR')}</td><td>$${(i.subtotal||0).toLocaleString('es-AR')}</td></tr>`
  ).join('');

  ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/favicon.svg"><title>Pedido #${pedido.id.slice(-6).toUpperCase()}</title>
  <style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h1{font-size:20px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f5f5}tfoot td{font-weight:700}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:14px}.meta div span{font-weight:600}</style>
</head><body>
  <h1>Piezauto — Pedido #${pedido.id.slice(-6).toUpperCase()}</h1>
  <p style="color:#888">Fecha: ${fecha}</p>
  <div class="meta">
    <div>Cliente: <span>${pedido.nombre_cliente || pedido.usuarios?.nombre || 'N/D'}</span></div>
    <div>Email: <span>${pedido.email_cliente || pedido.usuarios?.email || 'N/D'}</span></div>
    <div>Estado: <span>${pedido.estado}</span></div>
    <div>Método de pago: <span>${pedido.metodo_pago || 'N/D'}</span></div>
    <div>Envío: <span>${pedido.tipo_envio || pedido.metodo_envio || 'N/D'}</span></div>
    <div>Dirección: <span>${pedido.direccion_entrega || pedido.direccion_envio || 'N/D'}</span></div>
  </div>
  <table><thead><tr><th>Producto</th><th>Código</th><th>Cantidad</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
  <tbody>${items}</tbody>
  <tfoot><tr><td colspan="4">Total</td><td>$${(pedido.total||0).toLocaleString('es-AR')}</td></tr></tfoot>
  </table>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
  </body></html>`);
  ventana.document.close();
}

async function abrirDetallePedido(id) {
  pedidoActualId = id;
  const { data: p } = await db.from('pedidos').select('*').eq('id', id).single();
  if (!p) return;

  document.getElementById('modal-pedido-titulo').textContent = `Pedido #${p.id.split('-')[0].toUpperCase()}`;
  document.getElementById('modal-pedido-fecha').textContent  = new Date(p.creado_en).toLocaleString('es-AR');
  document.getElementById('mp-nombre').textContent    = p.nombre_cliente || '—';
  document.getElementById('mp-email').textContent     = p.email_cliente || '—';
  document.getElementById('mp-telefono').textContent  = p.telefono_cliente || '—';
  document.getElementById('mp-pago').textContent      = p.metodo_pago || '—';
  document.getElementById('mp-direccion').textContent = p.direccion_entrega || 'Retiro en local';
  document.getElementById('mp-localidad').textContent = p.localidad_entrega || '—';
  document.getElementById('mp-total').textContent     = Number(p.total).toLocaleString('es-AR');
  document.getElementById('mp-estado').value          = p.estado || 'nuevo';
  document.getElementById('mp-nota').value            = p.nota_interna || '';
  document.getElementById('mp-msg').textContent       = '';

  // Links rápidos de contacto
  if (p.email_cliente) {
    document.getElementById('mp-email-link').href = `mailto:${p.email_cliente}`;
    document.getElementById('mp-email-link').style.display = 'inline';
  } else {
    document.getElementById('mp-email-link').style.display = 'none';
  }
  if (p.telefono_cliente) {
    const tel = p.telefono_cliente.replace(/\D/g, '');
    document.getElementById('mp-wsp-link').href = `https://wa.me/549${tel}`;
    document.getElementById('mp-wsp-link').style.display = 'inline';
  } else {
    document.getElementById('mp-wsp-link').style.display = 'none';
  }

  // Cupón y descuento
  if (p.cupon_codigo) {
    document.getElementById('mp-cupon-wrap').style.display = 'block';
    document.getElementById('mp-cupon').textContent = p.cupon_codigo;
  } else {
    document.getElementById('mp-cupon-wrap').style.display = 'none';
  }
  if (p.descuento_aplicado) {
    document.getElementById('mp-descuento-wrap').style.display = 'block';
    document.getElementById('mp-descuento').textContent = '-$' + Number(p.descuento_aplicado).toLocaleString('es-AR');
  } else {
    document.getElementById('mp-descuento-wrap').style.display = 'none';
  }

  // Cargar items con join a productos
  const { data: items } = await db.from('items_pedido')
    .select('*, productos(nombre, codigo_pieza)')
    .eq('pedido_id', id);
  const tbody = document.getElementById('mp-items');
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:12px">Sin detalle de productos.</td></tr>';
  } else {
    tbody.innerHTML = items.map(i => {
      const nombre = i.productos?.nombre || i.nombre_producto || '—';
      const codigo = i.productos?.codigo_pieza ? `<br><span style="font-size:11px;color:#aaa">Cód: ${i.productos.codigo_pieza}</span>` : '';
      return `
        <tr>
          <td>${nombre}${codigo}</td>
          <td style="text-align:center">${i.cantidad}</td>
          <td>$${Number(i.precio_unitario).toLocaleString('es-AR')}</td>
          <td style="font-weight:700">$${Number(i.subtotal || i.cantidad * i.precio_unitario).toLocaleString('es-AR')}</td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('modal-pedido').classList.add('activo');
}

function cerrarModalPedido(e) {
  if (e.target === document.getElementById('modal-pedido')) cerrarModal();
}
function cerrarModal() {
  document.getElementById('modal-pedido').classList.remove('activo');
  pedidoActualId = null;
}

async function notificarCambioPedido(pedidoId, nuevoEstado) {
  const { data: pedido } = await db.from('pedidos').select('usuario_id, numero_pedido').eq('id', pedidoId).single();
  if (!pedido?.usuario_id) return;
  const num = pedido.numero_pedido || pedidoId;
  const labels = { nuevo:'Nuevo', confirmado:'Confirmado', preparando:'En preparación', enviado:'Enviado', entregado:'Entregado', cancelado:'Cancelado' };
  await db.from('notificaciones_usuario').insert({
    usuario_id: pedido.usuario_id,
    titulo: 'Tu pedido fue actualizado',
    mensaje: `Tu pedido #${num} pasó a estado: ${labels[nuevoEstado] || nuevoEstado}.`,
    tipo: 'pedido',
    link: 'seguimiento.html',
    leido: false
  });
}

async function guardarCambiosPedido() {
  if (!pedidoActualId) return;
  const msg    = document.getElementById('mp-msg');
  const estado = document.getElementById('mp-estado').value;
  const nota   = document.getElementById('mp-nota').value.trim() || null;

  msg.textContent = 'Guardando...'; msg.style.color = '#888';
  const { error } = await db.from('pedidos').update({ estado, nota_interna: nota }).eq('id', pedidoActualId);
  if (error) { msg.textContent = '❌ ' + error.message; msg.style.color = '#c00'; }
  else {
    msg.textContent = '✅ Cambios guardados.'; msg.style.color = '#1a7a3f';
    notificarCambioPedido(pedidoActualId, estado);
    cargarTablaPedidos();
  }
}

// ── COMPATIBILIDAD ────────────────────────────
async function cargarMarcasCompat() {
  const { data } = await db.from('marcas_auto').select('*').order('nombre');
  ['c-marca', 'fv-marca'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const primera = selId === 'fv-marca'
      ? '<option value="">Todas las marcas</option>'
      : '<option value="">Seleccioná marca</option>';
    sel.innerHTML = primera;
    if (data) data.forEach(m => { sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`; });
  });
  ['c-modelo', 'fv-modelo'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = selId === 'fv-modelo'
      ? '<option value="">Todos los modelos</option>'
      : '<option value="">Seleccioná modelo</option>';
    sel.disabled = true;
  });
}

async function onCompatMarca() {
  const marcaId = document.getElementById('c-marca').value;
  const sel = document.getElementById('c-modelo');
  sel.innerHTML = '<option value="">Seleccioná modelo</option>';
  sel.disabled = !marcaId;
  if (!marcaId) return;
  const { data } = await db.from('modelos_auto').select('*').eq('marca_id', marcaId).order('nombre');
  if (data) data.forEach(m => {
    const rango = `${m.anio_desde}–${m.anio_hasta || 'hoy'}`;
    sel.innerHTML += `<option value="${m.id}">${m.nombre} (${rango})</option>`;
  });
}

function agregarCompat() {
  const marcaSel  = document.getElementById('c-marca');
  const modeloSel = document.getElementById('c-modelo');
  const modeloId  = modeloSel.value;
  if (!modeloId) { alert('Seleccioná un modelo.'); return; }

  const marcaNombre  = marcaSel.options[marcaSel.selectedIndex].text;
  const modeloNombre = modeloSel.options[modeloSel.selectedIndex].text;
  const desdeRaw = document.getElementById('c-desde').value;
  const hastaRaw = document.getElementById('c-hasta').value;
  const desde = desdeRaw ? parseInt(desdeRaw, 10) : null;
  const hasta  = hastaRaw ? parseInt(hastaRaw, 10) : null;

  if (compatList.some(c => c.modeloId === modeloId && c.desde === desde && c.hasta === hasta)) {
    alert('Ya agregaste esta combinación.'); return;
  }

  const entrada = { modeloId, modeloNombre, marcaNombre, desde, hasta };
  console.log('[agregarCompat] Agregando:', entrada);
  compatList.push(entrada);
  renderCompatBadges();

  document.getElementById('c-marca').value = '';
  document.getElementById('c-modelo').innerHTML = '<option value="">Seleccioná modelo</option>';
  document.getElementById('c-modelo').disabled = true;
  document.getElementById('c-desde').value = '';
  document.getElementById('c-hasta').value = '';
}

function removerCompat(idx) {
  compatList.splice(idx, 1);
  renderCompatBadges();
}

function renderCompatBadges() {
  const cont  = document.getElementById('compat-badges');
  const count = document.getElementById('compat-count');
  if (!compatList.length) {
    cont.innerHTML = '<span class="compat-empty">Ninguna cargada aún — el producto no aparecerá en búsquedas por auto</span>';
    count.textContent = '';
    return;
  }
  count.textContent = `(${compatList.length})`;
  cont.innerHTML = compatList.map((c, i) => {
    const rango = (c.desde || c.hasta) ? ` ${c.desde || '?'}–${c.hasta || 'hoy'}` : '';
    return `<span class="compat-badge">${c.marcaNombre} ${c.modeloNombre}${rango}<button class="compat-badge-rm" onclick="removerCompat(${i})">✕</button></span>`;
  }).join('');
}

function onToggleUniversal() {
  const universal = document.getElementById('f-universal').checked;
  const wrap = document.getElementById('compat-selector-wrap');
  wrap.style.opacity       = universal ? '0.4' : '1';
  wrap.style.pointerEvents = universal ? 'none' : 'auto';
}

async function guardarCompatibilidades(productoId) {
  console.log('[guardarCompatibilidades] Borrando compatibilidades previas para:', productoId);
  const { error: delErr } = await db.from('compatibilidades').delete().eq('producto_id', productoId);
  if (delErr) {
    console.error('[guardarCompatibilidades] Error al borrar:', delErr);
    return delErr.message;
  }

  if (!compatList.length) {
    console.log('[guardarCompatibilidades] Sin compatibilidades para insertar.');
    return null;
  }

  const rows = compatList.map(c => ({
    producto_id: productoId,
    modelo_id:   c.modeloId,
    anio_desde:  c.desde !== null && c.desde !== undefined ? parseInt(c.desde, 10) : null,
    anio_hasta:  c.hasta !== null && c.hasta !== undefined ? parseInt(c.hasta, 10) : null,
  }));

  console.log('[guardarCompatibilidades] Insertando filas:', rows);
  const { data, error: insErr } = await db.from('compatibilidades').insert(rows).select();
  console.log('[guardarCompatibilidades] Resultado insert:', { data, error: insErr });

  if (insErr) return insErr.message;
  return null;
}

async function cargarCompatibilidades(productoId) {
  const { data } = await db.from('compatibilidades')
    .select('*, modelos_auto!modelo_id(nombre, marcas_auto(nombre))')
    .eq('producto_id', productoId);
  compatList = (data || []).map(c => ({
    modeloId:     c.modelo_id,
    modeloNombre: c.modelos_auto?.nombre || '—',
    marcaNombre:  c.modelos_auto?.marcas_auto?.nombre || '—',
    desde:        c.anio_desde,
    hasta:        c.anio_hasta,
  }));
  renderCompatBadges();
  const label = document.querySelector('.compat-section-title');
  if (label && compatList.length) {
    label.textContent = `Compatibilidad de vehículos — ${compatList.length} guardada${compatList.length !== 1 ? 's' : ''} en BD`;
  }
}

// ── FILTRO POR AUTO (panel productos) ─────────
async function onFvMarca() {
  const marcaId = document.getElementById('fv-marca').value;
  const sel = document.getElementById('fv-modelo');
  sel.innerHTML = '<option value="">Todos los modelos</option>';
  sel.disabled = !marcaId;
  if (!marcaId) return;
  const { data } = await db.from('modelos_auto').select('*').eq('marca_id', marcaId).order('nombre');
  if (data) data.forEach(m => { sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`; });
}

async function filtrarPorAuto() {
  const modeloId = document.getElementById('fv-modelo').value;
  const anio     = parseInt(document.getElementById('fv-anio').value) || null;
  const resultado = document.getElementById('fv-resultado');

  if (!modeloId && !anio) {
    resultado.textContent = '⚠️ Seleccioná al menos un modelo o año para filtrar.';
    return;
  }
  resultado.textContent = 'Buscando...';

  let compatQuery = db.from('compatibilidades').select('producto_id');
  if (modeloId) compatQuery = compatQuery.eq('modelo_id', modeloId);
  if (anio) {
    compatQuery = compatQuery.lte('anio_desde', anio);
    compatQuery = compatQuery.or(`anio_hasta.is.null,anio_hasta.gte.${anio}`);
  }
  const { data: compats } = await compatQuery;
  const idsPorCompat = (compats || []).map(c => c.producto_id);

  const { data: universales } = await db.from('productos').select('id').eq('universal', true).eq('activo', true);
  const idsUniversales = (universales || []).map(p => p.id);

  const todosIds = [...new Set([...idsPorCompat, ...idsUniversales])];

  if (!todosIds.length) {
    resultado.textContent = '0 productos compatibles con este vehículo.';
    document.getElementById('tbody-productos').innerHTML =
      '<tr><td colspan="8" class="vacio">Sin productos compatibles con este vehículo.</td></tr>';
    return;
  }

  const { data: productos } = await db.from('productos').select('*').in('id', todosIds).order('nombre');

  const marcaSel  = document.getElementById('fv-marca');
  const modeloSel = document.getElementById('fv-modelo');
  const filtroTxt = [
    marcaSel.value ? marcaSel.options[marcaSel.selectedIndex].text : '',
    modeloId ? modeloSel.options[modeloSel.selectedIndex].text : '',
    anio ? String(anio) : '',
  ].filter(Boolean).join(' ');

  resultado.innerHTML = `<strong style="color:var(--rojo)">${productos?.length || 0} productos</strong> compatibles con ${filtroTxt}`;

  const tbody = document.getElementById('tbody-productos');
  tbody.innerHTML = (productos || []).map(p => `
    <tr>
      <td>
        <strong>${p.nombre}</strong>
        ${p.codigo_propio ? `<div style="font-size:11px;color:#1a56c4;font-weight:600;margin-top:2px">${p.codigo_propio}</div>` : ''}
      </td>
      <td>${p.codigo_pieza ? `<code style="font-size:12px;background:#f0f0f0;padding:1px 5px;border-radius:3px">${p.codigo_pieza}</code>` : '—'}</td>
      <td>${p.precio_lista ? '$' + Number(p.precio_lista).toLocaleString('es-AR') : '—'}</td>
      <td style="font-weight:700;color:var(--rojo)">$${Number(p.precio).toLocaleString('es-AR')}</td>
      <td>${p.stock}</td>
      <td><span class="${p.activo ? 'badge-activo' : 'badge-inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td>—</td>
      <td>
        <button class="accion-btn accion-editar"   onclick="editarProducto('${p.id}')">Editar</button>
        <button class="accion-btn accion-eliminar" onclick="eliminarProducto('${p.id}', '${p.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
        <button class="accion-btn" style="background:#e8f0fe;color:#1a56c4" onclick="window.open('../producto.html?id=${p.id}','_blank')">Ver en tienda</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="vacio">Sin productos compatibles.</td></tr>';
}

function limpiarFiltroAutoAdmin() {
  document.getElementById('fv-marca').value = '';
  const fvModelo = document.getElementById('fv-modelo');
  fvModelo.innerHTML = '<option value="">Todos los modelos</option>';
  fvModelo.disabled = true;
  document.getElementById('fv-anio').value = '';
  document.getElementById('fv-resultado').textContent = '';
  cargarTablaProductos();
}

// ── CUPONES ───────────────────────────────────
function onCuponTipo() {
  const tipo = document.getElementById('cup-tipo').value;
  document.getElementById('cup-pct-wrap').style.display  = tipo === 'porcentaje' ? 'flex' : 'none';
  document.getElementById('cup-fijo-wrap').style.display = tipo === 'fijo'       ? 'flex' : 'none';
}

async function guardarCupon() {
  const msg     = document.getElementById('cup-msg');
  const codigo  = document.getElementById('cup-codigo').value.trim().toUpperCase();
  const tipo    = document.getElementById('cup-tipo').value;
  const descPct = parseFloat(document.getElementById('cup-porcentaje').value) || null;
  const descFij = parseFloat(document.getElementById('cup-fijo').value) || null;
  const venc    = document.getElementById('cup-vencimiento').value || null;
  const usosMax = parseInt(document.getElementById('cup-usos-max').value) || null;

  if (!codigo) { msg.style.color = '#c00'; msg.textContent = '⚠️ El código es obligatorio.'; return; }
  if (tipo === 'porcentaje' && (!descPct || descPct <= 0 || descPct > 100)) {
    msg.style.color = '#c00'; msg.textContent = '⚠️ Ingresá un porcentaje entre 1 y 100.'; return;
  }
  if (tipo === 'fijo' && (!descFij || descFij <= 0)) {
    msg.style.color = '#c00'; msg.textContent = '⚠️ Ingresá un monto fijo mayor a cero.'; return;
  }

  msg.textContent = 'Guardando...'; msg.style.color = '#888';

  const datos = {
    codigo,
    descripcion:          document.getElementById('cup-descripcion').value.trim() || null,
    tipo,
    descuento_porcentaje: tipo === 'porcentaje' ? descPct : null,
    descuento_fijo:       tipo === 'fijo'       ? descFij : null,
    activo:               true,
    fecha_vencimiento:    venc ? new Date(venc).toISOString() : null,
    usos_maximos:         usosMax,
    usos_actuales:        0,
  };

  const { error } = await db.from('cupones').insert([datos]);
  if (error) {
    msg.style.color = '#c00';
    msg.textContent = '❌ ' + (error.code === '23505' ? 'Ya existe un cupón con ese código.' : error.message);
  } else {
    msg.style.color = '#1a7a3f'; msg.textContent = '✅ Cupón creado.';
    ['cup-codigo','cup-descripcion','cup-porcentaje','cup-fijo','cup-vencimiento','cup-usos-max']
      .forEach(id => { document.getElementById(id).value = ''; });
    cargarTablaCupones();
  }
}

async function cargarTablaCupones() {
  const { data } = await db.from('cupones').select('*').order('creado_en', { ascending: false });
  const tbody = document.getElementById('tbody-cupones');

  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="vacio" style="text-align:center;padding:30px;color:#aaa">No hay cupones creados aún.</td></tr>';
    return;
  }

  const ahora = new Date();
  tbody.innerHTML = data.map(c => {
    const vencido   = c.fecha_vencimiento && new Date(c.fecha_vencimiento) < ahora;
    const agotado   = c.usos_maximos !== null && c.usos_actuales >= c.usos_maximos;
    const disponible = c.activo && !vencido && !agotado;

    const descuento = c.tipo === 'porcentaje'
      ? c.descuento_porcentaje + '%'
      : '$' + Number(c.descuento_fijo).toLocaleString('es-AR');

    const vencLabel = c.fecha_vencimiento
      ? new Date(c.fecha_vencimiento).toLocaleDateString('es-AR')
      : 'Sin vencimiento';

    const usosLabel = c.usos_maximos !== null
      ? `${c.usos_actuales} / ${c.usos_maximos}`
      : `${c.usos_actuales} / ∞`;

    const estadoBadge = disponible
      ? '<span class="badge-activo">Activo</span>'
      : vencido
        ? '<span class="badge-inactivo">Vencido</span>'
        : agotado
          ? '<span class="badge-inactivo">Agotado</span>'
          : '<span class="badge-inactivo">Inactivo</span>';

    return `
      <tr>
        <td><strong style="font-family:monospace;font-size:15px">${c.codigo}</strong>
          ${c.descripcion ? `<br><span style="font-size:11px;color:#aaa">${c.descripcion}</span>` : ''}
        </td>
        <td>${c.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}</td>
        <td style="font-weight:700;color:var(--rojo)">${descuento}</td>
        <td style="font-size:13px">${vencLabel}</td>
        <td style="font-size:13px">${usosLabel}</td>
        <td>${estadoBadge}</td>
        <td>
          <button class="accion-btn ${c.activo ? 'accion-editar' : 'accion-editar'}"
            onclick="toggleCupon('${c.id}', ${c.activo})"
            style="background:${c.activo ? '#fff3cd' : '#e6f7ee'};color:${c.activo ? '#856404' : '#1a7a3f'}">
            ${c.activo ? 'Pausar' : 'Activar'}
          </button>
          <button class="accion-btn accion-eliminar" onclick="eliminarCupon('${c.id}', '${c.codigo}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleCupon(id, activo) {
  await db.from('cupones').update({ activo: !activo }).eq('id', id);
  cargarTablaCupones();
}

async function eliminarCupon(id, codigo) {
  if (!confirm(`¿Eliminás el cupón "${codigo}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from('cupones').delete().eq('id', id);
  if (error) { alert('Error al eliminar: ' + error.message); } else { cargarTablaCupones(); }
}

// ── COMPAT MODAL ──────────────────────────────
async function verCompatProducto(productoId, nombreProducto, count) {
  const { data } = await db.from('compatibilidades')
    .select('*, modelos_auto!modelo_id(nombre, marcas_auto(nombre))')
    .eq('producto_id', productoId);

  const lista = (data || []).map(c => {
    const marca = c.modelos_auto?.marcas_auto?.nombre || '';
    const modelo = c.modelos_auto?.nombre || '—';
    const desde = c.anio_desde || '';
    const hasta = c.anio_hasta || 'vigente';
    return `<div style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:14px">
      <strong>${marca} ${modelo}</strong>
      <span style="color:#888;font-size:12px;margin-left:8px">${desde}–${hasta}</span>
    </div>`;
  }).join('');

  document.getElementById('compat-modal-titulo').textContent = nombreProducto;
  document.getElementById('compat-modal-lista').innerHTML = lista || '<p style="color:#aaa">Sin compatibilidades.</p>';
  document.getElementById('compat-modal').classList.add('activo');
}
function cerrarCompatModal() {
  document.getElementById('compat-modal').classList.remove('activo');
}

// ── REPORTES ──────────────────────────────────
async function cargarReportes() {
  const ahora    = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const inicioAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString();
  const finAnt    = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString();

  document.getElementById('reportes-periodo').textContent =
    ahora.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  // Ventas mes actual y anterior en paralelo
  const [{ data: pedidosMes }, { data: pedidosAnt }] = await Promise.all([
    db.from('pedidos').select('total, estado').gte('creado_en', inicioMes).neq('estado', 'cancelado'),
    db.from('pedidos').select('total').gte('creado_en', inicioAnt).lte('creado_en', finAnt).neq('estado', 'cancelado'),
  ]);

  const sumarTotal = arr => (arr || []).reduce((a, p) => a + Number(p.total || 0), 0);
  const ventasMes  = sumarTotal(pedidosMes);
  const ventasAnt  = sumarTotal(pedidosAnt);
  const cantMes    = (pedidosMes || []).length;

  document.getElementById('r-ventas-mes').textContent  = '$' + ventasMes.toLocaleString('es-AR');
  document.getElementById('r-ventas-ant').textContent  = '$' + ventasAnt.toLocaleString('es-AR');
  document.getElementById('r-pedidos-mes').textContent = cantMes;
  document.getElementById('r-ticket-prom').textContent = cantMes
    ? '$' + Math.round(ventasMes / cantMes).toLocaleString('es-AR')
    : '—';

  // Producto más vendido
  const { data: itemsMes } = await db.from('items_pedido')
    .select('producto_id, cantidad, productos(nombre)')
    .gte('creado_en', inicioMes);

  const prodMap = {};
  (itemsMes || []).forEach(i => {
    const pid = i.producto_id;
    if (!prodMap[pid]) prodMap[pid] = { nombre: i.productos?.nombre || '—', cantidad: 0 };
    prodMap[pid].cantidad += i.cantidad;
  });
  const topProd = Object.values(prodMap).sort((a, b) => b.cantidad - a.cantidad)[0];
  document.getElementById('r-top-producto').innerHTML = topProd
    ? `<div style="font-size:16px;font-weight:700">${topProd.nombre}</div>
       <div style="color:#888;font-size:13px;margin-top:4px">${topProd.cantidad} unidades vendidas este mes</div>`
    : '<p style="color:#aaa">Sin datos este mes.</p>';

  // Taller con más turnos
  const { data: turnos } = await db.from('turnos')
    .select('taller_id, talleres(nombre)')
    .gte('creado_en', inicioMes);

  const tallerMap = {};
  (turnos || []).forEach(t => {
    const tid = t.taller_id;
    if (!tallerMap[tid]) tallerMap[tid] = { nombre: t.talleres?.nombre || '—', cant: 0 };
    tallerMap[tid].cant++;
  });
  const topTaller = Object.values(tallerMap).sort((a, b) => b.cant - a.cant)[0];
  document.getElementById('r-top-taller').innerHTML = topTaller
    ? `<div style="font-size:16px;font-weight:700">${topTaller.nombre}</div>
       <div style="color:#888;font-size:13px;margin-top:4px">${topTaller.cant} turnos este mes</div>`
    : '<p style="color:#aaa">Sin datos este mes.</p>';

  // Pedidos por estado
  const { data: todosPedidos } = await db.from('pedidos').select('estado');
  const estadoMap = {};
  (todosPedidos || []).forEach(p => {
    estadoMap[p.estado || 'nuevo'] = (estadoMap[p.estado || 'nuevo'] || 0) + 1;
  });
  const estadoLabels = { nuevo:'Nuevo', confirmado:'Confirmado', preparando:'Preparando', enviado:'Enviado', entregado:'Entregado', cancelado:'Cancelado' };
  const estadoBadges = { nuevo:'badge-nuevo', confirmado:'badge-confirmado', preparando:'badge-preparando', enviado:'badge-enviado', entregado:'badge-entregado', cancelado:'badge-cancelado' };
  const total = Object.values(estadoMap).reduce((a, v) => a + v, 0);

  document.getElementById('r-por-estado').innerHTML = Object.entries(estadoLabels).map(([k, label]) => {
    const cant = estadoMap[k] || 0;
    const pct  = total ? Math.round((cant / total) * 100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f5f5f5">
        <span class="${estadoBadges[k]}" style="min-width:90px;text-align:center">${label}</span>
        <div style="flex:1;background:#f0f0f0;border-radius:20px;height:8px;overflow:hidden">
          <div style="width:${pct}%;background:var(--rojo);height:100%;border-radius:20px;transition:width .4s"></div>
        </div>
        <span style="font-size:14px;font-weight:700;min-width:24px;text-align:right">${cant}</span>
        <span style="font-size:12px;color:#aaa;min-width:32px">${pct}%</span>
      </div>`;
  }).join('');

  await cargarChartCategorias();
  await cargarChartPagos();
  await cargarTopProductos();
}

async function cargarChartCategorias() {
  const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: items } = await db.from('items_pedido')
    .select('subtotal, productos!producto_id(categoria_id, categorias(nombre))')
    .gte('creado_en', inicio);

  const mapa = {};
  (items || []).forEach(i => {
    const cat = i.productos?.categorias?.nombre || 'Sin categoría';
    mapa[cat] = (mapa[cat] || 0) + (i.subtotal || 0);
  });
  const labels = Object.keys(mapa);
  const valores = Object.values(mapa);

  const ctx = document.getElementById('chart-categorias');
  if (!ctx) return;
  if (window._chartCat) window._chartCat.destroy();
  window._chartCat = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: ['#E63946','#1a1a1a','#f59e0b','#3b82f6','#22c55e','#8b5cf6','#ec4899','#14b8a6'] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }
  });
}

async function cargarChartPagos() {
  const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: pedidos } = await db.from('pedidos').select('metodo_pago, total').gte('creado_en', inicio);
  const mapa = {};
  (pedidos || []).forEach(p => { mapa[p.metodo_pago || 'otro'] = (mapa[p.metodo_pago || 'otro'] || 0) + (p.total || 0); });
  const etiquetas = { transferencia:'Transferencia', efectivo:'Efectivo', mercadopago:'MercadoPago', debito:'Débito/Crédito' };
  const ctx = document.getElementById('chart-pagos');
  if (!ctx) return;
  if (window._chartPagos) window._chartPagos.destroy();
  window._chartPagos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(mapa).map(k => etiquetas[k] || k),
      datasets: [{ label: 'Ingresos ($)', data: Object.values(mapa), backgroundColor: '#E63946', borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '$' + Number(v).toLocaleString('es-AR') } } } }
  });
}

async function cargarTopProductos() {
  const { data: items } = await db.from('items_pedido')
    .select('producto_id, cantidad, productos!producto_id(nombre, imagenes, precio)')
    .order('cantidad', { ascending: false });

  const mapa = {};
  (items || []).forEach(i => {
    if (!mapa[i.producto_id]) mapa[i.producto_id] = { nombre: i.productos?.nombre, img: i.productos?.imagenes?.[0], precio: i.productos?.precio, cantidad: 0 };
    mapa[i.producto_id].cantidad += i.cantidad;
  });
  const top5 = Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  const cont = document.getElementById('top-productos-lista');
  if (!cont) return;
  cont.innerHTML = top5.map((p, i) => `
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid #f0f0f0">
      <div style="font-size:20px;font-weight:900;color:#ddd;width:24px">${i+1}</div>
      ${p.img ? `<img src='${p.img}' style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#f8f8f8">` : '<div style="width:48px;height:48px;background:#f0f0f0;border-radius:6px"></div>'}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">${p.nombre || '—'}</div>
        <div style="font-size:12px;color:#888">${p.cantidad} unidades vendidas</div>
      </div>
      <div style="font-size:14px;font-weight:800;color:var(--rojo)">$${Number(p.precio||0).toLocaleString('es-AR')}</div>
    </div>`).join('') || '<p style="color:#aaa;font-size:13px">Sin datos todavía.</p>';
}

// ── INVENTARIO ────────────────────────────────
async function cargarInventario() {
  const { data } = await db.from('productos')
    .select('id, nombre, codigo_pieza, stock, categorias(nombre)')
    .order('stock', { ascending: true });

  const sinStock = (data || []).filter(p => p.stock === 0).length;
  const bajoStock = (data || []).filter(p => p.stock > 0 && p.stock <= 5).length;
  const pocoStock = (data || []).filter(p => p.stock > 5 && p.stock <= 10).length;
  const okStock = (data || []).filter(p => p.stock > 10).length;

  document.getElementById('inv-total').textContent    = (data || []).length;
  document.getElementById('inv-sin-stock').textContent = sinStock;
  document.getElementById('inv-bajo').textContent      = bajoStock + pocoStock;
  document.getElementById('inv-ok').textContent        = okStock;

  const tbody = document.getElementById('tbody-inventario');
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="vacio" style="text-align:center;padding:30px;color:#aaa">No hay productos cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(p => {
    let badgeClass, badgeLabel;
    if (p.stock === 0)      { badgeClass = 'rojo';    badgeLabel = 'Sin stock'; }
    else if (p.stock <= 5)  { badgeClass = 'naranja'; badgeLabel = 'Bajo stock'; }
    else if (p.stock <= 10) { badgeClass = 'amarillo'; badgeLabel = 'Poco stock'; }
    else                    { badgeClass = 'verde';   badgeLabel = 'OK'; }

    return `
      <tr>
        <td><input type="checkbox" class="inv-chk" data-id="${p.id}" data-stock="${p.stock}" onchange="_actualizarContadorInv()"></td>
        <td><strong>${p.nombre}</strong></td>
        <td style="font-family:monospace;font-size:13px">${p.codigo_pieza || '—'}</td>
        <td>${p.categorias?.nombre || '—'}</td>
        <td style="font-weight:700;font-size:15px" id="stock-display-${p.id}">${p.stock}</td>
        <td><span class="badge-stock ${badgeClass}">${badgeLabel}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="number" id="stock-${p.id}" min="0" value="${p.stock}"
              style="width:70px;padding:6px 8px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none">
            <button class="accion-btn accion-editar" onclick="actualizarStock('${p.id}', '${p.nombre.replace(/'/g,"\\'")}')">Actualizar</button>
            <span id="stock-msg-${p.id}" style="font-size:12px;font-weight:600"></span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function actualizarStock(id, nombre) {
  const input = document.getElementById('stock-' + id);
  const msg   = document.getElementById('stock-msg-' + id);
  const val   = parseInt(input.value);
  if (isNaN(val) || val < 0) {
    msg.textContent = '⚠️ Valor inválido'; msg.style.color = '#c00'; return;
  }
  msg.textContent = 'Guardando...'; msg.style.color = '#888';
  const { error } = await db.from('productos').update({ stock: val }).eq('id', id);
  if (error) {
    msg.textContent = '❌ Error'; msg.style.color = '#c00';
  } else {
    msg.textContent = '✅ Actualizado'; msg.style.color = '#1a7a3f';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }
}

async function exportarBajoStock() {
  const { data } = await db.from('productos')
    .select('nombre, codigo_pieza, stock')
    .lte('stock', 10)
    .order('stock', { ascending: true });

  if (!data || !data.length) {
    alert('No hay productos con stock bajo o igual a 10.');
    return;
  }

  const filas = [['Nombre', 'Código', 'Stock']];
  data.forEach(p => filas.push([`"${p.nombre}"`, p.codigo_pieza || '', p.stock]));
  const csv = filas.map(f => f.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `bajo-stock-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function seleccionarTodosInv(checked) {
  document.querySelectorAll('.inv-chk').forEach(c => { c.checked = checked; });
  _actualizarContadorInv();
}

function _actualizarContadorInv() {
  const n = document.querySelectorAll('.inv-chk:checked').length;
  const lbl = document.getElementById('inv-seleccionados-label');
  if (lbl) lbl.textContent = n ? `${n} seleccionado${n !== 1 ? 's' : ''}` : '';
}

async function ajusteStockMasivo() {
  const checks = [...document.querySelectorAll('.inv-chk:checked')];
  if (!checks.length) { alert('Seleccioná al menos un producto.'); return; }
  const tipo = document.getElementById('inv-ajuste-tipo').value;
  const val  = parseInt(document.getElementById('inv-ajuste-valor').value);
  if (isNaN(val) || val < 0) { alert('Ingresá una cantidad válida.'); return; }
  const tipoLabel = { sumar: 'sumar', restar: 'restar', establecer: 'establecer en' }[tipo];
  if (!confirm(`¿${tipoLabel} ${val} a ${checks.length} producto${checks.length !== 1 ? 's' : ''}?`)) return;

  let ok = 0, err = 0;
  for (const chk of checks) {
    const id  = chk.dataset.id;
    const cur = parseInt(chk.dataset.stock) || 0;
    let nuevoStock;
    if (tipo === 'sumar')      nuevoStock = cur + val;
    else if (tipo === 'restar') nuevoStock = Math.max(0, cur - val);
    else                        nuevoStock = val;
    const { error } = await db.from('productos').update({ stock: nuevoStock }).eq('id', id);
    if (error) { err++; continue; }
    chk.dataset.stock = nuevoStock;
    const disp = document.getElementById('stock-display-' + id);
    if (disp) disp.textContent = nuevoStock;
    const inp = document.getElementById('stock-' + id);
    if (inp) inp.value = nuevoStock;
    ok++;
  }
  alert(`Ajuste completado: ${ok} actualizado${ok !== 1 ? 's' : ''}${err ? `, ${err} con error` : ''}.`);
  await cargarInventario();
}

async function cargarEstadoSistema() {
  const tablas = [
    { key: 'productos',         id: 'sis-productos' },
    { key: 'pedidos',           id: 'sis-pedidos' },
    { key: 'usuarios',          id: 'sis-usuarios' },
    { key: 'talleres',          id: 'sis-talleres' },
    { key: 'categorias',        id: 'sis-categorias' },
    { key: 'compatibilidades',  id: 'sis-compatibilidades' },
  ];
  for (const t of tablas) {
    const { count } = await db.from(t.key).select('*', { count: 'exact', head: true });
    const el = document.getElementById(t.id);
    if (el) el.textContent = count ?? '—';
  }

  const conexEl = document.getElementById('sis-conexion');
  try {
    const { error } = await db.from('productos').select('id').limit(1);
    conexEl.innerHTML = error
      ? `<span style="color:#dc2626">❌ Error: ${error.message}</span>`
      : `<span style="color:#16a34a">✅ Conectado a Supabase</span>`;
  } catch (e) {
    conexEl.innerHTML = `<span style="color:#dc2626">❌ Sin conexión</span>`;
  }

  const { data: ultima } = await db.from('items_proveedor')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  const impEl = document.getElementById('sis-ultima-importacion');
  if (impEl) {
    impEl.textContent = ultima?.[0]?.created_at
      ? new Date(ultima[0].created_at).toLocaleString('es-AR')
      : 'Sin importaciones registradas';
  }
}

// ── BANNERS ───────────────────────────────────
async function cargarBanners() {
  const { data } = await db.from('banners').select('*').order('orden');
  const tbody = document.getElementById('tbody-banners');
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="vacio" style="text-align:center;padding:30px;color:#aaa">No hay banners cargados aún.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(b => `
    <tr>
      <td>
        <img src='${b.url_imagen}' alt='${b.texto_alt || ""}'
          style="width:80px;height:45px;object-fit:cover;border-radius:6px;border:1px solid #eee"
          onerror="this.style.background='#f0f0f0';this.src=''">
      </td>
      <td style="font-size:13px">${b.texto_alt || '—'}</td>
      <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${b.url_destino ? `<a href="${b.url_destino}" target="_blank" style="color:var(--rojo)">${b.url_destino}</a>` : '—'}
      </td>
      <td style="text-align:center;font-weight:700">${b.orden ?? 0}</td>
      <td>
        <button class="accion-btn ${b.activo ? 'accion-editar' : ''}"
          onclick="toggleBannerActivo('${b.id}', ${b.activo})"
          style="background:${b.activo ? '#dcfce7' : '#fee2e2'};color:${b.activo ? '#16a34a' : '#dc2626'}">
          ${b.activo ? 'Activo' : 'Inactivo'}
        </button>
      </td>
      <td>
        <button class="accion-btn accion-eliminar" onclick="eliminarBanner('${b.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function actualizarPreviewBanner() {
  const urlEl   = document.getElementById('b-url');
  const textoEl = document.getElementById('b-alt');
  const wrap    = document.getElementById('banner-preview-wrap');
  const img     = document.getElementById('banner-preview-img');
  const texto   = document.getElementById('banner-preview-texto');

  const url = urlEl ? urlEl.value.trim() : '';
  if (!url) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  img.src = url;
  img.onerror = () => { wrap.style.display = 'none'; };
  texto.textContent = textoEl ? textoEl.value : '';
}

async function guardarBanner() {
  const msg     = document.getElementById('banner-msg');
  const url     = document.getElementById('b-url').value.trim();
  const link    = document.getElementById('b-link').value.trim();
  const alt     = document.getElementById('b-alt').value.trim();
  const posicion = document.getElementById('b-posicion')?.value || 'arriba';
  const orden   = parseInt(document.getElementById('b-orden').value) || 0;
  const activo  = document.getElementById('b-activo').checked;

  if (!url) { msg.textContent = '⚠️ Ingresá la URL de la imagen.'; msg.style.color = '#c00'; return; }
  msg.textContent = 'Guardando...'; msg.style.color = '#888';

  const { error } = await db.from('banners').insert({ url_imagen: url, url_destino: link || null, texto_alt: alt || null, posicion, orden, activo });
  if (error) {
    msg.textContent = '❌ ' + error.message; msg.style.color = '#c00';
  } else {
    msg.textContent = '✅ Banner guardado.'; msg.style.color = '#1a7a3f';
    document.getElementById('b-url').value  = '';
    document.getElementById('b-link').value = '';
    document.getElementById('b-alt').value  = '';
    document.getElementById('b-posicion').value = 'arriba';
    document.getElementById('b-orden').value = '0';
    document.getElementById('b-activo').checked = true;
    document.getElementById('banner-preview-wrap').style.display = 'none';
    cargarBanners();
  }
}

async function toggleBannerActivo(id, activo) {
  await db.from('banners').update({ activo: !activo }).eq('id', id);
  cargarBanners();
}

async function eliminarBanner(id) {
  if (!confirm('¿Eliminás este banner?')) return;
  await db.from('banners').delete().eq('id', id);
  cargarBanners();
}

// ── CONSULTAS ─────────────────────────────────
let consultaSeleccionadaId = null;

async function cargarConsultas() {
  const { data } = await db.from('consultas').select('*').order('creado_en', { ascending: false });
  const cont = document.getElementById('consultas-lista');
  if (!data || !data.length) {
    cont.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-size:14px">No hay consultas todavía.</div>';
    return;
  }
  const noLeidas = data.filter(c => !c.leido).length;
  const badge = document.getElementById('badge-consultas-nuevas');
  if (badge) { badge.textContent = noLeidas; badge.style.display = noLeidas > 0 ? 'inline-block' : 'none'; }

  cont.innerHTML = `
    <div style="overflow-x:auto">
      <table class="tabla-admin">
        <thead><tr>
          <th>Estado</th><th>Nombre</th><th>Email</th><th>Asunto</th><th>Fecha</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          ${data.map(c => `
            <tr style="opacity:${c.leido ? '0.6' : '1'}">
              <td>${c.leido
                ? '<span style="color:#888;font-size:12px">Leída</span>'
                : '<span style="background:#fee2e2;color:#dc2626;font-size:11px;font-weight:700;border-radius:20px;padding:2px 9px">Nueva</span>'}</td>
              <td style="font-weight:600">${c.nombre}</td>
              <td style="font-size:13px;color:#666">${c.email}</td>
              <td style="font-size:13px">${c.asunto || '—'}</td>
              <td style="font-size:12px;color:#888">${new Date(c.creado_en).toLocaleDateString('es-AR')}</td>
              <td style="display:flex;gap:6px">
                <button class="accion-btn accion-editar" onclick="verConsulta('${c.id}','${(c.nombre||'').replace(/'/g,"\\'")}','${(c.email||'')}','${(c.telefono||'')}','${(c.asunto||'').replace(/'/g,"\\'")}','${(c.mensaje||'').replace(/'/g,"\\'").replace(/\n/g,'\\n')}','${c.creado_en}')">Ver</button>
                ${!c.leido ? `<button class="accion-btn" style="background:#e6f7ee;color:#1a7a3f" onclick="marcarLeida('${c.id}')">Leída</button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function verConsulta(id, nombre, email, tel, asunto, mensaje, fecha) {
  consultaSeleccionadaId = id;
  document.getElementById('mc-nombre').textContent = nombre;
  document.getElementById('mc-meta').textContent = `${email}${tel ? ' · ' + tel : ''}${asunto ? ' · ' + asunto : ''} · ${new Date(fecha).toLocaleDateString('es-AR')}`;
  document.getElementById('mc-mensaje').textContent = mensaje.replace(/\\n/g, '\n');
  const modal = document.getElementById('modal-consulta');
  modal.style.display = 'flex';
}

function cerrarModalConsulta() {
  document.getElementById('modal-consulta').style.display = 'none';
  consultaSeleccionadaId = null;
}

async function marcarLeida(id) {
  await db.from('consultas').update({ leido: true }).eq('id', id);
  cerrarModalConsulta();
  cargarConsultas();
}

// ── REALTIME: nuevos pedidos ──────────────────
function iniciarRealtimePedidos() {
  db.channel('admin-pedidos')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, payload => {
      const p = payload.new;
      mostrarNotifAdmin(`Nuevo pedido de ${p.nombre_cliente || 'cliente'} — $${Number(p.total || 0).toLocaleString('es-AR')}`);
      const badge = document.getElementById('badge-pedidos-nuevos');
      if (badge) {
        badge.textContent = parseInt(badge.textContent || '0') + 1;
        badge.style.display = 'inline-block';
      }
    })
    .subscribe();
}

function mostrarNotifAdmin(texto) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:20px;right:20px;background:#1a1a1a;color:#fff;padding:14px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);border-left:4px solid var(--rojo);max-width:320px;animation:slideIn .3s ease';
  div.textContent = '🔔 ' + texto;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 6000);

  if (Notification.permission === 'granted') {
    new Notification('Piezauto Admin', { body: texto, icon: '/favicon.ico' });
  }
}

if (Notification.permission === 'default') {
  Notification.requestPermission();
}

iniciarRealtimePedidos();

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
  const [pedRes, conRes] = await Promise.all([
    db.from('pedidos').select('id', { count: 'exact' }).eq('estado', 'nuevo'),
    db.from('consultas').select('id', { count: 'exact' }).eq('leido', false),
  ]);
  actualizarBadge('badge-pedidos-nuevos', pedRes.count ?? 0);
  actualizarBadge('badge-consultas-nuevas', conRes.count ?? 0);
}

// ── DESCUENTOS POR VOLUMEN ────────────────────
let reglasDescuento = [];

function agregarReglaDescuento() {
  reglasDescuento.push({ cantidad_minima: 3, descuento_porcentaje: 10 });
  renderReglasDescuento();
}

function eliminarReglaDescuento(idx) {
  reglasDescuento.splice(idx, 1);
  renderReglasDescuento();
}

function renderReglasDescuento() {
  const el = document.getElementById('descuentos-vol-lista');
  if (!el) return;
  if (!reglasDescuento.length) {
    el.innerHTML = '<p style="color:#aaa;font-size:13px">Sin reglas — el precio es fijo para cualquier cantidad.</p>';
    return;
  }
  el.innerHTML = reglasDescuento.map((r, i) => `
    <div class="descuento-vol-item">
      <span>Comprando</span>
      <input type="number" min="1" id="reg-cant-${i}" oninput="reglasDescuento[${i}].cantidad_minima=+this.value" style="width:70px">
      <span>o más →</span>
      <input type="number" min="1" max="100" id="reg-desc-${i}" oninput="reglasDescuento[${i}].descuento_porcentaje=+this.value" style="width:70px">
      <span>% de descuento</span>
      <button class="descuento-vol-btn-del" onclick="eliminarReglaDescuento(${i})">Quitar</button>
    </div>
  `).join('');
  reglasDescuento.forEach((r, i) => {
    const cant = document.getElementById('reg-cant-' + i);
    const desc = document.getElementById('reg-desc-' + i);
    if (cant) cant.value = r.cantidad_minima;
    if (desc) desc.value = r.descuento_porcentaje;
  });
}

async function cargarReglasDescuento(productoId) {
  const { data } = await db.from('descuentos_volumen').select('*').eq('producto_id', productoId).eq('activo', true).order('cantidad_minima');
  reglasDescuento = (data || []).map(r => ({ cantidad_minima: r.cantidad_minima, descuento_porcentaje: +r.descuento_porcentaje }));
  renderReglasDescuento();
}

async function guardarReglasDescuento(productoId) {
  await db.from('descuentos_volumen').delete().eq('producto_id', productoId);
  if (!reglasDescuento.length) return;
  const rows = reglasDescuento
    .filter(r => r.cantidad_minima > 0 && r.descuento_porcentaje > 0)
    .map(r => ({ producto_id: productoId, cantidad_minima: r.cantidad_minima, descuento_porcentaje: r.descuento_porcentaje }));
  if (rows.length) await db.from('descuentos_volumen').insert(rows);
}

// ── VENDEDORES ────────────────────────────────
let editandoVendedorId = null;

async function cargarTablaVendedores() {
  const el = document.getElementById('tabla-vendedores');
  el.innerHTML = '<div class="loader">Cargando...</div>';
  const { data } = await db.from('vendedores').select('*').order('creado_en', { ascending: false });
  if (!data || !data.length) { el.innerHTML = '<p style="color:#aaa;padding:20px 0">Sin vendedores registrados.</p>'; return; }
  el.innerHTML = `<table class="tabla-admin">
    <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Comisión</th><th>Estado</th><th>Acciones</th></tr></thead>
    <tbody>${data.map(v => `
      <tr>
        <td><strong>${v.nombre}</strong></td>
        <td>${v.email}</td>
        <td>${v.telefono || '—'}</td>
        <td>${v.comision_porcentaje}%</td>
        <td><span class="${v.activo ? 'badge-activo' : 'badge-inactivo'}">${v.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="accion-btn accion-editar" onclick="editarVendedor('${v.id}','${v.nombre.replace(/'/g,"\\'")}','${v.email}','${v.telefono||''}',${v.comision_porcentaje})">Editar</button>
          <button class="accion-btn accion-eliminar" onclick="toggleVendedor('${v.id}',${v.activo})">${v.activo ? 'Desactivar' : 'Activar'}</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function guardarVendedor() {
  const nombre   = document.getElementById('v-nombre').value.trim();
  const email    = document.getElementById('v-email').value.trim();
  const telefono = document.getElementById('v-telefono').value.trim();
  const comision = parseFloat(document.getElementById('v-comision').value) || 10;
  const msg      = document.getElementById('v-msg');

  if (!nombre || !email) { msg.style.color='var(--rojo)'; msg.textContent='Nombre y email son obligatorios.'; return; }
  msg.style.color='#888'; msg.textContent='Guardando...';

  const row = { nombre, email, comision_porcentaje: comision };
  if (telefono) row.telefono = telefono;

  let error;
  if (editandoVendedorId) {
    ({ error } = await db.from('vendedores').update(row).eq('id', editandoVendedorId));
  } else {
    ({ error } = await db.from('vendedores').insert(row));
  }
  if (error) { msg.style.color='var(--rojo)'; msg.textContent='Error: ' + error.message; return; }

  msg.style.color='#22c55e'; msg.textContent = editandoVendedorId ? '✅ Vendedor actualizado.' : '✅ Vendedor registrado.';
  cancelarVendedor();
  cargarTablaVendedores();
}

function editarVendedor(id, nombre, email, telefono, comision) {
  editandoVendedorId = id;
  document.getElementById('v-nombre').value   = nombre;
  document.getElementById('v-email').value    = email;
  document.getElementById('v-telefono').value = telefono;
  document.getElementById('v-comision').value = comision;
  document.getElementById('v-form-titulo').textContent = 'Editar vendedor';
  document.getElementById('v-btn-cancelar').style.display = 'inline-block';
  document.getElementById('v-msg').textContent = '';
}

function cancelarVendedor() {
  editandoVendedorId = null;
  ['v-nombre','v-email','v-telefono'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('v-comision').value = '10';
  document.getElementById('v-form-titulo').textContent = 'Registrar vendedor';
  document.getElementById('v-btn-cancelar').style.display = 'none';
  document.getElementById('v-msg').textContent = '';
}

async function toggleVendedor(id, activo) {
  await db.from('vendedores').update({ activo: !activo }).eq('id', id);
  cargarTablaVendedores();
}

async function cargarVendedoresFiltro() {
  const { data } = await db.from('vendedores').select('id, nombre').eq('activo', true).order('nombre');
  const sel = document.getElementById('f-vendedor');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Stock propio Piezauto —</option>' +
    (data || []).map(v => `<option value="${v.id}">${v.nombre}</option>`).join('');
}

// ── EXPORTACIÓN CSV ───────────────────────────
function descargarCSV(nombre, datos, campos) {
  const csv = Papa.unparse({ fields: campos, data: datos });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre + '_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}

async function exportarPedidos() {
  const msg = document.getElementById('export-msg');
  msg.textContent = 'Generando...';
  const inicio = new Date(); inicio.setDate(1); inicio.setHours(0,0,0,0);
  const { data, error } = await db.from('pedidos')
    .select('id, estado, nombre_cliente, email_cliente, telefono_cliente, metodo_pago, metodo_envio, total, creado_en')
    .gte('creado_en', inicio.toISOString())
    .order('creado_en', { ascending: false });
  if (error || !data) { msg.textContent = 'Error al obtener pedidos.'; return; }
  descargarCSV('pedidos', data.map(p => ({
    ID: p.id, Estado: p.estado, Nombre: p.nombre_cliente, Email: p.email_cliente,
    Teléfono: p.telefono_cliente, Pago: p.metodo_pago, Envío: p.metodo_envio,
    Total: p.total, Fecha: p.creado_en?.slice(0,10)
  })), ['ID','Estado','Nombre','Email','Teléfono','Pago','Envío','Total','Fecha']);
  msg.textContent = `✅ ${data.length} pedidos exportados.`;
}

async function exportarClientes() {
  const msg = document.getElementById('export-msg');
  msg.textContent = 'Generando...';
  const { data, error } = await db.from('usuarios')
    .select('id, nombre, apellido, email, telefono, creado_en')
    .order('creado_en', { ascending: false });
  if (error || !data) { msg.textContent = 'Error al obtener clientes.'; return; }
  descargarCSV('clientes', data.map(u => ({
    ID: u.id, Nombre: u.nombre, Apellido: u.apellido,
    Email: u.email, Teléfono: u.telefono, Registro: u.creado_en?.slice(0,10)
  })), ['ID','Nombre','Apellido','Email','Teléfono','Registro']);
  msg.textContent = `✅ ${data.length} clientes exportados.`;
}

async function exportarProductos() {
  const msg = document.getElementById('export-msg');
  msg.textContent = 'Generando...';
  const { data, error } = await db.from('productos')
    .select('id, nombre, codigo_pieza, marca_producto, precio, precio_oferta, stock, activo, creado_en')
    .eq('activo', true)
    .order('nombre');
  if (error || !data) { msg.textContent = 'Error al obtener productos.'; return; }
  descargarCSV('productos', data.map(p => ({
    ID: p.id, Nombre: p.nombre, Código: p.codigo_pieza, Marca: p.marca_producto,
    Precio: p.precio, PrecioOferta: p.precio_oferta || '', Stock: p.stock
  })), ['ID','Nombre','Código','Marca','Precio','PrecioOferta','Stock']);
  msg.textContent = `✅ ${data.length} productos exportados.`;
}

async function exportarReportePDF() {
  const msg = document.getElementById('export-msg');
  msg.textContent = 'Generando PDF...';

  const { jsPDF } = window.jspdf;
  if (!jsPDF) { msg.textContent = 'Error: jsPDF no disponible.'; return; }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const ahora   = new Date();
  const periodo = ahora.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const fechaHoy = ahora.toLocaleDateString('es-AR');

  // Encabezado
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PIEZAUTO', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte mensual de ventas', 14, 19);
  doc.text(`Generado: ${fechaHoy}`, 140, 12);
  doc.text(`Período: ${periodo}`, 140, 19);

  let y = 36;
  doc.setTextColor(50, 50, 50);

  // Función helper para sección
  const seccion = (titulo, yPos) => {
    doc.setFillColor(245, 245, 245);
    doc.rect(10, yPos, 190, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(titulo, 14, yPos + 5);
    doc.setTextColor(50, 50, 50);
    return yPos + 12;
  };

  // Resumen de ventas (leer desde DOM — ya cargado)
  y = seccion('RESUMEN DE VENTAS', y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const stats = [
    ['Ventas este mes', document.getElementById('r-ventas-mes')?.textContent || '—'],
    ['Ventas mes anterior', document.getElementById('r-ventas-ant')?.textContent || '—'],
    ['Pedidos este mes', document.getElementById('r-pedidos-mes')?.textContent || '—'],
    ['Ticket promedio', document.getElementById('r-ticket-prom')?.textContent || '—'],
  ];
  stats.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(k + ':', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, 90, y);
    y += 6;
  });

  y += 4;
  y = seccion('TOP 5 PRODUCTOS MÁS VENDIDOS', y);
  doc.setFontSize(9);
  const topEl = document.getElementById('top-productos-lista');
  const topTexto = topEl ? topEl.innerText.replace(/\s{2,}/g, ' ').trim() : '—';
  const topLineas = doc.splitTextToSize(topTexto, 182);
  topLineas.slice(0, 12).forEach(l => {
    doc.text(l, 14, y);
    y += 5;
    if (y > 270) return;
  });

  y += 4;
  y = seccion('PEDIDOS POR ESTADO', y);
  doc.setFontSize(9);
  const estadoEl = document.getElementById('r-por-estado');
  const estadoTexto = estadoEl ? estadoEl.innerText.replace(/\s{2,}/g, ' ').trim() : '—';
  const estLineas = doc.splitTextToSize(estadoTexto, 182);
  estLineas.slice(0, 10).forEach(l => {
    doc.text(l, 14, y);
    y += 5;
  });

  // Gráfico de pedidos (canvas)
  try {
    const canvas = document.getElementById('chart-categorias');
    if (canvas) {
      if (y + 80 > 285) { doc.addPage(); y = 20; }
      y = seccion('VENTAS POR CATEGORÍA', y);
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, y, 90, 60);
    }
  } catch {}

  // Pie de página
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Piezauto — Reporte ${periodo} · Página ${i} de ${pages}`, 14, 293);
  }

  doc.save(`piezauto-reporte-${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}.pdf`);
  msg.textContent = '✅ PDF descargado.';
}

// ── TAGS PRODUCTO ────────────────────────────
function agregarTag(e) {
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, '');
  if (!val || _tags.includes(val)) { e.target.value = ''; return; }
  _tags.push(val);
  e.target.value = '';
  renderChips();
}

function quitarTag(tag) {
  _tags = _tags.filter(t => t !== tag);
  renderChips();
}

function renderChips() {
  const cont = document.getElementById('tags-chips');
  if (!cont) return;
  cont.innerHTML = _tags.map(t =>
    `<span class="tag-chip">${t}<button type="button" onclick="quitarTag('${t}')">×</button></span>`
  ).join('');
}

// ── HEATMAP DE PEDIDOS ────────────────────────
async function cargarHeatmap() {
  const desde = new Date();
  desde.setDate(desde.getDate() - 83);

  const { data } = await db.from('pedidos')
    .select('creado_en')
    .gte('creado_en', desde.toISOString());

  const conteo = {};
  (data || []).forEach(p => {
    const dia = p.creado_en.split('T')[0];
    conteo[dia] = (conteo[dia] || 0) + 1;
  });

  const max = Math.max(1, ...Object.values(conteo));
  const hoy = new Date();

  let celdas = '';
  for (let i = 83; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const count = conteo[iso] || 0;
    const intensidad = count === 0 ? 0 : Math.ceil((count / max) * 4);
    const colores = ['#1a1a1a', '#7f1d1d', '#b91c1c', '#dc2626', '#E63946'];
    const color = colores[intensidad];
    celdas += `<div class="hm-cell" style="background:${color}" title="${iso}: ${count} pedido${count !== 1 ? 's' : ''}"></div>`;
  }

  document.getElementById('heatmap-pedidos').innerHTML = `<div class="heatmap-grid">${celdas}</div>`;
}

// ── ACTIVIDAD REALTIME ────────────────────────
let _actividadItems = [];
let _realtimeActividadSuscripto = false;

function agregarActividad(tipo, texto, fecha) {
  _actividadItems.unshift({ tipo, texto, fecha: fecha || new Date().toISOString() });
  if (_actividadItems.length > 15) _actividadItems.pop();
  renderActividad();
}

function renderActividad() {
  const el = document.getElementById('actividad-lista');
  if (!el) return;
  if (_actividadItems.length === 0) {
    el.innerHTML = '<div class="actividad-loading">Sin actividad reciente</div>';
    return;
  }
  const iconos = { pedido: '🛒', usuario: '👤', turno: '📅', presupuesto: '📋' };
  el.innerHTML = _actividadItems.map(item => {
    const hora = new Date(item.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return `<div class="actividad-item"><span class="act-icon">${iconos[item.tipo] || '📌'}</span><span class="act-texto">${item.texto}</span><span class="act-hora">${hora}</span></div>`;
  }).join('');
}

async function iniciarRealtimeActividad() {
  if (_realtimeActividadSuscripto) return;
  _realtimeActividadSuscripto = true;
  _actividadItems = [];

  const [{ data: pedidos }, { data: usuarios }, { data: turnos }] = await Promise.all([
    db.from('pedidos').select('id, creado_en, estado').order('creado_en', { ascending: false }).limit(5),
    db.from('usuarios').select('id, nombre, creado_en').order('creado_en', { ascending: false }).limit(3),
    db.from('turnos').select('id, creado_en, estado').order('creado_en', { ascending: false }).limit(3),
  ]);

  (pedidos || []).forEach(p => agregarActividad('pedido', `Nuevo pedido #${p.id.slice(-6).toUpperCase()}`, p.creado_en));
  (usuarios || []).forEach(u => agregarActividad('usuario', `Nuevo usuario: ${u.nombre || 'sin nombre'}`, u.creado_en));
  (turnos || []).forEach(t => agregarActividad('turno', `Turno reservado #${t.id.slice(-6).toUpperCase()}`, t.creado_en));

  db.channel('actividad-admin')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, payload => {
      agregarActividad('pedido', `Nuevo pedido #${payload.new.id.slice(-6).toUpperCase()}`, payload.new.creado_en);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'usuarios' }, payload => {
      agregarActividad('usuario', `Nuevo usuario: ${payload.new.nombre || 'sin nombre'}`, payload.new.creado_en);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'turnos' }, payload => {
      agregarActividad('turno', `Turno reservado #${payload.new.id.slice(-6).toUpperCase()}`, payload.new.creado_en);
    })
    .subscribe();
}

// ── CONFIGURACIÓN GENERAL ─────────────────────
const CFG_CLAVES = ['nombre', 'telefono', 'whatsapp', 'email', 'direccion', 'horario', 'instagram', 'facebook', 'costo_envio', 'envio_gratis_desde', 'mp_public_key', 'mp_access_token', 'emailjs_service', 'emailjs_template', 'emailjs_key', 'wa_flotante', 'ga_id', 'wa_mensaje_bienvenida', 'horarios_por_dia', 'modo_mantenimiento', 'mantenimiento_mensaje', 'mantenimiento_eta'];
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

async function cargarConfiguracion() {
  const { data } = await db.from('configuracion').select('clave, valor');
  if (!data) return;
  const map = {};
  data.forEach(r => { map[r.clave] = r.valor; });

  const EXCLUIR = ['horarios_por_dia', 'modo_mantenimiento', 'mantenimiento_mensaje', 'mantenimiento_eta'];
  CFG_CLAVES.filter(c => !EXCLUIR.includes(c)).forEach(c => {
    const el = document.getElementById('cfg-' + c.replace(/_/g, '-'));
    if (el) el.value = map[c] || '';
  });

  // Horarios por día
  let horarios = {};
  try { horarios = JSON.parse(map['horarios_por_dia'] || '{}'); } catch (_) {}
  renderHorarioTabla(horarios);

  // Modo mantenimiento
  const chkMant = document.getElementById('cfg-mantenimiento');
  if (chkMant) {
    chkMant.checked = map['modo_mantenimiento'] === 'true';
    sincronizarToggleMant(chkMant.checked);
  }
  const inpMantMsg = document.getElementById('cfg-mant-mensaje');
  const inpMantEta = document.getElementById('cfg-mant-eta');
  if (inpMantMsg) inpMantMsg.value = map['mantenimiento_mensaje'] || '';
  if (inpMantEta) inpMantEta.value = map['mantenimiento_eta']    || '';

  actualizarPreviewHeader(map);
}

function renderHorarioTabla(horarios) {
  const tbody = document.getElementById('horarios-tabla');
  if (!tbody) return;
  tbody.innerHTML = DIAS_SEMANA.map(dia => {
    const h = horarios[dia] || {};
    return `<tr>
      <td style="padding:8px 12px;font-weight:600">${dia}</td>
      <td style="padding:4px 8px"><input type="time" id="hr-apertura-${dia}" value="${h.apertura || ''}" oninput="actualizarPreviewHeader()" style="padding:6px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px"></td>
      <td style="padding:4px 8px"><input type="time" id="hr-cierre-${dia}" value="${h.cierre || ''}" oninput="actualizarPreviewHeader()" style="padding:6px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px"></td>
      <td style="padding:4px 8px"><input type="checkbox" id="hr-cerrado-${dia}" ${h.cerrado ? 'checked' : ''} onchange="actualizarPreviewHeader()" style="width:18px;height:18px;accent-color:var(--rojo);cursor:pointer"></td>
    </tr>`;
  }).join('');
}

function leerHorarioTabla() {
  const horarios = {};
  DIAS_SEMANA.forEach(dia => {
    const ap = document.getElementById('hr-apertura-' + dia)?.value;
    const ci = document.getElementById('hr-cierre-' + dia)?.value;
    const ce = document.getElementById('hr-cerrado-' + dia)?.checked;
    if (ap || ci || ce) horarios[dia] = { apertura: ap, cierre: ci, cerrado: ce };
  });
  return horarios;
}

function actualizarPreviewHeader(cfgMap) {
  const nombre  = cfgMap?.nombre    || document.getElementById('cfg-nombre')?.value    || '';
  const tel     = cfgMap?.telefono  || document.getElementById('cfg-telefono')?.value  || '';
  const dir     = cfgMap?.direccion || document.getElementById('cfg-direccion')?.value || '';

  // Construir resumen de horarios
  const hors = cfgMap ? (() => { try { return JSON.parse(cfgMap['horarios_por_dia'] || '{}'); } catch (_) { return {}; } })() : leerHorarioTabla();
  const diasAbiertos = DIAS_SEMANA.filter(d => !hors[d]?.cerrado && hors[d]?.apertura);
  let horarioLabel = '';
  if (diasAbiertos.length) {
    const abr = d => d.slice(0, 3);
    if (diasAbiertos.length === 6) {
      const h = hors[diasAbiertos[0]];
      horarioLabel = `Lun–Sáb ${h.apertura?.slice(0,5)}–${h.cierre?.slice(0,5)}hs`;
    } else if (diasAbiertos.length > 0) {
      const h = hors[diasAbiertos[0]];
      horarioLabel = `${abr(diasAbiertos[0])}–${abr(diasAbiertos[diasAbiertos.length - 1])} ${h.apertura?.slice(0,5)}–${h.cierre?.slice(0,5)}hs`;
    }
  }

  const partes = [];
  if (dir) partes.push('📍 ' + dir);
  if (horarioLabel) partes.push(horarioLabel);

  const infoEl = document.getElementById('prev-topbar-info');
  const telEl  = document.getElementById('prev-topbar-tel');
  if (infoEl) infoEl.textContent = partes.length ? partes.join(' · ') : '📍 Dirección · Horario de atención';
  if (telEl)  telEl.textContent  = tel ? '📞 ' + tel : '📞 Teléfono';
}

function sincronizarToggleMant(activo) {
  const track = document.getElementById('toggle-track');
  const thumb = document.getElementById('toggle-thumb');
  const label = document.getElementById('mant-estado-label');
  if (track) track.style.background = activo ? '#E63946' : '#ccc';
  if (thumb) thumb.style.transform  = activo ? 'translateX(24px)' : '';
  if (label) { label.textContent = activo ? 'ACTIVO' : 'Desactivado'; label.style.color = activo ? '#E63946' : '#555'; }
}

function toggleMantenimiento(activo) {
  sincronizarToggleMant(activo);
}

async function guardarConfiguracion() {
  const msg = document.getElementById('cfg-msg');
  const EXCLUIR = ['horarios_por_dia', 'modo_mantenimiento', 'mantenimiento_mensaje', 'mantenimiento_eta'];
  const upserts = CFG_CLAVES.filter(c => !EXCLUIR.includes(c)).map(c => ({
    clave: c,
    valor: document.getElementById('cfg-' + c.replace(/_/g, '-'))?.value || '',
    actualizado_en: new Date().toISOString(),
  }));
  upserts.push(
    { clave: 'horarios_por_dia',      valor: JSON.stringify(leerHorarioTabla()), actualizado_en: new Date().toISOString() },
    { clave: 'modo_mantenimiento',     valor: document.getElementById('cfg-mantenimiento')?.checked ? 'true' : 'false', actualizado_en: new Date().toISOString() },
    { clave: 'mantenimiento_mensaje',  valor: document.getElementById('cfg-mant-mensaje')?.value || '', actualizado_en: new Date().toISOString() },
    { clave: 'mantenimiento_eta',      valor: document.getElementById('cfg-mant-eta')?.value     || '', actualizado_en: new Date().toISOString() },
  );
  const { error } = await db.from('configuracion').upsert(upserts, { onConflict: 'clave' });
  if (error) {
    msg.style.color = '#E63946';
    msg.textContent = '❌ Error al guardar: ' + error.message;
  } else {
    msg.style.color = '#22c55e';
    msg.textContent = '✅ Configuración guardada correctamente.';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }
}

// ── LOGÍSTICA ─────────────────────────────────
async function cargarLogistica() {
  filtrarLogistica('confirmado');
}

async function filtrarLogistica(estado) {
  document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('activo'));
  const tabEl = document.getElementById('ltab-' + estado);
  if (tabEl) tabEl.classList.add('activo');

  const { data } = await db
    .from('pedidos')
    .select('id, creado_en, estado, tipo_envio, numero_seguimiento, transportista, usuarios(nombre, email)')
    .eq('estado', estado)
    .neq('tipo_envio', 'retiro')
    .order('creado_en', { ascending: true });

  const lista = document.getElementById('logistica-lista');
  const pedidos = data || [];

  if (!pedidos.length) {
    lista.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa">No hay pedidos en este estado.</div>';
    return;
  }

  lista.innerHTML = pedidos.map(p => {
    const fecha = new Date(p.creado_en).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
    return `
    <div class="log-card" id="logcard-${p.id}">
      <div class="log-card-header">
        <div>
          <div class="log-pedido-id">Pedido #${p.id.slice(-6).toUpperCase()}</div>
          <div class="log-cliente">${p.usuarios?.nombre || 'N/D'} · ${p.usuarios?.email || ''}</div>
        </div>
        <span class="log-fecha">${fecha}</span>
      </div>
      ${p.numero_seguimiento ? `<div style="font-size:13px;color:#555;margin-bottom:8px">📦 ${p.transportista || ''}: <strong>${p.numero_seguimiento}</strong></div>` : ''}
      <div class="log-acciones">
        <select onchange="cambiarEstadoLogistica('${p.id}', this.value)">
          <option value="confirmado" ${p.estado==='confirmado'?'selected':''}>Confirmado</option>
          <option value="preparando" ${p.estado==='preparando'?'selected':''}>Preparando</option>
          <option value="listo_despacho" ${p.estado==='listo_despacho'?'selected':''}>Listo para despacho</option>
          <option value="enviado" ${p.estado==='enviado'?'selected':''}>Enviado</option>
        </select>
        <div class="log-tracking-wrap">
          <select id="transp-${p.id}" style="width:130px;padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:13px">
            <option>OCA</option><option>Andreani</option><option>Correo Argentino</option><option>Otro</option>
          </select>
          <input type="text" id="tracking-${p.id}" placeholder="N° seguimiento" style="flex:1;padding:7px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:13px">
        </div>
        <button class="log-btn log-btn-tracking" onclick="guardarTracking('${p.id}')">Guardar tracking</button>
      </div>
    </div>`;
  }).join('');
  pedidos.forEach(p => {
    const inp = document.getElementById('tracking-' + p.id);
    if (inp && p.numero_seguimiento) inp.value = p.numero_seguimiento;
    const sel = document.getElementById('transp-' + p.id);
    if (sel && p.transportista) {
      [...sel.options].forEach(o => { if (o.text === p.transportista) o.selected = true; });
    }
  });
}

async function cambiarEstadoLogistica(pedidoId, nuevoEstado) {
  await db.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId);
  notificarCambioPedido(pedidoId, nuevoEstado);
}

async function guardarTracking(pedidoId) {
  const tracking = document.getElementById('tracking-' + pedidoId)?.value?.trim();
  const transportista = document.getElementById('transp-' + pedidoId)?.value;
  if (!tracking) return;
  const { error } = await db.from('pedidos').update({ numero_seguimiento: tracking, transportista, estado: 'enviado' }).eq('id', pedidoId);
  if (!error) {
    notificarCambioPedido(pedidoId, 'enviado');
    const card = document.getElementById('logcard-' + pedidoId);
    if (card) {
      const ok = document.createElement('div');
      ok.style.cssText = 'background:#dcfce7;color:#15803d;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:600;margin-top:8px';
      ok.textContent = '✅ Tracking guardado. Pedido marcado como Enviado.';
      card.appendChild(ok);
      setTimeout(() => ok.remove(), 3000);
    }
  }
}

// ══════════════════════════════════════════════════════
// PANEL: MARCAS DE PRODUCTOS
// ══════════════════════════════════════════════════════

let _marcasData = [];

async function cargarMarcasPanel() {
  document.getElementById('tbody-marcas').innerHTML =
    '<tr><td colspan="6" style="padding:24px;text-align:center;color:#aaa">Cargando...</td></tr>';

  const { data, error } = await db
    .from('productos')
    .select('marca_producto, precio')
    .eq('activo', true)
    .not('marca_producto', 'is', null)
    .neq('marca_producto', '');

  if (error || !data) {
    document.getElementById('tbody-marcas').innerHTML =
      '<tr><td colspan="6" style="padding:24px;text-align:center;color:#e63946">Error al cargar marcas.</td></tr>';
    return;
  }

  const grupos = {};
  data.forEach(p => {
    const m = (p.marca_producto || '').trim();
    if (!m) return;
    if (!grupos[m]) grupos[m] = [];
    if (p.precio) grupos[m].push(parseFloat(p.precio));
  });

  _marcasData = Object.entries(grupos)
    .map(([marca, precios]) => ({
      marca,
      cantidad: precios.length,
      promedio: precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : null,
      minimo:   precios.length ? Math.min(...precios) : null,
      maximo:   precios.length ? Math.max(...precios) : null,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  renderMarcasPanel(_marcasData);
}

function renderMarcasPanel(lista) {
  const fmt  = n => n != null ? '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const tbody = document.getElementById('tbody-marcas');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:24px;text-align:center;color:#aaa">No hay marcas registradas.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(m => `
    <tr>
      <td style="font-weight:700;color:#333">${m.marca}</td>
      <td style="text-align:center">
        <span style="background:#e8f0fe;color:#1a56c4;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700">${m.cantidad}</span>
      </td>
      <td style="text-align:right;color:#555">${fmt(m.promedio)}</td>
      <td style="text-align:right;color:#1a7a3f">${fmt(m.minimo)}</td>
      <td style="text-align:right;color:#e63946">${fmt(m.maximo)}</td>
      <td style="text-align:right">
        <button class="accion-btn accion-editar" onclick="verProductosDeMarca('${m.marca.replace(/'/g,"\\'")}')">Ver productos</button>
      </td>
    </tr>
  `).join('');
}

function filtrarMarcasPanel() {
  const q = (document.getElementById('marcas-buscar')?.value || '').toLowerCase();
  renderMarcasPanel(q ? _marcasData.filter(m => m.marca.toLowerCase().includes(q)) : _marcasData);
}

function verProductosDeMarca(marca) {
  mostrarPanel('productos');
  setTimeout(async () => {
    const { data } = await db.from('productos')
      .select('*', { count: 'exact' })
      .eq('activo', true)
      .eq('marca_producto', marca)
      .order('nombre')
      .limit(200);
    if (!data) return;
    const tbody = document.getElementById('tbody-productos');
    if (tbody) {
      tbody.innerHTML = data.map(p => renderFilaProducto(p, {})).join('');
    }
    document.getElementById('admin-titulo')?.textContent && (document.getElementById('admin-titulo').textContent = `Productos — ${marca}`);
  }, 100);
}

// ══════════════════════════════════════════════════════
// PANEL: OFERTAS
// ══════════════════════════════════════════════════════

let _ofertaBuscarTimer = null;

function toggleFormOferta() {
  const wrap = document.getElementById('oferta-form-wrap');
  const visible = wrap.style.display !== 'none';
  wrap.style.display = visible ? 'none' : 'block';
  if (!visible) {
    document.getElementById('oferta-prod-buscar').value = '';
    document.getElementById('oferta-prod-id').value = '';
    document.getElementById('oferta-prod-sel').textContent = '';
    document.getElementById('oferta-precio').value = '';
    document.getElementById('oferta-precio-normal').value = '';
    document.getElementById('oferta-inicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('oferta-fin').value = '';
    document.getElementById('oferta-msg').textContent = '';
  }
}

function buscarProductoOferta() {
  clearTimeout(_ofertaBuscarTimer);
  const texto = document.getElementById('oferta-prod-buscar').value.trim();
  const res = document.getElementById('oferta-prod-resultados');
  if (texto.length < 2) { res.style.display = 'none'; return; }
  _ofertaBuscarTimer = setTimeout(async () => {
    const { data } = await db.from('productos')
      .select('id, nombre, codigo_pieza, precio')
      .eq('activo', true)
      .or(`nombre.ilike.%${texto}%,codigo_pieza.ilike.%${texto}%`)
      .limit(8);
    if (!data?.length) { res.style.display = 'none'; return; }
    res.innerHTML = data.map(p =>
      `<div onclick="seleccionarProductoOferta('${p.id}','${p.nombre.replace(/'/g,"\\'")}',${p.precio||0})"
        style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:13px"
        onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background=''"
      ><strong>${p.nombre}</strong> ${p.codigo_pieza ? `<span style="color:#aaa;font-size:11px">· ${p.codigo_pieza}</span>` : ''} — <span style="color:#e63946;font-weight:700">$${Number(p.precio||0).toLocaleString('es-AR')}</span></div>`
    ).join('');
    res.style.display = 'block';
  }, 300);
}

function seleccionarProductoOferta(id, nombre, precio) {
  document.getElementById('oferta-prod-id').value  = id;
  document.getElementById('oferta-prod-buscar').value = nombre;
  document.getElementById('oferta-prod-resultados').style.display = 'none';
  document.getElementById('oferta-prod-sel').textContent = '✅ Producto seleccionado';
  document.getElementById('oferta-precio-normal').value = '$ ' + Number(precio).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

async function guardarOferta() {
  const prodId = document.getElementById('oferta-prod-id').value;
  const precio = parseFloat(document.getElementById('oferta-precio').value);
  const inicio = document.getElementById('oferta-inicio').value;
  const fin    = document.getElementById('oferta-fin').value;
  const msg    = document.getElementById('oferta-msg');

  if (!prodId) { msg.textContent = '⚠️ Seleccioná un producto.'; msg.style.color = '#e63946'; return; }
  if (!precio || precio <= 0) { msg.textContent = '⚠️ Ingresá un precio válido.'; msg.style.color = '#e63946'; return; }
  if (!inicio || !fin) { msg.textContent = '⚠️ Completá las fechas.'; msg.style.color = '#e63946'; return; }
  if (fin < inicio) { msg.textContent = '⚠️ La fecha de fin debe ser posterior al inicio.'; msg.style.color = '#e63946'; return; }

  const { error } = await db.from('productos').update({
    precio_oferta:        precio,
    fecha_inicio_oferta:  inicio,
    fecha_fin_oferta:     fin,
  }).eq('id', prodId);

  if (error) { msg.textContent = 'Error: ' + error.message; msg.style.color = '#e63946'; return; }

  msg.textContent = '✅ Oferta guardada correctamente.';
  msg.style.color = '#1a7a3f';
  setTimeout(() => { toggleFormOferta(); cargarOfertas(); }, 1200);
}

async function cargarOfertas() {
  const tbody = document.getElementById('tbody-ofertas');
  tbody.innerHTML = '<tr><td colspan="8" style="padding:24px;text-align:center;color:#aaa">Cargando...</td></tr>';

  const { data, error } = await db.from('productos')
    .select('id, nombre, codigo_pieza, precio, precio_oferta, fecha_inicio_oferta, fecha_fin_oferta')
    .not('precio_oferta', 'is', null)
    .order('fecha_fin_oferta', { ascending: true });

  if (error || !data) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:24px;text-align:center;color:#e63946">Error al cargar.</td></tr>';
    return;
  }

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:#aaa">No hay ofertas registradas. ¡Creá la primera!</td></tr>';
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];
  const fmt = n => n != null ? '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const fmtFecha = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '—';

  const estadoBadge = (inicio, fin) => {
    if (!fin) return '<span style="background:#e0e0e0;color:#888;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">Sin fecha</span>';
    if (fin < hoy) return '<span style="background:#f0f0f0;color:#888;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">Vencida</span>';
    if (inicio && inicio > hoy) return '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">Programada</span>';
    return '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">Activa</span>';
  };

  tbody.innerHTML = data.map(p => {
    const desc = p.precio && p.precio_oferta
      ? Math.round((1 - p.precio_oferta / p.precio) * 100) + '%'
      : '—';
    return `<tr>
      <td style="font-weight:600;color:#333">${p.nombre}<br><span style="font-size:11px;color:#aaa">${p.codigo_pieza || ''}</span></td>
      <td style="text-align:right;color:#888">${fmt(p.precio)}</td>
      <td style="text-align:right;font-weight:800;color:#e63946">${fmt(p.precio_oferta)}</td>
      <td style="text-align:center;color:#1a7a3f;font-weight:700">${desc}</td>
      <td>${fmtFecha(p.fecha_inicio_oferta)}</td>
      <td>${fmtFecha(p.fecha_fin_oferta)}</td>
      <td style="text-align:center">${estadoBadge(p.fecha_inicio_oferta, p.fecha_fin_oferta)}</td>
      <td style="text-align:right">
        <button class="accion-btn accion-eliminar" onclick="desactivarOferta('${p.id}')">Desactivar</button>
      </td>
    </tr>`;
  }).join('');
}

async function desactivarOferta(id) {
  if (!confirm('¿Desactivás esta oferta? Se elimina el precio oferta del producto.')) return;
  await db.from('productos').update({ precio_oferta: null, fecha_inicio_oferta: null, fecha_fin_oferta: null }).eq('id', id);
  cargarOfertas();
}

// ══════════════════════════════════════════════════════
// PANEL: MENSAJES INTERNOS (ADMIN ↔ TALLERES)
// ══════════════════════════════════════════════════════

let _msgAdminTallerActual = null;
let _msgAdminChannel      = null;

async function cargarMensajesInternos() {
  const lista = document.getElementById('msg-int-talleres-lista');
  lista.innerHTML = '<div class="loader" style="padding:20px;text-align:center">Cargando...</div>';

  const { data: talleres } = await db.from('talleres').select('id, nombre').eq('activo', true).order('nombre');
  if (!talleres?.length) {
    lista.innerHTML = '<div style="padding:16px;color:#aaa;font-size:13px">No hay talleres activos.</div>';
    return;
  }

  const { data: noLeidos } = await db.from('mensajes_internos')
    .select('de_taller_id')
    .eq('para_admin', false)
    .eq('leido', false);

  const cuentas = {};
  (noLeidos || []).forEach(m => {
    cuentas[m.de_taller_id] = (cuentas[m.de_taller_id] || 0) + 1;
  });

  const total = Object.values(cuentas).reduce((a, b) => a + b, 0);
  const badge = document.getElementById('msg-int-badge-total');
  if (badge) { badge.textContent = total; badge.style.display = total ? 'inline' : 'none'; }
  const badgeSidebar = document.getElementById('badge-mensajes-admin');
  if (badgeSidebar) { badgeSidebar.textContent = total; badgeSidebar.style.display = total ? 'inline-flex' : 'none'; }

  lista.innerHTML = talleres.map(t => {
    const n = cuentas[t.id] || 0;
    return `<div class="msg-int-taller-item" id="msg-taller-${t.id}" onclick="abrirConversacionAdmin('${t.id}','${t.nombre.replace(/'/g,"\\'")}')">
      <span style="flex:1;font-size:14px;color:#333">${t.nombre}</span>
      ${n ? `<span style="background:#e63946;color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700">${n}</span>` : ''}
    </div>`;
  }).join('');
}

async function abrirConversacionAdmin(tallerId, tallerNombre) {
  _msgAdminTallerActual = tallerId;

  document.querySelectorAll('.msg-int-taller-item').forEach(el => el.style.background = '');
  document.getElementById('msg-taller-' + tallerId)?.style &&
    (document.getElementById('msg-taller-' + tallerId).style.background = '#f0f4ff');

  document.getElementById('msg-int-chat-header').textContent = tallerNombre;
  const body = document.getElementById('msg-int-chat-body');
  body.innerHTML = '<div class="loader" style="padding:24px;text-align:center">Cargando...</div>';
  document.getElementById('msg-int-input-wrap').style.display = 'flex';

  const { data } = await db.from('mensajes_internos')
    .select('*')
    .eq('de_taller_id', tallerId)
    .order('creado_en', { ascending: true });

  const noLeidos = (data || []).filter(m => !m.para_admin && !m.leido).map(m => m.id);
  if (noLeidos.length) {
    await db.from('mensajes_internos').update({ leido: true }).in('id', noLeidos);
    const item = document.getElementById('msg-taller-' + tallerId);
    if (item) item.querySelector('span:last-child')?.remove();
    await cargarBadgeMensajesAdmin();
  }

  renderConversacionAdmin(data || []);

  if (_msgAdminChannel) db.removeChannel(_msgAdminChannel);
  _msgAdminChannel = db.channel('admin-chat-' + tallerId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_internos', filter: `de_taller_id=eq.${tallerId}` }, p => {
      agregarBurbujaAdmin(p.new);
    })
    .subscribe();
}

function renderConversacionAdmin(mensajes) {
  const body = document.getElementById('msg-int-chat-body');
  if (!mensajes.length) {
    body.innerHTML = '<div style="text-align:center;color:#aaa;padding:24px;font-size:13px">Sin mensajes aún con este taller.</div>';
    return;
  }
  body.innerHTML = mensajes.map(m => burbujaAdmin(m)).join('');
  body.scrollTop = body.scrollHeight;
}

function burbujaAdmin(m) {
  const esAdmin = !m.para_admin;
  const hora    = new Date(m.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const fecha   = new Date(m.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  const color   = esAdmin ? '#1a1a1a' : '#1a56c4';
  const bg      = esAdmin ? '#f0f0f0' : '#e8f0fe';
  const align   = esAdmin ? 'flex-start' : 'flex-end';
  const quien   = esAdmin ? 'Taller' : 'Piezauto Admin';
  return `<div style="display:flex;flex-direction:column;align-items:${align};gap:2px">
    <div style="font-size:10px;color:#aaa">${quien} · ${fecha} ${hora}</div>
    <div style="background:${bg};color:${color};padding:10px 14px;border-radius:12px;max-width:75%;font-size:13px;line-height:1.5">${m.mensaje}</div>
  </div>`;
}

function agregarBurbujaAdmin(m) {
  const body = document.getElementById('msg-int-chat-body');
  const sin = body.querySelector('[style*="Sin mensajes"]');
  if (sin) sin.remove();
  body.insertAdjacentHTML('beforeend', burbujaAdmin(m));
  body.scrollTop = body.scrollHeight;
}

async function enviarMensajeAdmin() {
  if (!_msgAdminTallerActual) return;
  const texto = document.getElementById('msg-int-texto').value.trim();
  if (!texto) return;

  const { error } = await db.from('mensajes_internos').insert({
    de_taller_id: _msgAdminTallerActual,
    para_admin:   false,
    mensaje:      texto,
    leido:        false,
  });

  if (!error) document.getElementById('msg-int-texto').value = '';
}

async function cargarBadgeMensajesAdmin() {
  const { data } = await db.from('mensajes_internos')
    .select('de_taller_id')
    .eq('para_admin', false)
    .eq('leido', false);
  const total = (data || []).length;
  const badge = document.getElementById('badge-mensajes-admin');
  const badgeTotal = document.getElementById('msg-int-badge-total');
  if (badge) { badge.textContent = total; badge.style.display = total ? 'inline-flex' : 'none'; }
  if (badgeTotal) { badgeTotal.textContent = total; badgeTotal.style.display = total ? 'inline' : 'none'; }
}

// ── PREGUNTAS SIN RESPONDER ───────────────────
async function cargarPreguntasSinResponder() {
  const { data, count } = await db.from('preguntas_producto')
    .select('id, pregunta, producto_id, creado_en, productos(nombre)', { count: 'exact' })
    .is('respuesta', null)
    .eq('publico', false)
    .order('creado_en', { ascending: false })
    .limit(20);
  if (!data?.length) return;
  const wrap = document.getElementById('preguntas-sin-responder-wrap');
  const badge = document.getElementById('badge-preguntas');
  const lista = document.getElementById('lista-preguntas-sr');
  if (wrap) wrap.style.display = 'block';
  if (badge) badge.textContent = count || data.length;
  if (!lista) return;
  lista.innerHTML = data.map(q => `
    <div id="psr-${q.id}" style="background:#fff;border:1px solid #f0e68c;border-radius:8px;padding:12px 14px;margin-bottom:8px">
      <div style="font-size:11px;color:#888;margin-bottom:4px">
        Producto: <strong>${q.productos?.nombre || q.producto_id}</strong> &nbsp;·&nbsp;
        ${new Date(q.creado_en).toLocaleDateString('es-AR')}
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">${q.pregunta}</div>
      <div style="display:flex;gap:8px">
        <textarea id="resp-${q.id}" placeholder="Escribí la respuesta..." rows="2"
          style="flex:1;padding:8px 10px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;resize:none;font-family:inherit"></textarea>
        <button onclick="responderPregunta('${q.id}')"
          style="background:#E63946;color:#fff;border:none;border-radius:8px;padding:0 16px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap">
          Responder
        </button>
      </div>
      <div id="psr-msg-${q.id}" style="font-size:12px;min-height:16px;margin-top:4px"></div>
    </div>`).join('');
}

async function responderPregunta(id) {
  const resp = document.getElementById('resp-' + id)?.value.trim();
  const msg  = document.getElementById('psr-msg-' + id);
  if (!resp) { msg.style.color = '#c00'; msg.textContent = 'Escribí una respuesta.'; return; }
  const { error } = await db.from('preguntas_producto').update({ respuesta: resp, publico: true }).eq('id', id);
  if (error) { msg.style.color = '#c00'; msg.textContent = 'Error. Intentá de nuevo.'; return; }
  const card = document.getElementById('psr-' + id);
  if (card) card.style.opacity = '0.5';
  msg.style.color = '#22c55e';
  msg.textContent = '✓ Respuesta publicada.';
}

// ── INIT ──────────────────────────────────────
cargarDashboard();
cargarBadgesNotificacion();
cargarBadgeMensajesAdmin();
cargarPreguntasSinResponder();
setInterval(cargarBadgesNotificacion, 60000);
setInterval(cargarBadgeMensajesAdmin, 60000);
renderReglasDescuento();

// ── FACTURACIÓN POINT ────────────────────────
let _talleresCache = [];

async function cargarFacturacionPoint() {
  if (!_talleresCache.length) {
    const { data } = await db.from('talleres').select('id, nombre').eq('activo', true).order('nombre');
    _talleresCache = data || [];
    // Poblar selects de taller
    ['cargo-taller-id', 'fact-filtro-taller', 'mov-filtro-taller'].forEach(elId => {
      const sel = document.getElementById(elId);
      if (!sel) return;
      const placeholder = sel.options[0]?.text || '';
      sel.innerHTML = `<option value="">${placeholder}</option>` +
        _talleresCache.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
    });
  }

  const tallerFiltro = document.getElementById('fact-filtro-taller')?.value || '';
  const estadoFiltro = document.getElementById('fact-filtro-estado')?.value || '';

  let query = db.from('facturas_talleres')
    .select('*, talleres(nombre, cuenta_corriente_saldo)')
    .order('creado_en', { ascending: false });

  if (tallerFiltro) query = query.eq('taller_id', tallerFiltro);
  if (estadoFiltro) query = query.eq('estado', estadoFiltro);

  const { data: facturas } = await query;
  const items = facturas || [];

  const pendientes = items.filter(f => f.estado === 'pendiente');
  const vencidas   = items.filter(f => f.estado === 'vencido' ||
    (f.estado === 'pendiente' && f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date()));
  const totalPend  = pendientes.reduce((s, f) => s + Number(f.monto), 0);

  document.getElementById('fact-pendiente-total').textContent = '$' + Number(totalPend).toLocaleString('es-AR');
  document.getElementById('fact-pendiente-cant').textContent  = pendientes.length;
  document.getElementById('fact-vencidas').textContent        = vencidas.length;

  const badgeEl = document.getElementById('badge-facturacion');
  if (badgeEl) { badgeEl.style.display = pendientes.length ? 'inline-flex' : 'none'; badgeEl.textContent = pendientes.length; }

  const lista = document.getElementById('facturacion-lista');
  if (!items.length) {
    lista.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa">No hay facturas con esos filtros.</div>';
    return;
  }
  lista.innerHTML = items.map(f => {
    const venc = f.fecha_vencimiento ? new Date(f.fecha_vencimiento + 'T00:00').toLocaleDateString('es-AR') : '—';
    const estaVencida = f.estado === 'pendiente' && f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date();
    const estadoLabel = estaVencida ? 'vencido' : f.estado;
    const badgeMap = { pendiente: 'badge-preparando', pagado: 'badge-entregado', vencido: 'badge-cancelado' };
    return `
    <div style="background:#fff;border-radius:10px;padding:18px 20px;box-shadow:var(--sombra);margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:15px;font-weight:700">${f.concepto}</div>
        <div style="font-size:13px;color:#888;margin-top:3px">${f.talleres?.nombre || '—'} · Vence: ${venc}</div>
        ${f.nota ? `<div style="font-size:12px;color:#aaa;margin-top:2px">${f.nota}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:20px;font-weight:900;color:var(--rojo)">$${Number(f.monto).toLocaleString('es-AR')}</span>
        <span class="${badgeMap[estadoLabel] || 'badge-nuevo'}">${estadoLabel.charAt(0).toUpperCase() + estadoLabel.slice(1)}</span>
        ${f.estado === 'pendiente' ? `<button onclick="marcarFacturaPagada('${f.id}','${f.taller_id}',${f.monto})" style="background:#e6f7ee;color:#1a7a3f;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer">✓ Marcar pagada</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function crearCargoTaller() {
  const msg       = document.getElementById('cargo-msg');
  const tallerId  = document.getElementById('cargo-taller-id').value;
  const concepto  = document.getElementById('cargo-concepto').value.trim();
  const monto     = parseFloat(document.getElementById('cargo-monto').value);
  const venc      = document.getElementById('cargo-vencimiento').value;
  const nota      = document.getElementById('cargo-nota').value.trim();

  if (!tallerId) { msg.style.color = '#E63946'; msg.textContent = 'Seleccioná un taller.'; return; }
  if (!concepto) { msg.style.color = '#E63946'; msg.textContent = 'Ingresá el concepto.'; return; }
  if (!monto || monto <= 0) { msg.style.color = '#E63946'; msg.textContent = 'Ingresá un monto válido.'; return; }

  // Obtener saldo actual
  const { data: taller } = await db.from('talleres').select('cuenta_corriente_saldo').eq('id', tallerId).single();
  const saldoAnterior = Number(taller?.cuenta_corriente_saldo || 0);
  const saldoNuevo    = saldoAnterior + monto;

  // Crear factura
  const { data: factura, error } = await db.from('facturas_talleres').insert({
    taller_id: tallerId, concepto, monto,
    fecha_vencimiento: venc || null,
    nota: nota || null,
    creado_por: 'admin',
  }).select().single();

  if (error) { msg.style.color = '#E63946'; msg.textContent = '❌ ' + error.message; return; }

  // Registrar movimiento
  await db.from('movimientos_cuenta_corriente').insert({
    taller_id: tallerId,
    factura_id: factura.id,
    tipo: 'cargo',
    monto,
    descripcion: concepto,
    saldo_anterior: saldoAnterior,
    saldo_nuevo: saldoNuevo,
  });

  // Actualizar saldo del taller
  await db.from('talleres').update({ cuenta_corriente_saldo: saldoNuevo }).eq('id', tallerId);

  document.getElementById('cargo-form').style.display = 'none';
  ['cargo-taller-id','cargo-concepto','cargo-monto','cargo-vencimiento','cargo-nota'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  msg.textContent = '';
  cargarFacturacionPoint();
}

async function marcarFacturaPagada(facturaId, tallerId, monto) {
  if (!confirm(`¿Confirmás el pago de $${Number(monto).toLocaleString('es-AR')}?`)) return;

  const { data: taller } = await db.from('talleres').select('cuenta_corriente_saldo').eq('id', tallerId).single();
  const saldoAnterior = Number(taller?.cuenta_corriente_saldo || 0);
  const saldoNuevo    = Math.max(0, saldoAnterior - Number(monto));

  await db.from('facturas_talleres').update({ estado: 'pagado' }).eq('id', facturaId);
  await db.from('movimientos_cuenta_corriente').insert({
    taller_id: tallerId,
    factura_id: facturaId,
    tipo: 'pago',
    monto: Number(monto),
    descripcion: 'Pago de factura',
    saldo_anterior: saldoAnterior,
    saldo_nuevo: saldoNuevo,
  });
  await db.from('talleres').update({ cuenta_corriente_saldo: saldoNuevo }).eq('id', tallerId);
  cargarFacturacionPoint();
}

async function cargarMovimientosCuenta() {
  const tallerId = document.getElementById('mov-filtro-taller')?.value;
  const lista    = document.getElementById('movimientos-lista');
  if (!tallerId) { lista.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;font-size:14px">Seleccioná un taller.</div>'; return; }

  const { data: taller } = await db.from('talleres').select('nombre, cuenta_corriente_saldo').eq('id', tallerId).single();
  const { data: movs } = await db.from('movimientos_cuenta_corriente')
    .select('*')
    .eq('taller_id', tallerId)
    .order('creado_en', { ascending: false })
    .limit(50);

  const items = movs || [];
  const saldoActual = Number(taller?.cuenta_corriente_saldo || 0);

  lista.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;padding:14px 16px;background:${saldoActual > 0 ? '#fce8e8' : '#e6f7ee'};border-radius:8px">
      <div style="font-size:13px;color:#555">Saldo actual de <strong>${taller?.nombre || 'taller'}</strong></div>
      <div style="font-size:22px;font-weight:900;color:${saldoActual > 0 ? '#E63946' : '#1a7a3f'}">${saldoActual > 0 ? '-' : ''}$${Number(Math.abs(saldoActual)).toLocaleString('es-AR')}</div>
    </div>
    ${!items.length ? '<div style="padding:20px;text-align:center;color:#aaa">Sin movimientos registrados.</div>' :
    `<table class="tabla-admin">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th><th>Saldo resultante</th></tr></thead>
      <tbody>${items.map(m => {
        const fecha = new Date(m.creado_en).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
        const colorTipo = m.tipo === 'cargo' ? '#E63946' : '#1a7a3f';
        const signo     = m.tipo === 'cargo' ? '+' : '-';
        return `<tr>
          <td style="font-size:12px;color:#888">${fecha}</td>
          <td><span style="font-weight:700;color:${colorTipo}">${m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}</span></td>
          <td>${m.descripcion || '—'}</td>
          <td style="font-weight:700;color:${colorTipo}">${signo}$${Number(m.monto).toLocaleString('es-AR')}</td>
          <td>$${Number(m.saldo_nuevo).toLocaleString('es-AR')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`}`;
}

// ══════════════════════════════════════════════
// COMBOS / BUNDLES
// ══════════════════════════════════════════════

let _combosProductos = []; // [{ producto_id, nombre, precio, cantidad }]

async function cargarCombos() {
  const { data } = await db.from('combos')
    .select('*, combo_productos(producto_id, cantidad, productos(id, nombre, precio))')
    .order('creado_en', { ascending: false });

  const lista = document.getElementById('combos-lista');
  const combos = data || [];

  if (!combos.length) {
    lista.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#aaa">No hay combos creados todavía. Hacé clic en "+ Nuevo combo" para empezar.</div>';
    return;
  }

  lista.innerHTML = combos.map(c => {
    const prods = c.combo_productos || [];
    const sumaIndividual = prods.reduce((a, cp) => a + Number(cp.productos?.precio || 0) * cp.cantidad, 0);
    const ahorro = sumaIndividual - Number(c.precio_especial);
    return `
      <div style="background:#fff;border-radius:10px;border:1px solid #e8e8e8;padding:20px;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
          <div>
            <div style="font-size:15px;font-weight:700">${c.nombre}</div>
            ${c.destacado ? '<span style="background:#fffbeb;color:#92400e;border:1px solid #fcd34d;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">⭐ Destacado</span>' : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:20px;font-weight:900;color:var(--rojo)">$${Number(c.precio_especial).toLocaleString('es-AR')}</div>
            ${ahorro > 0 ? `<div style="font-size:11px;color:#1a7a3f;font-weight:600">Ahorro: $${ahorro.toLocaleString('es-AR')}</div>` : ''}
          </div>
        </div>
        ${c.descripcion ? `<p style="font-size:13px;color:#666;line-height:1.5;margin:0">${c.descripcion}</p>` : ''}
        <div style="font-size:12px;color:#888">
          ${prods.map(cp => `<span style="display:inline-block;background:#f0f0f0;padding:2px 8px;border-radius:10px;margin:2px">${cp.productos?.nombre || '—'} ×${cp.cantidad}</span>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="accion-btn accion-editar" onclick="abrirFormCombo('${c.id}')">✏️ Editar</button>
          <button class="accion-btn accion-eliminar" onclick="eliminarCombo('${c.id}','${c.nombre.replace(/'/g,"\\'")}')">🗑️ Eliminar</button>
          <button class="accion-btn" style="background:${c.activo ? '#e8f5e9' : '#fff3cd'};color:${c.activo ? '#1a7a3f' : '#92400e'}" onclick="toggleComboActivo('${c.id}',${!c.activo})">${c.activo ? '✅ Activo' : '⏸ Inactivo'}</button>
        </div>
      </div>`;
  }).join('');

  // Cargar productos para el select del formulario
  await cargarProductosSelectorCombo();
}

async function cargarProductosSelectorCombo() {
  const sel = document.getElementById('combo-prod-sel');
  if (!sel || sel.options.length > 1) return;
  const { data } = await db.from('productos').select('id, nombre, precio').eq('activo', true).order('nombre');
  (data || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} — $${Number(p.precio).toLocaleString('es-AR')}`;
    opt.dataset.nombre = p.nombre;
    opt.dataset.precio = p.precio;
    sel.appendChild(opt);
  });
}

async function abrirFormCombo(id) {
  _combosProductos = [];
  const wrap = document.getElementById('combo-form-wrap');
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('combo-msg').textContent = '';

  if (!id) {
    document.getElementById('combo-form-titulo').textContent = 'Nuevo combo';
    document.getElementById('combo-id').value = '';
    document.getElementById('combo-nombre').value = '';
    document.getElementById('combo-descripcion').value = '';
    document.getElementById('combo-precio').value = '';
    document.getElementById('combo-imagen').value = '';
    document.getElementById('combo-destacado').checked = false;
    renderProductosCombo();
    await cargarProductosSelectorCombo();
    return;
  }

  document.getElementById('combo-form-titulo').textContent = 'Editar combo';
  const { data } = await db.from('combos')
    .select('*, combo_productos(producto_id, cantidad, productos(id, nombre, precio))')
    .eq('id', id).single();

  if (!data) return;
  document.getElementById('combo-id').value      = data.id;
  document.getElementById('combo-nombre').value  = data.nombre;
  document.getElementById('combo-descripcion').value = data.descripcion || '';
  document.getElementById('combo-precio').value  = data.precio_especial;
  document.getElementById('combo-imagen').value  = data.imagen_url || '';
  document.getElementById('combo-destacado').checked = data.destacado;

  _combosProductos = (data.combo_productos || []).map(cp => ({
    producto_id: cp.producto_id,
    nombre: cp.productos?.nombre || '—',
    precio: Number(cp.productos?.precio || 0),
    cantidad: cp.cantidad,
  }));
  renderProductosCombo();
  await cargarProductosSelectorCombo();
}

function cerrarFormCombo() {
  document.getElementById('combo-form-wrap').style.display = 'none';
}

function agregarProductoACombo() {
  const sel  = document.getElementById('combo-prod-sel');
  const cant = parseInt(document.getElementById('combo-prod-cant').value) || 1;
  if (!sel.value) return;
  const opt = sel.options[sel.selectedIndex];
  if (_combosProductos.some(p => p.producto_id === sel.value)) {
    alert('Ese producto ya está en el combo. Modificá la cantidad directamente.');
    return;
  }
  _combosProductos.push({ producto_id: sel.value, nombre: opt.dataset.nombre, precio: Number(opt.dataset.precio), cantidad: cant });
  renderProductosCombo();
  sel.value = '';
  document.getElementById('combo-prod-cant').value = 1;
}

function quitarProductoCombo(idx) {
  _combosProductos.splice(idx, 1);
  renderProductosCombo();
}

function renderProductosCombo() {
  const lista = document.getElementById('combo-productos-lista');
  if (!_combosProductos.length) {
    lista.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;padding:10px">Sin productos agregados</div>';
    return;
  }
  lista.innerHTML = _combosProductos.map((p, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0">
      <div style="flex:1;font-size:13px;font-weight:600">${p.nombre}</div>
      <div style="font-size:13px;color:#888">$${Number(p.precio).toLocaleString('es-AR')}</div>
      <input type="number" min="1" value="${p.cantidad}" onchange="_combosProductos[${i}].cantidad=parseInt(this.value)||1" style="width:60px;padding:4px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px">
      <button onclick="quitarProductoCombo(${i})" style="background:none;border:none;color:#c00;font-size:16px;cursor:pointer">✕</button>
    </div>`).join('');
}

async function guardarCombo() {
  const msg    = document.getElementById('combo-msg');
  const id     = document.getElementById('combo-id').value;
  const nombre = document.getElementById('combo-nombre').value.trim();
  const precio = parseFloat(document.getElementById('combo-precio').value);

  if (!nombre) { msg.style.color='#c00'; msg.textContent='⚠️ Ingresá un nombre.'; return; }
  if (isNaN(precio) || precio <= 0) { msg.style.color='#c00'; msg.textContent='⚠️ Ingresá un precio válido.'; return; }
  if (!_combosProductos.length) { msg.style.color='#c00'; msg.textContent='⚠️ Agregá al menos un producto.'; return; }

  const datos = {
    nombre,
    descripcion: document.getElementById('combo-descripcion').value.trim() || null,
    precio_especial: precio,
    imagen_url: document.getElementById('combo-imagen').value.trim() || null,
    destacado:  document.getElementById('combo-destacado').checked,
    actualizado_en: new Date().toISOString(),
  };

  let comboId = id;
  if (id) {
    await db.from('combos').update(datos).eq('id', id);
    await db.from('combo_productos').delete().eq('combo_id', id);
  } else {
    const { data } = await db.from('combos').insert(datos).select('id').single();
    comboId = data?.id;
  }

  if (comboId) {
    const items = _combosProductos.map(p => ({ combo_id: comboId, producto_id: p.producto_id, cantidad: p.cantidad }));
    await db.from('combo_productos').insert(items);
  }

  msg.style.color = '#22c55e';
  msg.textContent = id ? '✅ Combo actualizado.' : '✅ Combo creado.';
  setTimeout(() => { cerrarFormCombo(); cargarCombos(); }, 1200);
}

async function eliminarCombo(id, nombre) {
  if (!confirm(`¿Eliminás el combo "${nombre}"?`)) return;
  await db.from('combos').delete().eq('id', id);
  cargarCombos();
}

async function toggleComboActivo(id, activo) {
  await db.from('combos').update({ activo }).eq('id', id);
  cargarCombos();
}

// ══════════════════════════════════════════════
// DEVOLUCIONES
// ══════════════════════════════════════════════

let _devFiltro = 'todas';

async function cargarDevoluciones() {
  let query = db.from('devoluciones').select('*').order('creado_en', { ascending: false });
  if (_devFiltro !== 'todas') query = query.eq('estado', _devFiltro);

  const { data } = await query;
  const devs = data || [];

  // Stats
  const { data: stats } = await db.from('devoluciones')
    .select('estado, monto_credito');
  const st = { pendiente: 0, aprobada: 0, rechazada: 0, monto: 0 };
  (stats || []).forEach(d => {
    if (d.estado === 'pendiente') st.pendiente++;
    if (d.estado === 'aprobada')  { st.aprobada++; st.monto += Number(d.monto_credito || 0); }
    if (d.estado === 'rechazada') st.rechazada++;
  });
  document.getElementById('dev-stat-pendientes').textContent = st.pendiente;
  document.getElementById('dev-stat-aprobadas').textContent  = st.aprobada;
  document.getElementById('dev-stat-rechazadas').textContent = st.rechazada;
  document.getElementById('dev-stat-monto').textContent      = '$' + st.monto.toLocaleString('es-AR');

  // Badge sidebar
  const badge = document.getElementById('badge-devoluciones');
  if (badge) { badge.textContent = st.pendiente; badge.style.display = st.pendiente ? 'inline-flex' : 'none'; }

  const tbody = document.getElementById('tbody-devoluciones');
  if (!devs.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="vacio">No hay devoluciones registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = devs.map(d => {
    const fecha = new Date(d.creado_en).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' });
    const pedidoCorto = d.pedido_id?.substring(0, 8).toUpperCase() || '—';
    const items = Array.isArray(d.items) ? d.items : [];
    const resumen = items.map(i => `${i.nombre} ×${i.cantidad}`).join(', ') || '—';
    const colorEstado = d.estado === 'pendiente' ? '#92400e' : d.estado === 'aprobada' ? '#1a7a3f' : '#b71c1c';
    const bgEstado    = d.estado === 'pendiente' ? '#fffbeb'  : d.estado === 'aprobada' ? '#e6f7ee'  : '#fce8e8';
    return `<tr>
      <td style="font-size:12px;color:#888">${fecha}</td>
      <td><code style="font-size:12px;background:#f0f0f0;padding:1px 5px;border-radius:3px">${pedidoCorto}</code></td>
      <td style="font-size:13px;max-width:200px">${d.motivo || '—'}</td>
      <td style="font-size:12px;color:#666;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${resumen}">${resumen}</td>
      <td style="font-weight:700;color:var(--rojo)">${d.monto_credito ? '$' + Number(d.monto_credito).toLocaleString('es-AR') : '—'}</td>
      <td><span style="background:${bgEstado};color:${colorEstado};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}</span></td>
      <td style="font-size:12px">${d.nota_credito_nro || '—'}</td>
      <td>
        ${d.estado === 'pendiente' ? `
          <button class="accion-btn" style="background:#e8f5e9;color:#1a7a3f" onclick="aprobarDevolucion('${d.id}')">✅ Aprobar</button>
          <button class="accion-btn accion-eliminar" onclick="rechazarDevolucion('${d.id}')">❌ Rechazar</button>
        ` : ''}
      </td>
    </tr>`;
  }).join('');
}

function filtrarDevoluciones(estado) {
  _devFiltro = estado;
  document.querySelectorAll('[id^="dev-filtro-"]').forEach(b => {
    b.className = b.id === 'dev-filtro-' + estado ? 'btn btn-rojo' : 'btn btn-blanco';
  });
  cargarDevoluciones();
}

function abrirFormDevolucion() {
  const wrap = document.getElementById('dev-form-wrap');
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('dev-msg').textContent = '';
  document.getElementById('dev-pedido-buscar').value = '';
  document.getElementById('dev-motivo').value = '';
  document.getElementById('dev-items').value  = '';
  document.getElementById('dev-monto').value  = '';
  document.getElementById('dev-nota').value   = '';
}

function cerrarFormDevolucion() {
  document.getElementById('dev-form-wrap').style.display = 'none';
}

async function buscarPedidoDevolucion() {
  const input  = document.getElementById('dev-pedido-buscar').value.trim().toUpperCase();
  const infoEl = document.getElementById('dev-pedido-info');
  if (!input || input.length < 6) { infoEl.innerHTML = ''; return; }

  const { data } = await db.from('pedidos').select('id, creado_en, total, nombre_cliente, estado, items_pedido(producto_id, cantidad, precio_unitario, productos(nombre))').order('creado_en', { ascending: false });
  const pedido = (data || []).find(p => p.id.toUpperCase().startsWith(input));
  if (!pedido) {
    infoEl.innerHTML = '<div style="background:#fce8e8;border:1px solid #f5c6cb;border-radius:8px;padding:10px;font-size:13px;color:#b71c1c">No se encontró ese pedido.</div>';
    return;
  }

  const items = pedido.items_pedido || [];
  const itemsJSON = JSON.stringify(items.map(i => ({
    producto_id: i.producto_id,
    nombre: i.productos?.nombre || '—',
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
  })));

  document.getElementById('dev-items').value = itemsJSON;
  document.getElementById('dev-monto').value = pedido.total;

  infoEl.innerHTML = `
    <div style="background:#e8f0fe;border:1px solid #b3d1f7;border-radius:8px;padding:12px;font-size:13px">
      <div style="font-weight:700;margin-bottom:4px">Pedido #${pedido.id.substring(0,8).toUpperCase()} — ${pedido.nombre_cliente || '—'}</div>
      <div style="color:#666">Total: <strong>$${Number(pedido.total).toLocaleString('es-AR')}</strong> · Estado: ${pedido.estado}</div>
      <div style="color:#666;margin-top:4px">Productos: ${items.map(i => `${i.productos?.nombre} ×${i.cantidad}`).join(', ')}</div>
    </div>`;
  infoEl.style.gridColumn = '1 / -1';
  infoEl.style.display = 'block';
}

async function guardarDevolucion() {
  const msg = document.getElementById('dev-msg');
  const pedidoBuscar = document.getElementById('dev-pedido-buscar').value.trim().toUpperCase();
  const motivo = document.getElementById('dev-motivo').value.trim();
  let items = [];
  try { items = JSON.parse(document.getElementById('dev-items').value); } catch(_) {}

  if (!pedidoBuscar) { msg.style.color='#c00'; msg.textContent='⚠️ Buscá un pedido primero.'; return; }
  if (!motivo) { msg.style.color='#c00'; msg.textContent='⚠️ Ingresá el motivo.'; return; }

  // Buscar el pedido_id completo
  const { data: peds } = await db.from('pedidos').select('id').order('creado_en', { ascending: false });
  const pedido = (peds || []).find(p => p.id.toUpperCase().startsWith(pedidoBuscar));
  if (!pedido) { msg.style.color='#c00'; msg.textContent='⚠️ Pedido no encontrado.'; return; }

  const { error } = await db.from('devoluciones').insert({
    pedido_id: pedido.id,
    motivo,
    items,
    monto_credito: parseFloat(document.getElementById('dev-monto').value) || null,
    nota_interna: document.getElementById('dev-nota').value.trim() || null,
    creado_por: 'admin',
  });

  if (error) { msg.style.color='#c00'; msg.textContent='❌ Error: ' + error.message; return; }
  msg.style.color = '#22c55e';
  msg.textContent = '✅ Devolución registrada correctamente.';
  setTimeout(() => { cerrarFormDevolucion(); cargarDevoluciones(); }, 1200);
}

async function aprobarDevolucion(id) {
  if (!confirm('¿Aprobás esta devolución? Se revertirá el stock automáticamente.')) return;

  // Aprobar y revertir stock manualmente (la función SQL es opcional)
  const { data: dev } = await db.from('devoluciones').select('*').eq('id', id).single();
  if (!dev) return;

  const items = Array.isArray(dev.items) ? dev.items : [];
  for (const item of items) {
    if (!item.producto_id || !item.cantidad) continue;
    const { data: prod } = await db.from('productos').select('stock').eq('id', item.producto_id).single();
    if (prod) {
      await db.from('productos').update({ stock: prod.stock + item.cantidad }).eq('id', item.producto_id);
    }
  }

  const nc = 'NC-' + Date.now().toString().slice(-6);
  await db.from('devoluciones').update({
    estado: 'aprobada',
    revertido_stock: true,
    nota_credito_nro: nc,
  }).eq('id', id);

  alert(`✅ Devolución aprobada. Nota de crédito: ${nc}`);
  cargarDevoluciones();
}

async function rechazarDevolucion(id) {
  const motivo = prompt('Motivo del rechazo (opcional):') ?? '';
  await db.from('devoluciones').update({ estado: 'rechazada', nota_interna: motivo || null }).eq('id', id);
  cargarDevoluciones();
}

// ══════════════════════════════════════════════
// ESTADÍSTICAS AVANZADAS
// ══════════════════════════════════════════════

async function cargarStatsAvanzadas() {
  const wrap = document.getElementById('stats-avanzadas-wrap');
  const btn  = document.getElementById('btn-stats-avanzadas');
  btn.textContent = 'Cargando...';
  btn.disabled    = true;
  wrap.style.display = 'block';

  await Promise.all([
    cargarHeatmapHorarios(),
    cargarTasaConversion(),
    cargarPromedioMetodosPago(),
    cargarTiempoHastaCompra(),
    cargarProductosCarrito(),
  ]);

  btn.textContent = 'Actualizar';
  btn.disabled    = false;
}

async function cargarHeatmapHorarios() {
  const { data } = await db.from('pedidos').select('creado_en').not('creado_en', 'is', null);
  const conteo = new Array(24).fill(0);
  (data || []).forEach(p => {
    const h = new Date(p.creado_en).getHours();
    conteo[h]++;
  });
  const max = Math.max(...conteo, 1);
  const heatmap = document.getElementById('heatmap-horarios');
  heatmap.innerHTML = conteo.map((c, h) => {
    const intensidad = Math.round((c / max) * 100);
    const r = Math.round(230 * intensidad / 100 + 240 * (1 - intensidad / 100));
    const g = Math.round(57  * intensidad / 100 + 240 * (1 - intensidad / 100));
    const b = Math.round(70  * intensidad / 100 + 240 * (1 - intensidad / 100));
    return `<div title="${h}hs: ${c} pedidos" style="height:36px;background:rgb(${r},${g},${b});border-radius:4px;cursor:default;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${intensidad > 40 ? '#fff' : '#999'}">${c || ''}</div>`;
  }).join('');
}

async function cargarTasaConversion() {
  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0,0,0,0);
  const { count } = await db.from('pedidos').select('id', { count: 'exact' }).gte('creado_en', inicio.toISOString());
  const visitas = parseInt(localStorage.getItem('pz_admin_visitas') || '1');
  const tasa = count > 0 ? ((count / visitas) * 100).toFixed(1) : '0.0';
  document.getElementById('adv-visitas').textContent    = visitas;
  document.getElementById('adv-pedidos-mes').textContent = count ?? 0;
  document.getElementById('adv-conversion').textContent  = tasa + '%';
}

async function cargarPromedioMetodosPago() {
  const { data } = await db.from('pedidos').select('metodo_pago, total').not('total', 'is', null);
  const grupos = {};
  (data || []).forEach(p => {
    const m = p.metodo_pago || 'otro';
    if (!grupos[m]) grupos[m] = { suma: 0, cnt: 0 };
    grupos[m].suma += Number(p.total);
    grupos[m].cnt++;
  });
  const el = document.getElementById('adv-metodos-pago');
  const etiquetas = { transferencia: '💸 Transferencia', mercadopago: '💳 MercadoPago', efectivo: '💵 Efectivo' };
  el.innerHTML = Object.entries(grupos).map(([m, v]) => `
    <div class="stat-card">
      <div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;margin-bottom:6px">${etiquetas[m] || m}</div>
      <div style="font-size:20px;font-weight:900;color:var(--rojo)">$${Math.round(v.suma / v.cnt).toLocaleString('es-AR')}</div>
      <div style="font-size:11px;color:#aaa;margin-top:4px">${v.cnt} pedido${v.cnt !== 1 ? 's' : ''}</div>
    </div>`).join('') || '<div style="color:#aaa;font-size:13px;padding:20px">Sin datos de pedidos.</div>';
}

async function cargarTiempoHastaCompra() {
  const { data: usu } = await db.from('usuarios').select('id, email, creado_en').order('creado_en');
  const { data: ped } = await db.from('pedidos').select('email_cliente, creado_en').order('creado_en');

  const primeraCompra = {};
  (ped || []).forEach(p => {
    if (!primeraCompra[p.email_cliente]) primeraCompra[p.email_cliente] = p.creado_en;
  });

  const tiempos = (usu || [])
    .filter(u => primeraCompra[u.email])
    .map(u => (new Date(primeraCompra[u.email]) - new Date(u.creado_en)) / 86400000);

  const promDias = tiempos.length ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : '—';
  document.getElementById('adv-tiempo-prom').textContent = tiempos.length ? promDias + 'd' : '—';

  const { data: tots } = await db.from('pedidos').select('total').not('total', 'is', null);
  const tickProm = tots?.length ? Math.round(tots.reduce((a, p) => a + Number(p.total), 0) / tots.length) : 0;
  document.getElementById('adv-ticket-prom').textContent = '$' + tickProm.toLocaleString('es-AR');
}

async function cargarProductosCarrito() {
  const el = document.getElementById('adv-carrito-abandono');
  const dl = (window.dataLayer || []).filter(e => e.event === 'add_to_cart');
  if (!dl.length) {
    el.innerHTML = '<div style="color:#aaa;font-size:13px;padding:12px">No hay eventos de carrito registrados en esta sesión del browser.</div>';
    return;
  }
  const conteo = {};
  dl.forEach(e => {
    const item = e.ecommerce?.items?.[0];
    if (!item) return;
    const k = item.item_name || item.item_id;
    conteo[k] = (conteo[k] || 0) + 1;
  });
  el.innerHTML = `<table class="tabla-admin">
    <thead><tr><th>Producto</th><th>Veces agregado al carrito</th></tr></thead>
    <tbody>${Object.entries(conteo).sort((a,b) => b[1]-a[1]).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong></td></tr>`).join('')}</tbody>
  </table>`;
}

// ── PERMISOS DINÁMICOS DEL SIDEBAR ────────────────────────────
// Mapa: nav item ID → permiso requerido (null = siempre visible, 'owner' = solo owner)
const PERM_SIDEBAR = {
  'nav-dashboard':          null,
  'nav-pedidos':            'operaciones',
  'nav-cupones':            'operaciones',
  'nav-reportes':           'insights',
  'nav-logistica':          'operaciones',
  'nav-productos':          'configuracion_sistema',
  'nav-nuevo-producto':     'configuracion_sistema',
  'nav-categorias':         'configuracion_sistema',
  'nav-marcas':             'configuracion_sistema',
  'nav-inventario':         'operaciones',
  'nav-ofertas':            'configuracion_sistema',
  'nav-combos':             'configuracion_sistema',
  'nav-pagos':              'comprobantes',
  'nav-talleres':           'talleres_red',
  'nav-nuevo-taller':       'talleres_red',
  'nav-invitaciones':       'invitaciones_beta',
  'nav-turnos':             'turnos',
  'nav-op-taller':          'operaciones',
  'nav-validacion-svc':     'validacion_servicios',
  'nav-talleres-ext':       'talleres_externos',
  'nav-comprobantes':       'comprobantes',
  'nav-facturacion-point':  'comprobantes',
  'nav-devoluciones':       'operaciones',
  'nav-mensajes-internos':  'operaciones',
  'nav-modelos':            'configuracion_sistema',
  'nav-vendedores':         'configuracion_sistema',
  'nav-banners':            'configuracion_sistema',
  'nav-consultas':          'operaciones',
  'nav-configuracion':      'configuracion_sistema',
  'nav-estado-sistema':     'configuracion_sistema',
  'nav-usuarios-internos':  'owner',
  'nav-insights':           'insights',
  'nav-auditoria':          'owner',
  'nav-wallet-admin':       'comercial',
  'nav-referidos':          'comercial',
};

async function aplicarPermisosAdmin() {
  let permisos = null;
  let rolCodigo = null;

  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user?.id) {
      const { data } = await db.from('cat_usuarios_internos')
        .select('rol_codigo, cat_admin_roles(permisos)')
        .eq('auth_user_id', session.user.id)
        .single();
      if (data) {
        rolCodigo = data.rol_codigo;
        permisos  = data.cat_admin_roles?.permisos || {};
      }
    }
  } catch (_) {}

  // Sin sesión Supabase Auth → asumir owner (login clásico)
  if (!permisos) return;

  const esOwner = permisos.all === true;

  for (const [navId, permiso] of Object.entries(PERM_SIDEBAR)) {
    const el = document.getElementById(navId);
    if (!el) continue;
    if (permiso === null) continue;

    let tieneAcceso = esOwner;
    if (!tieneAcceso) {
      if (permiso === 'owner') {
        tieneAcceso = rolCodigo === 'owner';
      } else {
        const val = permisos[permiso];
        tieneAcceso = val === true || val === 'lectura' || val === 'limitado';
      }
    }
    if (!tieneAcceso) el.style.display = 'none';
  }

  // Ocultar sección "Equipo" si no es owner ni analista
  if (!esOwner && rolCodigo !== 'analista') {
    const secEquipo = document.getElementById('sec-equipo');
    if (secEquipo) secEquipo.style.display = 'none';
  }
}

// Protección de URL: si llegan a admin/index.html sin permiso de insights/auditoría
// los nuevos items son navegaciones externas (href), no paneles. El muro lo manejan las propias páginas.
document.addEventListener('DOMContentLoaded', () => {
  aplicarPermisosAdmin();
});
