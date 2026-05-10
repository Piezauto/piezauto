/**
 * Smoke test Hito 4 Fase 1 — Auth B2C + perfil + vehículos
 * Ejecutar: node smoke_test_hito4.js
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL            — URL del proyecto Supabase
 *   SUPABASE_ANON_KEY       — clave pública (anon)
 *   SUPABASE_SERVICE_ROLE_KEY — clave secreta (para cleanup de auth.users)
 *
 * En local: crear .env con esas vars y ejecutar con:
 *   node --env-file=.env smoke_test_hito4.js
 * En CI: configurar GitHub Secrets y el workflow los inyecta.
 */

const SUPABASE_URL      = process.env.SUPABASE_URL      || 'https://mqxowotdeibllkitkije.supabase.co';
const ANON_KEY          = process.env.SUPABASE_ANON_KEY  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8';
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const REST              = `${SUPABASE_URL}/rest/v1`;
const AUTH              = `${SUPABASE_URL}/auth/v1`;

const TS     = Date.now();
const EMAIL  = `smoketest${TS}@yopmail.com`;
const PASS   = 'SmokeTest2026!';
const CODIGO = 'BETA-TEST01';

const report = [];
let userJwt      = null;
let authUserId   = null;
let clienteId    = null;
let vehiculoId   = null;
let invitacionId = null;
let invUsosBefore = 0;

function ok(label, detail='')   { report.push({s:'✅',label,detail}); console.log(`  ✅ ${label}${detail?' → '+detail:''}`); }
function fail(label, detail='') { report.push({s:'❌',label,detail}); console.log(`  ❌ ${label}${detail?' → '+detail:''}`); }
function warn(label, detail='') { report.push({s:'⚠️',label,detail}); console.log(`  ⚠️  ${label}${detail?' → '+detail:''}`); }

