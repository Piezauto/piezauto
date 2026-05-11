
function esNuevo(fechaISO) {
  if (!fechaISO) return false;
  return (Date.now() - new Date(fechaISO).getTime()) < 30 * 24 * 60 * 60 * 1000;
}

function buscarDesdeHeader() {
  const q = document.getElementById('header-buscar').value.trim();
  if (q) window.location.href = 'busqueda.html?q=' + encodeURIComponent(q);
}
function toggleMenu() {
  document.getElementById('menu-mobile').classList.toggle('open');
}

function obtenerComparacion() {
  return JSON.parse(localStorage.getItem('pz_comparar') || '[]');
}
function estaEnComparacion(id) {
  return obtenerComparacion().some(p => p.id === id);
}
function toggleComparar(producto) {
  let lista = obtenerComparacion();
  const idx = lista.findIndex(p => p.id === producto.id);
  if (idx >= 0) {
    lista.splice(idx, 1);
  } else {
    if (lista.length >= 3) {
      mostrarNotificacion('Podés comparar hasta 3 productos a la vez. Quitá uno para agregar otro.', 'error');
      return;
    }
    lista.push(producto);
  }
  localStorage.setItem('pz_comparar', JSON.stringify(lista));
  actualizarBarraComparar();
}
function limpiarComparacion() {
  localStorage.removeItem('pz_comparar');
  actualizarBarraComparar();
}
function actualizarBarraComparar() {
  const lista = obtenerComparacion();
  const barra = document.getElementById('comparar-barra');
  const itemsEl = document.getElementById('comparar-items');
  if (!barra) return;
  if (!lista.length) { barra.style.display = 'none'; return; }
  barra.style.display = 'flex';
  itemsEl.innerHTML = lista.map(p => `
    <div class="comparar-barra-item" onclick="toggleComparar({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${p.precio},imagen:'${p.imagen||''}'})" >
      <span>${p.nombre.length > 28 ? p.nombre.slice(0,28)+'…' : p.nombre}</span>
      <span class="comparar-barra-x">×</span>
    </div>
  `).join('');
  document.querySelectorAll('[data-comparar-id]').forEach(btn => {
    const id = btn.dataset.compararId;
    btn.classList.toggle('activo', lista.some(p => p.id === id));
    btn.textContent = lista.some(p => p.id === id) ? '✓ En comparación' : '⚖️ Comparar';
  });
}

const iconos = {
  'motor': '⚙️', 'frenos': '🔴', 'suspension': '🔧',
  'transmision': '⚡', 'electricidad': '💡', 'filtros': '🌀',
  'refrigeracion': '❄️', 'carroceria': '🚗', 'iluminacion': '💡',
  'accesorios': '✨', 'escape': '💨', 'direccion': '🎯'
};

let carrito = JSON.parse(localStorage.getItem('pz_carrito') || '[]');
function actualizarContadorCarrito() {
  document.getElementById('carrito-count').textContent = carrito.reduce((a,i) => a+i.cantidad, 0);
}
function agregarAlCarrito(producto) {
  const existe = carrito.find(i => i.id === producto.id);
  if (existe) { existe.cantidad++; } else { carrito.push({ ...producto, cantidad: 1 }); }
  localStorage.setItem('pz_carrito', JSON.stringify(carrito));
  actualizarContadorCarrito();
  mostrarNotificacion(`"${producto.nombre}" agregado al carrito`, 'success');
}
function verCarrito() { window.location.href = 'checkout.html'; }
actualizarContadorCarrito();

function esFavorito(id) {
  const favs = JSON.parse(localStorage.getItem('pz_favoritos') || '[]');
  return favs.some(f => f.id === id);
}

