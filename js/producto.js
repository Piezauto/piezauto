// Ficha de producto — Fase 2 Piezauto
// Depende de: dbB2C, getClienteActual, cargarCarritoLocal, agregarAlCarrito

async function initProducto() {
  const params = new URLSearchParams(window.location.search);
  const skuId = params.get('id');

  if (!skuId) {
    mostrarError('No se especificó un producto.');
    return;
  }

  document.getElementById('loader-producto').style.display = 'flex';

  const { data: sku, error } = await dbB2C
    .from('cat_skus')
    .select(`
      id, codigo_piezauto, descripcion, descripcion_corta,
      precio_lista, precio_neto, lado, posicion, aplicaciones,
      carroceria, puertas, motor, caja, version, observaciones,
      codigo_oem, activo_venta,
      familia_id, cat_familias!familia_id(nombre),
      fabricante_id, cat_fabricantes!fabricante_id(nombre),
      recomendado_digital, cat_proveedores!recomendado_digital(nombre)
    `)
    .eq('id', skuId)
    .eq('activo', true)
    .single();

  if (error || !sku) {
    mostrarError('Producto no encontrado.');
    return;
  }

  document.title = `${sku.descripcion_corta || sku.descripcion} — Piezauto`;

  renderFicha(sku);

  // Cargar alternativas en paralelo
  cargarAlternativas(sku);

  document.getElementById('loader-producto').style.display = 'none';
  document.getElementById('ficha-container').style.display = 'block';

  document.getElementById('btn-agregar-carrito').addEventListener('click', () => {
    const cantidad = parseInt(document.getElementById('cantidad-input').value) || 1;
    agregarAlCarrito({
      id: sku.id,
      codigo_piezauto: sku.codigo_piezauto,
      descripcion: sku.descripcion_corta || sku.descripcion,
      precio: sku.precio_lista,
      cantidad,
    });
    mostrarToast('Agregado al carrito');
    actualizarBadgeCarrito();
  });
}

