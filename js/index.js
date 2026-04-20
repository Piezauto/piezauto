
function esNuevo(fechaISO) {
  if (!fechaISO) return false;
  return (Date.now() - new Date(fechaISO).getTime()) < 30 * 24 * 60 * 60 * 1000;
}

// ── SKELETON LOADERS ─────────────────────────
function skeletonProductos(n) {
  return Array(n).fill(0).map(() => `
    <div class="skeleton-prod-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line price"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    </div>`).join('');
}

function skeletonCategorias(n) {
  return Array(n).fill(0).map(() => `
    <div class="skeleton-cat-card">
      <div class="skeleton skeleton-cat-icono"></div>
      <div class="skeleton skeleton-cat-label"></div>
    </div>`).join('');
}

// ── ÍCONOS POR CATEGORÍA ──────────────────────
const _svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">${d}</svg>`;

const iconos = {
  'motor':         _svg('<rect x="4" y="8" width="16" height="9" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M8 8V5M16 8V5M2 12h2M20 12h2M8 17v3M16 17v3"/>'),
  'frenos':        _svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M3 12h3M12 21v-3M21 12h-3"/>'),
  'suspension':    _svg('<line x1="12" y1="2" x2="12" y2="5"/><line x1="9" y1="5" x2="15" y2="5"/><path d="M9 6L15 7.5 9 9 15 10.5 9 12 15 13.5"/><line x1="9" y1="13.5" x2="15" y2="13.5"/><line x1="12" y1="13.5" x2="12" y2="22"/>'),
  'transmision':   _svg('<circle cx="7" cy="7" r="3.5"/><circle cx="17" cy="17" r="3.5"/><circle cx="7" cy="7" r="1" fill="#888" stroke="none"/><circle cx="17" cy="17" r="1" fill="#888" stroke="none"/><path d="M10.5 10.5l3 3"/>'),
  'electricidad':  _svg('<path d="M13 2L4 13.5h7L9 22l11-12.5h-7L13 2z"/>'),
  'filtros':       _svg('<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>'),
  'refrigeracion': _svg('<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/><line x1="18.4" y1="5.6" x2="5.6" y2="18.4"/><circle cx="12" cy="12" r="2.5"/>'),
  'carroceria':    _svg('<path d="M5 10l2.5-5h9L19 10"/><rect x="2" y="10" width="20" height="7" rx="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><line x1="2" y1="14" x2="22" y2="14"/>'),
  'iluminacion':   _svg('<path d="M12 2a5 5 0 015 5c0 2.38-1.19 4.47-3 5.74V15a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2.26C8.19 11.47 7 9.38 7 7a5 5 0 015-5z"/><line x1="10" y1="18" x2="14" y2="18"/><line x1="11" y1="21" x2="13" y2="21"/>'),
  'accesorios':    _svg('<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>'),
  'escape':        _svg('<path d="M3 8h9a3 3 0 013 3v2a3 3 0 01-3 3H3"/><path d="M15 12h4a2 2 0 012 2"/><path d="M3 8V6M3 16v2"/>'),
  'direccion':     _svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M4.93 7l4.24 4.24M21 12h-6M4.93 17l4.24-4.24"/>'),
  'herrajes':      _svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1.5" fill="#888" stroke="none"/>'),
};

// ── CARRITO (guardado en el navegador) ────────
let carrito = JSON.parse(localStorage.getItem('pz_carrito') || '[]');
let productosCache = [];
actualizarContadorCarrito();

function actualizarContadorCarrito() {
  const total = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  document.getElementById('carrito-count').textContent = total;
}

function agregarAlCarrito(producto, originEl) {
  const existe = carrito.find(i => i.id === producto.id);
  if (existe) {
    existe.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }
  localStorage.setItem('pz_carrito', JSON.stringify(carrito));
  actualizarContadorCarrito();
  if (window.trackAddToCart) trackAddToCart(producto);
  if (!document.querySelector('link[rel="prefetch"][href="checkout.html"]')) {
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = 'checkout.html';
    document.head.appendChild(l);
  }
  if (originEl && window.flyAlCarrito) window.flyAlCarrito(originEl);
  else alert(`✅ "${producto.nombre}" agregado al carrito`);
}