function toggleFavoritoById(id) {
  let favs = JSON.parse(localStorage.getItem('pz_favoritos') || '[]');
  const idx = favs.findIndex(f => f.id === id);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    const p = productosCache.find(x => x.id === id);
    if (p) favs.push({ id: p.id, nombre: p.nombre, precio: p.precio_oferta || p.precio, imagenes: p.imagenes, categoria_id: p.categoria_id });
  }
  localStorage.setItem('pz_favoritos', JSON.stringify(favs));
  const btn = document.getElementById('fav-' + id);
  if (btn) btn.textContent = idx >= 0 ? '🤍' : '❤️';
}

const POR_PAGINA = 24;
let paginaActual = 1;
let totalProductos = 0;
let filtros = { texto: '', categoria_id: '', precio_min: null, precio_max: null, orden: 'relevancia', modelo_id: null, anio: null };
let categorias = [];
let _catMap = {}; // id → slug
let productosCache = [];
let filtroTag = null;

let vistaActual = localStorage.getItem('pz_vista_catalogo') || 'grilla';

function cambiarVista(vista) {
  vistaActual = vista;
  localStorage.setItem('pz_vista_catalogo', vista);
  document.getElementById('btn-vista-grilla').classList.toggle('activo', vista === 'grilla');
  document.getElementById('btn-vista-lista').classList.toggle('activo', vista === 'lista');
  if (window._ultimosProductos) renderProductos(window._ultimosProductos);
}

function imgOIcono(p) {
  const slug  = _catMap[p.categoria_id] || '';
  const icono = iconos[slug] || '🔩';
  if (p.imagenes && p.imagenes[0]) {
    return `<img class="prod-card-img" src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy"
      onerror="this.outerHTML='<div class=\\'prod-card-placeholder\\'>${icono}</div>'">`;
  }
  return `<div class="prod-card-placeholder">${icono}</div>`;
}

async function obtenerCompatIds(modeloId, anio) {
  let compatQuery = db.from('compatibilidades')
    .select('producto_id')
    .eq('modelo_id', modeloId);

  if (anio) {
    compatQuery = compatQuery
      .lte('anio_desde', anio)
      .or(`anio_hasta.is.null,anio_hasta.gte.${anio}`);
  }

  const { data: compat, error: compatError } = await compatQuery;
  if (compatError) { console.error('Error compatibilidades:', compatError); }
  const idsCompat = compat ? [...new Set(compat.map(c => c.producto_id))] : [];

  const { data: universales, error: univError } = await db.from('productos')
    .select('id')
    .eq('activo', true)
    .eq('universal', true);
  if (univError) { console.error('Error universales:', univError); }
  const idsUniversales = universales ? universales.map(p => p.id) : [];

  return [...new Set([...idsCompat, ...idsUniversales])];
}

