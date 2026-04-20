
function buscarDesdeHeader() {
  const q = document.getElementById('header-buscar').value.trim();
  if (q) window.location.href = 'busqueda.html?q=' + encodeURIComponent(q);
}
function toggleMenu() {
  document.getElementById('menu-mobile').classList.toggle('open');
}

// ── CONFIGURACIÓN MERCADOPAGO ─────────────────
// Seteá la URL de tu proxy (Netlify Functions, Vercel, Supabase Edge, etc.)
// Dejala vacía para modo demo/pendiente. Ver mp_proxy.html para instrucciones.
var MP_PROXY_URL = '';
// Clave pública de MP (TEST o producción según corresponda)
var MP_PUBLIC_KEY = '';

// URLs de retorno que debés configurar en tu preferencia de MP:
//   success_url: seguimiento.html?pedido=ID&pago=aprobado
//   failure_url: seguimiento.html?pedido=ID&pago=fallido
//   pending_url: seguimiento.html?pedido=ID&pago=pendiente

// EmailJS — dejar vacío para deshabilitar. Ver emailjs_setup.md para configurar.
var EMAILJS_SERVICE_ID  = '';
var EMAILJS_TEMPLATE_ID = '';
var EMAILJS_PUBLIC_KEY  = '';

let carrito = JSON.parse(localStorage.getItem('pz_carrito') || '[]');
let metodoEnvio = 'retiro';
let metodoPago  = 'transferencia';
let cuponAplicado = null; // { codigo, tipo, descuento_porcentaje, descuento_fijo, id }
let descuentosVolumen = {}; // { productoId: [{ cantidad_minima, descuento_porcentaje }] }
let _fechaElegida = null;
let _horaElegida  = null;

async function init() {
  // Cargar credenciales EmailJS desde Supabase
  try {
    const { data: cfg } = await db.from('configuracion').select('clave, valor')
      .in('clave', ['emailjs_service_id', 'emailjs_template_id', 'emailjs_public_key']);
    if (cfg?.length) {
      cfg.forEach(r => {
        if (r.clave === 'emailjs_service_id')  EMAILJS_SERVICE_ID  = r.valor;
        if (r.clave === 'emailjs_template_id') EMAILJS_TEMPLATE_ID = r.valor;
        if (r.clave === 'emailjs_public_key')  EMAILJS_PUBLIC_KEY  = r.valor;
      });
    }
  } catch(e) {}

  actualizarContadorCarrito();
  preLlenarDatosUsuario();
  if (!carrito.length) {
    document.getElementById('checkout-form-wrap').style.display = 'none';
    document.getElementById('carrito-vacio').style.display = 'block';
    return;
  }
  await cargarDescuentosVolumen();
  renderResumen();
  verificarCreditoReferidos();
  cargarNivelUsuario();
  cargarPuntosCheckout();
  inyectarCamposMensaje();
}

function inyectarCamposMensaje() {
  const cuponWrap = document.querySelector('.cupon-wrap');
  if (!cuponWrap || document.getElementById('mensaje-vendedor')) return;
  const div = document.createElement('div');
  div.style.cssText = 'margin-top:14px';
  div.innerHTML = `
    <label style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px">Mensaje para el vendedor (opcional)</label>
    <textarea id="mensaje-vendedor" rows="2" placeholder="Ej: necesito el producto urgente, horarios de contacto..." style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none;resize:none;font-family:inherit;box-sizing:border-box"></textarea>`;
  cuponWrap.parentNode.insertBefore(div, cuponWrap);
}

let creditoReferidos = 0;
let creditoAplicado  = false;
let puntosDisponibles = 0;
let puntosCanjeados   = false;
let descuentoPuntos   = 0;

async function cargarPuntosCheckout() {
  const usuarioRaw = localStorage.getItem('pz_usuario');
  if (!usuarioRaw) return;
  let u;
  try { u = JSON.parse(usuarioRaw); } catch { return; }
  if (!u?.id) return;

  const { data } = await db.from('usuarios').select('puntos_acumulados').eq('id', u.id).single();
  puntosDisponibles = Number(data?.puntos_acumulados || 0);
  if (puntosDisponibles < 100) return;

  const wrap = document.getElementById('puntos-checkout-wrap');
  if (wrap) wrap.style.display = 'block';
  const descuento = Math.floor(puntosDisponibles / 100) * 500;
  const el1 = document.getElementById('puntos-disponibles-label');
  const el2 = document.getElementById('puntos-pesos-label');
  if (el1) el1.textContent = puntosDisponibles + ' puntos';
  if (el2) el2.textContent = '$' + descuento.toLocaleString('es-AR');
}