function verCarrito() {
  window.location.href = 'checkout.html';
}

// ── FAVORITOS ─────────────────────────────────
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
const MARCAS_DESTACADAS = [
  { nombre: 'Ford',          logo: 'https://logo.clearbit.com/ford.com' },
  { nombre: 'Chevrolet',     logo: 'https://logo.clearbit.com/chevrolet.com' },
  { nombre: 'Volkswagen',    logo: 'https://logo.clearbit.com/vw.com' },
  { nombre: 'Renault',       logo: 'https://logo.clearbit.com/renault.com' },
  { nombre: 'Peugeot',       logo: 'https://logo.clearbit.com/peugeot.com' },
  { nombre: 'Fiat',          logo: 'https://logo.clearbit.com/fiat.com' },
  { nombre: 'Toyota',        logo: 'https://logo.clearbit.com/toyota.com' },
  { nombre: 'Honda',         logo: 'https://logo.clearbit.com/honda.com' },
  { nombre: 'Nissan',        logo: 'https://logo.clearbit.com/nissan.com' },
  { nombre: 'Citroën',       logo: 'https://logo.clearbit.com/citroen.com' },
  { nombre: 'Hyundai',       logo: 'https://logo.clearbit.com/hyundai.com' },
  { nombre: 'Kia',           logo: 'https://logo.clearbit.com/kia.com' },
  { nombre: 'Jeep',          logo: 'https://logo.clearbit.com/jeep.com' },
  { nombre: 'BMW',           logo: 'https://logo.clearbit.com/bmw.com' },
  { nombre: 'Mercedes-Benz', logo: 'https://logo.clearbit.com/mercedes-benz.com' },
  { nombre: 'Audi',          logo: 'https://logo.clearbit.com/audi.com' },
  { nombre: 'Mitsubishi',    logo: 'https://logo.clearbit.com/mitsubishi.com' },
  { nombre: 'Suzuki',        logo: 'https://logo.clearbit.com/suzuki.com' },
  { nombre: 'Subaru',        logo: 'https://logo.clearbit.com/subaru.com' },
];

function renderMarcasDestacadas() {
  const container = document.getElementById('marcas-badges');
  if (!container) return;

  container.innerHTML = MARCAS_DESTACADAS.map(m =>
    `<a href="catalogo.html?marca_auto=${encodeURIComponent(m.nombre)}" class="marca-logo-card" title="Ver repuestos para ${m.nombre}">
      <span class="marca-logo-nombre">${m.nombre}</span>
    </a>`
  ).join('');
}

// ── CARGAR CATEGORÍAS ─────────────────────────
async function cargarCategorias() {
  const grilla = document.getElementById('grilla-categorias');
  grilla.innerHTML = skeletonCategorias(8);
  const { data, error } = await db.from('categorias').select('*').order('nombre');

  if (error || !data.length) {
    grilla.innerHTML = '<p class="vacio">No hay categorías cargadas aún.</p>';
    return;
  }

  grilla.innerHTML = data.map(cat => `
    <div class="cat-card" onclick="window.location='categoria.html?slug=${cat.slug}'">
      <div class="cat-icono">${iconos[cat.slug] || '🔩'}</div>
      ${cat.nombre}
    </div>
  `).join('');
}

// ── PLACEHOLDER CON ÍCONO DE CATEGORÍA ────────
function imgOIcono(p) {
  if (p.imagenes && p.imagenes[0]) {
    const slug = p.categorias?.slug || '';
    const icono = iconos[slug] || '🔩';
    return `<img class="prod-card-img" src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy"
      onerror="this.outerHTML='<div class=\\'prod-card-placeholder\\'>${icono}</div>'">`;
  }
  const slug  = p.categorias?.slug || '';
  const icono = iconos[slug] || '🔩';
  return `<div class="prod-card-placeholder">${icono}</div>`;
}

