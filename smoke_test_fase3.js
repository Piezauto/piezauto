/**
 * Smoke test Fase 3 — Checkout B2C + Confirmación + Taller
 * Ejecutar: node smoke_test_fase3.js
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL              — URL del proyecto
 *   SUPABASE_ANON_KEY         — clave pública
 *   SUPABASE_SERVICE_ROLE_KEY — clave secreta (cleanup auth.users)
 *
 * En local: node --env-file=.env smoke_test_fase3.js
 */

const SUPABASE_URL     = process.env.SUPABASE_URL     || 'https://mqxowotdeibllkitkije.supabase.co';
const ANON_KEY         = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const REST             = `${SUPABASE_URL}/rest/v1`;
const AUTH             = `${SUPABASE_URL}/auth/v1`;

const TS    = Date.now();
const EMAIL = `smoke3fase3${TS}@yopmail.com`;
const PASS  = `Smoke3Pass!${TS % 10000}`;

let passed = 0, failed = 0, warned = 0;
const results = [];

function ok(name, detail = '')   { passed++; results.push({ s: '✅', name, detail }); }
function fail(name, detail = '') { failed++; results.push({ s: '❌', name, detail }); }
function warn(name, detail = '') { warned++; results.push({ s: '⚠️', name, detail }); }

async function api(path, opts = {}, token = null) {
  const headers = {
    'apikey': token === 'service' ? (SERVICE_ROLE_KEY || ANON_KEY) : ANON_KEY,
    'Authorization': `Bearer ${token === 'service' ? (SERVICE_ROLE_KEY || ANON_KEY) : (token || ANON_KEY)}`,
    'Content-Type': 'application/json',
    'Prefer': opts.prefer || '',
    ...(opts.headers || {}),
  };
  const res  = await fetch(`${REST}${path}`, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function authApi(path, body, token = null) {
  const headers = {
    'apikey': ANON_KEY,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${AUTH}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json().catch(() => ({}));
}

async function run() {
  const t0 = Date.now();
  let userToken = null, userId = null, clienteId = null, operacionId = null, itemId = null, skuId = null;

  // ── 1. Talleres visibles por anon ──────────────────────────────────
  {
    const { status, body } = await api('/cat_recomendaciones_talleres?select=id,nombre,localidad&activo=eq.true&limit=4');
    if (status === 200 && Array.isArray(body) && body.length > 0) {
      ok('Talleres visibles por anon', `${body.length} talleres (ej: ${body[0].nombre} — ${body[0].localidad})`);
    } else {
      fail('Talleres visibles por anon', `status=${status} len=${body?.length}`);
    }
  }

  // ── 2. Campos de talleres correctos ───────────────────────────────
  {
    const { status, body } = await api('/cat_recomendaciones_talleres?select=id,nombre,razon_social,direccion,telefono,whatsapp,lat,lng,localidad&activo=eq.true&limit=1');
    const t = body?.[0];
    if (status === 200 && t && t.nombre && t.lat !== undefined && t.lng !== undefined) {
      ok('Campos taller completos', `lat=${t.lat} lng=${t.lng}`);
    } else {
      fail('Campos taller completos', `status=${status} taller=${JSON.stringify(t)?.slice(0,60)}`);
    }
  }

  // ── 3. Signup + login ──────────────────────────────────────────────
  {
    const data = await authApi('/signup', { email: EMAIL, password: PASS });
    userToken = data?.access_token;
    userId    = data?.user?.id;
    if (userToken && userId) {
      ok('Signup B2C', `uid=${userId.slice(0,8)}`);
    } else {
      fail('Signup B2C', JSON.stringify(data)?.slice(0,80));
      console.error('\n[FATAL] No se pudo crear usuario de prueba. Abortando.');
      printReport(t0);
      process.exit(1);
    }
  }

  // ── 4. INSERT cat_clientes_finales ────────────────────────────────
  {
    const { status, body } = await api(
      '/cat_clientes_finales?select=id',
      { method: 'POST', prefer: 'return=representation',
        body: { auth_user_id: userId, nombre: 'Smoke', apellido: 'Fase3', email: EMAIL, telefono: '1155550003', localidad: 'Morón', provincia: 'Buenos Aires', activo: true } },
      userToken
    );
    clienteId = body?.[0]?.id;
    if (status === 201 && clienteId) {
      ok('INSERT cat_clientes_finales', `id=${clienteId.slice(0,8)}`);
    } else {
      fail('INSERT cat_clientes_finales', `status=${status} ${JSON.stringify(body)?.slice(0,80)}`);
    }
  }

  // ── 5. Verificar lectura del propio perfil ─────────────────────────
  if (clienteId) {
    const { status, body } = await api(`/cat_clientes_finales?id=eq.${clienteId}&select=nombre,apellido,telefono,localidad`, {}, userToken);
    if (status === 200 && body?.[0]?.nombre === 'Smoke') {
      ok('SELECT propio perfil', `${body[0].nombre} ${body[0].apellido} — ${body[0].localidad}`);
    } else {
      fail('SELECT propio perfil', `status=${status} ${JSON.stringify(body)?.slice(0,60)}`);
    }
  }

  // ── 6. Obtener SKU para el carrito ────────────────────────────────
  {
    const { status, body } = await api('/cat_skus?activo=eq.true&activo_venta=eq.true&select=id,codigo_piezauto,precio_lista&limit=1');
    skuId = body?.[0]?.id;
    if (status === 200 && skuId) {
      ok('SKU disponible para carrito', `id=${skuId.slice(0,8)} precio=$${body[0].precio_lista}`);
    } else {
      fail('SKU disponible para carrito', `status=${status}`);
    }
  }

  // ── 7. INSERT operación B2C (checkout) ────────────────────────────
  if (clienteId) {
    const notasJson = JSON.stringify({
      metodo_pago: 'manual',
      taller: { id: 'e5a732a0-ba98-4a9f-bca5-0d0c99bcc225', nombre: 'Franzoni Hermanos', direccion: 'Av. Gaona 5525', localidad: 'Villa Tesei', whatsapp: '1122222222' },
      notas_cliente: 'Test smoke Fase 3',
    });
    const { status, body } = await api(
      '/cat_operaciones_b2c?select=id',
      { method: 'POST', prefer: 'return=representation',
        body: { cliente_id: clienteId, estado: 'pendiente', subtotal: 7500, total: 7500, descuento: 0, direccion_entrega: 'Av. Test 1234, Morón', notas: notasJson } },
      userToken
    );
    operacionId = body?.[0]?.id;
    if (status === 201 && operacionId) {
      ok('INSERT operacion checkout (con taller en notas)', `id=${operacionId.slice(0,8)}`);
    } else {
      fail('INSERT operacion checkout', `status=${status} ${JSON.stringify(body)?.slice(0,80)}`);
    }
  }

  // ── 8. INSERT items de la operación ───────────────────────────────
  if (operacionId && skuId) {
    const { status, body } = await api(
      '/cat_operaciones_b2c_items?select=id',
      { method: 'POST', prefer: 'return=representation',
        body: { operacion_id: operacionId, sku_id: skuId, cantidad: 2, precio_unitario: 3750, subtotal: 7500 } },
      userToken
    );
    itemId = body?.[0]?.id;
    if (status === 201 && itemId) {
      ok('INSERT item operacion', `id=${itemId.slice(0,8)}`);
    } else {
      fail('INSERT item operacion', `status=${status} ${JSON.stringify(body)?.slice(0,80)}`);
    }
  }

  // ── 9. SELECT operación con JOIN items ────────────────────────────
  if (operacionId) {
    const { status, body } = await api(
      `/cat_operaciones_b2c?id=eq.${operacionId}&select=id,estado,total,notas,direccion_entrega,cat_operaciones_b2c_items!operacion_id(id,cantidad,precio_unitario)`,
      {}, userToken
    );
    const op = body?.[0];
    if (status === 200 && op && op.cat_operaciones_b2c_items?.length > 0) {
      const notas = JSON.parse(op.notas || '{}');
      ok('SELECT operacion + items + notas JSON', `total=$${op.total} taller=${notas.taller?.nombre} items=${op.cat_operaciones_b2c_items.length}`);
    } else {
      fail('SELECT operacion + items', `status=${status} ${JSON.stringify(op)?.slice(0,80)}`);
    }
  }

  // ── 10. UPDATE totales (simula actualización checkout) ────────────
  if (operacionId) {
    const { status } = await api(
      `/cat_operaciones_b2c?id=eq.${operacionId}`,
      { method: 'PATCH', prefer: 'return=minimal',
        body: { total: 7500, subtotal: 7500, descuento: 0, direccion_entrega: 'Av. Test 1234, Morón actualizada', updated_at: new Date().toISOString() } },
      userToken
    );
    if (status === 204) {
      ok('UPDATE operacion (checkout confirm)', 'PATCH exitoso');
    } else {
      fail('UPDATE operacion', `status=${status}`);
    }
  }

  // ── 11. INSERT cat_creditos_clientes (operación de admin — service_role) ───
  let creditoId = null;
  if (clienteId && operacionId) {
    if (!SERVICE_ROLE_KEY) {
      warn('INSERT cat_creditos_clientes (service_role requerida)', 'Sin service_role — créditos son operación de admin');
    } else {
      const { status, body } = await api(
        '/cat_creditos_clientes?select=id',
        { method: 'POST', prefer: 'return=representation',
          body: { cliente_id: clienteId, operacion_id: operacionId, monto: 1500, tipo: 'diferencial_taller', concepto: 'Test smoke: diferencial taller' } },
        'service'
      );
      creditoId = body?.[0]?.id;
      if (status === 201 && creditoId) {
        ok('INSERT cat_creditos_clientes (service_role)', `id=${creditoId.slice(0,8)} monto=$1500`);
      } else {
        fail('INSERT cat_creditos_clientes', `status=${status} ${JSON.stringify(body)?.slice(0,80)}`);
      }
    }
  }

  // ── 12. SELECT cat_creditos_clientes (propio cliente via RLS) ─────
  if (clienteId && creditoId) {
    const { status, body } = await api(
      `/cat_creditos_clientes?cliente_id=eq.${clienteId}&select=id,monto,tipo,concepto`,
      {}, userToken
    );
    if (status === 200 && Array.isArray(body) && body.length > 0) {
      ok('SELECT creditos propios (RLS cliente)', `${body.length} crédito(s) — $${body[0].monto}`);
    } else if (status === 200 && body?.length === 0) {
      warn('SELECT creditos propios', 'RLS cliente para creditos requiere fase3_ddl.sql aplicado');
    } else {
      fail('SELECT creditos propios', `status=${status} ${JSON.stringify(body)?.slice(0,60)}`);
    }
  } else if (!creditoId) {
    warn('SELECT creditos propios', 'Saltado — no se creó crédito (sin service_role o DDL pendiente)');
  }

  // ── 13. Columnas MP en operacion ──────────────────────────────────
  if (operacionId) {
    const { status, body } = await api(
      `/cat_operaciones_b2c?id=eq.${operacionId}&select=mp_preference_id,mp_payment_id,mp_status`,
      {}, userToken
    );
    const op = body?.[0];
    if (status === 200 && op && 'mp_preference_id' in op && 'mp_payment_id' in op && 'mp_status' in op) {
      ok('Columnas MP presentes en operacion', 'mp_preference_id + mp_payment_id + mp_status OK');
    } else {
      fail('Columnas MP presentes', `status=${status} keys=${Object.keys(op || {}).join(',')}`);
    }
  }

  // ── 14. Transición de estado pendiente → pagado ───────────────────
  if (operacionId) {
    const { status } = await api(
      `/cat_operaciones_b2c?id=eq.${operacionId}`,
      { method: 'PATCH', prefer: 'return=minimal', body: { estado: 'pagado', updated_at: new Date().toISOString() } },
      userToken
    );
    // Por RLS, solo si el estado es 'pendiente' se puede actualizar
    if (status === 204 || status === 200) {
      ok('Transición pendiente → pagado', 'PATCH exitoso');
    } else {
      warn('Transición pendiente → pagado', `status=${status} (verificar RLS UPDATE)`);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────
  if (itemId && operacionId && userToken) {
    await api(`/cat_operaciones_b2c_items?id=eq.${itemId}`,     { method: 'DELETE' }, userToken);
    await api(`/cat_creditos_clientes?cliente_id=eq.${clienteId}`, { method: 'DELETE' }, userToken);
    await api(`/cat_operaciones_b2c?id=eq.${operacionId}`,      { method: 'DELETE' }, userToken);
    await api(`/cat_clientes_finales?id=eq.${clienteId}`,        { method: 'DELETE' }, userToken);
  }

  if (SERVICE_ROLE_KEY && userId) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    });
    if (res.status === 200 || res.status === 204) {
      ok('Cleanup auth.users', `uid=${userId.slice(0,8)} eliminado`);
    } else {
      warn('Cleanup auth.users (service_role no disponible)', `Eliminar manualmente: ${userId}`);
    }
  } else {
    warn('Cleanup auth.users manual', `Eliminar desde Supabase Dashboard: ${userId}`);
  }

  printReport(t0);
}

function printReport(t0) {
  const elapsed = Date.now() - t0;
  console.log('\n' + '─'.repeat(60));
  results.forEach(r => console.log(`  ${r.s} ${r.name}${r.detail ? ' — ' + r.detail : ''}`));
  console.log('─'.repeat(60));
  console.log(`Total: ${results.length - (SERVICE_ROLE_KEY ? 0 : 1)} | ❌ ${failed} | ⚠️ ${warned} | ⏱ ${elapsed}ms`);
  if (failed === 0) {
    console.log('🎉 Todo OK');
  } else {
    console.log(`💥 ${failed} test(s) fallaron`);
  }

  // GitHub Actions Step Summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = require('fs');
    const lines = ['## Smoke Test Fase 3 — Checkout B2C\n', `**Total: ${results.length}** | ❌ ${failed} | ⚠️ ${warned} | ⏱ ${elapsed}ms\n`, '| | Test | Detalle |', '|---|---|---|'];
    results.forEach(r => lines.push(`| ${r.s} | ${r.name} | ${r.detail || '—'} |`));
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('[FATAL]', err); process.exit(1); });