function canjearPuntos() {
  if (puntosCanjeados) return;
  descuentoPuntos  = Math.floor(puntosDisponibles / 100) * 500;
  puntosCanjeados  = true;
  const btn = document.getElementById('btn-canjear-puntos');
  if (btn) { btn.textContent = '✓ Canjeados'; btn.disabled = true; btn.style.background = '#22c55e'; }
  renderResumen();
}

// Extender calcularDescuento para incluir puntos
const _calcularDescuentoPuntos = typeof calcularDescuento === 'function' ? calcularDescuento : null;
function calcularDescuento(subtotal) {
  let base = _calcularDescuentoPuntos ? _calcularDescuentoPuntos(subtotal) : 0;
  if (puntosCanjeados) base += Math.min(descuentoPuntos, subtotal - base);
  return base;
}
let nivelDescPct     = 0;
let nivelNombre      = '';

async function cargarNivelUsuario() {
  const usuarioRaw = localStorage.getItem('pz_usuario');
  if (!usuarioRaw) return;
  let u;
  try { u = JSON.parse(usuarioRaw); } catch { return; }
  if (!u?.id) return;

  const { data } = await db.from('niveles_usuario')
    .select('nivel').eq('usuario_id', u.id).single();
  if (!data) return;

  const pcts = { plata: 5, oro: 10 };
  nivelDescPct = pcts[data.nivel] || 0;
  if (nivelDescPct <= 0) return;
  nivelNombre = data.nivel;
  mostrarDescuentoNivel();
  renderResumen();
}

function mostrarDescuentoNivel() {
  const cuponMsg = document.getElementById('cupon-msg');
  if (!cuponMsg || document.getElementById('nivel-row')) return;
  const emojis = { plata: '🥈', oro: '🥇' };
  const div = document.createElement('div');
  div.id = 'nivel-row';
  div.style.cssText = 'margin-top:10px;padding:10px 12px;background:#f0f7ff;border:1px solid #b3d1f7;border-radius:8px;font-size:13px;font-weight:600;color:#1a56c4';
  div.innerHTML = `${emojis[nivelNombre] || '⭐'} Descuento nivel ${nivelNombre.charAt(0).toUpperCase()+nivelNombre.slice(1)}: <strong>-${nivelDescPct}%</strong> aplicado automáticamente`;
  cuponMsg.parentNode.insertBefore(div, cuponMsg.nextSibling);
}

async function verificarCreditoReferidos() {
  const usuarioRaw = localStorage.getItem('pz_usuario');
  if (!usuarioRaw) return;
  let u;
  try { u = JSON.parse(usuarioRaw); } catch { return; }
  if (!u?.id) return;
  const { data } = await db.from('referidos')
    .select('credito_disponible')
    .eq('usuario_id', u.id)
    .single();
  if (!data?.credito_disponible || data.credito_disponible <= 0) return;
  creditoReferidos = data.credito_disponible;
  mostrarOpcionReferidos();
}

function mostrarOpcionReferidos() {
  const cuponMsg = document.getElementById('cupon-msg');
  if (!cuponMsg || document.getElementById('referidos-row')) return;
  const div = document.createElement('div');
  div.id = 'referidos-row';
  div.style.cssText = 'margin-top:10px;padding:10px 12px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px';
  div.innerHTML = `
    <span style="font-size:13px;color:#1a7a3f;font-weight:600">🎁 Tenés $${creditoReferidos.toLocaleString('es-AR')} de crédito por referidos</span>
    <button id="btn-aplicar-credito" onclick="aplicarCreditoReferidos()"
      style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-weight:700;font-size:12px;cursor:pointer">
      Aplicar
    </button>`;
  cuponMsg.parentNode.insertBefore(div, cuponMsg.nextSibling);
}