async function cargarCatalogo(pagina = 1) {
  paginaActual = pagina;
  const grilla = document.getElementById('cat-grilla');
  grilla.innerHTML = '<div class="loader">Cargando...</div>';
  document.getElementById('cat-paginacion').innerHTML = '';

  const from = (pagina - 1) * POR_PAGINA;
  const to = pagina * POR_PAGINA - 1;

  if (filtros.modelo_id) {
    const compatIds = await obtenerCompatIds(filtros.modelo_id, filtros.anio);

    if (!compatIds.length) {
      grilla.innerHTML = '<p class="vacio">No encontramos productos compatibles con el vehículo seleccionado.</p>';
      document.getElementById('cat-resultado-txt').textContent = '0 productos encontrados';
      return;
    }

    let query = db.from('productos')
      .select('*', { count: 'exact' })
      .eq('activo', true)
      .in('id', compatIds);

    if (filtros.texto) {
      query = query.or(`nombre.ilike.%${filtros.texto}%,codigo_pieza.ilike.%${filtros.texto}%,descripcion.ilike.%${filtros.texto}%`);
    }
    if (filtros.categoria_id) {
      query = query.eq('categoria_id', filtros.categoria_id);
    }
    if (filtros.precio_min !== null) {
      query = query.gte('precio', filtros.precio_min);
    }
    if (filtros.precio_max !== null) {
      query = query.lte('precio', filtros.precio_max);
    }
    if (filtroMarca) {
      query = query.eq('marca', filtroMarca);
    }
    if (filtroTag) {
      query = query.contains('tags', [filtroTag]);
    }

    query = aplicarOrden(query);
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      grilla.innerHTML = '<p class="vacio">Error al cargar productos.</p>';
      console.error('Error productos:', error);
      return;
    }

    await renderProductos(data);
    renderPaginacion(count || 0);
    return;
  }

  let query = db.from('productos')
    .select('*', { count: 'exact' })
    .eq('activo', true);

  if (filtros.texto) {
    query = query.or(`nombre.ilike.%${filtros.texto}%,codigo_pieza.ilike.%${filtros.texto}%,descripcion.ilike.%${filtros.texto}%`);
  }
  if (filtros.categoria_id) {
    query = query.eq('categoria_id', filtros.categoria_id);
  }
  if (filtros.precio_min !== null) {
    query = query.gte('precio', filtros.precio_min);
  }
  if (filtros.precio_max !== null) {
    query = query.lte('precio', filtros.precio_max);
  }
  if (filtroMarca) {
    query = query.eq('marca', filtroMarca);
  }
  if (filtroTag) {
    query = query.contains('tags', [filtroTag]);
  }

  query = aplicarOrden(query);
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    grilla.innerHTML = '<p class="vacio">Error al cargar productos.</p>';
    console.error('Error productos:', error);
    return;
  }

  await renderProductos(data);
  renderPaginacion(count || 0);
}

function aplicarOrden(query) {
  const orden = filtros.orden;
  if (orden === 'menor-precio') return query.order('precio', { ascending: true });
  if (orden === 'mayor-precio') return query.order('precio', { ascending: false });
  if (orden === 'nombre') return query.order('nombre', { ascending: true });
  return query.order('creado_en', { ascending: false });
}

async function cargarResenas(ids) {
  if (!ids.length) return {};
  try {
    const { data } = await db.from('vista_promedio_resenas').select('producto_id, promedio, cantidad').in('producto_id', ids);
    if (!data) return {};
    return Object.fromEntries(data.map(r => [r.producto_id, { promedio: r.promedio, cantidad: r.cantidad }]));
  } catch(e) { return {}; }
}

