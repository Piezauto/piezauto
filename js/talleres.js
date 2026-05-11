
function buscarDesdeHeader() {
  const q = document.getElementById('header-buscar').value.trim();
  if (q) window.location.href = 'busqueda.html?q=' + encodeURIComponent(q);
}
function toggleMenu() {
  document.getElementById('menu-mobile').classList.toggle('open');
}

let todosLosTalleres = [];
let tallerActualId   = null;
let _mapaInstance    = null;
let _talleresData    = [];
let carrito = JSON.parse(localStorage.getItem('pz_carrito') || '[]');
actualizarContadorCarrito();

function actualizarContadorCarrito() {
  const total = carrito.reduce((a, i) => a + i.cantidad, 0);
  document.getElementById('carrito-count').textContent = total;
}
function verCarrito() {
  if (!carrito.length) { mostrarNotificacion('Tu carrito está vacío.', 'error'); return; }
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  mostrarNotificacion(`${carrito.length} artículo(s) en el carrito — Total: $${total.toLocaleString('es-AR')}`, 'info');
}

// ── CARGAR TALLERES ───────────────────────────
async function cargarTalleres() {
  const { data, error } = await db
    .from('talleres')
    .select('*, resenas(puntuacion), servicios_taller(id, nombre, precio, duracion_minutos)')
    .eq('activo', true)
    .order('nombre');

  if (error || !data) {
    document.getElementById('talleres-grilla').innerHTML =
      '<p class="vacio" style="grid-column:1/-1">Error al cargar talleres.</p>';
    return;
  }

  todosLosTalleres = data;
  _talleresData    = data;
  renderTalleres(data);
}

function filtrarTalleres() {
  const texto   = document.getElementById('buscar-taller').value.toLowerCase();
  const zona    = document.getElementById('filtro-zona').value;

  let filtrado = todosLosTalleres;
  if (texto) filtrado = filtrado.filter(t =>
    t.nombre.toLowerCase().includes(texto) ||
    (t.localidad || '').toLowerCase().includes(texto) ||
    (t.descripcion || '').toLowerCase().includes(texto)
  );
  if (zona) filtrado = filtrado.filter(t => t.zona === zona);
  renderTalleres(filtrado);
}

function estaAbierto(apertura, cierre) {
  if (!apertura || !cierre) return null;
  const ahora = new Date();
  const [ha, ma] = apertura.split(':').map(Number);
  const [hc, mc] = cierre.split(':').map(Number);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const minAp    = ha * 60 + ma;
  const minCi    = hc * 60 + mc;
  if (minCi > minAp) return minAhora >= minAp && minAhora < minCi;
  return minAhora >= minAp || minAhora < minCi;
}

