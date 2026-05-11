/**
 * Smoke test Fase 2 — Búsqueda + Ficha + Carrito
 * Ejecutar: node smoke_test_fase2.js
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL              — URL del proyecto
 *   SUPABASE_ANON_KEY         — clave pública
 *   SUPABASE_SERVICE_ROLE_KEY — clave secreta (cleanup auth.users)
 *
 * En local: node --env-file=.env smoke_test_fase2.js
 */

const SUPABASE_URL     = process.env.SUPABASE_URL     || 'https://mqxowotdeibllkitkije.supabase.co';
const ANON_KEY         = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const REST             = `${SUPABASE_URL}/rest/v1`;
const AUTH             = `${SUPABASE_URL}/auth/v1`;

const TS    = Date.now();
const EMAIL = `smoke2fase2${TS}@yopmail.com`;
const PASS  = 'SmokeF2026!';

const report = [];
let userJwt    = null;
let authUserId = null;
let clienteId  = null;
let operacionId = null;
let itemId      = null;

function ok(label, detail='')   { report.push({s:'✅',label,detail}); console.log(`  ✅ ${label}${detail?' → '+detail:''}`); }
function fail(label, detail='') { report.push({s:'❌',label,detail}); console.log(`  ❌ ${label}${detail?' → '+detail:''}`); }
function warn(label, detail='') { report.push({s:'⚠️',label,detail}); console.log(`  ⚠️  ${label}${detail?' → '+detail:''}`); }

