// Carrito B2C — Fase 2 Piezauto
// State: localStorage key "piezauto_carrito_b2c"
// Sincronización BD: cat_operaciones_b2c (estado='pendiente') para usuarios logueados

const CARRITO_KEY = 'piezauto_carrito_b2c';

// ── Operaciones básicas ──────────────────────────────────────────

function cargarCarritoLocal() {
  try { return JSON.parse(localStorage.getItem(CARRITO_KEY) || '[]'); }
  catch { return []; }
}

function guardarCarritoLocal(items) {
  localStorage.setItem(CARRITO_KEY, JSON.stringify(items));
}

function agregarAlCarrito(item) {
  // item: { id, codigo_piezauto, descripcion, precio, cantidad }
  const items = cargarCarritoLocal();
  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    items[idx].cantidad = Math.min(99, items[idx].cantidad + item.cantidad);
  } else {
    items.push({
      id: item.id,
      codigo_piezauto: item.codigo_piezauto || '',
      descripcion: item.descripcion || '',
      precio: item.precio || null,
      cantidad: item.cantidad || 1,
    });
  }
  guardarCarritoLocal(items);
  sincronizarConBD();
}

function actualizarCantidad(skuId, nuevaCantidad) {
  const items = cargarCarritoLocal();
  const idx = items.findIndex(i => i.id === skuId);
  if (idx < 0) return;
  const cant = parseInt(nuevaCantidad);
  if (!cant || cant < 1) {
    eliminarDelCarrito(skuId);
    return;
  }
  items[idx].cantidad = Math.min(99, cant);
  guardarCarritoLocal(items);
  sincronizarConBD();
}

function eliminarDelCarrito(skuId) {
  const items = cargarCarritoLocal().filter(i => i.id !== skuId);
  guardarCarritoLocal(items);
  sincronizarConBD();
}

function vaciarCarrito() {
  guardarCarritoLocal([]);
  sincronizarConBD();
}

function calcularTotales() {
  const items = cargarCarritoLocal();
  const subtotal = items.reduce((s, i) => s + (i.precio || 0) * i.cantidad, 0);
  return { subtotal, total: subtotal, items };
}

// ── Sincronización con BD (usuarios logueados) ───────────────────

let _syncTimeout = null;

function sincronizarConBD() {
  clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(_doSync, 1200);
}

async function _doSync() {
  let session = null;
  try {
    const { data } = await dbB2C.auth.getSession();
    session = data?.session;
  } catch { return; }
  if (!session) return;

  const cliente = await getClienteActual();
  if (!cliente) return;

  const items = cargarCarritoLocal();
  const { subtotal, total } = calcularTotales();

  // Buscar borrador existente
  const { data: borradores } = await dbB2C
    .from('cat_operaciones_b2c')
    .select('id')
    .eq('cliente_id', cliente.id)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1);

  const borrador = borradores?.[0];

  if (items.length === 0) {
    if (borrador) {
      await dbB2C.from('cat_operaciones_b2c_items').delete().eq('operacion_id', borrador.id);
      await dbB2C.from('cat_operaciones_b2c').delete().eq('id', borrador.id);
    }
    return;
  }

  let operacionId;

  if (borrador) {
    operacionId = borrador.id;
    await dbB2C.from('cat_operaciones_b2c').update({
      subtotal, total, descuento: 0, updated_at: new Date().toISOString()
    }).eq('id', operacionId);
    await dbB2C.from('cat_operaciones_b2c_items').delete().eq('operacion_id', operacionId);
  } else {
    const { data: nueva } = await dbB2C
      .from('cat_operaciones_b2c')
      .insert({ cliente_id: cliente.id, estado: 'pendiente', subtotal, total, descuento: 0 })
      .select('id')
      .single();
    if (!nueva) return;
    operacionId = nueva.id;
  }

  const lineas = items.map(i => ({
    operacion_id: operacionId,
    sku_id: i.id,
    cantidad: i.cantidad,
    precio_unitario: i.precio || 0,
    subtotal: (i.precio || 0) * i.cantidad,
  }));

  if (lineas.length > 0) {
    await dbB2C.from('cat_operaciones_b2c_items').insert(lineas);
  }
}

// ── Carga carrito desde BD al iniciar sesión ─────────────────────

async function cargarCarritoDesdeDB() {
  const cliente = await getClienteActual();
  if (!cliente) return;

  const { data: borradores } = await dbB2C
    .from('cat_operaciones_b2c')
    .select('id')
    .eq('cliente_id', cliente.id)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1);

  const borrador = borradores?.[0];
  if (!borrador) return;

  const { data: lineas } = await dbB2C
    .from('cat_operaciones_b2c_items')
    .select(`
      sku_id, cantidad, precio_unitario,
      cat_skus!sku_id(id, codigo_piezauto, descripcion_corta, descripcion, precio_lista)
    `)
    .eq('operacion_id', borrador.id);

  if (!lineas || lineas.length === 0) return;

  const local = cargarCarritoLocal();
  const merged = [...local];

  lineas.forEach(l => {
    const sku = l.cat_skus;
    if (!sku) return;
    const existe = merged.find(i => i.id === sku.id);
    if (!existe) {
      merged.push({
        id: sku.id,
        codigo_piezauto: sku.codigo_piezauto,
        descripcion: sku.descripcion_corta || sku.descripcion,
        precio: l.precio_unitario || sku.precio_lista,
        cantidad: l.cantidad,
      });
    }
  });

  guardarCarritoLocal(merged);
}
