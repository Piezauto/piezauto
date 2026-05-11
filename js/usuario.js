
function buscarDesdeHeader() {
  const q = document.getElementById('header-buscar').value.trim();
  if (q) window.location.href = 'busqueda.html?q=' + encodeURIComponent(q);
}
function toggleMenu() {
  document.getElementById('menu-mobile').classList.toggle('open');
}

// ── CARRITO COUNT ─────────────────────────────
const carrito = JSON.parse(localStorage.getItem('pz_carrito') || '[]');
document.getElementById('carrito-count').textContent = carrito.reduce((a,i) => a + i.cantidad, 0);

// ── SESIÓN ────────────────────────────────────
let usuarioActual = JSON.parse(localStorage.getItem('pz_usuario') || 'null');

function mostrarPantalla() {
  if (usuarioActual) {
    document.getElementById('pantalla-auth').style.display   = 'none';
    document.getElementById('pantalla-perfil').style.display = 'block';
    cargarPerfil();
  } else {
    document.getElementById('pantalla-auth').style.display   = 'flex';
    document.getElementById('pantalla-perfil').style.display = 'none';
  }
}

// ── AUTH TABS ─────────────────────────────────
function cambiarTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((el, i) => {
    el.classList.toggle('activo', (tab === 'login' && i === 0) || (tab === 'registro' && i === 1));
  });
  document.getElementById('form-login').classList.toggle('activo', tab === 'login');
  document.getElementById('form-registro').classList.toggle('activo', tab === 'registro');
}

// ── PERFIL TABS ───────────────────────────────
function verTab(nombre) {
  document.querySelectorAll('.tab-nav-item').forEach(el => el.classList.remove('activo'));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('activo'));
  document.getElementById('tab-' + nombre).classList.add('activo');
  event.currentTarget.classList.add('activo');

  if (nombre === 'mis-pedidos') cargarPedidosUsuario();
  if (nombre === 'mis-vehiculos') { cargarMarcasVehiculo(); cargarVehiculosUsuario(); }
  if (nombre === 'notificaciones') cargarNotificaciones();
  if (nombre === 'referidos') cargarReferidos();
  if (nombre === 'beneficios') cargarBeneficios();
}