function aplicarCreditoReferidos() {
  if (creditoAplicado) return;
  creditoAplicado = true;
  document.getElementById('btn-aplicar-credito').textContent = '✓ Aplicado';
  document.getElementById('btn-aplicar-credito').disabled = true;
  renderResumen();
}

// Sobreescribir calcularDescuento para incluir nivel + crédito referidos
const _calcularDescuentoOriginal = calcularDescuento;
function calcularDescuento(subtotal) {
  let desc = _calcularDescuentoOriginal ? _calcularDescuentoOriginal(subtotal) : 0;
  if (nivelDescPct > 0) desc += Math.round(subtotal * nivelDescPct / 100);
  if (creditoAplicado) desc += Math.min(creditoReferidos, subtotal - desc);
  return desc;
}

function preLlenarDatosUsuario() {
  var usuarioRaw = localStorage.getItem('pz_usuario');
  if (!usuarioRaw) return;
  try {
    var u = JSON.parse(usuarioRaw);
    if (u.nombre)   document.getElementById('c-nombre').value   = u.nombre;
    if (u.apellido) document.getElementById('c-apellido').value = u.apellido;
    if (u.email)    document.getElementById('c-email').value    = u.email;
    if (u.telefono) document.getElementById('c-telefono').value = u.telefono;
  } catch(e) {}
}

function actualizarContadorCarrito() {
  const total = carrito.reduce((a, i) => a + i.cantidad, 0);
  document.getElementById('carrito-count').textContent = total;
}

function calcularSubtotal() {
  return carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);
}

function calcularDescuento(subtotal) {
  if (!cuponAplicado) return 0;
  if (cuponAplicado.tipo === 'porcentaje') {
    return Math.round(subtotal * (cuponAplicado.descuento_porcentaje / 100));
  }
  return Math.min(cuponAplicado.descuento_fijo, subtotal);
}

function renderResumen() {
  const wrap = document.getElementById('resumen-items');
  let subtotal = 0;
  wrap.innerHTML = carrito.map((item, idx) => {
    const sub = item.precio * item.cantidad;
    subtotal += sub;
    const imgHtml = item.imagen
      ? `<img src="${item.imagen}" alt="${item.nombre}" style="width:44px;height:44px;object-fit:contain;border-radius:6px;background:#f8f8f8;flex-shrink:0">`
      : `<div style="width:44px;height:44px;background:#f0f0f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔩</div>`;
    return '<div class="resumen-item" style="gap:10px">' +
      imgHtml +
      '<div class="resumen-item-nombre" style="flex:1">' + item.nombre + '<div style="font-size:11px;color:#aaa;margin-top:2px">x' + item.cantidad + '</div></div>' +
      '<div class="resumen-item-precio">$' + sub.toLocaleString('es-AR') + '</div>' +
      '<button class="resumen-item-eliminar" onclick="eliminarDelCarrito(' + idx + ')" title="Quitar">✕</button>' +
      '</div>';
  }).join('');

  const descuento    = calcularDescuento(subtotal);
  const descuentoVol = calcularDescuentoVolumen();
  const total        = subtotal - descuento - descuentoVol;

  // Estimación de entrega
  var estimEl = document.getElementById('estimacion-entrega');
  if (estimEl) {
    estimEl.textContent = metodoEnvio === 'retiro'
      ? '🏪 Retiro en local: disponible en 24–48 hs'
      : '🚚 Envío al AMBA: 2–5 días hábiles';
  }

  document.getElementById('resumen-subtotal').textContent = '$' + subtotal.toLocaleString('es-AR');
  document.getElementById('resumen-envio').textContent    = metodoEnvio === 'retiro' ? 'Sin costo' : 'A coordinar';
  document.getElementById('resumen-total').textContent    = '$' + total.toLocaleString('es-AR');

  const descRow = document.getElementById('descuento-row');
  if (cuponAplicado && descuento > 0) {
    descRow.style.display = 'flex';
    const label = cuponAplicado.tipo === 'porcentaje'
      ? cuponAplicado.codigo + ' -' + cuponAplicado.descuento_porcentaje + '%'
      : cuponAplicado.codigo;
    document.getElementById('cupon-label').textContent    = label;
    document.getElementById('resumen-descuento').textContent = '-$' + descuento.toLocaleString('es-AR');
  } else {
    descRow.style.display = 'none';
  }

  const dvolRow = document.getElementById('dvol-row');
  if (dvolRow) {
    if (descuentoVol > 0) {
      dvolRow.style.display = 'flex';
      document.getElementById('resumen-dvol').textContent = '-$' + descuentoVol.toLocaleString('es-AR');
    } else {
      dvolRow.style.display = 'none';
    }
  }
}