function renderCardGrilla(p, resenaMap, ahora) {
  const esFav = esFavorito(p.id);
  const esNuevo = p.creado_en && (ahora - new Date(p.creado_en)) < 30 * 24 * 3600 * 1000;
  const tieneOferta = p.precio_oferta && (!p.fecha_fin_oferta || new Date(p.fecha_fin_oferta) >= ahora);
  const sinStock = p.stock === 0;
  const pct = tieneOferta ? Math.round(((p.precio - p.precio_oferta) / p.precio) * 100) : 0;

  const badgesHtml = `<div class="prod-badges">
    ${tieneOferta ? `<span class="badge-oferta">-${pct}% OFF</span>` : ''}
    ${esNuevo && !tieneOferta ? '<span class="badge-nuevo">NUEVO</span>' : ''}
    ${sinStock ? '<span class="badge-sin-stock">Sin stock</span>' : ''}
  </div>`;

  const precioHtml = tieneOferta
    ? `<div class="prod-precio-wrap">
         <span class="prod-precio-original">$${Number(p.precio).toLocaleString('es-AR')}</span>
         <span class="prod-card-precio">$${Number(p.precio_oferta).toLocaleString('es-AR')}</span>
       </div>`
    : `<div class="prod-card-precio">$${Number(p.precio).toLocaleString('es-AR')}</div>`;

  const resData = resenaMap[p.id];
  const resenasHtml = resData
    ? `<div class="prod-resenas"><span class="stars">${'★'.repeat(Math.round(resData.promedio))}${'☆'.repeat(5 - Math.round(resData.promedio))}</span> ${resData.promedio.toFixed(1)} (${resData.cantidad})</div>`
    : '';

  const btnHtml = `<button class="prod-card-btn" ${sinStock ? 'disabled' : `onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${tieneOferta ? p.precio_oferta : p.precio}})"`}>${sinStock ? 'Sin stock' : '🛒 Agregar'}</button>`;

  const img = p.imagenes && p.imagenes[0] ? p.imagenes[0] : '';
  const comparando = estaEnComparacion(p.id);
  const btnComparar = `<button class="btn-comparar ${comparando ? 'activo' : ''}" data-comparar-id="${p.id}" onclick="event.stopPropagation(); toggleComparar({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${tieneOferta ? p.precio_oferta : p.precio},imagen:'${img}'})">${comparando ? '✓ En comparación' : '⚖️ Comparar'}</button>`;

  const tagsHtml = p.tags && p.tags.length
    ? `<div class="card-tags">${p.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}</div>`
    : '';

  return `
  <div class="prod-card" onclick="window.location='producto.html?id=${p.id}'">
    <div style="position:relative">
      ${imgOIcono(p)}
      <div class="prod-card-img-overlay" onclick="event.stopPropagation(); abrirQuickView('${p.id}')" aria-label="Vista rápida de ${p.nombre}">
        <span>🔍 Vista rápida</span>
      </div>
      <div class="card-badges">
        ${sinStock ? '<span class="badge badge-sin-stock">Sin stock</span>' : ''}
        ${esNuevo && !tieneOferta ? '<span class="badge badge-nuevo">Nuevo</span>' : ''}
        ${tieneOferta ? '<span class="badge badge-oferta">Oferta</span>' : ''}
      </div>
      <button id="fav-${p.id}"
        onclick="event.stopPropagation(); toggleFavoritoById('${p.id}')"
        style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1)"
      >${esFav ? '❤️' : '🤍'}</button>
    </div>
    <div class="prod-card-body">
      ${badgesHtml}
      <div class="prod-card-nombre">${p.nombre}</div>
      ${tagsHtml}
      <div class="prod-card-codigo">${p.codigo_pieza ? 'Cód: ' + p.codigo_pieza : ''}</div>
      ${resenasHtml}
      ${precioHtml}
      ${btnHtml}
      ${btnComparar}
    </div>
  </div>`;
}