function renderFicha(sku) {
  // Migas de pan
  const familia = sku.cat_familias?.nombre || '';
  document.getElementById('breadcrumb').innerHTML = `
    <a href="/buscar">Inicio</a>
    <span>›</span>
    ${familia ? `<a href="/buscar?familia=${sku.familia_id}">${familia}</a><span>›</span>` : ''}
    <span>${sku.descripcion_corta || sku.descripcion}</span>
  `;

  // Cabecera
  const proveedor = sku.cat_proveedores?.nombre || '';
  const fabricante = sku.cat_fabricantes?.nombre || '';
  document.getElementById('sku-familia').textContent = familia;
  document.getElementById('sku-titulo').textContent = sku.descripcion;
  document.getElementById('sku-codigo').textContent = sku.codigo_piezauto;

  if (proveedor) {
    document.getElementById('sku-proveedor').textContent = `Proveedor: ${proveedor}`;
    document.getElementById('sku-proveedor').style.display = 'block';
  }
  if (fabricante && fabricante !== 'Por identificar') {
    document.getElementById('sku-fabricante').textContent = `Marca: ${fabricante}`;
    document.getElementById('sku-fabricante').style.display = 'block';
  }

  // Precio
  const precioEl = document.getElementById('sku-precio');
  if (sku.precio_lista) {
    precioEl.textContent = `$${Number(sku.precio_lista).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  } else {
    precioEl.textContent = 'Consultar precio';
    precioEl.classList.add('precio-consultar');
    document.getElementById('btn-agregar-carrito').textContent = 'Consultar disponibilidad';
  }

  // Tags lateralidad / posición
  const tags = document.getElementById('sku-tags');
  if (sku.lado && sku.lado !== 'N/A') {
    tags.insertAdjacentHTML('beforeend', `<span class="tag">Lado: ${sku.lado}</span>`);
  }
  if (sku.posicion && sku.posicion !== 'N/A') {
    tags.insertAdjacentHTML('beforeend', `<span class="tag">Posición: ${sku.posicion}</span>`);
  }

  // OEM
  if (sku.codigo_oem) {
    const oems = sku.codigo_oem.split(';').map(c => c.trim()).filter(Boolean);
    document.getElementById('sku-oem-container').style.display = 'block';
    document.getElementById('sku-oem').textContent = oems.join(' · ');
  }

  // Atributos técnicos
  const attrs = [];
  if (sku.carroceria) attrs.push(['Carrocería', sku.carroceria]);
  if (sku.puertas) attrs.push(['Puertas', sku.puertas]);
  if (sku.motor) attrs.push(['Motor', sku.motor]);
  if (sku.caja) attrs.push(['Caja', sku.caja]);
  if (sku.version) attrs.push(['Versión', sku.version]);

  if (attrs.length > 0) {
    const tablaEl = document.getElementById('tabla-atributos');
    tablaEl.style.display = 'block';
    attrs.forEach(([k, v]) => {
      tablaEl.insertAdjacentHTML('beforeend', `
        <div class="attr-fila">
          <span class="attr-key">${k}</span>
          <span class="attr-val">${v}</span>
        </div>
      `);
    });
  }

  // Aplicaciones
  if (sku.aplicaciones) {
    const apps = sku.aplicaciones
      .split(' / ')
      .map(a => a.trim())
      .filter(Boolean);

    const contenedor = document.getElementById('aplicaciones-lista');
    contenedor.parentElement.style.display = 'block';
    apps.slice(0, 30).forEach(a => {
      contenedor.insertAdjacentHTML('beforeend', `<li>${a}</li>`);
    });
    if (apps.length > 30) {
      contenedor.insertAdjacentHTML('beforeend',
        `<li class="apps-mas">…y ${apps.length - 30} vehículos más</li>`);
    }
  }

  // Observaciones
  if (sku.observaciones) {
    const obs = document.getElementById('sku-observaciones');
    obs.textContent = sku.observaciones;
    obs.parentElement.style.display = 'block';
  }
}

async function cargarAlternativas(sku) {
  // Alternativas vía cat_skus_codigos_fabrica (mismos códigos de fábrica, diferente SKU)
  const { data: vinculos } = await dbB2C
    .from('cat_skus_codigos_fabrica')
    .select('codigo_fabrica_id, confianza')
    .eq('sku_id', sku.id)
    .limit(10);

  if (!vinculos || vinculos.length === 0) {
    // Fallback: buscar por mismo codigo_oem si existe
    if (sku.codigo_oem) {
      await cargarAlternativasPorOEM(sku);
    }
    return;
  }

  const codIds = vinculos.map(v => v.codigo_fabrica_id);

  const { data: otrosVinculos } = await dbB2C
    .from('cat_skus_codigos_fabrica')
    .select('sku_id, confianza')
    .in('codigo_fabrica_id', codIds)
    .neq('sku_id', sku.id)
    .limit(20);

  if (!otrosVinculos || otrosVinculos.length === 0) return;

  const otroIds = [...new Set(otrosVinculos.map(v => v.sku_id))];

  const { data: altSkus } = await dbB2C
    .from('cat_skus')
    .select(`
      id, codigo_piezauto, descripcion_corta, descripcion,
      precio_lista, lado,
      recomendado_digital, cat_proveedores!recomendado_digital(nombre),
      cat_fabricantes!fabricante_id(nombre)
    `)
    .in('id', otroIds)
    .eq('activo', true)
    .eq('activo_venta', true)
    .limit(8);

  if (!altSkus || altSkus.length === 0) return;

  renderAlternativas(altSkus, 'OEM compartido');
}

async function cargarAlternativasPorOEM(sku) {
  const primerOEM = sku.codigo_oem.split(';')[0].trim();
  if (!primerOEM) return;

  const { data: altSkus } = await dbB2C
    .from('cat_skus')
    .select(`
      id, codigo_piezauto, descripcion_corta, descripcion,
      precio_lista, lado,
      recomendado_digital, cat_proveedores!recomendado_digital(nombre),
      cat_fabricantes!fabricante_id(nombre)
    `)
    .ilike('codigo_oem', `%${primerOEM}%`)
    .neq('id', sku.id)
    .eq('activo', true)
    .eq('activo_venta', true)
    .limit(6);

  if (!altSkus || altSkus.length === 0) return;
  renderAlternativas(altSkus, 'Mismo código OEM');
}

function renderAlternativas(skus, motivo) {
  const seccion = document.getElementById('alternativas-seccion');
  const lista = document.getElementById('alternativas-lista');
  seccion.style.display = 'block';
  document.getElementById('alternativas-motivo').textContent = motivo;

  skus.forEach(s => {
    const precio = s.precio_lista
      ? `$${Number(s.precio_lista).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : 'Consultar';
    const prov = s.cat_proveedores?.nombre || '';
    const fab = s.cat_fabricantes?.nombre && s.cat_fabricantes.nombre !== 'Por identificar'
      ? s.cat_fabricantes.nombre : '';
    const lado = s.lado && s.lado !== 'N/A' ? ` · ${s.lado}` : '';

    lista.insertAdjacentHTML('beforeend', `
      <a href="/producto?id=${s.id}" class="alt-tarjeta">
        <div class="alt-desc">${s.descripcion_corta || s.descripcion}</div>
        <div class="alt-meta">${prov || fab}${lado}</div>
        <div class="alt-precio">${precio}</div>
      </a>
    `);
  });
}

function mostrarError(msg) {
  document.getElementById('loader-producto').style.display = 'none';
  const err = document.getElementById('error-producto');
  err.textContent = msg;
  err.style.display = 'block';
}

function mostrarToast(msg) {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:var(--negro); color:var(--blanco); padding:12px 24px;
      border-radius:8px; font-size:14px; font-weight:600; z-index:9999;
      animation: fadeInUp 0.2s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.display = 'none'; }, 2500);
}
