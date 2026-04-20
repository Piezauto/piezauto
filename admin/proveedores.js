
// ══ CONFIGURACIÓN DE CAMPOS MAPEABLES DESDE EXCEL ══════════════
const CAMPOS = [
  { key: 'nombre',            label: 'Descripción del producto (nombre)',     req: true  },
  { key: 'codigo_oem',        label: 'Código OEM',                            req: false },
  { key: 'codigo_proveedor',  label: 'Código del proveedor',                  req: false },
  { key: 'fabricante',        label: 'Fabricante (Bosch, SKF, NGK…)',         req: false },
  { key: 'marca',             label: 'Marca del producto',                    req: false },
  { key: 'precio_lista',      label: 'Precio lista ($)',                      req: false },
  { key: 'precio_costo',      label: 'Precio costo ($ interno)',              req: false },
  { key: 'stock',             label: 'Stock (columna principal)',              req: false },
  { key: 'stock_2',           label: 'Stock adicional 2 (se suma)',           req: false, stockExtra: true },
  { key: 'stock_3',           label: 'Stock adicional 3 (se suma)',           req: false, stockExtra: true },
  { key: 'stock_4',           label: 'Stock adicional 4 (se suma)',           req: false, stockExtra: true },
  { key: 'origen',            label: 'Origen (ORIGINAL, T-ORIGINAL…)',        req: false },
  { key: 'descripcion',       label: 'Descripción detallada',                 req: false },
  { key: 'categoria_hint',    label: 'Categoría / rubro (referencia)',        req: false },
  { key: 'marca_vehiculo',    label: 'Marca del vehículo (Ford, VW…)',        req: false },
  { key: 'vehiculo',          label: 'Modelo del vehículo (Ranger, Golf…)',   req: false },
  { key: 'version_formato',   label: 'Versión carrocería (3P, 4P, sedan…)',   req: false },
  { key: 'anio_desde_pieza',  label: 'Año desde',                            req: false },
  { key: 'anio_hasta_pieza',  label: 'Año hasta',                            req: false },
  { key: 'lado',              label: 'Lado de montaje (D / I / ambos)',       req: false },
  { key: 'compat_marca',      label: 'Marca vehículo (compat. auto — legacy)',req: false, noStore: true },
  { key: 'compat_modelo',     label: 'Modelo/año vehículo (compat. — legacy)',req: false, noStore: true },
];

// ══ HELPERS ════════════════════════════════════════════════════

// Interpreta año de 2 o 4 dígitos: 66→1966, 02→2002, 1996→1996
function normalizeYear(str) {
  const n = parseInt(str);
  if (String(str).length === 4) return n;
  return n >= 60 ? 1900 + n : 2000 + n;
}

// Analiza el texto de descripción para extraer datos de vehículo si no están mapeados
function analizarDescripcion(texto, marcaExcel, modeloExcel) {
  const resultado = {
    marca_vehiculo:   marcaExcel || null,
    vehiculo:         modeloExcel || null,
    version_formato:  null,
    anio_desde_pieza: null,
    anio_hasta_pieza: null,
    lado:             null,
  };

  if (!texto) return resultado;
  const txt = texto.toUpperCase();

  // Detectar lado de montaje
  if (/\b(DERECHO|DERECHA|DER\b)/.test(txt))       resultado.lado = 'D';
  else if (/\b(IZQUIERDO|IZQUIERDA|IZQ\b)/.test(txt)) resultado.lado = 'I';
  else if (/\b(AMBOS|JUEGO|PAR)\b/.test(txt))       resultado.lado = 'ambos';

  // Detectar versión / carrocería
  const verMatch = txt.match(/\b(3P|4P|5P|SEDAN|COUPE|COUP[EÉ]|STD|RURAL|PICKUP|STATION|FURGON|HATCHBACK)\b/);
  if (verMatch) resultado.version_formato = verMatch[1];

  // Detectar rango de años: "66/69", "1996/2002", "70-80"
  const rangeMatch = txt.match(/\b(\d{2}|\d{4})\s*[\/\-]\s*(\d{2}|\d{4})\b/);
  if (rangeMatch) {
    resultado.anio_desde_pieza = normalizeYear(rangeMatch[1]);
    resultado.anio_hasta_pieza = normalizeYear(rangeMatch[2]);
  } else {
    // Año suelto de 4 dígitos
    const yearMatch = txt.match(/\b(19[6-9]\d|20[0-2]\d)\b/);
    if (yearMatch) resultado.anio_desde_pieza = parseInt(yearMatch[1]);
  }

  return resultado;
}