function renderCardLista(p, ahora) {
  const tieneOferta = p.precio_oferta && (!p.fecha_fin_oferta || new Date(p.fecha_fin_oferta) >= ahora);
  const sinStock = p.stock === 0;
  const precio = tieneOferta ? p.precio_oferta : p.precio;
  const precioOriginal = tieneOferta ? `<span class="precio-original">$${Number(p.precio).toLocaleString('es-AR')}</span>` : '';
  const img = (p.imagenes && p.imagenes[0]) ? p.imagenes[0] : 'https://placehold.co/100x100/1a1a1a/555?text=Sin+imagen';

  const badges = [];
  if (sinStock) badges.push('<span class="badge badge-sin-stock">Sin stock</span>');
  if (tieneOferta) badges.push('<span class="badge badge-oferta">Oferta</span>');

  const tagsHtml = p.tags && p.tags.length
    ? `<div class="card-tags">${p.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}</div>`
    : '';

  const descHtml = p.descripcion
    ? `<div class="cl-desc">${p.descripcion.slice(0, 120)}${p.descripcion.length > 120 ? '...' : ''}</div>`
    : '';

  return `
  <div class="card-lista" onclick="window.location='producto.html?id=${p.id}'" style="cursor:pointer">
    <div class="cl-img">
      <img src="${img}" alt="${p.nombre}" loading="lazy" onerror="this.src='https://placehold.co/100x100/1a1a1a/555?text=Sin+imagen'">
      ${badges.length ? `<div class="card-badges">${badges.join('')}</div>` : ''}
    </div>
    <div class="cl-body">
      <div class="cl-nombre">${p.nombre}</div>
      ${p.codigo_pieza ? `<div class="cl-codigo">Código: ${p.codigo_pieza}</div>` : ''}
      ${descHtml}
      ${tagsHtml}
    </div>
    <div class="cl-acciones">
      <div class="cl-precio">
        $${Number(precio).toLocaleString('es-AR')}
        ${precioOriginal}
      </div>
      ${sinStock
        ? `<button class="btn btn-rojo" disabled style="background:#555;cursor:not-allowed;opacity:0.7;font-size:12px">Sin stock</button>`
        : `<button class="btn btn-rojo" style="font-size:12px" onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${precio}})">Agregar al carrito</button>`
      }
      <a href="producto.html?id=${p.id}" class="cl-ver" onclick="event.stopPropagation()">Ver producto →</a>
    </div>
  </div>`;
}

async function renderProductos(data) {
  const grilla = document.getElementById('cat-grilla');
  if (!data || !data.length) {
    grilla.innerHTML = '<p class="vacio">No se encontraron productos con los filtros aplicados.</p>';
    return;
  }
  productosCache = data;
  window._ultimosProductos = data;

  if (vistaActual === 'lista') {
    grilla.className = 'productos-lista';
    const ahora = new Date();
    grilla.innerHTML = data.map(p => renderCardLista(p, ahora)).join('');
  } else {
    grilla.className = 'grilla-productos';
    const resenaMap = await cargarResenas(data.map(p => p.id));
    const ahora = new Date();
    grilla.innerHTML = data.map(p => renderCardGrilla(p, resenaMap, ahora)).join('');
  }
}

function renderPaginacion(total) {
  totalProductos = total;
  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const txt = total === 1 ? '1 producto encontrado' : `${total.toLocaleString('es-AR')} productos encontrados`;
  document.getElementById('cat-resultado-txt').textContent = txt;

  // Título dinámico
  const catActiva = categorias.find(c => c.id === filtros.categoria_id);
  const textoSearch = filtros.texto;
  const marcaSearch = filtros.modelo_id ? '' : '';
  if (catActiva) {
    document.title = `${catActiva.nombre} — Autopartes Piezauto`;
  } else if (textoSearch) {
    document.title = `"${textoSearch}" — Catálogo Piezauto`;
  } else if (filtros.modelo_id) {
    const params = new URLSearchParams(window.location.search);
    const marca = params.get('marca_nombre') || '';
    const modelo = params.get('modelo_nombre') || '';
    if (marca || modelo) document.title = `Repuestos ${marca} ${modelo} — Piezauto`.trim();
  } else {
    document.title = 'Catálogo de Autopartes — Piezauto';
  }

  const contenedor = document.getElementById('cat-paginacion');
  if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }

  let html = '';

  html += `<button class="pag-btn" onclick="irPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>← Anterior</button>`;

  let inicio = Math.max(1, paginaActual - 2);
  let fin = Math.min(totalPaginas, inicio + 4);
  if (fin - inicio < 4) { inicio = Math.max(1, fin - 4); }

  for (let i = inicio; i <= fin; i++) {
    html += `<button class="pag-btn ${i === paginaActual ? 'activo' : ''}" onclick="irPagina(${i})">${i}</button>`;
  }

  html += `<button class="pag-btn" onclick="irPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente →</button>`;

  contenedor.innerHTML = html;
}

function irPagina(n) {
  const totalPaginas = Math.ceil(totalProductos / POR_PAGINA);
  if (n < 1 || n > totalPaginas) return;
  cargarCatalogo(n);
  document.querySelector('.catalogo-contenido').scrollIntoView({ behavior: 'smooth' });
}

function aplicarFiltros() {
  filtros.texto = document.getElementById('cat-texto').value.trim();
  const minVal = document.getElementById('precio-min').value;
  const maxVal = document.getElementById('precio-max').value;
  filtros.precio_min = minVal !== '' ? Number(minVal) : null;
  filtros.precio_max = maxVal !== '' ? Number(maxVal) : null;
  filtros.orden = document.getElementById('cat-orden').value;
  cargarCatalogo(1);
}