function headers(jwt=null, extra={}) {
  const key = jwt || ANON_KEY;
  return { apikey:ANON_KEY, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', ...extra };
}
async function restGet(table, params='', jwt=null) {
  const r = await fetch(`${REST}/${table}?${params}`, { headers:headers(jwt) });
  return { status:r.status, data: await r.json() };
}
async function restPost(table, body, jwt=null) {
  const r = await fetch(`${REST}/${table}`, {
    method:'POST', headers:headers(jwt, {'Prefer':'return=representation'}), body:JSON.stringify(body)
  });
  return { status:r.status, data: await r.json() };
}
async function restPatch(table, params, body, jwt=null) {
  const r = await fetch(`${REST}/${table}?${params}`, {
    method:'PATCH', headers:headers(jwt, {'Prefer':'return=representation'}), body:JSON.stringify(body)
  });
  return { status:r.status, data: await r.json() };
}
async function restDelete(table, params, jwt=null) {
  const r = await fetch(`${REST}/${table}?${params}`, { method:'DELETE', headers:headers(jwt) });
  return { status:r.status };
}
async function authReq(path, body, jwt=null) {
  const r = await fetch(`${AUTH}/${path}`, {
    method:'POST', headers:headers(jwt), body:JSON.stringify(body)
  });
  return r.json();
}

async function run() {
  const t0 = Date.now();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SMOKE TEST — Fase 2 — Búsqueda/Ficha/Carrito');
  console.log(`  SERVICE_ROLE disponible: ${SERVICE_ROLE_KEY ? 'SÍ' : 'NO'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 1. cat_skus accesible (SELECT anon) ─────────────────────────
  console.log('[ 1 ] SELECT cat_skus (RLS anon)');
  {
    const r = await restGet('cat_skus',
      'activo=eq.true&activo_venta=eq.true&select=id,codigo_piezauto,descripcion,precio_lista&limit=3');
    if (r.status === 200 && Array.isArray(r.data) && r.data.length > 0) {
      ok('SELECT cat_skus anon', `${r.data.length} SKUs visibles — ej: ${r.data[0].codigo_piezauto}`);
    } else if (r.status === 200 && Array.isArray(r.data) && r.data.length === 0) {
      fail('SELECT cat_skus anon', 'HTTP 200 pero 0 filas — RLS sin política SELECT o tablas vacías');
    } else {
      fail('SELECT cat_skus anon', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,120)}`);
    }
  }

  // ── 2. cat_familias accesible ────────────────────────────────────
  console.log('\n[ 2 ] SELECT cat_familias (RLS anon)');
  {
    const r = await restGet('cat_familias', 'activo=eq.true&select=id,nombre&limit=5');
    if (r.status === 200 && Array.isArray(r.data) && r.data.length > 0) {
      ok('SELECT cat_familias', `${r.data.length} familias — ej: ${r.data[0].nombre}`);
    } else if (r.status === 200 && r.data.length === 0) {
      fail('SELECT cat_familias', 'RLS bloquea o tabla vacía');
    } else {
      fail('SELECT cat_familias', `HTTP ${r.status}`);
    }
  }

  // ── 3. cat_proveedores accesible ─────────────────────────────────
  console.log('\n[ 3 ] SELECT cat_proveedores (RLS anon)');
  {
    const r = await restGet('cat_proveedores', 'activo=eq.true&select=id,nombre&limit=5');
    if (r.status === 200 && Array.isArray(r.data) && r.data.length > 0) {
      ok('SELECT cat_proveedores', `${r.data.length} proveedores`);
    } else if (r.status === 200 && r.data.length === 0) {
      fail('SELECT cat_proveedores', 'RLS bloquea o tabla vacía');
    } else {
      fail('SELECT cat_proveedores', `HTTP ${r.status}`);
    }
  }

  // ── 4. Full-text search en descripcion ───────────────────────────
  console.log('\n[ 4 ] Full-text search cat_skus');
  {
    const r = await restGet('cat_skus',
      `activo=eq.true&activo_venta=eq.true&descripcion=fts.optica&select=id,codigo_piezauto,descripcion&limit=3`);
    if (r.status === 200 && Array.isArray(r.data)) {
      if (r.data.length > 0) {
        ok('Full-text search "optica"', `${r.data.length} resultados — ${r.data[0].descripcion.slice(0,50)}`);
      } else {
        warn('Full-text search "optica"', '0 resultados — RLS puede estar bloqueando (ver check 1)');
      }
    } else {
      fail('Full-text search "optica"', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,120)}`);
    }
  }

  // ── 5. cat_skus_codigos_fabrica accesible ────────────────────────
  console.log('\n[ 5 ] SELECT cat_skus_codigos_fabrica');
  {
    const r = await restGet('cat_skus_codigos_fabrica', 'select=sku_id,codigo_fabrica_id,confianza&limit=3');
    if (r.status === 200 && Array.isArray(r.data)) {
      if (r.data.length > 0) {
        ok('SELECT cat_skus_codigos_fabrica', `${r.data.length} vínculos visibles`);
      } else {
        warn('SELECT cat_skus_codigos_fabrica', '0 filas — RLS puede estar bloqueando');
      }
    } else {
      fail('SELECT cat_skus_codigos_fabrica', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,120)}`);
    }
  }

  // ── 6. signUp + signIn para tests de carrito ─────────────────────
  console.log('\n[ 6 ] signUp + signIn (carrito autenticado)');
  {
    const signup = await authReq('signup', { email:EMAIL, password:PASS });
    if (signup.error || (!signup.id && !signup.user)) {
      fail('signUp Fase 2', signup.error?.message || JSON.stringify(signup).slice(0,120));
    } else {
      authUserId = signup.id || signup.user?.id;
      userJwt    = signup.access_token || null;
      if (!userJwt) {
        const signin = await authReq('token?grant_type=password', { email:EMAIL, password:PASS });
        userJwt = signin.access_token || null;
      }
      ok('signUp + signIn', `uid=${authUserId} | jwt=${userJwt ? 'OK' : 'FALLO'}`);
    }
  }

  if (!userJwt) {
    warn('SKIP pasos 7-11', 'Sin JWT — activá email confirmation OFF');
    await cleanup(); printReport(Date.now()-t0); return;
  }

  // ── 7. INSERT cat_clientes_finales ───────────────────────────────
  console.log('\n[ 7 ] INSERT cat_clientes_finales');
  {
    const r = await restPost('cat_clientes_finales', {
      auth_user_id:authUserId, email:EMAIL, nombre:'Fase2', apellido:'Test',
      telefono:'01112345678', localidad:'Morón', provincia:'Buenos Aires'
    }, userJwt);
    if (r.status === 201) {
      const row = Array.isArray(r.data) ? r.data[0] : r.data;
      clienteId = row?.id;
      ok('INSERT cat_clientes_finales', `id=${clienteId}`);
    } else {
      fail('INSERT cat_clientes_finales', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,150)}`);
    }
  }

  // ── 8. INSERT cat_operaciones_b2c (borrador) ─────────────────────
  console.log('\n[ 8 ] INSERT cat_operaciones_b2c (borrador)');
  if (!clienteId) {
    warn('INSERT operacion', 'SKIP — sin clienteId');
  } else {
    const r = await restPost('cat_operaciones_b2c', {
      cliente_id: clienteId,
      estado: 'pendiente',
      subtotal: 0,
      total: 0,
      descuento: 0,
    }, userJwt);
    if (r.status === 201) {
      const row = Array.isArray(r.data) ? r.data[0] : r.data;
      operacionId = row?.id;
      ok('INSERT cat_operaciones_b2c', `id=${operacionId}`);
    } else {
      fail('INSERT cat_operaciones_b2c', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,150)}`);
    }
  }

  // ── 9. Obtener un SKU real para el item ──────────────────────────
  let skuId = null;
  {
    const r = await restGet('cat_skus',
      'activo=eq.true&activo_venta=eq.true&select=id,precio_lista&limit=1', userJwt);
    skuId = r.data?.[0]?.id;
    const precio = r.data?.[0]?.precio_lista;
    if (skuId) {
      console.log(`\n[ 9 ] SKU para item: ${skuId} precio=$${precio}`);
      ok('GET sku para item', `id=${skuId}`);
    } else {
      warn('GET sku para item', 'Sin SKUs visibles — RLS bloquea. Item test saltado.');
    }
  }

  // ── 10. INSERT cat_operaciones_b2c_items ─────────────────────────
  console.log('\n[ 10 ] INSERT cat_operaciones_b2c_items');
  if (!operacionId || !skuId) {
    warn('INSERT item', 'SKIP — sin operacionId o skuId');
  } else {
    const r = await restPost('cat_operaciones_b2c_items', {
      operacion_id: operacionId,
      sku_id: skuId,
      cantidad: 2,
      precio_unitario: 1500,
      subtotal: 3000,
    }, userJwt);
    if (r.status === 201) {
      const row = Array.isArray(r.data) ? r.data[0] : r.data;
      itemId = row?.id;
      ok('INSERT cat_operaciones_b2c_items', `id=${itemId}`);
    } else {
      fail('INSERT cat_operaciones_b2c_items', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,150)}`);
    }
  }

  // ── 11. UPDATE operacion con totales ────────────────────────────
  console.log('\n[ 11 ] UPDATE cat_operaciones_b2c (totales)');
  if (!operacionId) {
    warn('UPDATE operacion totales', 'SKIP');
  } else {
    const r = await restPatch('cat_operaciones_b2c', `id=eq.${operacionId}`,
      { subtotal: 3000, total: 3000 }, userJwt);
    if (r.status === 200 && Array.isArray(r.data) && r.data.length > 0) {
      ok('UPDATE cat_operaciones_b2c totales', `total → $3000`);
    } else {
      fail('UPDATE cat_operaciones_b2c totales', `HTTP ${r.status}`);
    }
  }

  // ── 12. SELECT operacion + items ─────────────────────────────────
  console.log('\n[ 12 ] SELECT operacion con items');
  if (!operacionId) {
    warn('SELECT operacion + items', 'SKIP');
  } else {
    const r = await restGet('cat_operaciones_b2c', `id=eq.${operacionId}&select=id,estado,total`, userJwt);
    if (r.data?.[0]) {
      ok('SELECT cat_operaciones_b2c', `estado=${r.data[0].estado} total=${r.data[0].total}`);
    } else {
      fail('SELECT cat_operaciones_b2c', `HTTP ${r.status}`);
    }
  }

  await cleanup();
  printReport(Date.now()-t0);
}

async function cleanup() {
  console.log('\n[ CLEANUP ]');
  if (itemId && userJwt) {
    const r = await restDelete('cat_operaciones_b2c_items', `id=eq.${itemId}`, userJwt);
    console.log(`  🗑  item ${itemId} (HTTP ${r.status})`);
  }
  if (operacionId && userJwt) {
    const r = await restDelete('cat_operaciones_b2c', `id=eq.${operacionId}`, userJwt);
    console.log(`  🗑  operacion ${operacionId} (HTTP ${r.status})`);
  }
  if (clienteId && userJwt) {
    const r = await restDelete('cat_clientes_finales', `id=eq.${clienteId}`, userJwt);
    console.log(`  🗑  cliente ${clienteId} (HTTP ${r.status})`);
  }
  if (authUserId) {
    if (SERVICE_ROLE_KEY) {
      const r = await fetch(`${AUTH}/admin/users/${authUserId}`, {
        method:'DELETE', headers:{ apikey:ANON_KEY, Authorization:`Bearer ${SERVICE_ROLE_KEY}` }
      });
      console.log(`  🗑  auth.users ${authUserId} (HTTP ${r.status})`);
      report.push({s:'✅', label:'Cleanup auth.users', detail:`${authUserId} eliminado`});
    } else {
      console.log(`  ⚠️  auth.users ${authUserId} — borrar manualmente en Dashboard`);
      report.push({s:'⚠️', label:'Cleanup auth.users', detail:`manual — ${authUserId}`});
    }
  }
}

function printReport(ms) {
  const fails = report.filter(r => r.s.startsWith('❌'));
  const warns = report.filter(r => r.s.startsWith('⚠️'));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  REPORTE FINAL — Fase 2');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = require('fs');
    let summary = '## Smoke Test Fase 2\n\n| Check | Resultado | Detalle |\n|---|---|---|\n';
    report.forEach(r => { summary += `| ${r.label} | ${r.s} | ${r.detail} |\n`; });
    summary += `\n**Total:** ${report.length} | ❌ ${fails.length} | ⚠️ ${warns.length} | ⏱ ${ms}ms\n`;
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  report.forEach(r => {
    console.log(`${r.s} ${r.label}${r.detail ? ' → ' + r.detail : ''}`);
  });
  console.log('─────────────────────────────────────────');
  console.log(`Total: ${report.length} | ❌ ${fails.length} | ⚠️ ${warns.length} | ⏱ ${ms}ms`);

  const rlsFails = report.filter(r => r.s === '❌' && r.detail?.includes('RLS'));
  if (rlsFails.length > 0) {
    console.log('\n⚠️  ACCIÓN REQUERIDA: Aplicar fase2_rls_catalogo.sql en Supabase SQL Editor');
  }

  if (fails.length === 0) console.log('🎉 Todo OK');
  else console.log('🚨 HAY ERRORES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(fails.length > 0 ? 1 : 0);
}

run().catch(e => { fail('Error inesperado', e.message); printReport(0); });