// Parser de precios: maneja formato argentino (44.000,00) e internacional (44000.00)
function parsePrice(val) {
  if (val === undefined || val === null || val === '') return null;
  const str = String(val).trim();
  if (!str) return null;
  const lastDot   = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');
  let normalized;
  if (lastComma > lastDot) {
    normalized = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = str.replace(/,/g, '');
  } else {
    normalized = str;
  }
  const num = parseFloat(normalized.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

// Interpreta stock: "si"=1, "no"=0, número=número
function parseStockValue(val) {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).trim().toLowerCase();
  if (['si','sí','yes','s','x'].includes(str)) return 1;
  if (['no','n','-'].includes(str)) return 0;
  const num = parseFloat(str.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : Math.round(num);
}

// Normaliza el valor del campo "lado" para la check constraint
function normalizarLado(val) {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (['D', 'DER', 'DERECHO', 'DERECHA'].includes(s)) return 'D';
  if (['I', 'IZQ', 'IZQUIERDO', 'IZQUIERDA'].includes(s)) return 'I';
  if (['AMBOS', 'B', 'PAR', 'JUEGO'].includes(s)) return 'ambos';
  return null;
}

// Formatea un número como precio ARS
function fmtPrecio(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ══ DETECCIÓN DE FORMATO ══════════════════════════════════════

// Detecta el formato del archivo según la primera fila
function detectarFormatoArchivo(rows) {
  if (!rows || !rows.length) return 'manual';
  const col0 = String(rows[0][0] ?? '').trim().toUpperCase();
  if (col0 === 'STELLANTIS') return 'stellantis';
  if (col0 === 'PROVEEDOR') {
    const col5 = String(rows[0][5] ?? '').trim().toUpperCase();
    return col5 === 'CATEGORIA' ? 'dam' : 'estandar';
  }
  return 'manual';
}

// Parsea año en formatos: "1994/2023", "94/23", "1996>", "1996", "96"
function parsearAnio(texto) {
  if (!texto) return { desde: null, hasta: null };
  const s = String(texto).trim();
  const rangeMatch = s.match(/^(\d{2}|\d{4})[\/\-](\d{2}|\d{4})$/);
  if (rangeMatch) {
    return { desde: normalizeYear(rangeMatch[1]), hasta: normalizeYear(rangeMatch[2]) };
  }
  const openMatch = s.match(/^(\d{2}|\d{4})>?$/);
  if (openMatch) {
    return { desde: normalizeYear(openMatch[1]), hasta: null };
  }
  return { desde: null, hasta: null };
}

// Normaliza LADO para formatos estándar/DAM
function parsearLadoStd(val) {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (s === 'D' || s === 'DER' || s === 'DERECHO' || s === 'DERECHA') return 'D';
  if (s === 'I' || s === 'IZQ' || s === 'IZQUIERDO' || s === 'IZQUIERDA') return 'I';
  if (s === 'D/I' || s === 'I/D' || s === '*' || s === 'AMBOS' || s === 'PAR') return 'ambos';
  return null;
}

// Palabras clave para categoría automática
const CAT_KEYWORDS = {
  freno:        ['freno', 'disco', 'pastilla', 'balata', 'tambor', 'mordaza', 'cilindro de freno'],
  suspension:   ['amortiguador', 'resorte', 'buje', 'rotula', 'terminal', 'barra estabilizadora', 'suspension'],
  motor:        ['junta', 'empaque', 'culata', 'piston', 'biela', 'ciguenal', 'arbol de levas', 'valvula'],
  transmision:  ['embrague', 'clutch', 'diferencial', 'semeje', 'cardan', 'caja de cambio'],
  electrico:    ['bujia', 'bobina', 'sensor', 'alternador', 'arranque', 'relay', 'fusible'],
  filtro:       ['filtro'],
  correa:       ['correa', 'cadena distribucion', 'tensor', 'distribucion'],
  refrigeracion:['radiador', 'termostato', 'bomba de agua', 'refrigeracion'],
  direccion:    ['cremallera', 'bomba de direccion', 'columna de direccion'],
  escape:       ['escape', 'silenciador', 'catalizador'],
};

function detectarCategoria(nombre) {
  if (!nombre) return null;
  const n = nombre.toLowerCase();
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    if (kws.some(k => n.includes(k))) return cat;
  }
  return null;
}

// Normaliza un string para comparación fuzzy (sin extensión, lowercase, sin especiales)
function _normalizarNombreArchivo(s) {
  return s.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Intenta auto-seleccionar el proveedor según el nombre del archivo
async function intentarAutoSeleccionarProveedor(nombreArchivo) {
  const { data: provs } = await db.from('proveedores').select('id, nombre, archivo_nombre').eq('activo', true);
  if (!provs || !provs.length) return;

  const normArch = _normalizarNombreArchivo(nombreArchivo);

  // 1. Buscar por archivo_nombre configurado en el proveedor
  const porArchivo = provs.find(p => {
    if (!p.archivo_nombre) return false;
    const normRef = _normalizarNombreArchivo(p.archivo_nombre);
    return normRef === normArch || normArch.includes(normRef) || normRef.includes(normArch);
  });
  if (porArchivo) { document.getElementById('imp-proveedor').value = porArchivo.id; return; }

  // 2. Buscar por nombre del proveedor
  const porNombre = provs.find(p => {
    const normProv = _normalizarNombreArchivo(p.nombre);
    return normArch.includes(normProv) || normProv.includes(normArch);
  });
  if (porNombre) document.getElementById('imp-proveedor').value = porNombre.id;
}

// Construye un item desde una fila del formato estándar o DAM
// Cols estándar: 0=PROVEEDOR 1=CODIGO 2=DESC 3=PRECIO 4=MARCA_VEH [5=CAT si dam] n+shift=VEH ANIO LADO OEM FAB ORIGEN
function buildItemEstandar(row, formato, provCtx) {
  const shift     = formato === 'dam' ? 1 : 0;
  const codigo    = String(row[1]          ?? '').trim() || null;
  const nombre    = String(row[2]          ?? '').trim();
  const precio    = parsePrice(row[3]);
  const marcaVeh  = String(row[4]          ?? '').trim() || null;
  const catHint   = formato === 'dam' ? (String(row[5] ?? '').trim() || null) : null;
  const vehiculo  = String(row[5 + shift]  ?? '').trim() || null;
  const anioRaw   = String(row[6 + shift]  ?? '').trim();
  const ladoRaw   = row[7 + shift];
  const oem       = String(row[8 + shift]  ?? '').trim() || null;
  const fabricante= String(row[9 + shift]  ?? '').trim() || null;
  const origen    = String(row[10 + shift] ?? '').trim() || null;

  if (!nombre) return null;

  const { desde, hasta } = parsearAnio(anioRaw);

  return {
    proveedor_id:       provCtx.proveedorId,
    importacion_id:     provCtx.impId,
    descuento_aplicado: provCtx.descuentoProv,
    margen_aplicado:    provCtx.margenProv,
    iva_aplicado:       provCtx.ivaProv,
    codigo_proveedor:   codigo,
    nombre,
    precio_lista:       precio,
    marca_vehiculo:     marcaVeh,
    vehiculo,
    anio_desde_pieza:   desde,
    anio_hasta_pieza:   hasta,
    lado:               parsearLadoStd(ladoRaw),
    codigo_oem:         oem,
    fabricante,
    origen,
    categoria_hint:     catHint,
    activo_en_tienda:
      (oem    && provCtx.activosOEM.has(oem)) ||
      (codigo && provCtx.activosCod.has(codigo)),
  };
}

// Construye un item desde una fila de formato Stellantis (mapea por nombre de columna)
function buildItemStellantis(row, provCtx, headerMap) {
  const g = (...keys) => {
    for (const k of keys) {
      const idx = headerMap[k.toUpperCase()];
      if (idx !== undefined) { const v = String(row[idx] ?? '').trim(); if (v) return v; }
    }
    return null;
  };

  const nombre = g('DESCRIPCION', 'DESCRIPTION', 'DESCRIPCION DEL PRODUCTO', 'NOMBRE', 'ARTICULO');
  if (!nombre) return null;

  const codigo   = g('CODIGO', 'COD', 'CODIGO_PROVEEDOR', 'PART NUMBER', 'PART_NUMBER', 'NUMERO DE PARTE');
  const oem      = g('OEM', 'CODIGO OEM', 'CODIGO_OEM', 'REFERENCIA OEM');
  const anioRaw  = g('ANIO', 'AÑO', 'ANIO DESDE', 'DESDE', 'AÑO DESDE') || '';
  const { desde, hasta } = parsearAnio(anioRaw);

  return {
    proveedor_id:       provCtx.proveedorId,
    importacion_id:     provCtx.impId,
    descuento_aplicado: provCtx.descuentoProv,
    margen_aplicado:    provCtx.margenProv,
    iva_aplicado:       provCtx.ivaProv,
    codigo_proveedor:   codigo,
    nombre,
    precio_lista:       parsePrice(g('PRECIO', 'PRECIO LISTA', 'PRICE', 'PRECIO NETO')),
    marca_vehiculo:     g('MARCA VEHICULO', 'MARCA_VEHICULO', 'MARCA VEH'),
    vehiculo:           g('VEHICULO', 'MODELO', 'MODELO VEHICULO', 'APLICACION'),
    anio_desde_pieza:   desde,
    anio_hasta_pieza:   hasta,
    lado:               parsearLadoStd(g('LADO', 'POSICION')),
    codigo_oem:         oem,
    fabricante:         g('FABRICANTE', 'MARCA'),
    origen:             g('ORIGEN', 'PROCEDENCIA'),
    activo_en_tienda:
      (oem    && provCtx.activosOEM.has(oem)) ||
      (codigo && provCtx.activosCod.has(codigo)),
  };
}

// ══ ESTADO GLOBAL ══════════════════════════════════════════════
let todosLosItems    = [];
let columnHeaders    = [];
let rowsData         = [];
let archivoNombre    = '';
let proveedoresList  = [];
let formatoDetectado = 'manual'; // 'estandar' | 'dam' | 'stellantis' | 'manual'

// ══ NAVEGACIÓN ═════════════════════════════════════════════════
function mostrarPanel(nombre) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('activo'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
  document.getElementById('panel-' + nombre).classList.add('activo');
  document.getElementById('tab-btn-' + nombre).classList.add('activo');

  const acciones = {
    proveedores:   cargarProveedores,
    importar:      iniciarPanelImport,
    catalogo:      cargarCatalogo,
    equivalencias: cargarEquivalencias,
  };
  if (acciones[nombre]) acciones[nombre]();
}

// ══════════════════════════════════════════════════════
// PANEL 1: PROVEEDORES
// ══════════════════════════════════════════════════════

let editandoProvId = null;

// Muestra/oculta el input de condición personalizada
function onCondicionChange() {
  const val  = document.getElementById('prov-condicion')?.value;
  const wrap = document.getElementById('prov-condicion-custom-wrap');
  if (wrap) wrap.style.display = val === 'custom' ? 'block' : 'none';
}

// Lee el tipo de recargo no fiscal seleccionado
function leerRecargoTipo() {
  const sel = document.querySelector('input[name="nofiscal-tipo"]:checked');
  return sel ? sel.value : 'sin_recargo';
}

// Lee el porcentaje de recargo no fiscal según la selección
function leerRecargoPct() {
  const tipo = leerRecargoTipo();
  if (tipo === 'medio_iva')    return 10.5;
  if (tipo === 'personalizado') return parseFloat(document.getElementById('prov-nofiscal-pct')?.value) || 0;
  return 0;
}

// Sincroniza el estilo activo de las tarjetas radio
function onRecargoChange() {
  const tipo = leerRecargoTipo();
  document.getElementById('rdo-wrap-sin')?.classList.toggle('activa',   tipo === 'sin_recargo');
  document.getElementById('rdo-wrap-medio')?.classList.toggle('activa', tipo === 'medio_iva');
  document.getElementById('rdo-wrap-custom')?.classList.toggle('activa',tipo === 'personalizado');
  calcularSimulacion();
}

// Simulador horizontal — 5 columnas fijas
function calcularSimulacion() {
  const lista  = parseFloat(document.getElementById('sim-precio')?.value)      || 0;
  const d1     = parseFloat(document.getElementById('prov-descuento1')?.value) || 0;
  const d2     = parseFloat(document.getElementById('prov-descuento2')?.value) || 0;
  const d3     = parseFloat(document.getElementById('prov-descuento3')?.value) || 0;
  const margen = parseFloat(document.getElementById('prov-margen')?.value)     || 0;
  const xPct   = leerRecargoPct();
  const tipo   = leerRecargoTipo();

  // Actualizar label dinámico del encabezado "Precio no fiscal"
  const nofiscalLabel = document.getElementById('sim-nofiscal-label');
  if (nofiscalLabel) {
    if (tipo === 'sin_recargo')    nofiscalLabel.textContent = '(sin recargo)';
    else if (tipo === 'medio_iva') nofiscalLabel.textContent = '(10,5%)';
    else                           nofiscalLabel.textContent = `(${xPct % 1 === 0 ? xPct : xPct.toFixed(1)}%)`;
  }

  const tbody = document.getElementById('sim-tabla-body');
  if (!tbody) return;

  if (!lista) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:20px;color:#aaa;font-size:12px;text-align:center">Ingresá el precio lista para ver la simulación.</td></tr>';
    return;
  }

  const fmt = n => '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Cálculos ─────────────────────────────────────
  // 1. Precio de lista
  // 2. Descuentos en cascada
  const paso1    = lista * (1 - d1 / 100);
  const paso2    = paso1 * (1 - d2 / 100);
  const paso3    = paso2 * (1 - d3 / 100);
  const pNeto    = paso3;
  const descAmt  = lista - pNeto;
  const descPct  = descAmt > 0
    ? Math.round((1 - (1 - d1/100) * (1 - d2/100) * (1 - d3/100)) * 1000) / 10
    : 0;

  // 3. Precio con IVA (siempre 21%)
  const pConIva = pNeto * 1.21;

  // 4. Precio no fiscal según recargo seleccionado
  let pNoFiscal;
  if (tipo === 'sin_recargo')    pNoFiscal = pNeto;
  else if (tipo === 'medio_iva') pNoFiscal = pNeto * 1.105;
  else                           pNoFiscal = pNeto * (1 + xPct / 100);

  // 5. Precios de venta (con margen sobre precio de compra)
  const pVentaIva   = pConIva   * (1 + margen / 100);
  const pVentaNoFis = pNoFiscal * (1 + margen / 100);

  // ── Estilos de celdas ────────────────────────────
  const tdBase  = 'padding:14px;text-align:center;';
  const tdNeto  = tdBase + 'background:#f5f5f5;';
  const tdIva   = tdBase + 'background:#e8f0fe;';
  const tdNoFis = tdBase + 'background:#e8f7ee;';
  const tdPlain = tdBase + 'background:#fafafa;';

  const descLabel = descAmt > 0
    ? `<div style="color:#c00;font-weight:700;font-size:15px">−${fmt(descAmt)}</div>
       <div style="color:#c00;font-size:11px;margin-top:2px">${descPct}% total</div>`
    : `<div style="color:#aaa;font-size:13px">—</div>`;

  const margenLabel = margen
    ? `<div style="font-size:13px;color:#555;font-weight:700">+ Margen (${margen}%)</div>`
    : `<div style="font-size:12px;color:#aaa">Sin margen</div>`;

  tbody.innerHTML = `
    <tr>
      <td style="${tdBase}"><div class="td-big">${fmt(lista)}</div></td>
      <td style="${tdBase}">${descLabel}</td>
      <td style="${tdNeto}"><div class="td-big">${fmt(pNeto)}</div></td>
      <td style="${tdIva}"><div class="td-big">${fmt(pConIva)}</div></td>
      <td style="${tdNoFis}"><div class="td-big">${fmt(pNoFiscal)}</div></td>
    </tr>
    <tr style="border-top:2px solid #e0e0e0">
      <td style="${tdPlain}color:#aaa;font-size:12px">—</td>
      <td style="${tdPlain}color:#aaa;font-size:12px">—</td>
      <td style="${tdNeto}">${margenLabel}</td>
      <td style="${tdIva}">
        <div class="td-venta-iva">${fmt(pVentaIva)}</div>
        <div style="font-size:11px;color:#1a56c4;margin-top:2px">Precio de venta</div>
      </td>
      <td style="${tdNoFis}">
        <div class="td-venta-nofiscal">${fmt(pVentaNoFis)}</div>
        <div style="font-size:11px;color:#1a7a3f;margin-top:2px">Precio de venta</div>
      </td>
    </tr>
  `;
}

async function guardarProveedor() {
  const nombre = document.getElementById('prov-nombre').value.trim();
  const msg    = document.getElementById('prov-msg');
  if (!nombre) { msg.textContent = '⚠️ El nombre es obligatorio.'; msg.style.color = '#c00'; return; }

  const datos = {
    nombre,
    archivo_nombre:       document.getElementById('prov-archivo').value.trim()    || null,
    contacto:             document.getElementById('prov-contacto').value.trim()   || null,
    email:                document.getElementById('prov-email').value.trim()      || null,
    telefono:             document.getElementById('prov-telefono').value.trim()   || null,
    notas:                document.getElementById('prov-notas').value.trim()      || null,
    descuento_porcentaje:  parseFloat(document.getElementById('prov-descuento1').value) || 0,
    descuento_2:           parseFloat(document.getElementById('prov-descuento2').value) || 0,
    descuento_3:           parseFloat(document.getElementById('prov-descuento3').value) || 0,
    margen_venta:          parseFloat(document.getElementById('prov-margen').value)     || 30,
    iva_porcentaje:               21,
    recargo_no_fiscal_tipo:       leerRecargoTipo(),
    recargo_no_fiscal_porcentaje: leerRecargoTipo() === 'personalizado'
                                    ? (leerRecargoPct() || null)
                                    : null,
    condicion_pago:        document.getElementById('prov-condicion').value        || null,
    condicion_pago_custom: document.getElementById('prov-condicion').value === 'custom'
                             ? (document.getElementById('prov-condicion-custom').value.trim() || null)
                             : null,
    limite_credito:        parseFloat(document.getElementById('prov-limite-credito').value) || null,
    dia_pago_preferido:    document.getElementById('prov-dia-pago').value         || null,
    moneda:                document.getElementById('prov-moneda').value           || 'ARS',
  };

  msg.textContent = 'Guardando...'; msg.style.color = '#888';

  let error;
  if (editandoProvId) {
    ({ error } = await db.from('proveedores').update(datos).eq('id', editandoProvId));
  } else {
    ({ error } = await db.from('proveedores').insert([datos]));
  }

  if (error) {
    msg.textContent = '❌ ' + (error.message.includes('unique') ? 'Ya existe un proveedor con ese nombre.' : error.message);
    msg.style.color = '#c00';
  } else {
    msg.textContent = '✅ Proveedor guardado.'; msg.style.color = '#1a7a3f';
    editandoProvId = null;
    limpiarFormProv();
    cargarProveedores();
  }
}

function limpiarFormProv() {
  ['prov-nombre','prov-archivo','prov-contacto','prov-email','prov-telefono',
   'prov-notas','prov-descuento1','prov-descuento2','prov-descuento3',
   'prov-margen','prov-condicion-custom','prov-limite-credito','prov-nofiscal-pct']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const moneda = document.getElementById('prov-moneda');
  if (moneda) moneda.value = 'ARS';
  const condSel = document.getElementById('prov-condicion');
  if (condSel) condSel.value = 'contado';
  const diaSel = document.getElementById('prov-dia-pago');
  if (diaSel) diaSel.value = '';
  const rdoSin = document.querySelector('input[name="nofiscal-tipo"][value="sin_recargo"]');
  if (rdoSin) rdoSin.checked = true;
  onCondicionChange();
  onRecargoChange();
}

const CONDICION_LABELS = { contado: 'Contado', '15': '15 días', '30': '30 días', '45': '45 días', '60': '60 días', '90': '90 días', cta_cte: 'Cta. Cte.', consignacion: 'Consignación' };
const DIA_PAGO_LABELS  = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', dia_5: 'Día 5', dia_10: 'Día 10', dia_15: 'Día 15', dia_20: 'Día 20', ultimo: 'Último día' };

function labelCondicion(p) {
  if (p.condicion_pago === 'custom') return p.condicion_pago_custom || '—';
  return CONDICION_LABELS[p.condicion_pago] || p.condicion_pago || '—';
}
function labelDiaPago(val) { return DIA_PAGO_LABELS[val] || val || ''; }

const NOFISCAL_LABELS = {
  sin_recargo:   'Sin recargo',
  medio_iva:     'Medio IVA (10,5%)',
  personalizado: 'Personalizado',
};

function _badgeRecargoNoFiscal(p) {
  const tipo = p.recargo_no_fiscal_tipo || 'sin_recargo';
  const styles = {
    sin_recargo:  'background:#f0f0f0;color:#555',
    medio_iva:    'background:#fff8e1;color:#7a5c00',
    personalizado:'background:#e8f7ee;color:#1a7a3f',
  };
  const s     = styles[tipo] || 'background:#f0f0f0;color:#555';
  const label = NOFISCAL_LABELS[tipo] || tipo;
  const extra = tipo === 'personalizado' && p.recargo_no_fiscal_porcentaje != null
    ? ` — ${p.recargo_no_fiscal_porcentaje}%` : '';
  return `<span style="${s};padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600">${label}${extra}</span>`;
}

async function cargarProveedores() {
  const { data } = await db
    .from('proveedores')
    .select('*, importaciones(creado_en), recargo_no_fiscal_tipo, recargo_no_fiscal_porcentaje')
    .order('nombre');

  proveedoresList = data || [];
  const tbody = document.getElementById('tbody-proveedores');

  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="vacio">No hay proveedores. Agregá el primero.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(p => {
    const ultImp = p.importaciones?.length
      ? new Date(Math.max(...p.importaciones.map(i => new Date(i.creado_en)))).toLocaleDateString('es-AR')
      : 'Nunca';
    return `
      <tr>
        <td>
          <strong>${p.nombre}</strong>
          ${p.notas ? `<div style="font-size:11px;color:#aaa;margin-top:2px">${p.notas}</div>` : ''}
          <div style="font-size:11px;color:#888;margin-top:2px">${p.moneda || 'ARS'}</div>
        </td>
        <td>${p.archivo_nombre ? `<code style="font-size:12px;background:#f0f0f0;padding:2px 6px;border-radius:4px">${p.archivo_nombre}</code>` : '—'}</td>
        <td>${p.contacto || '—'}${p.email ? `<div style="font-size:11px;color:#888">${p.email}</div>` : ''}</td>
        <td style="font-size:12px">
          ${_badgeRecargoNoFiscal(p)}
        </td>
        <td style="font-size:13px">
          <strong>${labelCondicion(p)}</strong>
          ${p.limite_credito ? `<div style="font-size:11px;color:#888;margin-top:2px">Límite: $${Number(p.limite_credito).toLocaleString('es-AR')}</div>` : ''}
          ${p.dia_pago_preferido ? `<div style="font-size:11px;color:#aaa">${labelDiaPago(p.dia_pago_preferido)}</div>` : ''}
        </td>
        <td style="font-size:12px;white-space:nowrap">
          <span style="background:#fce8e8;color:#c00;padding:2px 7px;border-radius:4px;margin-right:3px">-${p.descuento_porcentaje ?? 0}%${(p.descuento_2 ?? 0) > 0 ? `/-${p.descuento_2}%` : ''}${(p.descuento_3 ?? 0) > 0 ? `/-${p.descuento_3}%` : ''}</span>
          <span style="background:#e6f7ee;color:#1a7a3f;padding:2px 7px;border-radius:4px">+${p.margen_venta ?? 30}% margen</span>
        </td>
        <td>${ultImp}</td>
        <td><span class="${p.activo ? 'badge-activo' : 'badge-inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="accion-btn accion-editar" onclick="editarProveedor('${p.id}')">Editar</button>
          <button class="accion-btn accion-eliminar" onclick="eliminarProveedor('${p.id}','${p.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function editarProveedor(id) {
  const p = proveedoresList.find(p => p.id === id);
  if (!p) return;
  editandoProvId = id;
  document.getElementById('prov-nombre').value      = p.nombre || '';
  document.getElementById('prov-archivo').value     = p.archivo_nombre || '';
  document.getElementById('prov-contacto').value    = p.contacto || '';
  document.getElementById('prov-email').value       = p.email || '';
  document.getElementById('prov-telefono').value    = p.telefono || '';
  document.getElementById('prov-notas').value       = p.notas || '';
  document.getElementById('prov-descuento1').value  = p.descuento_porcentaje ?? 0;
  document.getElementById('prov-descuento2').value  = p.descuento_2 ?? 0;
  document.getElementById('prov-descuento3').value  = p.descuento_3 ?? 0;
  document.getElementById('prov-margen').value = p.margen_venta ?? 30;
  document.getElementById('prov-moneda').value = p.moneda || 'ARS';

  // Condición de pago: si el valor guardado no es una opción del select, tratarlo como custom
  const condOpts = ['contado','15','30','45','60','90','cta_cte','consignacion','custom'];
  const condVal  = p.condicion_pago || '';
  if (condOpts.includes(condVal)) {
    document.getElementById('prov-condicion').value = condVal;
    if (condVal === 'custom') {
      document.getElementById('prov-condicion-custom').value = p.condicion_pago_custom || '';
    }
  } else if (condVal) {
    document.getElementById('prov-condicion').value = 'custom';
    document.getElementById('prov-condicion-custom').value = condVal;
  } else {
    document.getElementById('prov-condicion').value = 'contado';
  }
  onCondicionChange();

  document.getElementById('prov-limite-credito').value = p.limite_credito ?? '';
  document.getElementById('prov-dia-pago').value       = p.dia_pago_preferido || '';

  // Cargar recargo no fiscal
  const rdoTipo = p.recargo_no_fiscal_tipo || 'sin_recargo';
  const rdoInput = document.querySelector(`input[name="nofiscal-tipo"][value="${rdoTipo}"]`);
  if (rdoInput) rdoInput.checked = true;
  if (rdoTipo === 'personalizado' && p.recargo_no_fiscal_porcentaje != null) {
    document.getElementById('prov-nofiscal-pct').value = p.recargo_no_fiscal_porcentaje;
  }
  onRecargoChange();

  document.getElementById('prov-nombre').focus();
}

async function eliminarProveedor(id, nombre) {
  if (!confirm(`¿Eliminás "${nombre}" y todos sus productos importados?`)) return;
  const { error } = await db.from('proveedores').delete().eq('id', id);
  if (error) alert('Error: ' + error.message);
  else cargarProveedores();
}

// ══════════════════════════════════════════════════════
// PANEL 2: IMPORTAR EXCEL
// ══════════════════════════════════════════════════════

function iniciarPanelImport() {
  cargarProveedoresEnSelects();
}

async function cargarProveedoresEnSelects() {
  const { data } = await db.from('proveedores').select('id, nombre').eq('activo', true).order('nombre');
  if (!data) return;

  const selImp = document.getElementById('imp-proveedor');
  const selCat = document.getElementById('cat-proveedor-filtro');
  selImp.innerHTML = '<option value="">Seleccioná un proveedor</option>';
  selCat.innerHTML = '<option value="">Todos los proveedores</option>';
  data.forEach(p => {
    selImp.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
    selCat.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
  });
}

function onProveedorChange() {
  document.getElementById('seccion-mapeo').style.display = 'none';
  document.getElementById('seccion-resultado').style.display = 'none';
  rowsData = []; columnHeaders = []; archivoNombre = '';
  document.getElementById('file-input').value = '';
}

function onDragOver(e)  { e.preventDefault(); document.getElementById('upload-zone').classList.add('dragover'); }
function onDragLeave(e) { document.getElementById('upload-zone').classList.remove('dragover'); }
function onDrop(e)      { e.preventDefault(); document.getElementById('upload-zone').classList.remove('dragover'); procesarArchivo(e.dataTransfer.files[0]); }
function onFileSelect(e){ procesarArchivo(e.target.files[0]); }

async function procesarArchivo(file) {
  if (!file) return;
  archivoNombre = file.name;

  // Intentar auto-seleccionar proveedor por nombre de archivo
  await intentarAutoSeleccionarProveedor(archivoNombre);

  const proveedorId = document.getElementById('imp-proveedor').value;
  if (!proveedorId) { alert('Seleccioná un proveedor primero (ninguno coincidió con el nombre del archivo).'); return; }

  const FORMAT_LABELS = {
    estandar:  { label: 'Estándar Unificado', color: '#1a7a3f', bg: '#e6f7ee' },
    dam:       { label: 'DAM',                color: '#7a5c00', bg: '#fff8e1' },
    stellantis:{ label: 'Stellantis',         color: '#1a56c4', bg: '#e8f0fe' },
    manual:    { label: 'Mapeo manual',        color: '#555',    bg: '#f0f0f0' },
  };

  const reader = new FileReader();
  reader.onload = async (e) => {
    const data    = new Uint8Array(e.target.result);
    const wb      = XLSX.read(data, { type: 'array', cellText: true });
    const ws      = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

    if (!rawRows.length) { alert('El archivo está vacío.'); return; }

    formatoDetectado = detectarFormatoArchivo(rawRows);
    const fl = FORMAT_LABELS[formatoDetectado];

    if (formatoDetectado === 'estandar' || formatoDetectado === 'dam') {
      columnHeaders = rawRows[0].map((h, i) => ({ idx: i, nombre: h ? String(h).trim() : `Col ${i+1}` }));
      rowsData = rawRows.slice(1).filter(r => r.some(c => c !== ''));
      window._stellantisHeaderMap = null;
    } else if (formatoDetectado === 'stellantis') {
      columnHeaders = (rawRows[1] || []).map((h, i) => ({ idx: i, nombre: h ? String(h).trim() : `Col ${i+1}` }));
      rowsData = rawRows.slice(2).filter(r => r.some(c => c !== ''));
      window._stellantisHeaderMap = {};
      columnHeaders.forEach(h => { window._stellantisHeaderMap[h.nombre.toUpperCase()] = h.idx; });
    } else {
      // Manual: respetar selector de modo header
      const modoHeader = document.getElementById('imp-tiene-header').value;
      if (modoHeader === 'si') {
        columnHeaders = rawRows[0].map((h, i) => ({ idx: i, nombre: h ? String(h).trim() : `Col ${i+1}` }));
        rowsData = rawRows.slice(1).filter(r => r.some(c => c !== ''));
      } else if (modoHeader === 'fila2') {
        columnHeaders = (rawRows[1] || []).map((h, i) => ({ idx: i, nombre: h ? String(h).trim() : `Col ${i+1}` }));
        rowsData = rawRows.slice(2).filter(r => r.some(c => c !== ''));
      } else {
        columnHeaders = rawRows[0].map((_, i) => ({ idx: i, nombre: `Columna ${i+1}` }));
        rowsData = rawRows.filter(r => r.some(c => c !== ''));
      }
      window._stellantisHeaderMap = null;
    }

    document.getElementById('import-info').innerHTML =
      `<strong>${archivoNombre}</strong> — ` +
      `<strong>${rowsData.length.toLocaleString('es-AR')}</strong> filas · ` +
      `<strong>${columnHeaders.length}</strong> columnas · ` +
      `<span style="background:${fl.bg};color:${fl.color};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">${fl.label}</span>`;

    if (formatoDetectado !== 'manual') {
      // Mostrar preview de tabla sin el mapeador de columnas
      mostrarPreview();
      document.getElementById('mapeo-guardado-aviso').style.display = 'none';
      document.getElementById('mapeo-filas').innerHTML = `
        <div style="background:${fl.bg};border-radius:8px;padding:14px 18px;font-size:14px;color:${fl.color};margin-top:8px">
          ✅ Formato <strong>${fl.label}</strong> detectado — el mapeo de columnas es automático.
        </div>
      `;
    } else {
      mostrarPreview();
      await intentarCargarMapeoGuardado(proveedorId);
    }
  };
  reader.readAsArrayBuffer(file);
}

function mostrarPreview() {
  document.getElementById('import-info').innerHTML =
    `<strong>${archivoNombre}</strong> — <strong>${rowsData.length.toLocaleString('es-AR')}</strong> filas detectadas · <strong>${columnHeaders.length}</strong> columnas`;

  const preview = rowsData.slice(0, 5);
  const table   = document.getElementById('preview-table');
  table.innerHTML = `
    <thead>
      <tr>${columnHeaders.map(h => `<th>${h.nombre}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${preview.map(row => `<tr>${columnHeaders.map(h => `<td>${row[h.idx] ?? ''}</td>`).join('')}</tr>`).join('')}
    </tbody>
  `;

  const opciones = `<option value="">— No mapear —</option>` +
    columnHeaders.map(h => `<option value="${h.idx}">${h.nombre}</option>`).join('');

  document.getElementById('mapeo-filas').innerHTML = CAMPOS.map(c => `
    <div class="mapeo-grid">
      <div class="mapeo-cell">
        ${c.label}${c.req ? '<span class="req-badge">REQUERIDO</span>' : ''}
      </div>
      <div class="mapeo-cell">
        <select id="map-${c.key}">${opciones}</select>
      </div>
      <div class="mapeo-cell" id="preview-${c.key}" style="font-size:12px;color:#888;font-style:italic">—</div>
    </div>
  `).join('');

  CAMPOS.forEach(c => {
    document.getElementById('map-' + c.key).addEventListener('change', actualizarPreviewMapeo);
  });

  document.getElementById('seccion-mapeo').style.display = 'block';
}

function actualizarPreviewMapeo() {
  const primeraFila = rowsData[0];
  if (!primeraFila) return;
  CAMPOS.forEach(c => {
    const val = document.getElementById('map-' + c.key).value;
    const prev = document.getElementById('preview-' + c.key);
    prev.textContent = val !== '' ? (primeraFila[parseInt(val)] ?? '—') : '—';
  });
}

async function intentarCargarMapeoGuardado(proveedorId) {
  const { data } = await db.from('mapeos_proveedor').select('*').eq('proveedor_id', proveedorId);
  if (!data || !data.length) { document.getElementById('mapeo-guardado-aviso').style.display = 'none'; return; }

  let mapeado = 0;
  data.forEach(m => {
    const sel = document.getElementById('map-' + m.campo_sistema);
    if (!sel) return;
    const colEncontrada = columnHeaders.find(h => h.nombre === m.columna_nombre);
    if (colEncontrada) {
      sel.value = colEncontrada.idx;
      mapeado++;
    } else if (m.columna_indice !== null && columnHeaders[m.columna_indice]) {
      sel.value = m.columna_indice;
      mapeado++;
    }
  });

  if (mapeado > 0) {
    document.getElementById('mapeo-guardado-aviso').style.display = 'block';
    actualizarPreviewMapeo();
  }
}

async function ejecutarImport() {
  const proveedorId = document.getElementById('imp-proveedor').value;
  const reemplazar  = document.getElementById('reemplazar-check').checked;

  if (!proveedorId) { alert('Seleccioná un proveedor antes de importar.'); return; }
  if (!rowsData.length) { alert('No hay datos cargados. Seleccioná un archivo primero.'); return; }

  // Para formato manual requerir mapeo de nombre
  if (formatoDetectado === 'manual') {
    const nombreIdx = document.getElementById('map-nombre').value;
    if (nombreIdx === '') { alert('Debés mapear al menos el campo "Descripción del producto".'); return; }
  }

  // Config de precios del proveedor
  const { data: proveedor } = await db.from('proveedores')
    .select('descuento_porcentaje, descuento_2, descuento_3, margen_venta, iva_porcentaje')
    .eq('id', proveedorId).single();

  const d1 = proveedor?.descuento_porcentaje ?? 0;
  const d2 = proveedor?.descuento_2          ?? 0;
  const d3 = proveedor?.descuento_3          ?? 0;
  const descuentoEfectivo = (1 - (1 - d1/100) * (1 - d2/100) * (1 - d3/100)) * 100;
  const descuentoProv = Math.round(descuentoEfectivo * 100) / 100;
  const margenProv    = proveedor?.margen_venta   ?? 30;
  const ivaProv       = proveedor?.iva_porcentaje ?? 21;

  // Mapeo de columnas (solo para formato manual)
  const mapeo = {};
  if (formatoDetectado === 'manual') {
    CAMPOS.forEach(c => {
      const val = document.getElementById('map-' + c.key).value;
      if (val !== '') mapeo[c.key] = parseInt(val);
    });
  }

  const btnImportar = document.querySelector('[onclick="ejecutarImport()"]');
  if (btnImportar) { btnImportar.disabled = true; btnImportar.textContent = 'Importando...'; }

  // Guardar mapeo solo para formato manual
  if (formatoDetectado === 'manual') {
    const mapeoRows = CAMPOS
      .filter(c => mapeo[c.key] !== undefined)
      .map(c => ({
        proveedor_id:   proveedorId,
        campo_sistema:  c.key,
        columna_nombre: columnHeaders[mapeo[c.key]]?.nombre,
        columna_indice: mapeo[c.key],
      }));
    await db.from('mapeos_proveedor').upsert(mapeoRows, { onConflict: 'proveedor_id,campo_sistema' });
  }

  // Si reemplazar: recordar activos antes de borrar
  let activosOEM = new Set();
  let activosCod = new Set();
  if (reemplazar) {
    const { data: existentes } = await db.from('items_proveedor')
      .select('codigo_oem, codigo_proveedor, activo_en_tienda').eq('proveedor_id', proveedorId);
    existentes?.forEach(e => {
      if (e.activo_en_tienda) {
        if (e.codigo_oem)       activosOEM.add(e.codigo_oem);
        if (e.codigo_proveedor) activosCod.add(e.codigo_proveedor);
      }
    });
    await db.from('items_proveedor').delete().eq('proveedor_id', proveedorId);
  }

  // Registro de importación
  const { data: imp, error: errImp } = await db.from('importaciones').insert([{
    proveedor_id: proveedorId, nombre_archivo: archivoNombre, total_filas: rowsData.length,
  }]).select().single();
  if (errImp) console.warn('[ejecutarImport] error creando importación:', errImp.message);

  const provCtx = { proveedorId, impId: imp?.id, descuentoProv, margenProv, ivaProv, activosOEM, activosCod };

  // Estadísticas detalladas
  const stats = { conMarcaModelo: 0, conAnios: 0, conLado: 0, conCategoria: 0, sinVehiculo: 0 };

  // Índices compat legacy (solo manual)
  const idxCompatMarca  = mapeo['compat_marca']  !== undefined ? mapeo['compat_marca']  : null;
  const idxCompatModelo = mapeo['compat_modelo'] !== undefined ? mapeo['compat_modelo'] : null;

  // Builder para formato manual (mapeo configurable)
  function buildItemManual(row) {
    const item = {
      proveedor_id:       proveedorId,
      importacion_id:     imp?.id,
      descuento_aplicado: descuentoProv,
      margen_aplicado:    margenProv,
      iva_aplicado:       ivaProv,
    };
    CAMPOS.forEach(c => {
      if (mapeo[c.key] === undefined || c.stockExtra || c.noStore) return;
      const raw = row[mapeo[c.key]];
      if (c.key === 'precio_costo' || c.key === 'precio_lista') {
        item[c.key] = parsePrice(raw);
      } else if (c.key === 'stock') {
        item.stock = parseStockValue(raw) || null;
      } else if (c.key === 'lado') {
        item.lado = normalizarLado(raw);
      } else if (c.key === 'anio_desde_pieza' || c.key === 'anio_hasta_pieza') {
        const n = parseInt(raw); item[c.key] = isNaN(n) ? null : n;
      } else {
        item[c.key] = (raw !== undefined && raw !== '') ? String(raw).trim() : null;
      }
    });
    let stockTotal = item.stock || 0;
    ['stock_2', 'stock_3', 'stock_4'].forEach(key => {
      if (mapeo[key] !== undefined) stockTotal += parseStockValue(row[mapeo[key]]);
    });
    item.stock = stockTotal || null;
    if (!item.nombre?.trim()) return null;
    const analizado = analizarDescripcion(item.descripcion || item.nombre, item.marca_vehiculo, item.vehiculo);
    if (!item.marca_vehiculo && analizado.marca_vehiculo) item.marca_vehiculo = analizado.marca_vehiculo;
    if (!item.vehiculo       && analizado.vehiculo)       item.vehiculo       = analizado.vehiculo;
    if (!item.lado           && analizado.lado)           item.lado           = analizado.lado;
    if (!item.version_formato  && analizado.version_formato)  item.version_formato  = analizado.version_formato;
    if (!item.anio_desde_pieza && analizado.anio_desde_pieza) item.anio_desde_pieza = analizado.anio_desde_pieza;
    if (!item.anio_hasta_pieza && analizado.anio_hasta_pieza) item.anio_hasta_pieza = analizado.anio_hasta_pieza;
    item.activo_en_tienda =
      (item.codigo_oem       && activosOEM.has(item.codigo_oem)) ||
      (item.codigo_proveedor && activosCod.has(item.codigo_proveedor));
    return item;
  }

  const stellantisHeaderMap = window._stellantisHeaderMap || {};

  // Dispatcher principal
  function buildRow(row) {
    let item = null;
    if (formatoDetectado === 'estandar' || formatoDetectado === 'dam') {
      item = buildItemEstandar(row, formatoDetectado, provCtx);
    } else if (formatoDetectado === 'stellantis') {
      item = buildItemStellantis(row, provCtx, stellantisHeaderMap);
    } else {
      item = buildItemManual(row);
    }
    if (!item) return null;
    // Estadísticas
    if (item.marca_vehiculo || item.vehiculo) stats.conMarcaModelo++; else stats.sinVehiculo++;
    if (item.anio_desde_pieza || item.anio_hasta_pieza) stats.conAnios++;
    if (item.lado) stats.conLado++;
    if (item.categoria_hint || detectarCategoria(item.nombre)) stats.conCategoria++;
    return item;
  }

  function extraerCompat(row, item) {
    const cmLegacy = idxCompatMarca  !== null ? String(row[idxCompatMarca]  ?? '').trim() : null;
    const moLegacy = idxCompatModelo !== null ? String(row[idxCompatModelo] ?? '').trim() : null;
    const cm = cmLegacy || item?.marca_vehiculo || null;
    const mo = moLegacy || item?.vehiculo       || null;
    return (cm || mo) ? { _compat_marca: cm, _compat_modelo: mo } : null;
  }

  // Agrupar por codigo_proveedor (fusionar compatibilidades)
  const agrupados = {};
  const sinCodigo = [];
  let omitidas = 0;

  rowsData.forEach(row => {
    const item = buildRow(row);
    if (!item) { omitidas++; return; }
    const compat   = extraerCompat(row, item);
    const rawEntry = compat ? { ...row, ...compat } : row;
    const cod = item.codigo_proveedor;
    if (cod) {
      if (!agrupados[cod]) { agrupados[cod] = { ...item, datos_raw: [rawEntry] }; }
      else                 { agrupados[cod].datos_raw.push(rawEntry); }
    } else {
      item.datos_raw = rawEntry;
      sinCodigo.push(item);
    }
  });

  const itemsConsolidados = [...Object.values(agrupados), ...sinCodigo];
  const duplicadosConsolidados = rowsData.length - omitidas - itemsConsolidados.length;

  // Insertar en lotes de 200
  const BATCH = 200;
  let ok = 0, errores = 0;
  for (let i = 0; i < itemsConsolidados.length; i += BATCH) {
    const lote = itemsConsolidados.slice(i, i + BATCH);
    const { error } = await db.from('items_proveedor').insert(lote);
    if (error) { console.error('[ejecutarImport] error lote', i, ':', error.message); errores += lote.length; }
    else ok += lote.length;
  }

  // Autogenerar códigos propios
  let codigosAsignados = 0;
  if (imp?.id) {
    const { data: codsResult, error: codsError } = await db.rpc(
      'asignar_codigos_propios_importacion', { p_importacion_id: imp.id }
    );
    if (codsError) console.warn('[ejecutarImport] error asignando códigos propios:', codsError.message);
    else codigosAsignados = codsResult || 0;
  }

  if (imp) await db.from('importaciones').update({ filas_ok: ok }).eq('id', imp.id);
  if (btnImportar) { btnImportar.disabled = false; btnImportar.textContent = 'Importar todas las filas'; }

  const FORMAT_LABELS = { estandar: 'Estándar Unificado', dam: 'DAM', stellantis: 'Stellantis', manual: 'Manual' };

  const statRow = (label, val, total, warn) => {
    const pct = total ? Math.round(val / total * 100) : 0;
    const color = warn && pct < warn ? '#c00' : '#555';
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:13px">
      <span style="color:#666">${label}</span>
      <span style="font-weight:700;color:${color}">${val.toLocaleString('es-AR')} <span style="font-size:11px;font-weight:400">(${pct}%)</span></span>
    </div>`;
  };

  document.getElementById('seccion-mapeo').style.display = 'none';
  document.getElementById('seccion-resultado').style.display = 'block';
  document.getElementById('resultado-contenido').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      <div style="background:#e6f7ee;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:#1a7a3f">${ok.toLocaleString('es-AR')}</div>
        <div style="font-size:12px;color:#1a7a3f;margin-top:4px">Importados</div>
      </div>
      <div style="background:#f0f8ff;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:#555">${omitidas.toLocaleString('es-AR')}</div>
        <div style="font-size:12px;color:#555;margin-top:4px">Omitidos (sin nombre)</div>
      </div>
      <div style="background:${errores ? '#fce8e8' : '#f0f0f0'};border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:${errores ? '#c00' : '#888'}">${errores}</div>
        <div style="font-size:12px;color:${errores ? '#c00' : '#888'};margin-top:4px">Errores</div>
      </div>
      <div style="background:#f0f0f0;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:#333">${rowsData.length.toLocaleString('es-AR')}</div>
        <div style="font-size:12px;color:#666;margin-top:4px">Total en archivo</div>
      </div>
    </div>

    <div style="background:#f8f8f8;border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#888;margin-bottom:8px;text-transform:uppercase">Cobertura de datos</div>
      ${statRow('Con marca/modelo de vehículo', stats.conMarcaModelo, ok)}
      ${statRow('Con año(s) de aplicación',     stats.conAnios,       ok)}
      ${statRow('Con lado de montaje',           stats.conLado,        ok)}
      ${statRow('Sin referencia de vehículo',    stats.sinVehiculo,    ok)}
    </div>

    ${duplicadosConsolidados > 0 ? `
      <div style="background:#fff3cd;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:13px;color:#856404">
        ⚡ <strong>${duplicadosConsolidados}</strong> filas con código repetido fueron fusionadas (múltiples compatibilidades).
      </div>` : ''}
    ${codigosAsignados > 0 ? `
      <div style="background:#e6f7ee;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:13px;color:#1a7a3f">
        🏷️ <strong>${codigosAsignados}</strong> código${codigosAsignados !== 1 ? 's' : ''} propio${codigosAsignados !== 1 ? 's' : ''} asignado${codigosAsignados !== 1 ? 's' : ''} automáticamente.
      </div>` : ''}
    <div style="background:#e8f0fe;border-radius:8px;padding:10px 14px;font-size:13px;color:#1a56c4">
      💰 Cadena: ${d1 ? `-${d1}%` : ''}${d2 ? `/-${d2}%` : ''}${d3 ? `/-${d3}%` : ''} desc. neto ≈ -${descuentoProv}% · +${ivaProv}% IVA · +${margenProv}% margen
      · Formato: <strong>${FORMAT_LABELS[formatoDetectado] || formatoDetectado}</strong>
    </div>
    ${formatoDetectado === 'manual' ? `
      <p style="font-size:14px;color:#555;margin-top:12px">
        Mapeo guardado para <strong>${archivoNombre}</strong>. La próxima importación lo aplicará automáticamente.
      </p>` : ''}
  `;
}

function cancelarImport() {
  document.getElementById('seccion-mapeo').style.display = 'none';
  rowsData = []; columnHeaders = []; archivoNombre = '';
  document.getElementById('file-input').value = '';
}

function resetImport() {
  cancelarImport();
  document.getElementById('seccion-resultado').style.display = 'none';
  document.getElementById('imp-proveedor').value = '';
}

// ══ HELPERS DE PUBLICACIÓN ════════════════════════════════════

async function matchCategoria(hint) {
  if (!hint) return null;
  const { data: cats } = await db.from('categorias').select('id, nombre, slug');
  if (!cats || !cats.length) return null;
  const h = hint.toLowerCase().trim();
  const exacto  = cats.find(c => c.nombre.toLowerCase() === h || c.slug?.toLowerCase() === h);
  if (exacto) return exacto.id;
  const parcial = cats.find(c => c.nombre.toLowerCase().includes(h) || h.includes(c.nombre.toLowerCase()));
  return parcial?.id || null;
}

async function intentarMatchCompatibilidades(productoId, rawEntries) {
  const entradas = (Array.isArray(rawEntries) ? rawEntries : [rawEntries])
    .filter(r => r?._compat_marca || r?._compat_modelo);
  if (!entradas.length) return 0;

  const { data: marcas  } = await db.from('marcas_auto').select('id, nombre');
  const { data: modelos } = await db.from('modelos_auto').select('id, nombre, marca_id');
  if (!marcas || !modelos) return 0;

  const compatRows = [];
  entradas.forEach(raw => {
    const marcaStr  = (raw._compat_marca  || '').toLowerCase().trim();
    const modeloStr = (raw._compat_modelo || '').toLowerCase().trim();
    if (!marcaStr && !modeloStr) return;

    const marcaMatch = marcas.find(m =>
      m.nombre.toLowerCase() === marcaStr ||
      m.nombre.toLowerCase().includes(marcaStr) ||
      marcaStr.includes(m.nombre.toLowerCase())
    );
    if (!marcaMatch) return;

    const modeloMatch = modelos.find(m =>
      m.marca_id === marcaMatch.id && (
        m.nombre.toLowerCase() === modeloStr ||
        m.nombre.toLowerCase().includes(modeloStr) ||
        modeloStr.includes(m.nombre.toLowerCase())
      )
    );
    if (modeloMatch) compatRows.push({ producto_id: productoId, modelo_id: modeloMatch.id });
  });

  if (!compatRows.length) return 0;
  const { error } = await db.from('compatibilidades')
    .upsert(compatRows, { onConflict: 'producto_id,modelo_id', ignoreDuplicates: true });
  if (error) console.warn('[matchCompat] error:', error.message);
  return compatRows.length;
}

// ══════════════════════════════════════════════════════
// PANEL 3: CATÁLOGO & MEJOR PRECIO
// ══════════════════════════════════════════════════════

const CATALOGO_LIMIT = 100;
let _catalogoPagina  = 0;
let _catalogoTotal   = 0;
let _catalogoFiltros = { texto: '', provId: '', estado: '' };

async function cargarCatalogo() {
  _catalogoPagina = 0;
  _catalogoFiltros = {
    texto:  (document.getElementById('cat-buscar')?.value || '').trim(),
    provId: document.getElementById('cat-proveedor-filtro')?.value || '',
    estado: document.getElementById('cat-estado-filtro')?.value || '',
  };
  await _queryCatalogo();
}

async function _queryCatalogo() {
  document.getElementById('catalogo-contenido').innerHTML = '<div class="loader" style="padding:40px">Cargando catálogo...</div>';

  const from = _catalogoPagina * CATALOGO_LIMIT;
  const to   = from + CATALOGO_LIMIT - 1;

  let q = db.from('items_proveedor')
    .select('*, proveedores(id, nombre, descuento_porcentaje, descuento_2, descuento_3, margen_venta, iva_porcentaje)', { count: 'exact' })
    .order('nombre')
    .range(from, to);

  const { texto, provId, estado } = _catalogoFiltros;
  if (texto)  q = q.or(`nombre.ilike.%${texto}%,codigo_oem.ilike.%${texto}%,codigo_proveedor.ilike.%${texto}%,codigo_propio.ilike.%${texto}%`);
  if (provId) q = q.eq('proveedor_id', provId);
  if (estado === 'publicado')    q = q.eq('activo_en_tienda', true);
  if (estado === 'no-publicado') q = q.eq('activo_en_tienda', false);

  const { data: items, error, count } = await q;
  if (error) {
    document.getElementById('catalogo-contenido').innerHTML = `<p class="vacio">Error: <code>${error.message}</code></p>`;
    return;
  }
  _catalogoTotal = count || 0;
  todosLosItems  = items || [];
  renderCatalogo(todosLosItems);
}

async function filtrarCatalogo() {
  await cargarCatalogo();
}

// Genera el HTML de la cadena de precios para un item
function renderPrecioChain(item) {
  if (!item.precio_lista) return '';
  const desc   = item.descuento_aplicado ?? 0;
  const iva    = item.iva_aplicado       ?? 21;
  const margen = item.margen_aplicado    ?? 30;
  const pcd    = item.precio_con_descuento;
  const pneto  = item.precio_neto;
  const pventa = item.precio_venta;

  return `
    <div class="precio-chain">
      <span class="pc-label">Lista</span>
      <span class="pc-valor">${fmtPrecio(item.precio_lista)}</span>
      ${desc ? `<span class="pc-flecha">›</span><span class="pc-descuento">-${desc}% desc</span><span class="pc-flecha">›</span><span class="pc-valor">${fmtPrecio(pcd)}</span>` : ''}
      <span class="pc-flecha">›</span>
      <span class="pc-iva">+${iva}% IVA</span>
      <span class="pc-flecha">›</span>
      <span class="pc-neto">${fmtPrecio(pneto)}</span>
      <span class="pc-flecha">›</span>
      <span class="pc-margen">+${margen}% margen</span>
      <span class="pc-flecha">›</span>
      <span class="pc-venta">${fmtPrecio(pventa)}</span>
    </div>
  `;
}

function calcPreciosProv(item) {
  const p = item.proveedores;
  const lista = parseFloat(item.precio_lista) || 0;
  if (!p || !lista) return { lista, pNeto: null, pVenta: null };
  const d1     = parseFloat(p.descuento_porcentaje) || 0;
  const d2     = parseFloat(p.descuento_2)           || 0;
  const d3     = parseFloat(p.descuento_3)           || 0;
  const iva    = parseFloat(p.iva_porcentaje)        || 21;
  const margen = parseFloat(p.margen_venta)          || 0;
  const pNeto  = lista * (1 - d1/100) * (1 - d2/100) * (1 - d3/100);
  const pConIva = pNeto * (1 + iva/100);
  const pVenta  = pConIva * (1 + margen/100);
  return { lista, d1, d2, d3, iva, margen, pNeto, pConIva, pVenta };
}

function renderCatalogo(items) {
  const publicados = items.filter(i => i.activo_en_tienda).length;
  const conVenta   = items.filter(i => calcPreciosProv(i).pVenta).length;
  const totalPags  = Math.ceil(_catalogoTotal / CATALOGO_LIMIT) || 1;
  const from       = _catalogoPagina * CATALOGO_LIMIT;

  document.getElementById('catalogo-stats').innerHTML = `
    <div class="stat-pill"><strong>${_catalogoTotal.toLocaleString('es-AR')}</strong>total en BD</div>
    <div class="stat-pill"><strong style="color:#1a7a3f">${publicados}</strong>pub. (pág.)</div>
    <div class="stat-pill"><strong style="color:#1a56c4">${conVenta}</strong>con precio</div>
    <div class="stat-pill"><strong>${_catalogoPagina + 1}/${totalPags}</strong>página</div>
  `;

  if (!items.length) {
    document.getElementById('catalogo-contenido').innerHTML =
      '<p class="vacio" style="padding:40px">No hay productos. Importá listas de precios primero.</p>';
    return;
  }

  const fmtN = n => n != null ? Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  const filas = items.map(item => {
    const { lista, d1, d2, d3, iva, pNeto, pVenta } = calcPreciosProv(item);
    const descStr = [d1 && `${d1}%`, d2 && `${d2}%`, d3 && `${d3}%`].filter(Boolean).join('+') || '—';
    const pubLabel = item.activo_en_tienda
      ? `<span style="background:#e6f7ee;color:#1a7a3f;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap">✅ Pub.</span>`
      : `<button class="btn-publicar publicar" style="font-size:11px;padding:3px 10px" onclick="togglePublicarItem('${item.id}', true, this)">Publicar</button>`;

    return `<tr style="border-bottom:1px solid #f0f0f0;font-size:13px">
      <td style="padding:8px 10px;text-align:center"><input type="checkbox" class="cat-chk" data-id="${item.id}" style="width:14px;height:14px;cursor:pointer"></td>
      <td style="padding:8px 10px;color:#555;font-family:monospace;font-size:11px">${item.codigo_propio || '—'}</td>
      <td style="padding:8px 10px;color:#555;font-family:monospace;font-size:11px">${item.codigo_proveedor || '—'}</td>
      <td style="padding:8px 10px;font-weight:600;color:#222;max-width:220px">
        <div>${item.nombre}</div>
        ${item.codigo_oem ? `<div style="font-size:10px;color:#aaa">OEM: ${item.codigo_oem}</div>` : ''}
      </td>
      <td style="padding:8px 10px;color:#666;white-space:nowrap">${item.marca_vehiculo || '—'}</td>
      <td style="padding:8px 10px;color:#666;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.vehiculo || '—'}</td>
      <td style="padding:8px 10px;text-align:right;white-space:nowrap">${lista ? '$' + fmtN(lista) : '—'}</td>
      <td style="padding:8px 10px;text-align:center;font-size:12px;color:#e05c00;font-weight:700">${descStr}</td>
      <td style="padding:8px 10px;text-align:right;white-space:nowrap">${pNeto ? '$' + fmtN(pNeto) : '—'}</td>
      <td style="padding:8px 10px;text-align:center;font-size:12px;color:#555">${iva ? iva + '%' : '—'}</td>
      <td style="padding:8px 10px;text-align:right;white-space:nowrap">${pVenta ? `<span style="font-weight:800;color:#e63946">$${fmtN(pVenta)}</span>` : '<span style="color:#aaa">—</span>'}</td>
      <td style="padding:8px 10px;color:#666;font-size:12px;white-space:nowrap">${item.proveedores?.nombre || '—'}</td>
      <td style="padding:8px 10px;text-align:center">${pubLabel}</td>
    </tr>`;
  }).join('');

  const btnPrev = _catalogoPagina > 0
    ? `<button class="btn btn-blanco" onclick="irPaginaCatalogo(${_catalogoPagina - 1})" style="padding:7px 16px;font-size:13px">← Anterior</button>`
    : `<button class="btn btn-blanco" disabled style="padding:7px 16px;font-size:13px;opacity:.4;cursor:not-allowed">← Anterior</button>`;
  const btnNext = (_catalogoPagina + 1) < totalPags
    ? `<button class="btn btn-rojo" onclick="irPaginaCatalogo(${_catalogoPagina + 1})" style="padding:7px 16px;font-size:13px">Siguiente →</button>`
    : `<button class="btn btn-rojo" disabled style="padding:7px 16px;font-size:13px;opacity:.4;cursor:not-allowed">Siguiente →</button>`;

  document.getElementById('catalogo-contenido').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap">
      <label style="font-size:13px;color:#666;display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="cat-chk-todos" onchange="seleccionarTodosCatalogo(this.checked)" style="width:14px;height:14px">
        Seleccionar todos
      </label>
      <span style="font-size:13px;color:#888" id="cat-seleccionados-label">0 seleccionados</span>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:9px 8px;width:36px"></th>
            <th style="padding:9px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Cód. propio</th>
            <th style="padding:9px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Cód. proveedor</th>
            <th style="padding:9px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Nombre</th>
            <th style="padding:9px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Marca veh.</th>
            <th style="padding:9px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Vehículo</th>
            <th style="padding:9px;text-align:right;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Precio lista</th>
            <th style="padding:9px;text-align:center;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Desc%</th>
            <th style="padding:9px;text-align:right;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Precio neto</th>
            <th style="padding:9px;text-align:center;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">IVA</th>
            <th style="padding:9px;text-align:right;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Precio venta</th>
            <th style="padding:9px;text-align:left;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Proveedor</th>
            <th style="padding:9px;text-align:center;font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Publicado</th>
          </tr>
        </thead>
        <tbody id="cat-tbody">${filas}</tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;flex-wrap:wrap;gap:10px">
      <span style="font-size:13px;color:#888">Mostrando ${from + 1}–${Math.min(from + items.length, _catalogoTotal)} de ${_catalogoTotal.toLocaleString('es-AR')}</span>
      <div style="display:flex;align-items:center;gap:8px">
        ${btnPrev}
        <span style="font-size:13px;font-weight:700;color:#333">Pág. ${_catalogoPagina + 1} de ${totalPags}</span>
        ${btnNext}
      </div>
    </div>
  `;

  document.getElementById('cat-tbody').addEventListener('change', () => {
    const n = document.querySelectorAll('.cat-chk:checked').length;
    const el = document.getElementById('cat-seleccionados-label');
    if (el) el.textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`;
  });
}

function irPaginaCatalogo(pagina) {
  _catalogoPagina = pagina;
  _queryCatalogo();
}

function seleccionarTodosCatalogo(checked) {
  document.querySelectorAll('.cat-chk').forEach(c => { c.checked = checked; });
  const n = checked ? document.querySelectorAll('.cat-chk').length : 0;
  const el = document.getElementById('cat-seleccionados-label');
  if (el) el.textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`;
}

async function publicarSeleccionados() {
  const ids = [...document.querySelectorAll('.cat-chk:checked')].map(c => c.dataset.id);
  if (!ids.length) { alert('Seleccioná al menos un item para publicar.'); return; }
  if (!confirm(`¿Publicar ${ids.length} item${ids.length !== 1 ? 's' : ''} en la tienda?`)) return;

  const btn = document.getElementById('btn-publicar-seleccionados');
  if (btn) { btn.disabled = true; btn.textContent = `Publicando ${ids.length}...`; }

  let ok = 0, errores = 0;
  for (const id of ids) {
    try { await togglePublicarItem(id, true, null); ok++; }
    catch (e) { errores++; }
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Publicar seleccionados'; }
  alert(`✅ Publicados: ${ok}${errores ? `  ❌ Errores: ${errores}` : ''}`);
}

// ── legacy: mantener togglePublicarGrupo operativo ──────────────
function _legacyRenderCatalogoCards(items) {
  // Agrupar por OEM
  const grupos = {};
  const sinOEM = [];

  items.forEach(item => {
    const oem = item.codigo_oem?.trim();
    if (oem) {
      if (!grupos[oem]) grupos[oem] = [];
      grupos[oem].push(item);
    } else {
      sinOEM.push(item);
    }
  });

  let html = '';

  const entradasOEM = Object.entries(grupos);
  entradasOEM.sort((a, b) => a[1][0].nombre.localeCompare(b[1][0].nombre));

  entradasOEM.forEach(([oem, grpItems]) => {
    const conPrecio   = grpItems.filter(i => i.precio_lista);
    const minPrecio   = conPrecio.length ? Math.min(...conPrecio.map(i => i.precio_lista)) : null;
    const mejorItem   = conPrecio.find(i => i.precio_lista === minPrecio) || grpItems[0];
    const yaPublicado = grpItems.some(i => i.activo_en_tienda);
    const stockTotal  = grpItems.reduce((a, i) => a + (i.stock || 0), 0);

    const provsHtml = grpItems.map(item => {
      const esMejor = item === mejorItem;
      return `
        <span class="prov-pill ${esMejor ? 'mejor' : 'normal'}">
          <span>${item.proveedores?.nombre || '—'}</span>
          <strong>${item.precio_lista ? '$' + Number(item.precio_lista).toLocaleString('es-AR') : 'sin precio'}</strong>
          ${item.codigo_propio ? `<code style="font-size:10px;opacity:.7">${item.codigo_propio}</code>` : ''}
          ${esMejor ? '<span class="estrella">★ mejor</span>' : ''}
        </span>
      `;
    }).join('');

    const infoVehiculo = mejorItem.marca_vehiculo || mejorItem.vehiculo
      ? ` · ${[mejorItem.marca_vehiculo, mejorItem.vehiculo, mejorItem.version_formato].filter(Boolean).join(' ')}`
        + (mejorItem.anio_desde_pieza ? ` ${mejorItem.anio_desde_pieza}${mejorItem.anio_hasta_pieza ? '/' + mejorItem.anio_hasta_pieza : ''}` : '')
        + (mejorItem.lado ? ` · Lado ${mejorItem.lado}` : '')
      : '';

    html += `
      <div class="grupo-card">
        <div class="grupo-header">
          <div>
            <div class="grupo-nombre">${grpItems[0].nombre}</div>
            <div class="grupo-oem">OEM: ${oem}${grpItems[0].fabricante ? ` · Fab: ${grpItems[0].fabricante}` : ''}${grpItems[0].marca ? ` · ${grpItems[0].marca}` : ''} · Stock: ${stockTotal}${infoVehiculo}</div>
          </div>
          <div class="grupo-acciones">
            <div>
              <div class="precio-mejor">${mejorItem.precio_venta ? fmtPrecio(mejorItem.precio_venta) : (minPrecio ? fmtPrecio(minPrecio) : '—')}</div>
              <div style="font-size:11px;color:#aaa;text-align:right">${mejorItem.precio_venta ? 'precio venta' : 'precio lista'}</div>
            </div>
            <button
              class="btn-publicar ${yaPublicado ? 'publicado' : 'publicar'}"
              onclick="togglePublicarGrupo('${oem}', ${!yaPublicado})"
            >${yaPublicado ? '✅ Publicado' : 'Publicar en tienda'}</button>
          </div>
        </div>
        <div class="provs-lista">${provsHtml}</div>
        ${renderPrecioChain(mejorItem)}
      </div>
    `;
  });

  // Items SIN OEM
  if (sinOEM.length) {
    html += `
      <div style="margin:20px 0 10px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase">
        Productos sin código OEM (${sinOEM.length})
      </div>
    `;
    sinOEM.forEach(item => {
      const compatCount = Array.isArray(item.datos_raw) ? item.datos_raw.length : 0;
      html += `
        <div class="sin-oem-card">
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px">
              ${item.nombre}
              ${compatCount > 1 ? `<span style="background:#e8f0fe;color:#1a56c4;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:6px">${compatCount} compats</span>` : ''}
            </div>
            <div style="font-size:12px;color:#888;margin-top:2px">
              ${item.proveedores?.nombre || '—'} · Cód: ${item.codigo_proveedor || '—'} · ${item.codigo_propio ? `PZA: ${item.codigo_propio} · ` : ''}${item.precio_lista ? '$' + Number(item.precio_lista).toLocaleString('es-AR') : 'sin precio'}
            </div>
            ${renderPrecioChain(item)}
          </div>
          <button
            class="btn-publicar ${item.activo_en_tienda ? 'publicado' : 'publicar'}"
            onclick="togglePublicarItem('${item.id}', ${!item.activo_en_tienda}, this)"
          >${item.activo_en_tienda ? '✅ Publicado' : 'Publicar'}</button>
        </div>
      `;
    });
  }

  document.getElementById('catalogo-contenido').innerHTML = html ||
    '<p class="vacio" style="padding:40px">No hay productos. Importá listas de precios primero.</p>';
} // fin _legacyRenderCatalogoCards

async function togglePublicarGrupo(codigoOEM, publicar) {
  if (publicar) {
    const { data: items } = await db
      .from('items_proveedor')
      .select('*, proveedores(nombre)')
      .eq('codigo_oem', codigoOEM)
      .not('precio_lista', 'is', null)
      .order('precio_venta');

    const todosItems = await db
      .from('items_proveedor')
      .select('*')
      .eq('codigo_oem', codigoOEM);

    const mejor = items?.[0] || todosItems.data?.[0];
    if (!mejor) return;

    const categoriaId = await matchCategoria(mejor.categoria_hint);
    const prodData = {
      nombre:          mejor.nombre,
      descripcion:     mejor.descripcion || null,
      codigo_pieza:    codigoOEM,
      codigo_propio:   mejor.codigo_propio || null,
      fabricante:      mejor.fabricante || null,
      marca_vehiculo:  mejor.marca_vehiculo || null,
      vehiculo:        mejor.vehiculo || null,
      version_formato: mejor.version_formato || null,
      anio_desde:      mejor.anio_desde_pieza || null,
      anio_hasta:      mejor.anio_hasta_pieza || null,
      lado:            mejor.lado || null,
      precio:          mejor.precio_venta || mejor.precio_lista || 0,
      precio_lista:    mejor.precio_lista || null,
      stock:           mejor.stock || 0,
      marca_producto:  mejor.marca || null,
      categoria_id:    categoriaId,
      activo:          true,
    };

    let productoId = todosItems.data?.find(i => i.producto_id)?.producto_id;

    if (productoId) {
      await db.from('productos').update(prodData).eq('id', productoId);
    } else {
      const { data: prod } = await db.from('productos').insert([prodData]).select().single();
      productoId = prod?.id;
    }

    await db.from('items_proveedor')
      .update({ activo_en_tienda: true, producto_id: productoId })
      .eq('codigo_oem', codigoOEM);

    const allRaw = (todosItems.data || []).flatMap(i =>
      Array.isArray(i.datos_raw) ? i.datos_raw : [i.datos_raw]).filter(Boolean);
    const compatCount = await intentarMatchCompatibilidades(productoId, allRaw);

    const msg = [`✅ Publicado — Precio venta ${fmtPrecio(mejor.precio_venta)} (${mejor.proveedores?.nombre})`];
    if (compatCount) msg.push(`🔗 ${compatCount} compatibilidad${compatCount > 1 ? 'es' : ''} detectada${compatCount > 1 ? 's' : ''}.`);
    alert(msg.join('\n'));
  } else {
    const { data: items } = await db
      .from('items_proveedor')
      .select('producto_id')
      .eq('codigo_oem', codigoOEM)
      .not('producto_id', 'is', null)
      .limit(1);

    if (items?.[0]?.producto_id) {
      await db.from('productos').update({ activo: false }).eq('id', items[0].producto_id);
    }
    await db.from('items_proveedor')
      .update({ activo_en_tienda: false })
      .eq('codigo_oem', codigoOEM);
  }

  cargarCatalogo();
}

async function togglePublicarItem(id, publicar, btn) {
  if (publicar) {
    const { data: item } = await db.from('items_proveedor').select('*').eq('id', id).single();
    if (!item) return;

    const rawEntries = Array.isArray(item.datos_raw) ? item.datos_raw : [item.datos_raw].filter(Boolean);
    const categoriaId = await matchCategoria(item.categoria_hint);
    const prodData = {
      nombre:          item.nombre,
      descripcion:     item.descripcion || null,
      codigo_pieza:    item.codigo_proveedor || null,
      codigo_propio:   item.codigo_propio || null,
      fabricante:      item.fabricante || null,
      marca_vehiculo:  item.marca_vehiculo || null,
      vehiculo:        item.vehiculo || null,
      version_formato: item.version_formato || null,
      anio_desde:      item.anio_desde_pieza || null,
      anio_hasta:      item.anio_hasta_pieza || null,
      lado:            item.lado || null,
      precio:          item.precio_venta || item.precio_lista || 0,
      precio_lista:    item.precio_lista || null,
      stock:           item.stock || 0,
      marca_producto:  item.marca || null,
      categoria_id:    categoriaId,
      activo:          true,
    };

    let productoId = item.producto_id;
    if (productoId) {
      await db.from('productos').update(prodData).eq('id', productoId);
    } else {
      const { data: prod } = await db.from('productos').insert([prodData]).select().single();
      productoId = prod?.id;
    }

    await db.from('items_proveedor')
      .update({ activo_en_tienda: true, producto_id: productoId })
      .eq('id', id);

    const matched = await intentarMatchCompatibilidades(productoId, rawEntries);
    if (matched) console.log(`[togglePublicarItem] ${matched} compatibilidad(es) detectada(s).`);
  } else {
    const { data: item } = await db.from('items_proveedor').select('producto_id').eq('id', id).single();
    if (item?.producto_id) await db.from('productos').update({ activo: false }).eq('id', item.producto_id);
    await db.from('items_proveedor').update({ activo_en_tienda: false }).eq('id', id);
  }

  cargarCatalogo();
}

// ══════════════════════════════════════════════════════
// PANEL 4: EQUIVALENCIAS OEM
// ══════════════════════════════════════════════════════

let todasEquivalencias = [];

async function agregarEquivalencia() {
  const a   = document.getElementById('eq-oem-a').value.trim().toUpperCase();
  const b   = document.getElementById('eq-oem-b').value.trim().toUpperCase();
  const nom = document.getElementById('eq-nombre').value.trim();
  const msg = document.getElementById('eq-msg');

  if (!a || !b) { msg.textContent = '⚠️ Ingresá los dos códigos OEM.'; msg.style.color = '#c00'; return; }
  if (a === b)  { msg.textContent = '⚠️ Los dos códigos deben ser distintos.'; msg.style.color = '#c00'; return; }

  const { error } = await db.from('equivalencias_oem').insert([{
    codigo_oem_a: a,
    codigo_oem_b: b,
    nombre_comun: nom || null,
    verificada:   true
  }]);

  if (error) {
    msg.textContent = error.message.includes('unique') ? '⚠️ Esta equivalencia ya existe.' : '❌ ' + error.message;
    msg.style.color = '#c00';
  } else {
    msg.textContent = '✅ Equivalencia guardada.'; msg.style.color = '#1a7a3f';
    document.getElementById('eq-oem-a').value = '';
    document.getElementById('eq-oem-b').value = '';
    document.getElementById('eq-nombre').value = '';
    cargarEquivalencias();
  }
}

async function cargarEquivalencias() {
  const { data } = await db.from('equivalencias_oem').select('*').order('creado_en', { ascending: false });
  todasEquivalencias = data || [];
  renderEquivalencias(todasEquivalencias);
}

function filtrarEquivalencias() {
  const txt = document.getElementById('eq-buscar').value.toLowerCase();
  renderEquivalencias(todasEquivalencias.filter(e =>
    e.codigo_oem_a.toLowerCase().includes(txt) ||
    e.codigo_oem_b.toLowerCase().includes(txt) ||
    (e.nombre_comun || '').toLowerCase().includes(txt)
  ));
}

function renderEquivalencias(data) {
  const tbody = document.getElementById('tbody-equivalencias');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="vacio">No hay equivalencias registradas.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(e => `
    <tr>
      <td><code style="background:#f0f0f0;padding:2px 8px;border-radius:4px">${e.codigo_oem_a}</code></td>
      <td><code style="background:#f0f0f0;padding:2px 8px;border-radius:4px">${e.codigo_oem_b}</code></td>
      <td>${e.nombre_comun || '—'}</td>
      <td><span class="${e.verificada ? 'badge-activo' : 'badge-inactivo'}">${e.verificada ? 'Verificada' : 'Pendiente'}</span></td>
      <td><button class="accion-btn accion-eliminar" onclick="eliminarEquivalencia('${e.id}')">Eliminar</button></td>
    </tr>
  `).join('');
}

async function eliminarEquivalencia(id) {
  if (!confirm('¿Eliminás esta equivalencia?')) return;
  await db.from('equivalencias_oem').delete().eq('id', id);
  cargarEquivalencias();
}

async function detectarEquivalenciasSugeridas() {
  const { data: items } = await db
    .from('items_proveedor')
    .select('codigo_oem, nombre, proveedor_id, proveedores(nombre)')
    .not('codigo_oem', 'is', null);

  if (!items || items.length < 2) {
    alert('No hay suficientes productos con código OEM para detectar similitudes.');
    return;
  }

  const porNombre = {};
  items.forEach(i => {
    const clave = i.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!porNombre[clave]) porNombre[clave] = [];
    porNombre[clave].push(i);
  });

  const sugerencias = [];
  Object.values(porNombre).forEach(grupo => {
    const oems = [...new Set(grupo.map(i => i.codigo_oem))];
    if (oems.length > 1) {
      for (let i = 0; i < oems.length - 1; i++) {
        sugerencias.push({ a: oems[i], b: oems[i+1], nombre: grupo[0].nombre });
      }
    }
  });

  if (!sugerencias.length) {
    alert('No se detectaron posibles equivalencias. Podés agregarlas manualmente.');
    return;
  }

  const msg = sugerencias.slice(0,5).map(s => `• ${s.a} ↔ ${s.b}  (${s.nombre.substring(0,40)})`).join('\n');
  const confirmado = confirm(
    `Se detectaron ${sugerencias.length} posibles equivalencias. Ejemplos:\n\n${msg}\n\n¿Querés agregarlas todas como pendientes de verificación?`
  );

  if (!confirmado) return;

  const rows = sugerencias.map(s => ({
    codigo_oem_a: s.a,
    codigo_oem_b: s.b,
    nombre_comun: s.nombre,
    verificada:   false
  }));

  const { error } = await db.from('equivalencias_oem').upsert(rows, { onConflict: 'codigo_oem_a,codigo_oem_b', ignoreDuplicates: true });
  if (error) alert('Error: ' + error.message);
  else {
    alert(`✅ Se agregaron las sugerencias. Revisalas y verificá las correctas.`);
    cargarEquivalencias();
  }
}

// ══ INIT ══════════════════════════════════════════════
cargarProveedores();
cargarProveedoresEnSelects();
