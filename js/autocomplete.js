(function() {
  const style = document.createElement('style');
  style.textContent = `
    .header-search { display: flex; align-items: center; overflow: visible !important; position: relative; }
    .hs-tipo-sel {
      background: #222; color: #ccc; border: none; border-right: 1px solid #333;
      padding: 0 10px 0 12px; height: 100%; font-size: 12px; font-weight: 600;
      cursor: pointer; outline: none; border-radius: var(--radio) 0 0 var(--radio);
      white-space: nowrap; flex-shrink: 0; appearance: none; -webkit-appearance: none;
      min-width: 110px;
    }
    .hs-tipo-sel:focus { background: #2a2a2a; }
    .hs-auto-inline {
      display: none; position: absolute; top: calc(100% + 8px); left: 0; right: 0;
      background: #1a1a1a; border: 1px solid #333; border-radius: 10px;
      padding: 14px; z-index: 9999; gap: 8px; flex-direction: column;
    }
    .hs-auto-inline.visible { display: flex; }
    .hs-auto-inline select {
      background: #222; color: #ccc; border: 1px solid #333; border-radius: 6px;
      padding: 8px 10px; font-size: 13px; outline: none; width: 100%;
    }
    .hs-auto-inline .btn { font-size: 13px; }
    .autocomplete-dropdown {
      position: absolute; top: calc(100% + 8px); left: 0; right: 0;
      background: #1a1a1a; border: 1px solid #333; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 9999;
      overflow: hidden; display: none;
    }
    .autocomplete-dropdown.visible { display: block; }
    .ac-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      cursor: pointer; transition: background 0.12s; text-decoration: none;
    }
    .ac-item:hover { background: #252525; }
    .ac-thumb {
      width: 40px; height: 40px; border-radius: 6px; object-fit: cover;
      background: #111; flex-shrink: 0;
    }
    .ac-thumb-placeholder {
      width: 40px; height: 40px; border-radius: 6px; background: #222;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      color: #777; font-size: 18px;
    }
    .ac-info { flex: 1; min-width: 0; }
    .ac-nombre { font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ac-codigo { font-size: 11px; color: #777; }
    .ac-precio { font-size: 13px; font-weight: 700; color: #E63946; white-space: nowrap; }
    .ac-tipo-label { font-size: 10px; color: #555; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .ac-sin-resultados { padding: 16px 14px; font-size: 13px; color: #888; text-align: center; }
    .ac-sin-resultados a { color: #E63946; text-decoration: none; font-weight: 600; }
    .ac-ver-todos { padding: 10px 14px; text-align: center; border-top: 1px solid #222; }
    .ac-ver-todos a { font-size: 12px; color: #E63946; text-decoration: none; font-weight: 600; }
  `;
  document.head.appendChild(style);

  const isAdmin = window.location.pathname.includes('/admin') || window.location.pathname.includes('/point');
  const base    = isAdmin ? '../' : '';

  document.addEventListener('DOMContentLoaded', () => {
    const searchWrap = document.querySelector('.header-search');
    if (!searchWrap) return;

    const input = searchWrap.querySelector('input');
    if (!input) return;

    // ── Insertar selector de tipo ──────────────────
    const sel = document.createElement('select');
    sel.className = 'hs-tipo-sel';
    sel.id = 'hs-tipo';
    sel.innerHTML = `
      <option value="todo">🔍 Todo</option>
      <option value="productos">🔩 Productos</option>
      <option value="talleres">🏪 Talleres</option>
      <option value="auto">🚗 Mi auto</option>`;
    searchWrap.insertBefore(sel, input);

    // ── Panel inline para "Mi auto" ────────────────
    const autoPanel = document.createElement('div');
    autoPanel.className = 'hs-auto-inline';
    autoPanel.id = 'hs-auto-panel';
    autoPanel.innerHTML = `
      <div style="color:#aaa;font-size:12px;font-weight:700;margin-bottom:2px">Buscar por mi auto</div>
      <select id="hs-marca" style="background:#222;color:#ccc;border:1px solid #333;border-radius:6px;padding:8px 10px;font-size:13px;outline:none;width:100%"><option value="">Cargando marcas...</option></select>
      <select id="hs-modelo" disabled style="background:#222;color:#ccc;border:1px solid #333;border-radius:6px;padding:8px 10px;font-size:13px;outline:none;width:100%"><option value="">Primero elegí marca</option></select>
      <select id="hs-anio" disabled style="background:#222;color:#ccc;border:1px solid #333;border-radius:6px;padding:8px 10px;font-size:13px;outline:none;width:100%"><option value="">Primero elegí modelo</option></select>
      <button onclick="buscarPorAutoHeader()" style="background:#E63946;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:13px;cursor:pointer;width:100%">🔍 Buscar repuestos</button>`;
    searchWrap.appendChild(autoPanel);

    // ── Dropdown autocomplete ──────────────────────
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.id = 'ac-dropdown';
    searchWrap.appendChild(dropdown);

    // ── Manejo de cambio de tipo ───────────────────
    sel.addEventListener('change', () => {
      const tipo = sel.value;
      if (tipo === 'auto') {
        input.placeholder = 'Buscar repuestos para mi auto...';
        input.value = '';
        dropdown.classList.remove('visible');
        autoPanel.classList.add('visible');
        cargarMarcasHeader();
        // Si ya tiene auto guardado, ir directo
        const autoGuardado = JSON.parse(sessionStorage.getItem('pz_auto_seleccionado') || 'null');
        if (autoGuardado) {
          const txt = `${autoGuardado.marca} ${autoGuardado.modelo}${autoGuardado.anio ? ' ' + autoGuardado.anio : ''}`;
          const params = new URLSearchParams({ modelo_id: autoGuardado.modelo_id || '', anio: autoGuardado.anio || '', marca_nombre: autoGuardado.marca, modelo_nombre: autoGuardado.modelo });
          window.location.href = `${base}catalogo.html?` + params.toString();
        }
      } else {
        autoPanel.classList.remove('visible');
        input.placeholder = tipo === 'talleres' ? 'Buscá un taller...' : 'Buscá tu autoparte...';
      }
    });

    // ── Autocomplete por tipo ──────────────────────
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q || q.length < 2 || sel.value === 'auto') { dropdown.classList.remove('visible'); return; }
      timer = setTimeout(() => buscarSugerencias(q, sel.value), 280);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { dropdown.classList.remove('visible'); autoPanel.classList.remove('visible'); }
      if (e.key === 'Enter') {
        dropdown.classList.remove('visible');
        if (sel.value === 'talleres') window.location.href = `${base}talleres.html?q=${encodeURIComponent(input.value.trim())}`;
        else if (input.value.trim()) window.location.href = `${base}busqueda.html?q=${encodeURIComponent(input.value.trim())}`;
      }
    });

    document.addEventListener('click', e => {
      if (!searchWrap.contains(e.target)) {
        dropdown.classList.remove('visible');
        autoPanel.classList.remove('visible');
      }
    });

    // Mantener compatibilidad con buscarDesdeHeader existente
    const btn = searchWrap.querySelector('button');
    if (btn) {
      btn.onclick = () => {
        const q = input.value.trim();
        const tipo = sel.value;
        if (tipo === 'talleres') window.location.href = `${base}talleres.html?q=${encodeURIComponent(q)}`;
        else if (q) window.location.href = `${base}busqueda.html?q=${encodeURIComponent(q)}`;
      };
    }

    async function buscarSugerencias(q, tipo) {
      if (typeof db === 'undefined') return;

      const resultados = [];

      // Productos
      if (tipo === 'todo' || tipo === 'productos') {
        const { data: prods } = await db.from('productos')
          .select('id, nombre, codigo_pieza, precio, precio_oferta, imagenes')
          .eq('activo', true)
          .or(`nombre.ilike.%${q}%,codigo_pieza.ilike.%${q}%`)
          .limit(tipo === 'todo' ? 4 : 6);
        if (prods) prods.forEach(p => resultados.push({ tipo: 'producto', data: p }));
      }

      // Talleres
      if (tipo === 'todo' || tipo === 'talleres') {
        const { data: tall } = await db.from('talleres')
          .select('id, nombre, localidad, descripcion')
          .eq('activo', true)
          .or(`nombre.ilike.%${q}%,localidad.ilike.%${q}%`)
          .limit(tipo === 'todo' ? 2 : 6);
        if (tall) tall.forEach(t => resultados.push({ tipo: 'taller', data: t }));
      }

      if (!resultados.length) {
        dropdown.innerHTML = `<div class="ac-sin-resultados">Sin resultados para "<strong>${q}</strong>" &nbsp;·&nbsp; <a href="${base}busqueda.html?q=${encodeURIComponent(q)}">Buscar de todas formas</a></div>`;
        dropdown.classList.add('visible');
        return;
      }

      const items = resultados.map(r => {
        if (r.tipo === 'producto') {
          const p = r.data;
          const precio = p.precio_oferta || p.precio;
          const img = (p.imagenes && p.imagenes[0])
            ? `<img class="ac-thumb" src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy">`
            : `<div class="ac-thumb-placeholder">🔩</div>`;
          return `<a class="ac-item" href="${base}producto.html?id=${p.id}">${img}<div class="ac-info"><div class="ac-tipo-label">Producto</div><div class="ac-nombre">${p.nombre}</div><div class="ac-codigo">${p.codigo_pieza || ''}</div></div><div class="ac-precio">$${precio.toLocaleString('es-AR')}</div></a>`;
        } else {
          const t = r.data;
          return `<a class="ac-item" href="${base}talleres.html?id=${t.id}"><div class="ac-thumb-placeholder">🏪</div><div class="ac-info"><div class="ac-tipo-label">Taller</div><div class="ac-nombre">${t.nombre}</div><div class="ac-codigo">${t.localidad || ''}</div></div></a>`;
        }
      }).join('');

      const verTodos = tipo !== 'talleres'
        ? `<div class="ac-ver-todos"><a href="${base}busqueda.html?q=${encodeURIComponent(q)}">Ver todos los resultados para "${q}" →</a></div>`
        : '';
      dropdown.innerHTML = items + verTodos;
      dropdown.classList.add('visible');
    }
  });

  // ── Funciones para el panel "Mi auto" ──────────
  let _marcasHeaderCargadas = false;
  async function cargarMarcasHeader() {
    if (_marcasHeaderCargadas || typeof db === 'undefined') return;
    _marcasHeaderCargadas = true;
    const { data } = await db.from('marcas_auto').select('id, nombre').order('nombre');
    const sel = document.getElementById('hs-marca');
    if (!sel || !data) return;
    sel.innerHTML = '<option value="">Marca del auto</option>' + data.map(m => `<option value="${m.id}" data-nombre="${m.nombre}">${m.nombre}</option>`).join('');
    sel.onchange = async () => {
      const marcaId = sel.value;
      const selMod = document.getElementById('hs-modelo');
      selMod.innerHTML = '<option value="">Cargando modelos...</option>';
      selMod.disabled = true;
      if (!marcaId) return;
      const { data: mods } = await db.from('modelos_auto').select('id, nombre, anio_desde, anio_hasta').eq('marca_id', marcaId).order('nombre');
      selMod.innerHTML = '<option value="">Modelo</option>' + (mods || []).map(m => `<option value="${m.id}" data-desde="${m.anio_desde}" data-hasta="${m.anio_hasta || ''}" data-nombre="${m.nombre}">${m.nombre}</option>`).join('');
      selMod.disabled = false;
      selMod.onchange = () => {
        const opt = selMod.options[selMod.selectedIndex];
        const selAnio = document.getElementById('hs-anio');
        selAnio.innerHTML = '<option value="">Año</option>';
        if (!opt.value) { selAnio.disabled = true; return; }
        const desde = parseInt(opt.dataset.desde) || 1990;
        const hasta = parseInt(opt.dataset.hasta) || new Date().getFullYear();
        for (let y = hasta; y >= desde; y--) selAnio.innerHTML += `<option value="${y}">${y}</option>`;
        selAnio.disabled = false;
      };
    };
  }

  window.buscarPorAutoHeader = function() {
    const selMarca = document.getElementById('hs-marca');
    const selMod   = document.getElementById('hs-modelo');
    const selAnio  = document.getElementById('hs-anio');
    const modeloId = selMod?.value;
    const anio     = selAnio?.value;
    const marcaOpt = selMarca?.options[selMarca.selectedIndex];
    const modeloOpt = selMod?.options[selMod.selectedIndex];
    if (!modeloId) { mostrarNotificacion('Seleccioná un modelo.', 'error'); return; }
    const isAdmin = window.location.pathname.includes('/admin') || window.location.pathname.includes('/point');
    const base = isAdmin ? '../' : '';
    const params = new URLSearchParams({
      modelo_id: modeloId, anio: anio || '',
      marca_nombre: marcaOpt?.dataset.nombre || '',
      modelo_nombre: modeloOpt?.dataset.nombre || ''
    });
    sessionStorage.setItem('pz_auto_seleccionado', JSON.stringify({
      marca: marcaOpt?.dataset.nombre || '', modelo: modeloOpt?.dataset.nombre || '',
      anio: anio || '', modelo_id: modeloId
    }));
    window.location.href = `${base}catalogo.html?` + params.toString();
  };
})();