async function cargarDescuentosVolumen() {
  const ids = [...new Set(carrito.map(i => i.id))];
  if (!ids.length) return;
  const { data } = await db.from('descuentos_volumen')
    .select('producto_id, cantidad_minima, descuento_porcentaje')
    .in('producto_id', ids)
    .eq('activo', true)
    .order('cantidad_minima');
  if (!data) return;
  descuentosVolumen = {};
  data.forEach(r => {
    if (!descuentosVolumen[r.producto_id]) descuentosVolumen[r.producto_id] = [];
    descuentosVolumen[r.producto_id].push({ cantidad_minima: r.cantidad_minima, descuento_porcentaje: +r.descuento_porcentaje });
  });
}

function calcularDescuentoVolumen() {
  let ahorro = 0;
  carrito.forEach(item => {
    const reglas = descuentosVolumen[item.id];
    if (!reglas) return;
    const aplicable = reglas.filter(r => item.cantidad >= r.cantidad_minima)
                           .sort((a, b) => b.cantidad_minima - a.cantidad_minima)[0];
    if (!aplicable) return;
    ahorro += Math.round(item.precio * item.cantidad * (aplicable.descuento_porcentaje / 100));
  });
  return ahorro;
}

async function aplicarCupon() {
  const codigo = document.getElementById('cupon-input').value.trim().toUpperCase();
  const msg    = document.getElementById('cupon-msg');
  if (!codigo) { msg.style.color = '#c00'; msg.textContent = 'Ingresá un código de cupón.'; return; }

  msg.style.color = '#888'; msg.textContent = 'Verificando...';

  const ahora = new Date().toISOString();
  const { data, error } = await db.from('cupones')
    .select('*')
    .eq('activo', true)
    .ilike('codigo', codigo)
    .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${ahora}`)
    .single();

  if (error || !data) {
    cuponAplicado = null;
    msg.style.color = '#c00';
    msg.textContent = '❌ Cupón inválido o vencido.';
    renderResumen();
    return;
  }

  if (data.usos_maximos !== null && data.usos_actuales >= data.usos_maximos) {
    cuponAplicado = null;
    msg.style.color = '#c00';
    msg.textContent = '❌ Este cupón ya alcanzó su límite de usos.';
    renderResumen();
    return;
  }

  cuponAplicado = data;
  const subtotal  = calcularSubtotal();
  const descuento = calcularDescuento(subtotal);
  msg.style.color = '#1a7a3f';
  msg.textContent = '✅ Cupón aplicado — ahorrás $' + descuento.toLocaleString('es-AR') + '!';
  renderResumen();
}

function eliminarDelCarrito(idx) {
  carrito.splice(idx, 1);
  localStorage.setItem('pz_carrito', JSON.stringify(carrito));
  actualizarContadorCarrito();
  if (!carrito.length) {
    document.getElementById('checkout-form-wrap').style.display = 'none';
    document.getElementById('carrito-vacio').style.display = 'block';
  } else {
    renderResumen();
  }
}

function generarDias() {
  const container = document.getElementById('dias-selector');
  const hoy = new Date();
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  let html = '';
  for (let i = 1; i <= 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const diaSem = dias[d.getDay()];
    const diaMes = d.getDate();
    const mes = meses[d.getMonth()];
    const iso = d.toISOString().split('T')[0];
    html += `<div class="dia-btn" data-fecha="${iso}" onclick="elegirDia(this, '${iso}', '${diaSem} ${diaMes} ${mes}')">
      <span class="dia-sem">${diaSem}</span>
      <span class="dia-num">${diaMes}</span>
      <span class="dia-mes">${mes}</span>
    </div>`;
  }
  container.innerHTML = html;
}

function elegirDia(el, fecha, label) {
  document.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('activo'));
  el.classList.add('activo');
  _fechaElegida = fecha;
  _horaElegida = null;
  document.getElementById('horarios-wrap').style.display = 'block';
  generarHorarios(label);
}

function generarHorarios(diaLabel) {
  const grid = document.getElementById('horarios-grid');
  let html = '';
  for (let h = 9; h <= 17; h++) {
    html += `<div class="hora-btn" onclick="elegirHora(this, '${h}:00', '${diaLabel}')">${h}:00 – ${h+1}:00</div>`;
  }
  grid.innerHTML = html;
  document.getElementById('fecha-elegida-resumen').style.display = 'none';
}

function elegirHora(el, hora, diaLabel) {
  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('activo'));
  el.classList.add('activo');
  _horaElegida = hora;
  const resumen = document.getElementById('fecha-elegida-resumen');
  const accion = metodoEnvio === 'retiro' ? 'Retiro' : 'Entrega estimada';
  resumen.textContent = `✅ ${accion}: ${diaLabel}, ${hora}`;
  resumen.style.display = 'block';
}

function mostrarSelectorFecha(tipoEnvio) {
  const wrap = document.getElementById('selector-fecha-wrap');
  const titulo = document.getElementById('fecha-titulo-texto');
  if (!wrap) return;
  wrap.style.display = 'block';
  titulo.textContent = tipoEnvio === 'retiro'
    ? 'Elegí tu fecha preferida de retiro'
    : 'Elegí una fecha estimada de entrega';
  generarDias();
  document.getElementById('horarios-wrap').style.display = 'none';
  document.getElementById('fecha-elegida-resumen').style.display = 'none';
  _fechaElegida = null;
  _horaElegida = null;
}

function seleccionarEnvio(tipo) {
  metodoEnvio = tipo;
  document.getElementById('envio-retiro').classList.toggle('seleccionado', tipo === 'retiro');
  document.getElementById('envio-envio').classList.toggle('seleccionado',  tipo === 'envio');
  document.getElementById('form-envio').style.display = tipo === 'envio' ? 'block' : 'none';
  document.getElementById('resumen-envio').textContent = tipo === 'retiro' ? 'Sin costo' : 'A coordinar';
  mostrarSelectorFecha(tipo);
}

function seleccionarPago(tipo) {
  metodoPago = tipo;
  var tipos = ['transferencia','efectivo','mercadopago','debito'];
  tipos.forEach(function(t) {
    document.getElementById('pago-' + t).classList.toggle('seleccionado', t === tipo);
    document.getElementById('info-' + t).style.display = t === tipo ? 'block' : 'none';
  });
  if (tipo === 'mercadopago') {
    var infoMP = document.getElementById('info-mercadopago');
    if (!infoMP.querySelector('#mp-button-container')) {
      infoMP.innerHTML += '<div id="mp-button-container" style="margin-top:10px"></div>';
    }
  }
}

function iniciarMercadoPago(pedidoId, total, nombre, email) {
  if (!MP_PROXY_URL) {
    alert(
      'MercadoPago todavía no está configurado.\n\n' +
      'Para activarlo, seteá la variable MP_PROXY_URL en checkout.html ' +
      'con la URL de tu proxy.\n\n' +
      'Consultá mp_proxy.html para instrucciones.\n\n' +
      'Tu pedido quedó guardado — podés rastrearlo a continuación.'
    );
    window.location.href = 'seguimiento.html?pedido=' + pedidoId + '&pago=pendiente';
    return;
  }

  var itemsMP = carrito.map(function(i) {
    return {
      title:       i.nombre,
      quantity:    i.cantidad,
      unit_price:  i.precio,
      currency_id: 'ARS',
    };
  });

  fetch(MP_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pedidoId:  pedidoId,
      items:     itemsMP,
      payer:     { name: nombre, email: email },
      backUrls: {
        success: window.location.origin + '/seguimiento.html?pedido=' + pedidoId + '&pago=aprobado',
        failure: window.location.origin + '/seguimiento.html?pedido=' + pedidoId + '&pago=fallido',
        pending: window.location.origin + '/seguimiento.html?pedido=' + pedidoId + '&pago=pendiente',
      },
    }),
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var url = data.sandbox_init_point || data.init_point;
    if (url) {
      window.location.href = url;
    } else {
      alert('Error al obtener el link de pago. Tu pedido quedó guardado.');
      window.location.href = 'seguimiento.html?pedido=' + pedidoId + '&pago=pendiente';
    }
  })
  .catch(function(err) {
    console.error('[MP] Error al crear preferencia:', err);
    alert('Error al conectar con MercadoPago. Tu pedido quedó guardado.');
    window.location.href = 'seguimiento.html?pedido=' + pedidoId + '&pago=pendiente';
  });
}

async function confirmarPedido() {
  var nombre   = document.getElementById('c-nombre').value.trim();
  var apellido = document.getElementById('c-apellido').value.trim();
  var email    = document.getElementById('c-email').value.trim();
  var telefono = document.getElementById('c-telefono').value.trim();
  var msg      = document.getElementById('checkout-msg');
  var btn      = document.getElementById('btn-confirmar');

  if (!nombre || !apellido || !email || !telefono) {
    msg.style.color = '#c00';
    msg.textContent = 'Completá todos los datos obligatorios.';
    return;
  }

  var direccion = '', localidad = '';
  if (metodoEnvio === 'envio') {
    direccion = document.getElementById('c-direccion').value.trim();
    localidad = document.getElementById('c-localidad').value.trim();
    if (!direccion || !localidad) {
      msg.style.color = '#c00';
      msg.textContent = 'Completá la dirección de entrega.';
      return;
    }
  }

  btn.disabled    = true;
  msg.style.color = '#888';
  msg.textContent = 'Procesando pedido...';

  var subtotal      = calcularSubtotal();
  var descuento     = calcularDescuento(subtotal);
  var descuentoVol  = calcularDescuentoVolumen();
  var total         = subtotal - descuento - descuentoVol;

  // Leer usuario logueado si existe
  var usuarioId = null;
  try {
    var uRaw = localStorage.getItem('pz_usuario');
    if (uRaw) usuarioId = JSON.parse(uRaw).id || null;
  } catch(e) {}

  // Campos base — solo columnas que existen en la tabla original
  var pedidoData = {
    nombre_cliente:    nombre + ' ' + apellido,
    email_cliente:     email,
    telefono_cliente:  telefono,
    direccion_entrega: metodoEnvio === 'envio' ? direccion : 'Retiro en local',
    total:             total,
    metodo_pago:       metodoPago,
    estado:            'nuevo',
  };

  // Columnas opcionales: solo las agregamos si tienen valor para evitar errores
  // si el campo todavía no existe en la tabla.
  if (document.getElementById('c-notas').value.trim())
    pedidoData.nota_interna = document.getElementById('c-notas').value.trim();
  if (localidad) pedidoData.localidad_entrega = localidad;
  if (usuarioId) pedidoData.usuario_id = usuarioId;
  if (_fechaElegida) pedidoData.fecha_preferida = _fechaElegida;
  if (_horaElegida)  pedidoData.hora_preferida  = _horaElegida;

  console.log('[checkout] Insertando pedido con datos:', pedidoData);

  var result = await db.from('pedidos').insert([pedidoData]).select('id').single();

  if (result.error || !result.data) {
    console.error('[checkout] Error Supabase al insertar pedido:', result.error);
    msg.style.color = '#c00';
    msg.textContent = 'Error al procesar el pedido: ' + (result.error?.message || 'revisá la consola para más detalles.');
    btn.disabled = false;
    return;
  }

  var pedidoId = result.data.id;
  console.log('[checkout] Pedido creado con ID:', pedidoId);

  // Guardar cupon y descuento en un update separado (columnas pueden no existir aún)
  if (cuponAplicado) {
    var upd = await db.from('pedidos').update({
      cupon_codigo:       cuponAplicado.codigo,
      descuento_aplicado: descuento > 0 ? descuento : null,
    }).eq('id', pedidoId);
    if (upd.error) {
      console.warn('[checkout] No se pudo guardar el cupón en el pedido (¿corriste agregar_cupones_pedidos.sql?):', upd.error.message);
    }
  }

  // Insertar items
  var items = carrito.map(function(i) {
    return {
      pedido_id:       pedidoId,
      producto_id:     i.id,
      cantidad:        i.cantidad,
      precio_unitario: i.precio,
      subtotal:        i.precio * i.cantidad,
    };
  });

  var resItems = await db.from('items_pedido').insert(items);
  if (resItems.error) {
    console.error('[checkout] Error al insertar items_pedido:', resItems.error);
  }

  // Incrementar uso del cupón
  if (cuponAplicado) {
    await db.from('cupones')
      .update({ usos_actuales: cuponAplicado.usos_actuales + 1 })
      .eq('id', cuponAplicado.id);
  }

  // Si el pago es MercadoPago, redirigir al checkout de MP sin limpiar el carrito todavía
  if (metodoPago === 'mercadopago') {
    msg.style.color = '#888';
    msg.textContent = 'Redirigiendo a MercadoPago...';
    iniciarMercadoPago(pedidoId, total, nombre + ' ' + apellido, email);
    return;
  }

  // Enviar email de confirmación (no bloquea el flujo aunque falle)
  enviarEmailConfirmacion(pedidoId, {
    nombre:      nombre + ' ' + apellido,
    email:       email,
    telefono:    telefono,
    items:       carrito.slice(),
    total:       total,
    metodoPago:  metodoPago,
    metodoEnvio: metodoEnvio,
  });

  if (window.trackPurchase) try { trackPurchase(pedidoId, total, carrito.slice()); } catch(_) {}

  // Acumular puntos: $100 = 1 punto
  acumularPuntos(pedidoId, total);

  localStorage.removeItem('pz_carrito');
  carrito = [];

  var numeroPedido = pedidoId.substring(0, 8).toUpperCase();
  document.getElementById('checkout-contenido').style.display  = 'none';
  document.getElementById('confirmacion-wrap').style.display   = 'block';
  document.getElementById('confirmacion-numero').textContent   = '#' + numeroPedido;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enviarEmailConfirmacion(pedidoId, datos) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) return;

  // Formatear lista de productos
  var productosTexto = datos.items.map(function(i) {
    return '• ' + i.nombre + ' x' + i.cantidad + ' = $' + (i.precio * i.cantidad).toLocaleString('es-AR');
  }).join('\n');

  var templateParams = {
    nombre_cliente:   datos.nombre,
    email_cliente:    datos.email,
    telefono_cliente: datos.telefono,
    numero_pedido:    pedidoId.substring(0, 8).toUpperCase(),
    productos:        productosTexto,
    total:            '$' + datos.total.toLocaleString('es-AR'),
    metodo_pago:      datos.metodoPago,
    metodo_envio:     datos.metodoEnvio === 'retiro' ? 'Retiro en local' : 'Envío a domicilio',
  };

  emailjs.init(EMAILJS_PUBLIC_KEY);
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(function() {
      console.log('[EmailJS] Email de confirmación enviado a', datos.email);
    })
    .catch(function(err) {
      console.warn('[EmailJS] No se pudo enviar el email:', err);
    });
}

document.addEventListener('DOMContentLoaded', function() {
  init();
});

async function acumularPuntos(pedidoId, total) {
  try {
    const usuarioRaw = localStorage.getItem('pz_usuario');
    if (!usuarioRaw) return;
    const u = JSON.parse(usuarioRaw);
    if (!u?.id) return;

    const puntosGanados = Math.floor(Number(total) / 100);
    if (puntosGanados <= 0) return;

    const { data: usu } = await db.from('usuarios').select('puntos_acumulados').eq('id', u.id).single();
    const puntosActuales = Number(usu?.puntos_acumulados || 0);
    const puntosNuevos   = puntosActuales + puntosGanados - (puntosCanjeados ? puntosDisponibles : 0);

    await db.from('usuarios').update({ puntos_acumulados: Math.max(0, puntosNuevos) }).eq('id', u.id);

    // Registro en historial
    await db.from('puntos_historial').insert({
      usuario_id: u.id,
      pedido_id: pedidoId,
      tipo: 'acumulacion',
      puntos: puntosGanados,
      descripcion: 'Compra #' + pedidoId.substring(0, 8).toUpperCase(),
    });

    if (puntosCanjeados && puntosDisponibles > 0) {
      await db.from('puntos_historial').insert({
        usuario_id: u.id,
        pedido_id: pedidoId,
        tipo: 'canje',
        puntos: -puntosDisponibles,
        descripcion: 'Canje en compra #' + pedidoId.substring(0, 8).toUpperCase(),
      });
    }
  } catch(_) {}
}