// ── CARGAR PRODUCTOS DESTACADOS ───────────────
async function cargarProductos(filtros = {}) {
  const grilla = document.getElementById('grilla-productos');
  grilla.innerHTML = skeletonProductos(8);

  let query = db.from('productos')
    .select('*, categorias(slug)')
    .eq('activo', true)
    .limit(8);

  if (filtros.texto) {
    query = query.or(`nombre.ilike.%${filtros.texto}%,codigo_pieza.ilike.%${filtros.texto}%,descripcion.ilike.%${filtros.texto}%`);
  }
  if (filtros.categoria_id) {
    query = query.eq('categoria_id', filtros.categoria_id);
  }

  const { data, error } = await query.order('creado_en', { ascending: false });

  if (error) {
    grilla.innerHTML = '<p class="vacio">Error al cargar productos.</p>';
    return;
  }

  if (!data.length) {
    grilla.innerHTML = '<p class="vacio">No se encontraron productos.</p>';
    return;
  }

  productosCache = [...productosCache.filter(x => !data.find(d => d.id === x.id)), ...data];
  grilla.innerHTML = data.map(p => {
    const esFav = esFavorito(p.id);
    return `
    <div class="prod-card" onclick="window.location='producto.html?id=${p.id}'">
      <div style="position:relative">
        ${imgOIcono(p)}
        <div class="prod-card-img-overlay" onclick="event.stopPropagation(); window.location='producto.html?id=${p.id}'" aria-label="Ver detalles de ${p.nombre}">
          <span>🔍 Ver detalles</span>
        </div>
        <div class="card-badges">
          ${p.stock === 0 ? '<span class="badge badge-sin-stock">Sin stock</span>' : ''}
          ${esNuevo(p.creado_en) ? '<span class="badge badge-nuevo">Nuevo</span>' : ''}
          ${p.precio_oferta ? '<span class="badge badge-oferta">Oferta</span>' : ''}
        </div>
        <button id="fav-${p.id}"
          onclick="event.stopPropagation(); toggleFavoritoById('${p.id}')"
          style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1)"
        >${esFav ? '❤️' : '🤍'}</button>
      </div>
      <div class="prod-card-body">
        <div class="prod-card-nombre">${p.nombre}</div>
        <div class="prod-card-codigo">${p.codigo_pieza ? 'Cód: ' + p.codigo_pieza : ''}</div>
        <div class="prod-card-precio">$${Number(p.precio).toLocaleString('es-AR')}</div>
        ${p.stock === 0
          ? '<button class="prod-card-btn" disabled style="background:#555;cursor:not-allowed;opacity:0.7">Sin stock</button>'
          : `<button class="prod-card-btn" onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}', nombre:'${p.nombre.replace(/'/g,"\\'")}', precio:${p.precio}})">Agregar al carrito</button>`}
      </div>
    </div>`;
  }).join('');
}

// ── CARGAR TALLERES ───────────────────────────
async function cargarTalleres() {
  const grilla = document.getElementById('grilla-talleres');
  const { data, error } = await db.from('talleres')
    .select('*, resenas(puntuacion)')
    .eq('activo', true)
    .limit(3);

  if (error || !data.length) {
    grilla.innerHTML = '<p class="vacio">Próximamente talleres en tu zona.</p>';
    return;
  }

  grilla.innerHTML = data.map(t => {
    const resenas = t.resenas || [];
    const promedio = resenas.length
      ? (resenas.reduce((a, r) => a + r.puntuacion, 0) / resenas.length).toFixed(1)
      : null;
    const estrellas = promedio ? '★'.repeat(Math.round(promedio)) + '☆'.repeat(5 - Math.round(promedio)) : '☆☆☆☆☆';

    return `
      <div class="taller-card">
        <div class="taller-card-nombre">${t.nombre}</div>
        <div class="taller-card-zona">📍 ${t.localidad || t.zona || 'Zona AMBA'}</div>
        <div class="taller-card-stars">
          ${estrellas}
          <span style="font-size:12px;color:#999;margin-left:4px">
            ${promedio ? promedio + ' (' + resenas.length + ' reseñas)' : 'Sin reseñas aún'}
          </span>
        </div>
        <button class="taller-card-btn" onclick="window.location='talleres.html?id=${t.id}'">
          Ver taller
        </button>
      </div>
    `;
  }).join('');
}

// ── CARGAR MARCAS EN EL FILTRO ────────────────
async function cargarMarcasFiltro() {
  const { data } = await db.from('marcas_auto').select('*').order('nombre');
  const sel = document.getElementById('filtro-marca');
  if (!data) return;
  data.forEach(m => {
    sel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });
}

async function cargarModelos() {
  const marcaId   = document.getElementById('filtro-marca').value;
  const selModelo = document.getElementById('filtro-modelo');
  selModelo.innerHTML = '<option value="">Todos los modelos</option>';
  document.getElementById('filtro-anio').innerHTML = '<option value="">Todos los años</option>';
  document.getElementById('btn-buscar-auto').style.display = 'none';
  document.getElementById('auto-seleccionado').textContent = '';
  if (!marcaId) return;

  const { data } = await db.from('modelos_auto').select('*').eq('marca_id', marcaId).order('nombre');
  if (!data) return;
  data.forEach(m => {
    selModelo.innerHTML += `<option value="${m.id}" data-desde="${m.anio_desde}" data-hasta="${m.anio_hasta || ''}">${m.nombre}</option>`;
  });
}

function cargarAniosPorModelo() {
  const selModelo = document.getElementById('filtro-modelo');
  const selAnio   = document.getElementById('filtro-anio');
  const opt       = selModelo.options[selModelo.selectedIndex];
  selAnio.innerHTML = '<option value="">Todos los años</option>';
  document.getElementById('btn-buscar-auto').style.display = 'none';
  document.getElementById('auto-seleccionado').textContent = '';
  if (!opt || !opt.value) return;

  const desde = parseInt(opt.dataset.desde) || 1980;
  const hasta = parseInt(opt.dataset.hasta) || new Date().getFullYear();
  for (let a = hasta; a >= desde; a--) {
    selAnio.innerHTML += `<option value="${a}">${a}</option>`;
  }
  document.getElementById('btn-buscar-auto').style.display = 'inline-block';
}

// ── AÑOS EN EL FILTRO (fallback) ──────────────
function cargarAniosFiltro() {
  // Se llena dinámicamente al seleccionar modelo; noop en carga inicial
}

// ── BUSCAR ────────────────────────────────────
function buscar() {
  const texto = document.getElementById('buscador-input').value.trim();
  if (texto) {
    window.location.href = 'busqueda.html?q=' + encodeURIComponent(texto);
    return;
  }
  cargarProductos({ texto });
  document.getElementById('grilla-productos').scrollIntoView({ behavior: 'smooth' });
}

function buscarPorCategoria(id, nombre) {
  cargarProductos({ categoria_id: id });
  document.getElementById('grilla-productos').scrollIntoView({ behavior: 'smooth' });
}

// ── BUSCAR POR AUTO (COMPATIBILIDAD) ─────────
async function buscarPorAuto() {
  const selMarca  = document.getElementById('filtro-marca');
  const selModelo = document.getElementById('filtro-modelo');
  const modeloId  = selModelo.value;
  const anio      = parseInt(document.getElementById('filtro-anio').value) || null;

  if (!modeloId) { alert('Seleccioná un modelo de auto.'); return; }

  const marcaNombre  = selMarca.options[selMarca.selectedIndex]?.text || '';
  const modeloNombre = selModelo.options[selModelo.selectedIndex]?.text || '';
  const autoTexto    = `${marcaNombre} ${modeloNombre}${anio ? ' ' + anio : ''}`;

  console.log('[buscarPorAuto] modelo_id:', modeloId, '| año:', anio, '| auto:', autoTexto);

  document.getElementById('grilla-productos').innerHTML = '<div class="loader">Buscando...</div>';
  document.getElementById('auto-seleccionado').textContent = autoTexto;
  sessionStorage.setItem('pz_auto_seleccionado', JSON.stringify({ marca: marcaNombre, modelo: modeloNombre, anio: anio || '' }));
  document.getElementById('banner-auto-texto').textContent = autoTexto;
  document.getElementById('banner-auto').style.display = 'block';

  // PASO 1 — buscar compatibilidades por modelo_id y año
  let compatQuery = db.from('compatibilidades')
    .select('producto_id')
    .eq('modelo_id', modeloId);

  if (anio) {
    compatQuery = compatQuery
      .lte('anio_desde', anio)
      .or(`anio_hasta.is.null,anio_hasta.gte.${anio}`);
  }

  const { data: compat, error: compatError } = await compatQuery;
  console.log('[buscarPorAuto] PASO 1 - compatibilidades:', compat, '| error:', compatError);

  const idsCompat = compat ? [...new Set(compat.map(c => c.producto_id))] : [];
  console.log('[buscarPorAuto] IDs por compatibilidad:', idsCompat);

  // PASO 2 — buscar productos universales
  const { data: universales, error: univError } = await db.from('productos')
    .select('id')
    .eq('activo', true)
    .eq('universal', true);
  console.log('[buscarPorAuto] PASO 2 - universales:', universales, '| error:', univError);

  const idsUniversales = universales ? universales.map(p => p.id) : [];

  // PASO 3 — combinar IDs sin duplicados
  const todosIds = [...new Set([...idsCompat, ...idsUniversales])];
  console.log('[buscarPorAuto] PASO 3 - IDs combinados:', todosIds);

  const grilla = document.getElementById('grilla-productos');

  if (!todosIds.length) {
    grilla.innerHTML = `
      <p class="vacio">
        No encontramos productos compatibles con <strong>${autoTexto}</strong>.<br>
        <span style="font-size:13px;color:#aaa">Contactanos para consultar disponibilidad.</span>
      </p>`;
    grilla.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // PASO 4 — traer los productos
  const { data: productos, error: prodError } = await db.from('productos')
    .select('*')
    .eq('activo', true)
    .in('id', todosIds)
    .order('nombre');
  console.log('[buscarPorAuto] PASO 4 - productos:', productos, '| error:', prodError);

  if (!productos || !productos.length) {
    grilla.innerHTML = `<p class="vacio">No encontramos productos compatibles con ${autoTexto}.</p>`;
    grilla.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  productosCache = [...productosCache.filter(x => !productos.find(d => d.id === x.id)), ...productos];

  const counter = `<p style="font-size:13px;color:#888;margin-bottom:16px">
    <strong style="color:var(--rojo)">${productos.length} producto${productos.length !== 1 ? 's' : ''}</strong>
    compatibles con ${autoTexto}
  </p>`;

  grilla.innerHTML = counter + productos.map(p => {
    const esFav = esFavorito(p.id);
    const imgSrc = p.imagenes && p.imagenes[0] ? p.imagenes[0] : 'https://placehold.co/300x200?text=Sin+imagen';
    return `
    <div class="prod-card" onclick="window.location='producto.html?id=${p.id}'">
      <div style="position:relative">
        <img class="prod-card-img" src="${imgSrc}" alt="${p.nombre}" loading="lazy">
        <div class="card-badges">
          ${p.stock === 0 ? '<span class="badge badge-sin-stock">Sin stock</span>' : ''}
          ${esNuevo(p.creado_en) ? '<span class="badge badge-nuevo">Nuevo</span>' : ''}
          ${p.precio_oferta ? '<span class="badge badge-oferta">Oferta</span>' : ''}
        </div>
        <button id="fav-${p.id}"
          onclick="event.stopPropagation(); toggleFavoritoById('${p.id}')"
          style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1)"
        >${esFav ? '❤️' : '🤍'}</button>
      </div>
      <div class="prod-card-body">
        <div class="prod-card-nombre">${p.nombre}</div>
        <div class="prod-card-codigo">${p.codigo_pieza ? 'Cód: ' + p.codigo_pieza : ''}</div>
        <div class="prod-card-precio">$${Number(p.precio).toLocaleString('es-AR')}</div>
        ${p.stock === 0
          ? '<button class="prod-card-btn" disabled style="background:#555;cursor:not-allowed;opacity:0.7">Sin stock</button>'
          : `<button class="prod-card-btn" onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}', nombre:'${p.nombre.replace(/'/g,"\\'")}', precio:${p.precio}})">Agregar al carrito</button>`}
      </div>
    </div>`;
  }).join('');

  document.getElementById('titulo-seccion-productos').textContent = 'Productos compatibles con tu auto';
  document.getElementById('link-ver-todos').href =
    `catalogo.html?modelo_id=${encodeURIComponent(modeloId)}&anio=${anio || ''}&marca_nombre=${encodeURIComponent(marcaNombre)}&modelo_nombre=${encodeURIComponent(modeloNombre)}`;

  grilla.scrollIntoView({ behavior: 'smooth' });
}

function limpiarFiltroAuto() {
  sessionStorage.removeItem('pz_auto_seleccionado');
  document.getElementById('banner-auto').style.display = 'none';
  document.getElementById('filtro-marca').value = '';
  document.getElementById('filtro-modelo').innerHTML = '<option value="">Todos los modelos</option>';
  document.getElementById('filtro-anio').innerHTML = '<option value="">Todos los años</option>';
  document.getElementById('btn-buscar-auto').style.display = 'none';
  document.getElementById('auto-seleccionado').textContent = '';
  document.getElementById('titulo-seccion-productos').textContent = 'Productos destacados';
  document.getElementById('link-ver-todos').href = 'catalogo.html';
  cargarProductos();
}

// Enter en el buscador
document.getElementById('buscador-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') buscar();
});

function buscarDesdeHeader() {
  const q = document.getElementById('header-buscar').value.trim();
  if (q) window.location.href = 'busqueda.html?q=' + encodeURIComponent(q);
}
function toggleMenu() {
  document.getElementById('menu-mobile').classList.toggle('open');
}

// ── SLIDER BANNERS ────────────────────────
let sliderActual = 0;
let sliderTotal  = 0;
let sliderTimer  = null;

async function cargarSlider() {
  const { data } = await db.from('banners').select('*').eq('activo', true).order('orden');
  if (!data || data.length === 0) return;

  document.getElementById('hero-estatico').style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'slider-wrap';
  wrap.innerHTML = `
    <div class="slider-track" id="slider-track">
      ${data.map((b, i) => `
        <div class="slider-slide" onclick="${b.url_destino ? `window.location='${b.url_destino}'` : ''}">
          <img src="${b.url_imagen}" alt="${b.texto_alt || 'Banner Piezauto'}" loading="${i === 0 ? 'eager' : 'lazy'}">
          ${b.texto_alt ? `<div class="slide-overlay"><div class="slide-texto"><h2>${b.texto_alt}</h2></div></div>` : ''}
        </div>`).join('')}
    </div>
    <button class="slider-btn prev" onclick="sliderIr(-1)">&#8249;</button>
    <button class="slider-btn next" onclick="sliderIr(1)">&#8250;</button>
    <div class="slider-dots" id="slider-dots">
      ${data.map((_, i) => `<button class="slider-dot${i===0?' activo':''}" onclick="sliderGoto(${i})"></button>`).join('')}
    </div>
  `;

  document.getElementById('hero-section').prepend(wrap);
  sliderTotal = data.length;
  sliderAutoplay();
}

function sliderActualizar() {
  document.getElementById('slider-track').style.transform = `translateX(-${sliderActual * 100}%)`;
  document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('activo', i === sliderActual));
}

function sliderIr(dir) {
  sliderActual = (sliderActual + dir + sliderTotal) % sliderTotal;
  sliderActualizar();
  clearInterval(sliderTimer);
  sliderAutoplay();
}

function sliderGoto(i) {
  sliderActual = i;
  sliderActualizar();
  clearInterval(sliderTimer);
  sliderAutoplay();
}

function sliderAutoplay() {
  if (sliderTotal <= 1) return;
  sliderTimer = setInterval(() => sliderIr(1), 5000);
}

// ── INIT ──────────────────────────────────────
const _autoGuardado = JSON.parse(sessionStorage.getItem('pz_auto_seleccionado') || 'null');
if (_autoGuardado) {
  const _autoTxt = `${_autoGuardado.marca} ${_autoGuardado.modelo}${_autoGuardado.anio ? ' ' + _autoGuardado.anio : ''}`;
  document.getElementById('banner-auto-texto').textContent = _autoTxt;
  document.getElementById('banner-auto').style.display = 'block';
  document.getElementById('titulo-seccion-productos').textContent = 'Productos compatibles con tu auto';
}

function cargarVistosRecientes() {
  const vistos = JSON.parse(localStorage.getItem('pz_vistos') || '[]');
  if (!vistos.length) return;

  document.getElementById('seccion-vistos').style.display = 'block';
  document.getElementById('grilla-vistos').innerHTML = vistos.map(p => `
    <div class="prod-card" onclick="window.location='producto.html?id=${p.id}'">
      ${p.imagen
        ? `<img class="prod-card-img" src="${p.imagen}" alt="${p.nombre}" loading="lazy" onerror="this.outerHTML='<div class=\\'prod-card-placeholder\\'>🔩</div>'">`
        : `<div class="prod-card-placeholder">🔩</div>`}
      <div class="prod-card-body">
        <div class="prod-card-nombre">${p.nombre}</div>
        <div class="prod-card-precio">$${Number(p.precio).toLocaleString('es-AR')}</div>
        <button class="prod-card-btn" onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${p.precio}})">🛒 Agregar</button>
      </div>
    </div>
  `).join('');
}

function limpiarVistos(e) {
  e.preventDefault();
  localStorage.removeItem('pz_vistos');
  document.getElementById('seccion-vistos').style.display = 'none';
}

// ── OFERTAS DESTACADAS ────────────────────────
async function cargarOfertasDestacadas() {
  const { data } = await db.from('productos')
    .select('*, categorias(slug)')
    .eq('activo', true)
    .not('precio_oferta', 'is', null)
    .order('precio_oferta', { ascending: true })
    .limit(4);
  if (!data?.length) return;
  document.getElementById('seccion-ofertas-dest').style.display = 'block';
  document.getElementById('grilla-ofertas-dest').innerHTML = data.map(p => {
    const descuento = Math.round((1 - p.precio_oferta / p.precio) * 100);
    return `
    <div class="prod-card" onclick="window.location='producto.html?id=${p.id}'">
      <div style="position:relative">
        ${imgOIcono(p)}
        <div class="card-badges">
          <span class="badge badge-oferta">-${descuento}%</span>
        </div>
      </div>
      <div class="prod-card-body">
        <div class="prod-card-nombre">${p.nombre}</div>
        <div style="display:flex;gap:8px;align-items:baseline">
          <div class="prod-card-precio" style="color:var(--rojo)">$${Number(p.precio_oferta).toLocaleString('es-AR')}</div>
          <div style="font-size:12px;color:#aaa;text-decoration:line-through">$${Number(p.precio).toLocaleString('es-AR')}</div>
        </div>
        <button class="prod-card-btn" onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${p.precio_oferta}})">Agregar al carrito</button>
      </div>
    </div>`;
  }).join('');
}

// ── NUEVOS INGRESOS ───────────────────────────
async function cargarNuevosDestacados() {
  const grilla = document.getElementById('grilla-nuevos-dest');
  const { data } = await db.from('productos')
    .select('*, categorias(slug)')
    .eq('activo', true)
    .order('creado_en', { ascending: false })
    .limit(4);
  if (!data?.length) { grilla.innerHTML = ''; return; }
  productosCache = [...productosCache.filter(x => !data.find(d => d.id === x.id)), ...data];
  grilla.innerHTML = data.map(p => `
    <div class="prod-card" onclick="window.location='producto.html?id=${p.id}'">
      <div style="position:relative">
        ${imgOIcono(p)}
        <div class="card-badges"><span class="badge badge-nuevo">Nuevo</span></div>
      </div>
      <div class="prod-card-body">
        <div class="prod-card-nombre">${p.nombre}</div>
        <div class="prod-card-precio">$${Number(p.precio).toLocaleString('es-AR')}</div>
        <button class="prod-card-btn" onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${p.precio_oferta || p.precio}})">Agregar al carrito</button>
      </div>
    </div>`).join('');
}

// ── MÁS VENDIDOS ──────────────────────────────
async function cargarMasVendidos() {
  const grilla = document.getElementById('grilla-vendidos-dest');
  const { data: items } = await db.from('items_pedido')
    .select('producto_id, cantidad')
    .limit(500);
  if (!items?.length) { grilla.innerHTML = ''; return; }

  const conteo = {};
  items.forEach(i => { conteo[i.producto_id] = (conteo[i.producto_id] || 0) + i.cantidad; });
  const topIds = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => id);

  if (!topIds.length) { grilla.innerHTML = ''; return; }
  const { data } = await db.from('productos')
    .select('*, categorias(slug)')
    .eq('activo', true)
    .in('id', topIds);
  if (!data?.length) { grilla.innerHTML = ''; return; }

  const ordenados = topIds.map(id => data.find(p => p.id === id)).filter(Boolean);
  productosCache = [...productosCache.filter(x => !ordenados.find(d => d.id === x.id)), ...ordenados];
  grilla.innerHTML = ordenados.map(p => `
    <div class="prod-card" onclick="window.location='producto.html?id=${p.id}'">
      <div style="position:relative">
        ${imgOIcono(p)}
      </div>
      <div class="prod-card-body">
        <div class="prod-card-nombre">${p.nombre}</div>
        <div class="prod-card-precio">$${Number(p.precio_oferta || p.precio).toLocaleString('es-AR')}</div>
        <button class="prod-card-btn" onclick="event.stopPropagation(); agregarAlCarrito({id:'${p.id}',nombre:'${p.nombre.replace(/'/g,"\\'")}',precio:${p.precio_oferta || p.precio}})">Agregar al carrito</button>
      </div>
    </div>`).join('');
}