// ── SISTEMA DE REFERIDOS ─────────────────────
async function cargarReferidos() {
  if (!usuarioActual?.id) return;
  const codigo = usuarioActual.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  document.getElementById('ref-codigo').textContent = codigo;

  const { data: referidos } = await db.from('referidos')
    .select('*, usuarios!referido_id(nombre, apellido, creado_en)')
    .eq('referente_id', usuarioActual.id)
    .order('creado_en', { ascending: false });

  const lista = referidos || [];
  document.getElementById('ref-cant').textContent = lista.length;

  const creditoTotal = lista.reduce((sum, r) => sum + (parseFloat(r.credito_otorgado) || 0), 0);
  document.getElementById('ref-credito').textContent = creditoTotal
    ? '$ ' + creditoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    : '$ 0,00';

  if (!lista.length) {
    document.getElementById('ref-lista').innerHTML =
      '<p style="color:#aaa;font-style:italic">Todavía no referiste a nadie. ¡Compartí tu código!</p>';
    return;
  }

  document.getElementById('ref-lista').innerHTML = lista.map(r => {
    const nombre = r.usuarios ? `${r.usuarios.nombre || ''} ${r.usuarios.apellido || ''}`.trim() : 'Usuario';
    const fecha  = r.creado_en ? new Date(r.creado_en).toLocaleDateString('es-AR') : '—';
    const credito = parseFloat(r.credito_otorgado) || 0;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px">
      <span>${nombre}</span>
      <span style="color:#888">${fecha}</span>
      ${credito ? `<span style="color:#1a7a3f;font-weight:700">+$ ${credito.toLocaleString('es-AR')}</span>` : '<span style="color:#aaa">pendiente</span>'}
    </div>`;
  }).join('');
}

function copiarCodigoReferido() {
  const codigo = document.getElementById('ref-codigo').textContent;
  navigator.clipboard.writeText(codigo).then(() => {
    const el = document.getElementById('ref-copiado');
    el.textContent = '✅ ¡Código copiado!';
    setTimeout(() => { el.textContent = ''; }, 2000);
  });
}

// ── INICIAR SESIÓN ────────────────────────────
async function iniciarSesion() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msg      = document.getElementById('login-msg');
  if (!email || !password) { msg.textContent = '⚠️ Completá todos los campos.'; msg.style.color = '#c00'; return; }

  msg.textContent = 'Verificando...'; msg.style.color = '#888';

  const { data, error } = await db.from('usuarios')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) { msg.textContent = '❌ Email o contraseña incorrectos.'; msg.style.color = '#c00'; return; }
  // Comparación simple de contraseña (en producción usar bcrypt/Supabase Auth)
  if (data.password_hash !== password) { msg.textContent = '❌ Email o contraseña incorrectos.'; msg.style.color = '#c00'; return; }

  usuarioActual = data;
  localStorage.setItem('pz_usuario', JSON.stringify(data));
  msg.textContent = '✅ ¡Bienvenido!'; msg.style.color = '#1a7a3f';
  setTimeout(mostrarPantalla, 800);
}

// ── REGISTRARSE ───────────────────────────────
async function registrarse() {
  const nombre   = document.getElementById('reg-nombre').value.trim();
  const apellido = document.getElementById('reg-apellido').value.trim();
  const email    = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const msg      = document.getElementById('reg-msg');

  if (!nombre || !apellido || !email || !password) {
    msg.textContent = '⚠️ Completá todos los campos.'; msg.style.color = '#c00'; return;
  }
  if (password.length < 6) { msg.textContent = '⚠️ La contraseña debe tener al menos 6 caracteres.'; msg.style.color = '#c00'; return; }
  if (password !== password2) { msg.textContent = '⚠️ Las contraseñas no coinciden.'; msg.style.color = '#c00'; return; }

  msg.textContent = 'Creando cuenta...'; msg.style.color = '#888';

  // Verificar que no exista
  const { data: existe } = await db.from('usuarios').select('id').eq('email', email).single();
  if (existe) { msg.textContent = '❌ Ya existe una cuenta con ese email.'; msg.style.color = '#c00'; return; }

  const { data, error } = await db.from('usuarios').insert([{
    nombre, apellido, email,
    password_hash: password,
  }]).select().single();

  if (error) { msg.textContent = '❌ Error: ' + error.message; msg.style.color = '#c00'; return; }

  usuarioActual = data;
  localStorage.setItem('pz_usuario', JSON.stringify(data));
  msg.textContent = '✅ Cuenta creada. ¡Bienvenido!'; msg.style.color = '#1a7a3f';
  setTimeout(mostrarPantalla, 800);
}

function cerrarSesionUsuario() {
  usuarioActual = null;
  localStorage.removeItem('pz_usuario');
  mostrarPantalla();
}

// ── CARGAR PERFIL ─────────────────────────────
function cargarPerfil() {
  const u = usuarioActual;
  const iniciales = ((u.nombre?.[0] || '') + (u.apellido?.[0] || '')).toUpperCase() || '?';
  document.getElementById('perfil-iniciales').textContent   = iniciales;
  document.getElementById('perfil-nombre-titulo').textContent = `${u.nombre} ${u.apellido}`;
  document.getElementById('perfil-email-titulo').textContent  = u.email;
  document.getElementById('datos-nombre').value    = u.nombre || '';
  document.getElementById('datos-apellido').value  = u.apellido || '';
  document.getElementById('datos-email').value     = u.email || '';
  document.getElementById('datos-telefono').value  = u.telefono || '';
}

async function guardarDatos() {
  const msg = document.getElementById('datos-msg');
  const nombre   = document.getElementById('datos-nombre').value.trim();
  const apellido = document.getElementById('datos-apellido').value.trim();
  const telefono = document.getElementById('datos-telefono').value.trim();

  msg.textContent = 'Guardando...'; msg.style.color = '#888';
  const { error } = await db.from('usuarios').update({ nombre, apellido, telefono }).eq('id', usuarioActual.id);
  if (error) { msg.textContent = '❌ ' + error.message; msg.style.color = '#c00'; }
  else {
    usuarioActual = { ...usuarioActual, nombre, apellido, telefono };
    localStorage.setItem('pz_usuario', JSON.stringify(usuarioActual));
    msg.textContent = '✅ Datos actualizados.'; msg.style.color = '#1a7a3f';
    cargarPerfil();
  }
}

// ── PEDIDOS DEL USUARIO ───────────────────────
async function cargarPedidosUsuario() {
  const { data } = await db.from('pedidos')
    .select('*')
    .eq('email_cliente', usuarioActual.email)
    .order('creado_en', { ascending: false });

  const cont = document.getElementById('lista-pedidos');
  if (!data || !data.length) {
    cont.innerHTML = '<p style="color:#aaa;font-size:14px;text-align:center;padding:20px">No tenés pedidos realizados aún.</p>';
    return;
  }

  const labels = { nuevo:'Nuevo', confirmado:'Confirmado', preparando:'Preparando', enviado:'Enviado', entregado:'Entregado', cancelado:'Cancelado' };

  // Renderizar pedidos con acordeón para ver productos
  cont.innerHTML = data.map(p => {
    const numeroPedido = p.id.split('-')[0].toUpperCase();
    const fecha = new Date(p.creado_en).toLocaleDateString('es-AR', { day:'numeric', month:'long', year:'numeric' });
    return `
      <div style="border:1px solid #f0f0f0;border-radius:10px;margin-bottom:12px;overflow:hidden">
        <div class="pedido-row" style="padding:14px 16px;cursor:pointer;background:#fff"
             onclick="toggleDetallePedido('${p.id}')">
          <div>
            <div style="font-weight:700;font-size:14px">Pedido #${numeroPedido}</div>
            <div style="font-size:12px;color:#aaa;margin-top:2px">${fecha}</div>
            ${p.cupon_codigo ? `<div style="font-size:11px;color:#1a7a3f;margin-top:2px">Cupón: ${p.cupon_codigo}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="font-size:16px;font-weight:800;color:var(--rojo)">$${Number(p.total).toLocaleString('es-AR')}</div>
            <span class="badge-estado badge-${p.estado || 'nuevo'}">${labels[p.estado] || 'Nuevo'}</span>
            <span style="font-size:18px;color:#aaa" id="arrow-${p.id}">▾</span>
          </div>
        </div>
        <div id="detalle-${p.id}" style="display:none;border-top:1px solid #f5f5f5;padding:14px 16px;background:#fafafa">
          <div class="loader" style="font-size:13px">Cargando productos...</div>
        </div>
        <div style="border-top:1px solid #f5f5f5;padding:10px 16px;background:#fff;display:flex;gap:10px;justify-content:flex-end">
          <button onclick="volverAComprar('${p.id}')"
            style="font-size:12px;padding:6px 14px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;font-weight:600;color:#333">
            🔄 Volver a comprar
          </button>
          <a href="seguimiento.html?id=${p.id}&email=${encodeURIComponent(p.email_cliente)}"
             class="btn btn-rojo" style="font-size:12px;padding:6px 14px">
            📦 Ver seguimiento
          </a>
        </div>
      </div>
    `;
  }).join('');
}

const _pedidosAbiertos = {};

async function toggleDetallePedido(pedidoId) {
  const wrap  = document.getElementById('detalle-' + pedidoId);
  const arrow = document.getElementById('arrow-' + pedidoId);
  if (!wrap) return;

  const estaAbierto = wrap.style.display !== 'none';
  wrap.style.display = estaAbierto ? 'none' : 'block';
  if (arrow) arrow.textContent = estaAbierto ? '▾' : '▴';

  if (estaAbierto || _pedidosAbiertos[pedidoId]) return;
  _pedidosAbiertos[pedidoId] = true;

  const { data: items } = await db.from('items_pedido')
    .select('*, productos(nombre, codigo_pieza, imagenes)')
    .eq('pedido_id', pedidoId);

  if (!items || !items.length) {
    wrap.innerHTML = '<p style="color:#aaa;font-size:13px">Sin detalle de productos.</p>';
    return;
  }

  wrap.innerHTML = items.map(i => {
    const nombre = i.productos?.nombre || '—';
    const img    = i.productos?.imagenes?.[0];
    const codigo = i.productos?.codigo_pieza;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f0f0f0">
        ${img ? `<img src="${img}" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#f8f8f8;flex-shrink:0">` : ''}
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${nombre}</div>
          ${codigo ? `<div style="font-size:11px;color:#aaa">Cód: ${codigo}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:#888">x${i.cantidad}</div>
          <div style="font-size:13px;font-weight:700;color:var(--rojo)">$${Number(i.subtotal || i.cantidad * i.precio_unitario).toLocaleString('es-AR')}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function volverAComprar(pedidoId) {
  const { data: items } = await db.from('items_pedido')
    .select('producto_id, cantidad, precio_unitario, productos(nombre, imagenes)')
    .eq('pedido_id', pedidoId);
  if (!items?.length) { mostrarNotificacion('No se encontraron productos en este pedido.', 'error'); return; }

  let carrito = JSON.parse(localStorage.getItem('pz_carrito') || '[]');
  items.forEach(i => {
    const existe = carrito.find(c => c.id === i.producto_id);
    if (existe) { existe.cantidad += i.cantidad; }
    else { carrito.push({ id: i.producto_id, nombre: i.productos?.nombre || 'Producto', precio: i.precio_unitario, cantidad: i.cantidad }); }
  });
  localStorage.setItem('pz_carrito', JSON.stringify(carrito));
  mostrarConfirm(`${items.length} producto(s) agregados al carrito. ¿Ir al carrito ahora?`, function() {
    window.location.href = 'checkout.html';
  });
}

// ── VEHÍCULOS DEL USUARIO ─────────────────────
async function cargarMarcasVehiculo() {
  const { data } = await db.from('marcas_auto').select('id, nombre').order('nombre');
  const sel = document.getElementById('veh-marca');
  if (!sel || !data) return;
  sel.innerHTML = '<option value="">Seleccioná una marca</option>' +
    data.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
}

async function cargarModelosVehiculo() {
  const marcaId = document.getElementById('veh-marca').value;
  const selModelo = document.getElementById('veh-modelo');
  const selAnio = document.getElementById('veh-anio');

  selModelo.innerHTML = '<option value="">Cargando...</option>';
  selModelo.disabled = true;
  selAnio.innerHTML = '<option value="">Primero elegí un modelo</option>';
  selAnio.disabled = true;

  if (!marcaId) return;

  const { data } = await db.from('modelos_auto').select('id, nombre').eq('marca_id', marcaId).order('nombre');
  selModelo.innerHTML = '<option value="">Seleccioná un modelo</option>' +
    (data || []).map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
  selModelo.disabled = false;
}

function habilitarAnioVehiculo() {
  const selAnio = document.getElementById('veh-anio');
  selAnio.disabled = false;
  const anioActual = new Date().getFullYear();
  let opts = '<option value="">Seleccioná el año</option>';
  for (let y = anioActual; y >= 1990; y--) {
    opts += `<option value="${y}">${y}</option>`;
  }
  selAnio.innerHTML = opts;
}

async function guardarVehiculo() {
  const modeloId = document.getElementById('veh-modelo').value;
  const anio = document.getElementById('veh-anio').value;
  const msg = document.getElementById('vehiculo-msg');

  if (!modeloId || !anio) {
    msg.style.color = '#E63946';
    msg.textContent = '⚠️ Completá todos los campos.';
    return;
  }

  const { error } = await db.from('vehiculos_usuario').insert({
    usuario_id: usuarioActual.id,
    modelo_id: modeloId,
    anio: parseInt(anio),
  });

  if (error) {
    msg.style.color = '#E63946';
    msg.textContent = '❌ Error al guardar. Intentá de nuevo.';
    return;
  }

  msg.style.color = '#22c55e';
  msg.textContent = '✅ Vehículo agregado correctamente.';
  document.getElementById('veh-marca').value = '';
  document.getElementById('veh-modelo').innerHTML = '<option value="">Primero elegí una marca</option>';
  document.getElementById('veh-modelo').disabled = true;
  document.getElementById('veh-anio').innerHTML = '<option value="">Primero elegí un modelo</option>';
  document.getElementById('veh-anio').disabled = true;

  await cargarVehiculosUsuario();
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

async function cargarVehiculosUsuario() {
  const { data } = await db.from('vehiculos_usuario')
    .select('id, anio, modelos_auto!modelo_id(id, nombre, marcas_auto(nombre))')
    .eq('usuario_id', usuarioActual.id);

  const cont = document.getElementById('lista-vehiculos');
  if (!data || !data.length) {
    cont.innerHTML = '<p style="color:#888;font-size:14px">No tenés vehículos registrados todavía.</p>';
    return;
  }
  const principalId = localStorage.getItem('pz_vehiculo_principal');
  cont.innerHTML = data.map(v => {
    const marca = v.modelos_auto?.marcas_auto?.nombre || 'Marca';
    const modelo = v.modelos_auto?.nombre || 'Modelo';
    const anio = v.anio;
    const modeloId = v.modelos_auto?.id;
    const esPrincipal = principalId === v.id;
    return `
    <div class="vehiculo-card" id="vcard-${v.id}" style="${esPrincipal ? 'border-color:var(--rojo)' : ''}">
      <div class="vehiculo-icon">🚗</div>
      <div class="vehiculo-info">
        <div class="vehiculo-nombre">${marca} ${modelo}</div>
        <div class="vehiculo-anio">${anio}${esPrincipal ? ' <span style="font-size:10px;background:var(--rojo);color:#fff;border-radius:4px;padding:1px 6px;font-weight:700">Principal</span>' : ''}</div>
      </div>
      <div class="vehiculo-acciones">
        ${!esPrincipal ? `<button onclick="marcarPrincipal('${v.id}')" style="font-size:11px;padding:4px 10px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;font-weight:600">⭐ Principal</button>` : ''}
        <a href="catalogo.html?modelo_id=${modeloId}&marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}&anio=${anio}" class="btn-buscar-repuestos">
          🔍 Buscar repuestos
        </a>
        <button onclick="eliminarVehiculo('${v.id}')" class="btn-eliminar-vehiculo">✕</button>
      </div>
    </div>`;
  }).join('');
}

function marcarPrincipal(id) {
  localStorage.setItem('pz_vehiculo_principal', id);
  cargarVehiculosUsuario();
}

async function eliminarVehiculo(id) {
  mostrarConfirm('¿Eliminás este vehículo?', async function() {
    await db.from('vehiculos_usuario').delete().eq('id', id);
    if (localStorage.getItem('pz_vehiculo_principal') === id) localStorage.removeItem('pz_vehiculo_principal');
    await cargarVehiculosUsuario();
  });
}

// ── NOTIFICACIONES ────────────────────────────
const NOTIF_ICONOS = { pedido: '📦', producto: '🔧', oferta: '🏷️', sistema: '🔔' };

async function cargarNotificaciones() {
  const usuario = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
  if (!usuario) return;

  const { data } = await db
    .from('notificaciones_usuario')
    .select('*')
    .eq('usuario_id', usuario.id)
    .order('creado_en', { ascending: false })
    .limit(50);

  renderNotificaciones(data || []);

  const noLeidas = (data || []).filter(n => !n.leido).length;
  const badge = document.getElementById('notif-tab-badge');
  if (badge) {
    badge.textContent = noLeidas > 9 ? '9+' : noLeidas;
    badge.style.display = noLeidas > 0 ? 'inline-flex' : 'none';
  }
}

function renderNotificaciones(items) {
  const lista = document.getElementById('notificaciones-lista');
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = '<div class="notif-vacia"><div class="notif-vacia-icon">🔔</div><div>No tenés notificaciones por el momento.</div></div>';
    return;
  }

  lista.innerHTML = items.map(n => {
    const fecha = new Date(n.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const icono = NOTIF_ICONOS[n.tipo] || '🔔';
    const claseLeida = n.leido ? '' : 'no-leida';
    const linkAttr = n.link ? `onclick="marcarLeida('${n.id}'); window.location.href='${n.link}'"` : `onclick="marcarLeida('${n.id}')"`;
    return `
    <div class="notif-item ${claseLeida}" ${linkAttr} id="notif-${n.id}">
      <div class="notif-icono">${icono}</div>
      <div class="notif-body">
        <div class="notif-titulo">${n.titulo}</div>
        <div class="notif-mensaje">${n.mensaje}</div>
        <div class="notif-meta">
          <span class="notif-fecha">${fecha}</span>
          <span class="notif-tipo ${n.tipo}">${n.tipo}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function marcarLeida(id) {
  const item = document.getElementById('notif-' + id);
  if (item) item.classList.remove('no-leida');
  await db.from('notificaciones_usuario').update({ leido: true }).eq('id', id);
}

async function marcarTodasLeidas() {
  const usuario = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
  if (!usuario) return;
  await db.from('notificaciones_usuario').update({ leido: true }).eq('usuario_id', usuario.id).eq('leido', false);
  document.querySelectorAll('.notif-item.no-leida').forEach(el => el.classList.remove('no-leida'));
  const badge = document.getElementById('notif-tab-badge');
  if (badge) badge.style.display = 'none';
}

// ── SISTEMA DE FIDELIZACIÓN ───────────────────
const NIVELES_CONFIG = {
  bronce: { label: 'Bronce', faltan: 6,  siguiente: 'Plata' },
  plata:  { label: 'Plata',  faltan: 16, siguiente: 'Oro'   },
  oro:    { label: 'Oro',    faltan: 0,  siguiente: null    },
};
const BENEFICIOS_DEF = [
  { nivel: 'bronce', icono: '🚚', nombre: 'Envío gratis',           desc: 'En compras mayores a $50.000', activo: n => !!n },
  { nivel: 'plata',  icono: '💰', nombre: '5% descuento adicional', desc: 'Se aplica automáticamente en el checkout', activo: n => n === 'plata' || n === 'oro' },
  { nivel: 'oro',    icono: '✨', nombre: '10% descuento',          desc: 'Reemplaza el 5% de Plata — el mejor nivel', activo: n => n === 'oro' },
  { nivel: 'oro',    icono: '🌟', nombre: 'Atención prioritaria',   desc: 'Canal de soporte exclusivo para clientes Oro', activo: n => n === 'oro' },
];

async function cargarBeneficios() {
  if (!usuarioActual?.id) return;

  // Mostrar puntos_acumulados de la tabla usuarios
  const { data: usuDatos } = await db.from('usuarios')
    .select('puntos_acumulados').eq('id', usuarioActual.id).single();
  const puntosAcum = Number(usuDatos?.puntos_acumulados || 0);
  const puntosCard = document.getElementById('puntos-card');
  if (puntosCard) {
    puntosCard.style.display = 'block';
    document.getElementById('puntos-cantidad').textContent = puntosAcum;
    document.getElementById('puntos-pesos').textContent    = '$' + (Math.floor(puntosAcum / 100) * 500).toLocaleString('es-AR');
  }

  let { data: nivel } = await db.from('niveles_usuario')
    .select('*').eq('usuario_id', usuarioActual.id).single();

  if (!nivel) {
    const { count } = await db.from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('email_cliente', usuarioActual.email)
      .in('estado', ['entregado', 'confirmado', 'enviado', 'preparando']);
    const compras = count || 0;
    const nivelCalc = compras >= 16 ? 'oro' : compras >= 6 ? 'plata' : 'bronce';
    const { data: nuevo } = await db.from('niveles_usuario').insert({
      usuario_id: usuarioActual.id, nivel: nivelCalc,
      compras_totales: compras, puntos_totales: compras * 10,
    }).select().single();
    nivel = nuevo || { nivel: nivelCalc, compras_totales: compras, puntos_totales: compras * 10 };
  }

  renderNivelCard(nivel);
  renderBeneficiosLista(nivel.nivel);

  const { data: historial } = await db.from('puntos_historial')
    .select('*').eq('usuario_id', usuarioActual.id)
    .order('creado_en', { ascending: false }).limit(10);
  renderHistorialPuntos(historial || []);
}

function renderNivelCard(nivel) {
  const cfg = NIVELES_CONFIG[nivel.nivel] || NIVELES_CONFIG.bronce;
  const compras = nivel.compras_totales || 0;
  const pct = cfg.siguiente ? Math.min(100, Math.round((compras / cfg.faltan) * 100)) : 100;
  const faltanTexto = cfg.siguiente
    ? `${cfg.faltan - compras} compra${cfg.faltan - compras !== 1 ? 's' : ''} para nivel ${cfg.siguiente}`
    : '¡Nivel máximo alcanzado! 🎉';
  const emojis = { bronce: '🥉', plata: '🥈', oro: '🥇' };
  document.getElementById('beneficios-nivel-card').innerHTML = `
    <div class="nivel-card card-section" style="margin-bottom:24px">
      <div class="nivel-badge ${nivel.nivel}">${emojis[nivel.nivel] || ''} ${cfg.label}</div>
      <div class="nivel-titulo">Hola, ${usuarioActual.nombre || 'cliente'} — Nivel ${cfg.label}</div>
      <div class="nivel-subtitulo">${compras} compra${compras !== 1 ? 's' : ''} realizadas · ${nivel.puntos_totales || 0} puntos</div>
      <div class="nivel-progreso-track">
        <div class="nivel-progreso-fill ${nivel.nivel}" style="width:${pct}%"></div>
      </div>
      <div class="nivel-progreso-txt">${faltanTexto}</div>
    </div>`;
}

function renderBeneficiosLista(nivelActual) {
  document.getElementById('beneficios-lista').innerHTML = BENEFICIOS_DEF.map(b => {
    const activo = b.activo(nivelActual);
    const reqLabel = `<span style="font-size:11px;color:#aaa">(requiere nivel ${b.nivel.charAt(0).toUpperCase()+b.nivel.slice(1)})</span>`;
    return `
      <div class="beneficio-row ${activo ? 'activo' : 'inactivo'}">
        <div class="ben-icono" aria-hidden="true">${b.icono}</div>
        <div class="ben-info">
          <div class="ben-nombre">${b.nombre} ${activo ? '✓' : reqLabel}</div>
          <div class="ben-desc">${b.desc}</div>
        </div>
      </div>`;
  }).join('');
}

function renderHistorialPuntos(items) {
  const cont = document.getElementById('beneficios-historial');
  if (!items.length) {
    cont.innerHTML = '<p style="color:#aaa;font-size:14px;text-align:center;padding:20px">Todavía no hay puntos en tu historial.</p>';
    return;
  }
  cont.innerHTML = items.map(h => {
    const fecha = new Date(h.creado_en).toLocaleDateString('es-AR');
    const signo = h.tipo === 'ganado' ? '+' : '-';
    return `
      <div class="historial-item">
        <span>${h.descripcion || (h.tipo === 'ganado' ? 'Puntos ganados' : 'Puntos canjeados')}</span>
        <span style="color:#aaa;font-size:12px">${fecha}</span>
        <span class="historial-puntos-val ${h.tipo}">${signo}${h.puntos} pts</span>
      </div>`;
  }).join('');
}

// ── INIT ──────────────────────────────────────
mostrarPantalla();
if (usuarioActual) cargarNotificaciones();

// Enter en login
document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') iniciarSesion();
});