function renderTalleres(lista) {
  const grilla = document.getElementById('talleres-grilla');

  if (!lista.length) {
    grilla.innerHTML = '<p class="vacio" style="grid-column:1/-1;padding:60px;text-align:center">No se encontraron talleres.</p>';
    return;
  }

  grilla.innerHTML = lista.map(t => {
    const puntuaciones = (t.resenas || []).map(r => r.puntuacion).filter(Boolean);
    const prom = puntuaciones.length
      ? (puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length).toFixed(1)
      : null;
    const estrellas = prom ? '★'.repeat(Math.round(prom)) + '☆'.repeat(5 - Math.round(prom)) : '';

    const serviciosPreview = (t.servicios_taller || []).slice(0, 3)
      .map(s => `<span class="servicio-tag">${s.nombre}</span>`).join('');

    const inicial = t.nombre ? t.nombre[0].toUpperCase() : '?';

    const abierto = estaAbierto(t.horario_apertura, t.horario_cierre);
    const horarioTxt = (t.horario_apertura && t.horario_cierre)
      ? `🕐 ${t.horario_apertura.slice(0,5)} – ${t.horario_cierre.slice(0,5)}`
      : '';
    const badgeEstado = abierto === true
      ? `<span style="display:inline-block;background:#22c55e;color:#fff;font-size:10px;font-weight:700;border-radius:20px;padding:2px 9px;margin-left:8px">Abierto</span>`
      : abierto === false
        ? `<span style="display:inline-block;background:#64748b;color:#fff;font-size:10px;font-weight:700;border-radius:20px;padding:2px 9px;margin-left:8px">Cerrado</span>`
        : '';
    const badgeVerif = t.verificado
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--rojo);color:#fff;font-size:10px;font-weight:700;border-radius:20px;padding:2px 9px">✓ Verificado</span>`
      : '';

    return `
    <div class="taller-card-full" onclick="verTaller(${t.id})">
      <div class="taller-card-header">
        <div class="taller-avatar">${inicial}</div>
        <div style="flex:1">
          <div class="taller-card-nombre">${t.nombre}</div>
          <div class="taller-card-localidad">${t.localidad || ''}</div>
          ${badgeVerif ? `<div style="margin-top:6px">${badgeVerif}</div>` : ''}
        </div>
      </div>
      <div class="taller-card-body">
        ${prom ? `<div class="taller-stars"><span class="stars-text">${estrellas}</span><span class="stars-num">${prom} (${puntuaciones.length})</span></div>` : ''}
        ${t.descripcion ? `<div class="taller-descripcion">${t.descripcion}</div>` : ''}
        ${horarioTxt ? `<div class="taller-horario">${horarioTxt}${badgeEstado}</div>` : ''}
        ${serviciosPreview ? `<div class="taller-servicios-preview">${serviciosPreview}</div>` : ''}
      </div>
      <div class="taller-card-acciones">
        <button class="btn-ver-taller" onclick="event.stopPropagation();verTaller(${t.id})">Ver perfil</button>
        <button class="btn-reservar"   onclick="event.stopPropagation();verTaller(${t.id});setTimeout(()=>document.getElementById('turno-nombre').focus(),300)">Reservar turno</button>
      </div>
    </div>`;
  }).join('');
}

// ── MODAL TALLER ──────────────────────────────
async function verTaller(id) {
  tallerActualId = id;
  const t = todosLosTalleres.find(x => x.id === id);
  if (!t) return;

  document.getElementById('modal-avatar').textContent   = t.nombre[0].toUpperCase();
  document.getElementById('modal-nombre').textContent   = t.nombre;
  document.getElementById('modal-localidad').textContent = t.localidad || '';

  const abierto    = estaAbierto(t.horario_apertura, t.horario_cierre);
  const horarioTxt = (t.horario_apertura && t.horario_cierre)
    ? `${t.horario_apertura.slice(0,5)} – ${t.horario_cierre.slice(0,5)}` : null;
  const estadoTxt  = abierto === true ? '<span style="color:#22c55e;font-weight:700">● Abierto ahora</span>'
                   : abierto === false ? '<span style="color:#94a3b8;font-weight:700">● Cerrado</span>' : '';

  let infoHtml = '';
  if (t.direccion) infoHtml += `<div class="modal-info-row">📍 ${t.direccion}, ${t.localidad || ''}</div>`;
  if (t.telefono)  infoHtml += `<div class="modal-info-row">📞 <a href="tel:${t.telefono}" style="color:var(--rojo)">${t.telefono}</a></div>`;
  if (horarioTxt)  infoHtml += `<div class="modal-info-row">🕐 ${horarioTxt} &nbsp;${estadoTxt}</div>`;
  if (t.verificado) infoHtml += `<div class="modal-info-row" style="color:var(--rojo);font-weight:700">✓ Taller verificado por Piezauto</div>`;
  document.getElementById('modal-info').innerHTML = infoHtml || '<p style="color:#aaa;font-size:13px">Sin información adicional.</p>';

  const servs = t.servicios_taller || [];
  const modalServWrap = document.getElementById('modal-servicios-wrap');
  if (servs.length) {
    document.getElementById('modal-servicios').innerHTML = servs.map(s => `
      <div class="modal-servicio-card">
        <div class="modal-servicio-nombre">${s.nombre}</div>
        ${s.precio ? `<div class="modal-servicio-precio">$${Number(s.precio).toLocaleString('es-AR')}</div>` : ''}
        ${s.duracion_minutos ? `<div class="modal-servicio-duracion">⏱ ${s.duracion_minutos} min</div>` : ''}
      </div>`).join('');

    const sel = document.getElementById('turno-servicio');
    sel.innerHTML = '<option value="">Seleccioná un servicio (opcional)</option>' +
      servs.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    modalServWrap.style.display = '';
  } else {
    modalServWrap.style.display = 'none';
  }

  const { data: resenas } = await db.from('resenas').select('*').eq('taller_id', id).order('creado_en', { ascending: false }).limit(5);
  const modalResWrap = document.getElementById('modal-resenas-wrap');
  if (resenas && resenas.length) {
    document.getElementById('modal-resenas').innerHTML = resenas.map(r => `
      <div class="resena-item">
        <div class="resena-autor">${r.nombre || 'Anónimo'}</div>
        <div class="resena-stars">${'★'.repeat(r.puntuacion || 0)}${'☆'.repeat(5 - (r.puntuacion || 0))}</div>
        ${r.comentario ? `<div class="resena-texto">${r.comentario}</div>` : ''}
      </div>`).join('');
    modalResWrap.style.display = '';
  } else {
    modalResWrap.style.display = 'none';
  }

  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('turno-fecha').value = hoy;
  document.getElementById('turno-msg').textContent = '';

  document.getElementById('modal-taller').classList.add('activo');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modal-taller').classList.remove('activo');
  document.body.style.overflow = '';
}