cargarSlider();
cargarCategorias();
cargarMarcasFiltro();
cargarAniosFiltro();
cargarVistosRecientes();
mostrarBannerPersonalizado();

function observarSeccion(el, fn) {
  if (!el) { fn(); return; }
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { obs.unobserve(el); fn(); }
  }, { rootMargin: '0px 0px 300px 0px' });
  obs.observe(el);
}

observarSeccion(document.querySelector('.marcas-destacadas-section'), renderMarcasDestacadas);
observarSeccion(document.getElementById('grilla-productos')?.closest('section'), cargarProductos);
observarSeccion(document.getElementById('grilla-nuevos-dest')?.closest('section'), () => {
  cargarOfertasDestacadas();
  cargarNuevosDestacados();
});
observarSeccion(document.getElementById('grilla-vendidos-dest')?.closest('section'), cargarMasVendidos);
observarSeccion(document.getElementById('grilla-talleres')?.closest('section'), cargarTalleres);

// ── TYPING EFFECT HERO ────────────────────────
(function initTyping() {
  const el = document.getElementById('hero-subtitulo');
  if (!el) return;
  const texto = 'Repuestos, autopartes y talleres de confianza en el AMBA';
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  el.appendChild(cursor);

  const interval = setInterval(() => {
    el.insertBefore(document.createTextNode(texto[i++]), cursor);
    if (i >= texto.length) {
      clearInterval(interval);
      setTimeout(() => cursor.remove(), 800);
    }
  }, 38);
})();