function seleccionarCategoria(id) {
  filtros.categoria_id = id;
  document.querySelectorAll('.cat-filtro-btn').forEach(btn => btn.classList.remove('activo'));
  const btnActivo = document.querySelector(`.cat-filtro-btn[data-cat-id="${id === '' ? 'todas' : id}"]`);
  if (btnActivo) btnActivo.classList.add('activo');
  aplicarFiltros();
}

async function cargarCategoriasSidebar() {
  const { data, error } = await db.from('categorias').select('*').order('nombre');
  if (error || !data) return;
  categorias = data;
  _catMap = Object.fromEntries(data.map(c => [c.id, c.slug]));
  const lista = document.getElementById('cat-categorias-lista');
  const btnTodas = `<button class="cat-filtro-btn ${filtros.categoria_id === '' ? 'activo' : ''}" data-cat-id="todas" onclick="seleccionarCategoria('')">Todas</button>`;
  const btnsCats = data.map(cat => `
    <button class="cat-filtro-btn ${filtros.categoria_id === cat.id ? 'activo' : ''}" data-cat-id="${cat.id}" onclick="seleccionarCategoria('${cat.id}')">
      ${iconos[cat.slug] || '🔩'} ${cat.nombre}
    </button>
  `).join('');
  lista.innerHTML = btnTodas + btnsCats;
}

async function cargarMarcasCatalogo() {
  const { data, error } = await db.from('marcas_auto').select('*').order('nombre');
  if (error || !data) return;
  const sel = document.getElementById('cat-marca-auto');
  data.forEach(m => {
    sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });
}

async function cargarModelosCatalogo() {
  const marcaId = document.getElementById('cat-marca-auto').value;
  const selModelo = document.getElementById('cat-modelo-auto');
  const selAnio = document.getElementById('cat-anio-auto');
  selModelo.innerHTML = '<option value="">Todos los modelos</option>';
  selModelo.disabled = true;
  selAnio.innerHTML = '<option value="">Todos los años</option>';
  selAnio.disabled = true;
  if (!marcaId) return;

  const { data, error } = await db.from('modelos_auto').select('*').eq('marca_id', marcaId).order('nombre');
  if (error || !data) return;
  data.forEach(m => {
    selModelo.innerHTML += `<option value="${m.id}" data-desde="${m.anio_desde}" data-hasta="${m.anio_hasta || ''}">${m.nombre}</option>`;
  });
  selModelo.disabled = false;
}

function cargarAniosCatalogo() {
  const selModelo = document.getElementById('cat-modelo-auto');
  const selAnio = document.getElementById('cat-anio-auto');
  const opt = selModelo.options[selModelo.selectedIndex];
  selAnio.innerHTML = '<option value="">Todos los años</option>';
  selAnio.disabled = true;
  if (!opt || !opt.value) return;

  const desde = parseInt(opt.dataset.desde) || 1980;
  const hasta = parseInt(opt.dataset.hasta) || new Date().getFullYear();
  for (let a = hasta; a >= desde; a--) {
    selAnio.innerHTML += `<option value="${a}">${a}</option>`;
  }
  selAnio.disabled = false;
}

function aplicarFiltroAuto() {
  const selModelo = document.getElementById('cat-modelo-auto');
  const modeloId = selModelo.value;
  if (!modeloId) { mostrarNotificacion('Seleccioná un modelo para filtrar.', 'error'); return; }
  const anio = document.getElementById('cat-anio-auto').value;
  filtros.modelo_id = modeloId;
  filtros.anio = anio ? parseInt(anio) : null;

  const selMarca = document.getElementById('cat-marca-auto');
  const marcaNombre = selMarca.options[selMarca.selectedIndex]?.text || '';
  const modeloNombre = selModelo.options[selModelo.selectedIndex]?.text || '';
  const autoTexto = `${marcaNombre} ${modeloNombre}${filtros.anio ? ' ' + filtros.anio : ''}`;

  sessionStorage.setItem('pz_auto_seleccionado', JSON.stringify({
    marca: marcaNombre,
    modelo: modeloNombre,
    anio: filtros.anio || '',
    modelo_id: modeloId
  }));

  mostrarBadgeAuto(autoTexto);
  cargarCatalogo(1);
}