function headers(jwt=null, extra={}) {
  const key = jwt || ANON_KEY;
  return { apikey:ANON_KEY, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', ...extra };
}

async function restGet(table, params='', jwt=null) {
  const r = await fetch(`${REST}/${table}?${params}`, { headers: headers(jwt) });
  return { status:r.status, data: await r.json() };
}
async function restPost(table, body, jwt=null) {
  const r = await fetch(`${REST}/${table}`, {
    method:'POST', headers: headers(jwt, {'Prefer':'return=representation'}), body: JSON.stringify(body)
  });
  return { status:r.status, data: await r.json() };
}
async function restPatch(table, params, body, jwt=null) {
  const r = await fetch(`${REST}/${table}?${params}`, {
    method:'PATCH', headers: headers(jwt, {'Prefer':'return=representation'}), body: JSON.stringify(body)
  });
  return { status:r.status, data: await r.json() };
}
async function restDelete(table, params, jwt=null) {
  const r = await fetch(`${REST}/${table}?${params}`, { method:'DELETE', headers: headers(jwt) });
  return { status:r.status };
}
async function authReq(path, body, jwt=null) {
  const r = await fetch(`${AUTH}/${path}`, {
    method:'POST', headers: headers(jwt), body: JSON.stringify(body)
  });
  return r.json();
}

async function run() {
  const t0 = Date.now();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SMOKE TEST — Hito 4 Fase 1 — Piezauto  ');
  console.log(`  SERVICE_ROLE disponible: ${SERVICE_ROLE_KEY ? 'SÍ' : 'NO (cleanup manual)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 1. Validar código BETA-TEST01 ────────────────────────────────────────
  console.log('[ 1 ] Validación código');
  {
    const r = await restGet('cat_invitaciones_b2c',
      `codigo=eq.${CODIGO}&usado=eq.false&select=id,codigo,max_usos,usos_actuales`);
    if (!Array.isArray(r.data) || r.data.length === 0) {
      fail('Validación código BETA-TEST01', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,100)}`);
    } else {
      const row = r.data[0];
      if (row.usos_actuales >= row.max_usos) {
        fail('Validación código BETA-TEST01', `agotado ${row.usos_actuales}/${row.max_usos}`);
      } else {
        invitacionId = row.id;
        invUsosBefore = row.usos_actuales;
        ok('Validación código BETA-TEST01', `usos=${row.usos_actuales}/${row.max_usos}`);
      }
    }
  }

  // ── 2. signUp ────────────────────────────────────────────────────────────
  console.log('\n[ 2 ] signUp');
  {
    const d = await authReq('signup', { email:EMAIL, password:PASS });
    if (d.error || (!d.id && !d.user)) {
      fail('signUp Supabase Auth', d.error?.message || JSON.stringify(d).slice(0,150));
    } else {
      authUserId = d.id || d.user?.id;
      userJwt    = d.access_token || null;
      ok('signUp Supabase Auth', `uid=${authUserId} | sesión=${userJwt ? 'activa ✓' : 'INACTIVA (email confirm ON?)'}`);
    }
  }

  // ── 3. signIn ────────────────────────────────────────────────────────────
  console.log('\n[ 3 ] signIn');
  {
    const d = await authReq('token?grant_type=password', { email:EMAIL, password:PASS });
    if (d.error || !d.access_token) {
      fail('signIn Supabase Auth', d.error?.message || JSON.stringify(d).slice(0,150));
    } else {
      userJwt = d.access_token;
      ok('signIn Supabase Auth', `token OK`);
    }
  }

  if (!userJwt) {
    warn('SKIP pasos 4-7', 'Sin JWT — activá email confirmation OFF en Supabase Dashboard');
    await cleanup(); printReport(Date.now()-t0); return;
  }

  // ── 4. INSERT cat_clientes_finales ───────────────────────────────────────
  console.log('\n[ 4 ] INSERT cat_clientes_finales');
  {
    const r = await restPost('cat_clientes_finales', {
      auth_user_id:authUserId, email:EMAIL, nombre:'Smoke', apellido:'Test',
      telefono:'01112345678', localidad:'Morón', provincia:'Buenos Aires'
    }, userJwt);
    if (r.status === 201) {
      const row = Array.isArray(r.data)?r.data[0]:r.data;
      clienteId = row?.id;
      ok('INSERT cat_clientes_finales', `id=${clienteId}`);
    } else {
      fail('INSERT cat_clientes_finales', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,150)}`);
    }
  }

  // ── 5. UPDATE invitación (usado_por = clienteId UUID) ───────────────────
  console.log('\n[ 5 ] UPDATE cat_invitaciones_b2c');
  if (!invitacionId || !clienteId) {
    warn('UPDATE invitación', 'SKIP — falta invitacionId o clienteId');
  } else {
    const r = await restPatch('cat_invitaciones_b2c', `id=eq.${invitacionId}`, {
      usos_actuales: invUsosBefore+1,
      usado: invUsosBefore+1 >= 10,
      usado_por: clienteId,
      usado_at: new Date().toISOString(),
    }, userJwt);
    if (r.status===200 && Array.isArray(r.data) && r.data.length>0) {
      ok('UPDATE cat_invitaciones_b2c', `usos_actuales → ${invUsosBefore+1}`);
    } else {
      fail('UPDATE cat_invitaciones_b2c', `HTTP ${r.status} rows=${Array.isArray(r.data)?r.data.length:'?'} ${JSON.stringify(r.data).slice(0,100)}`);
    }
  }

  // ── 6. INSERT cat_clientes_vehiculos ─────────────────────────────────────
  console.log('\n[ 6 ] INSERT cat_clientes_vehiculos');
  if (!clienteId) {
    fail('INSERT cat_clientes_vehiculos', 'SKIP — sin clienteId');
  } else {
    const marcaR = await restGet('cat_marcas_terminales','activo=eq.true&select=id,nombre&limit=1', userJwt);
    const marca = marcaR.data?.[0];
    if (!marca) { fail('INSERT cat_clientes_vehiculos','sin marcas en cat_marcas_terminales'); }
    else {
      const r = await restPost('cat_clientes_vehiculos', {
        cliente_id:clienteId, marca_terminal_id:marca.id,
        modelo:'Test Modelo', anio:2020, version:'1.6 GNC', principal:true
      }, userJwt);
      if (r.status===201) {
        const row = Array.isArray(r.data)?r.data[0]:r.data;
        vehiculoId = row?.id;
        ok(`INSERT cat_clientes_vehiculos`, `id=${vehiculoId} marca=${marca.nombre}`);
      } else {
        fail('INSERT cat_clientes_vehiculos', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,150)}`);
      }
    }
  }

  // ── 7. SELECT vehículo ───────────────────────────────────────────────────
  console.log('\n[ 7 ] SELECT cat_clientes_vehiculos');
  if (vehiculoId) {
    const r = await restGet('cat_clientes_vehiculos',`id=eq.${vehiculoId}&select=*`, userJwt);
    if (r.data?.[0]) {
      ok('SELECT cat_clientes_vehiculos', `modelo=${r.data[0].modelo} anio=${r.data[0].anio}`);
    } else {
      fail('SELECT cat_clientes_vehiculos', `HTTP ${r.status}`);
    }
  }

  // ── 8. Verificar contador de invitación ──────────────────────────────────
  console.log('\n[ 8 ] Verificar usos_actuales final');
  {
    const r = await restGet('cat_invitaciones_b2c',`codigo=eq.${CODIGO}&select=usos_actuales`);
    const actual = r.data?.[0]?.usos_actuales;
    if (actual === invUsosBefore+1) {
      ok('Verificar usos_actuales', `${invUsosBefore} → ${actual} ✓`);
    } else {
      fail('Verificar usos_actuales', `esperado=${invUsosBefore+1} actual=${actual} — contador NO incrementó`);
    }
  }

  await cleanup();
  printReport(Date.now()-t0);
}