async function mostrarBannerPersonalizado() {
  const sesionRaw = localStorage.getItem('pz_usuario');
  if (!sesionRaw) return;
  let sesion;
  try { sesion = JSON.parse(sesionRaw); } catch { return; }
  if (!sesion?.id) return;

  const { data: vehiculos } = await db.from('vehiculos_usuario')
    .select('*, modelos_auto!modelo_id(nombre, marcas_auto(nombre))')
    .eq('usuario_id', sesion.id)
    .limit(1);

  if (!vehiculos?.length) return;
  const v = vehiculos[0];
  const marca  = v.modelos_auto?.marcas_auto?.nombre || '';
  const modelo = v.modelos_auto?.nombre || '';
  const anio   = v.anio || '';
  const modeloId = v.modelo_id;

  const { count } = await db.from('compatibilidades')
    .select('producto_id', { count: 'exact', head: true })
    .eq('modelo_id', modeloId);

  const nombre = sesion.nombre || 'cliente';
  const cantStr = count ? `${count} producto${count !== 1 ? 's' : ''}` : 'productos';
  document.getElementById('banner-bienvenida-texto').innerHTML =
    `👋 Hola <strong>${nombre}</strong>, tenemos <strong>${cantStr}</strong> para tu <strong>${marca} ${modelo} ${anio}</strong>`;
  document.getElementById('banner-bienvenida-btn').href =
    `catalogo.html?modelo_id=${modeloId}&anio=${anio}`;
  document.getElementById('banner-bienvenida').style.display = 'block';
}