function mostrarBadgeAuto(texto) {
  const contenido = document.getElementById('auto-filtro-contenido');
  contenido.innerHTML = `
    <div class="auto-badge-activo">
      <span>🚗 ${texto}</span>
      <button onclick="limpiarFiltroAuto()" style="background:none;border:none;cursor:pointer;font-size:18px;color:#1a7a3f;padding:0 0 0 8px">✕</button>
    </div>
  `;
}

function limpiarFiltroAuto() {
  filtros.modelo_id = null;
  filtros.anio = null;
  sessionStorage.removeItem('pz_auto_seleccionado');

  const contenido = document.getElementById('auto-filtro-contenido');
  contenido.innerHTML = `
    <select id="cat-marca-auto" class="sidebar-select" onchange="cargarModelosCatalogo()">
      <option value="">Todas las marcas</option>
    </select>
    <select id="cat-modelo-auto" class="sidebar-select" onchange="cargarAniosCatalogo()" disabled>
      <option value="">Todos los modelos</option>
    </select>
    <select id="cat-anio-auto" class="sidebar-select" disabled>
      <option value="">Todos los años</option>
    </select>
    <button class="btn btn-rojo" style="width:100%;margin-top:4px" onclick="aplicarFiltroAuto()">🔍 Filtrar por este auto</button>
  `;
  cargarMarcasCatalogo();
  cargarCatalogo(1);
}

function limpiarTodosFiltros() {
  filtros = { texto: '', categoria_id: '', precio_min: null, precio_max: null, orden: 'relevancia', modelo_id: null, anio: null };
  document.getElementById('cat-texto').value = '';
  document.getElementById('precio-min').value = '';
  document.getElementById('precio-max').value = '';
  document.getElementById('cat-orden').value = 'relevancia';
  sessionStorage.removeItem('pz_auto_seleccionado');
  cargarCatalogo(1);
}

document.getElementById('cat-texto').addEventListener('keydown', e => {
  if (e.key === 'Enter') aplicarFiltros();
});

let filtroMarca = null;

async function cargarTagsSidebar() {
  const { data: prods } = await db.from('productos').select('tags').eq('activo', true);
  if (!prods) return;
  const todosLosTags = [...new Set(prods.flatMap(p => p.tags || []))].sort();
  if (!todosLosTags.length) return;

  const card = document.getElementById('card-tags');
  const lista = document.getElementById('tags-lista');
  card.style.display = 'block';
  lista.innerHTML = todosLosTags.map(t =>
    `<button class="tag-filtro-btn ${filtroTag === t ? 'activo' : ''}" onclick="seleccionarTag('${t.replace(/'/g, "\\'")}')">${t}</button>`
  ).join('');
}

function seleccionarTag(tag) {
  filtroTag = filtroTag === tag ? null : tag;
  document.querySelectorAll('.tag-filtro-btn').forEach(btn => {
    btn.classList.toggle('activo', btn.textContent === filtroTag);
  });
  cargarCatalogo(1);
}