document.getElementById('modal-taller').addEventListener('click', function(e) {
  if (e.target === this) cerrarModal();
});

// ── RESERVAR TURNO ────────────────────────────
async function reservarTurno() {
  const nombre  = document.getElementById('turno-nombre').value.trim();
  const tel     = document.getElementById('turno-tel').value.trim();
  const fecha   = document.getElementById('turno-fecha').value;
  const hora    = document.getElementById('turno-hora').value;
  const msg     = document.getElementById('turno-msg');

  if (!nombre || !fecha || !hora) {
    msg.style.color = 'var(--rojo)';
    msg.textContent = 'Completá nombre, fecha y hora.';
    return;
  }

  const servId = document.getElementById('turno-servicio').value || null;
  const desc   = document.getElementById('turno-desc').value.trim() || null;

  const { error } = await db.from('turnos').insert({
    taller_id:        tallerActualId,
    nombre_cliente:   nombre,
    telefono_cliente: tel || null,
    fecha,
    hora,
    servicio_id:      servId,
    descripcion:      desc,
    estado:           'pendiente',
  });

  if (error) {
    msg.style.color = 'var(--rojo)';
    msg.textContent = 'Error al reservar. Intentá de nuevo.';
    return;
  }

  msg.style.color = '#22c55e';
  msg.textContent = '✓ Turno reservado. El taller se va a comunicar con vos.';
  ['turno-nombre','turno-tel','turno-hora','turno-desc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('turno-servicio').value = '';
}

// ── MAPA ─────────────────────────────────────
let _marcadorUsuario = null;

function cambiarVistaTalleres(vista) {
  const lista   = document.getElementById('talleres-grilla');
  const mapa    = document.getElementById('mapa-talleres');
  const btnLista = document.getElementById('btn-tl-lista');
  const btnMapa  = document.getElementById('btn-tl-mapa');

  if (vista === 'mapa') {
    lista.style.display  = 'none';
    mapa.style.display   = 'block';
    btnLista.classList.remove('activo');
    btnMapa.classList.add('activo');
    initMapa();
  } else {
    lista.style.display  = '';
    mapa.style.display   = 'none';
    btnLista.classList.add('activo');
    btnMapa.classList.remove('activo');
  }
}

function initMapa() {
  if (_mapaInstance) {
    _mapaInstance.invalidateSize();
    return;
  }

  _mapaInstance = L.map('mapa-talleres').setView([-34.6037, -58.3816], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(_mapaInstance);

  // Botón "Mi ubicación"
  const btnGeo = L.control({ position: 'topleft' });
  btnGeo.onAdd = function() {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.innerHTML = `<a href="#" title="Mostrar mi ubicación" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:18px;text-decoration:none;background:#fff;border-radius:4px" onclick="mostrarUbicacion(event)">📍</a>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  btnGeo.addTo(_mapaInstance);

  agregarMarcadores();
}

function iconoColor(color) {
  return L.divIcon({
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><div style="transform:rotate(45deg);text-align:center;line-height:24px;font-size:13px">🔧</div></div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -34],
  });
}

function agregarMarcadores() {
  if (!_mapaInstance || !_talleresData.length) return;

  _talleresData.forEach(t => {
    if (!t.latitud && !t.longitud) return; // solo mostrar talleres con coords reales

    const lat = t.latitud  || (-34.6037 + (Math.random() - 0.5) * 0.2);
    const lng = t.longitud || (-58.3816 + (Math.random() - 0.5) * 0.3);

    const abierto = estaAbierto(t.horario_apertura, t.horario_cierre);
    const color = abierto === true ? '#22c55e' : abierto === false ? '#64748b' : '#E63946';

    const marker = L.marker([lat, lng], { icon: iconoColor(color) }).addTo(_mapaInstance);

    // Click en marker → abrir modal directamente
    marker.on('click', () => verTaller(t.id));

    marker.bindTooltip(`<strong>${t.nombre}</strong>${abierto === true ? ' <span style="color:#22c55e">● Abierto</span>' : abierto === false ? ' <span style="color:#94a3b8">● Cerrado</span>' : ''}`, {
      permanent: false, direction: 'top', offset: [0, -32]
    });
  });

  // Si ningún taller tiene coordenadas, usar posiciones aleatorias con marcadores
  const sinCoords = _talleresData.filter(t => !t.latitud && !t.longitud);
  if (sinCoords.length && _talleresData.every(t => !t.latitud && !t.longitud)) {
    _talleresData.forEach(t => {
      const lat = -34.6037 + (Math.random() - 0.5) * 0.25;
      const lng = -58.3816 + (Math.random() - 0.5) * 0.35;
      const abierto = estaAbierto(t.horario_apertura, t.horario_cierre);
      const color = abierto === true ? '#22c55e' : abierto === false ? '#64748b' : '#E63946';
      L.marker([lat, lng], { icon: iconoColor(color) })
        .addTo(_mapaInstance)
        .on('click', () => verTaller(t.id))
        .bindTooltip(`<strong>${t.nombre}</strong>`, { permanent: false, direction: 'top', offset: [0, -32] });
    });
  }
}

function mostrarUbicacion(e) {
  e.preventDefault();
  if (!navigator.geolocation) { mostrarNotificacion('Tu navegador no soporta geolocalización.', 'error'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    if (_marcadorUsuario) _mapaInstance.removeLayer(_marcadorUsuario);
    _marcadorUsuario = L.circleMarker([lat, lng], {
      radius: 10, fillColor: '#1a56c4', color: '#fff',
      weight: 2, fillOpacity: 0.9
    }).addTo(_mapaInstance).bindPopup('📍 Tu ubicación').openPopup();
    _mapaInstance.setView([lat, lng], 13);

    // Ordenar talleres por distancia
    const conDist = _talleresData
      .filter(t => t.latitud && t.longitud)
      .map(t => ({ ...t, dist: Math.hypot(t.latitud - lat, t.longitud - lng) }))
      .sort((a, b) => a.dist - b.dist);
    if (conDist.length) renderTalleres(conDist);
  }, () => { mostrarNotificacion('No pudimos obtener tu ubicación. Verificá que diste permiso al navegador.', 'error'); });
}

cargarTalleres();