async function cleanup() {
  console.log('\n[ CLEANUP ]');
  // Orden crítico: primero limpiar FK de invitación (usado_por → cliente),
  // luego el vehículo (FK cliente_id → cliente), finalmente el cliente.
  if (invitacionId && userJwt) {
    await restPatch('cat_invitaciones_b2c',`id=eq.${invitacionId}`,
      {usos_actuales:invUsosBefore, usado:false, usado_por:null, usado_at:null}, userJwt);
    console.log(`  🔄 invitación decrementada a ${invUsosBefore}`);
  }
  if (vehiculoId && userJwt) {
    const r = await restDelete('cat_clientes_vehiculos',`id=eq.${vehiculoId}`,userJwt);
    console.log(`  🗑  vehículo ${vehiculoId} (HTTP ${r.status})`);
  }
  if (clienteId && userJwt) {
    const r = await restDelete('cat_clientes_finales',`id=eq.${clienteId}`,userJwt);
    console.log(`  🗑  cliente ${clienteId} (HTTP ${r.status})`);
  }
  if (authUserId) {
    if (SERVICE_ROLE_KEY) {
      const r = await fetch(`${AUTH}/admin/users/${authUserId}`, {
        method:'DELETE',
        headers:{apikey:ANON_KEY, Authorization:`Bearer ${SERVICE_ROLE_KEY}`}
      });
      console.log(`  🗑  auth.users ${authUserId} (HTTP ${r.status})`);
      report.push({s:'✅',label:'Cleanup auth.users',detail:`${authUserId} eliminado`});
    } else {
      console.log(`  ⚠️  auth.users ${authUserId} — borrá manualmente en Dashboard > Authentication > Users`);
      report.push({s:'⚠️',label:'Cleanup auth.users',detail:`manual — ${authUserId}`});
    }
  }
}

function printReport(ms) {
  const fails = report.filter(r=>r.s.startsWith('❌'));
  const warns = report.filter(r=>r.s.startsWith('⚠️'));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  REPORTE FINAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // GitHub Actions job summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = require('fs');
    let summary = '## Smoke Test Hito 4 Fase 1\n\n| Check | Resultado | Detalle |\n|---|---|---|\n';
    report.forEach(r => { summary += `| ${r.label} | ${r.s} | ${r.detail} |\n`; });
    summary += `\n**Total:** ${report.length} | ❌ ${fails.length} | ⚠️ ${warns.length} | ⏱ ${ms}ms\n`;
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  report.forEach(r => {
    console.log(`${r.s} ${r.label}${r.detail?' → '+r.detail:''}`);
  });
  console.log('─────────────────────────────────────────');
  console.log(`Total: ${report.length} | ❌ ${fails.length} | ⚠️ ${warns.length} | ⏱ ${ms}ms`);
  if (fails.length===0) console.log('🎉 Todo OK');
  else console.log('🚨 HAY ERRORES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(fails.length>0 ? 1 : 0);
}

run().catch(e => { fail('Error inesperado', e.message); printReport(0); });