async function init() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('modelo_id')) {
    filtros.modelo_id = params.get('modelo_id');
    if (params.get('anio')) filtros.anio = parseInt(params.get('anio'));
    const marcaNombre = params.get('marca_nombre') || '';
    const modeloNombre = params.get('modelo_nombre') || '';
    const autoTexto = `${marcaNombre} ${modeloNombre}${filtros.anio ? ' ' + filtros.anio : ''}`.trim();
    if (autoTexto) mostrarBadgeAuto(autoTexto);
  } else {
    const autoGuardado = JSON.parse(sessionStorage.getItem('pz_auto_seleccionado') || 'null');
    if (autoGuardado && autoGuardado.modelo_id) {
      filtros.modelo_id = autoGuardado.modelo_id;
      filtros.anio = autoGuardado.anio ? parseInt(autoGuardado.anio) : null;
      const autoTexto = `${autoGuardado.marca} ${autoGuardado.modelo}${autoGuardado.anio ? ' ' + autoGuardado.anio : ''}`;
      mostrarBadgeAuto(autoTexto);
    } else {
      cargarMarcasCatalogo();
    }
  }

  if (params.get('cat')) filtros.categoria_id = params.get('cat');
  if (params.get('texto')) {
    filtros.texto = params.get('texto');
    document.getElementById('cat-texto').value = filtros.texto;
  }
  if (params.get('marca')) {
    filtroMarca = params.get('marca');
  }

  cambiarVista(vistaActual);
  await cargarCategoriasSidebar();
  await cargarTagsSidebar();
  await cargarCatalogo(1);
  actualizarBarraComparar();
}

init();

async function abrirQuickView(id) {
  const modal = document.getElementById('modal-quickview');
  if (!modal) return;
  modal.classList.add('abierto');
  document.getElementById('qv-contenido').innerHTML = '<p style="text-align:center;padding:40px">Cargando...</p>';
  const { data: p } = await db.from('productos').select('*, categorias(nombre)').eq('id', id).single();
  if (!p) { modal.classList.remove('abierto'); return; }
  const img = p.imagenes && p.imagenes[0] ? `<img src="${p.imagenes[0]}" alt="${p.nombre}" style="width:100%;max-height:300px;object-fit:contain;border-radius:8px">` : '<div style="height:200px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:48px">🔩</div>';
  const tieneOferta = p.precio_oferta && (!p.fecha_fin_oferta || new Date(p.fecha_fin_oferta) >= new Date());
  const precioHtml = tieneOferta
    ? `<div><span style="text-decoration:line-through;color:#999;font-size:14px">$${Number(p.precio).toLocaleString('es-AR')}</span> <span style="font-size:24px;font-weight:800;color:var(--rojo)">$${Number(p.precio_oferta).toLocaleString('es-AR')}</span></div>`
    : `<div style="font-size:24px;font-weight:800;color:var(--rojo)">$${Number(p.precio).toLocaleString('es-AR')}</div>`;
  document.getElementById('qv-contenido').innerHTML = `
    <div class="qv-body">
      <div>${img}</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">${p.categorias?.nombre || ''}</div>
        <h2 style="font-size:18px;margin:0;line-height:1.3">${p.nombre}</h2>
        ${p.codigo_pieza ? `<div style="font-size:12px;color:#aaa">Cód: ${p.codigo_pieza}</div>` : ''}
        <p style="font-size:14px;color:#555;margin:0;line-height:1.5">${p.descripcion || ''}</p>
        ${precioHtml}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${p.stock > 0
            ? `<button class="prod-card-btn" onclick="agregarAlCarrito({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${tieneOferta ? p.precio_oferta : p.precio}}); document.getElementById('modal-quickview').classList.remove('abierto')">🛒 Agregar al carrito</button>`
            : `<button class="prod-card-btn" disabled style="background:#555;opacity:.7;cursor:not-allowed">Sin stock</button>`}
          <a href="producto.html?id=${p.id}" class="prod-card-btn" style="background:#333;text-decoration:none;display:inline-flex;align-items:center;justify-content:center">Ver ficha completa →</a>
        </div>
      </div>
    </div>`;
}

function aplicarOrdenLocal() {
  const orden = document.getElementById('orden-select')?.value || 'nuevo';
  const arr = window._ultimosProductos;
  if (!arr || !arr.length) return;
  const sorted = [...arr];
  if (orden === 'precio-asc')  sorted.sort((a, b) => (a.precio || 0) - (b.precio || 0));
  if (orden === 'precio-desc') sorted.sort((a, b) => (b.precio || 0) - (a.precio || 0));
  if (orden === 'nombre-az')   sorted.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  renderProductos(sorted);
}

