/**
 * Smoke test Hito 4 Fase 1 — Auth B2C + perfil + vehículos
 * Ejecutar: node smoke_test_hito4.js
 * Solo usa fetch nativo (Node >= 18) — sin dependencias externas.
 *
 * Estrategia de auth:
 *   - cat_invitaciones_b2c INSERT: intenta con anon key (requiere RLS permisiva).
 *     Si falla → necesitás service role key (Supabase Dashboard > Settings > API).
 *   - cat_clientes_finales, cat_clientes_vehiculos: usa JWT del signUp (RLS auth.uid()).
 */

const SUPABASE_URL = 'https://mqxowotdeibllkitkije.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8';
const REST         = `${SUPABASE_URL}/rest/v1`;
const AUTH         = `${SUPABASE_URL}/auth/v1`;

const TS    = Date.now();
const EMAIL = `smoketest${TS}@yopmail.com`;
const PASS  = 'SmokeTest2026!';
const CODIGO = 'BETA-TEST01';

const report = [];
let userJwt      = null;
let authUserId   = null;
let clienteId    = null;
let vehiculoId   = null;
let invitacionId = null;

function ok(label, detail='')   { report.push({s:'✅', label, detail}); console.log(`  ✅ ${label}${detail ? ' → '+detail : ''}`); }
function fail(label, detail='') { report.push({s:'❌', label, detail}); console.log(`  ❌ ${label}${detail ? ' → '+detail : ''}`); }
function warn(label, detail='') { report.push({s:'⚠️', label, detail}); console.log(`  ⚠️  ${label}${detail ? ' → '+detail : ''}`); }
function info(msg) { console.log(`     ${msg}`); }

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function headers(jwt=null) {
  const h = { 'apikey': ANON_KEY, 'Content-Type': 'application/json' };
  if (jwt) h['Authorization'] = `Bearer ${jwt}`;
  else     h['Authorization'] = `Bearer ${ANON_KEY}`;
  return h;
}

async function restGet(table, params='', jwt=null) {
  const res = await fetch(`${REST}/${table}?${params}`, { headers: headers(jwt) });
  return { status: res.status, data: await res.json() };
}

async function restPost(table, body, jwt=null, extra={}) {
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: { ...headers(jwt), 'Prefer': 'return=representation', ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function restPatch(table, params, body, jwt=null) {
  const res = await fetch(`${REST}/${table}?${params}`, {
    method: 'PATCH',
    headers: { ...headers(jwt), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function restDelete(table, params, jwt=null) {
  const res = await fetch(`${REST}/${table}?${params}`, {
    method: 'DELETE',
    headers: headers(jwt),
  });
  return { status: res.status };
}

async function authReq(path, body) {
  const res = await fetch(`${AUTH}/${path}`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SMOKE TEST — Hito 4 Fase 1 — Piezauto  ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 1. INSERT código de invitación (anon key — testea RLS) ───────────────
  console.log('[ PASO 1 ] INSERT cat_invitaciones_b2c');
  {
    const r = await restPost('cat_invitaciones_b2c', {
      codigo: CODIGO, max_usos: 10, usos_actuales: 0,
      generado_por: 'sistema', usado: false,
    });
    if (r.status === 201) {
      const row = Array.isArray(r.data) ? r.data[0] : r.data;
      invitacionId = row?.id;
      ok('INSERT cat_invitaciones_b2c', `id=${invitacionId} (nueva)`);
    } else if (r.status === 409) {
      // Ya existe — la buscamos
      const sel = await restGet('cat_invitaciones_b2c', `codigo=eq.${CODIGO}&select=id,codigo,max_usos,usos_actuales,usado`);
      if (sel.data?.length > 0) {
        invitacionId = sel.data[0].id;
        ok('INSERT cat_invitaciones_b2c', `ya existía — id=${invitacionId} | usos=${sel.data[0].usos_actuales}/${sel.data[0].max_usos}`);
      } else {
        fail('INSERT cat_invitaciones_b2c', 'conflict pero no se pudo leer la fila existente');
      }
    } else {
      const errMsg = r.data?.message || r.data?.hint || JSON.stringify(r.data);
      if (r.status === 403 || r.status === 401 || (r.data?.code === '42501')) {
        fail('INSERT cat_invitaciones_b2c',
          `BLOQUEADO POR RLS (HTTP ${r.status}) — necesitás ejecutar el SQL manualmente en Supabase Dashboard o proveer service_role key. Error: ${errMsg}`);
        warn('ACCIÓN REQUERIDA', 'Ejecutá hito4_invitacion_test.sql en Supabase SQL Editor y volvé a correr el test');
      } else {
        fail('INSERT cat_invitaciones_b2c', `HTTP ${r.status} — ${errMsg}`);
      }
      // Intentamos recuperar si ya existe de todas formas
      const sel = await restGet('cat_invitaciones_b2c', `codigo=eq.${CODIGO}&select=id,usos_actuales,max_usos`);
      if (Array.isArray(sel.data) && sel.data.length > 0) {
        invitacionId = sel.data[0].id;
        info(`Código ${CODIGO} ya existe (id=${invitacionId}), continúo smoke test`);
      } else {
        info('No hay código de invitación — el resto del test que depende de él fallará');
      }
    }
  }

  // ── 2. Validar código ────────────────────────────────────────────────────
  console.log('\n[ PASO 2 ] Validar código BETA-TEST01');
  {
    const r = await restGet('cat_invitaciones_b2c',
      `codigo=eq.${CODIGO}&usado=eq.false&select=id,codigo,max_usos,usos_actuales`);
    if (!Array.isArray(r.data) || r.data.length === 0) {
      fail('Validación código BETA-TEST01', 'No encontrado, ya usado, o RLS bloquea lectura anon');
    } else {
      const row = r.data[0];
      if (row.usos_actuales >= row.max_usos) {
        fail('Validación código BETA-TEST01', `usos_actuales(${row.usos_actuales}) >= max_usos(${row.max_usos})`);
      } else {
        ok('Validación código BETA-TEST01', `usos=${row.usos_actuales}/${row.max_usos}`);
      }
    }
  }

  // ── 3. Introspección cat_clientes_vehiculos ──────────────────────────────
  console.log('\n[ PASO 3 ] Introspección schema cat_clientes_vehiculos');
  let vehiculosCols = [];
  {
    // Usamos el endpoint de OpenAPI de Supabase para ver columns
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cat_clientes_vehiculos?limit=0`, {
      method: 'GET',
      headers: { ...headers(), 'Accept': 'application/openapi+json' },
    });
    // Fallback: hacemos un select que retorne 0 filas y leemos el error/headers
    // En su lugar chequeamos con un GET que retorne schema via Prefer: schema
    const res2 = await fetch(`${REST}/cat_clientes_vehiculos?limit=0`, {
      headers: { ...headers(), 'Prefer': 'count=exact' },
    });
    // Supabase no expone column list via REST sin datos — inferimos via INSERT fallido
    // Hacemos un INSERT con campos incorrectos para ver el error de schema
    const testInsert = await restPost('cat_clientes_vehiculos', { _schema_probe: true });
    const errText = JSON.stringify(testInsert.data);
    info(`Schema probe response (HTTP ${testInsert.status}): ${errText.slice(0, 200)}`);

    // Detectar si menciona marca_terminal_id o marca_nombre en el error
    const hasMarcaTerminalId = errText.includes('marca_terminal_id');
    const hasMarcaNombre     = errText.includes('marca_nombre');
    if (hasMarcaTerminalId) {
      warn('Schema cat_clientes_vehiculos', 'DDL usa marca_terminal_id (UUID FK) — js/vehiculos.js asume marca_nombre → BUG');
      vehiculosCols.push('marca_terminal_id');
    } else if (hasMarcaNombre) {
      ok('Schema cat_clientes_vehiculos', 'Columna marca_nombre existe — js/vehiculos.js compatible');
      vehiculosCols.push('marca_nombre');
    } else {
      info('No se pudo detectar columna de marca del probe — se asume marca_nombre y se verifica en INSERT real');
    }
  }

  // ── 4. signUp ────────────────────────────────────────────────────────────
  console.log('\n[ PASO 4 ] signUp Supabase Auth');
  {
    const data = await authReq('signup', { email: EMAIL, password: PASS });
    if (data.error || (!data.id && !data.user)) {
      fail('signUp Supabase Auth', data.error?.message || data.msg || JSON.stringify(data).slice(0,200));
    } else {
      authUserId = data.id || data.user?.id;
      userJwt    = data.access_token || null;
      const sessionInfo = userJwt ? 'sesión activa (email confirm OFF ✓)' : 'sin sesión — email confirm está ON → activalo en Supabase Dashboard > Auth > Settings';
      ok('signUp Supabase Auth', `user_id=${authUserId} | ${sessionInfo}`);
    }
  }

  // ── 5. signIn (verificar credenciales) ──────────────────────────────────
  console.log('\n[ PASO 5 ] signIn Supabase Auth');
  {
    const data = await authReq('token?grant_type=password', { email: EMAIL, password: PASS });
    if (data.error || !data.access_token) {
      fail('signIn Supabase Auth', data.error?.message || data.msg || JSON.stringify(data).slice(0,200));
    } else {
      userJwt = data.access_token; // actualizar con token fresco
      ok('signIn Supabase Auth', `token OK | user_id=${data.user?.id}`);
    }
  }

  if (!userJwt) {
    warn('SKIP pasos 6-8', 'Sin JWT activo (email confirmation ON) — no se puede testear inserción con RLS');
  } else {

    // ── 6. INSERT cat_clientes_finales ───────────────────────────────────
    console.log('\n[ PASO 6 ] INSERT cat_clientes_finales (con JWT)');
    {
      const r = await restPost('cat_clientes_finales', {
        auth_user_id: authUserId,
        email:     EMAIL,
        nombre:    'Smoke',
        apellido:  'Test',
        telefono:  '01112345678',
        localidad: 'Morón',
        provincia: 'Buenos Aires',
      }, userJwt);
      if (r.status === 201) {
        const row = Array.isArray(r.data) ? r.data[0] : r.data;
        clienteId = row?.id;
        ok('INSERT cat_clientes_finales', `cliente_id=${clienteId}`);
      } else {
        fail('INSERT cat_clientes_finales', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,200)}`);
      }
    }

    // ── 7. UPDATE invitación ─────────────────────────────────────────────
    console.log('\n[ PASO 7 ] UPDATE cat_invitaciones_b2c (usos_actuales++)');
    if (invitacionId) {
      // Leemos el valor actual primero
      const cur = await restGet('cat_invitaciones_b2c', `id=eq.${invitacionId}&select=usos_actuales,max_usos`);
      const currentUsos = cur.data?.[0]?.usos_actuales ?? 0;
      const maxUsos     = cur.data?.[0]?.max_usos     ?? 10;
      const nuevosUsos  = currentUsos + 1;
      const r = await restPatch('cat_invitaciones_b2c', `id=eq.${invitacionId}`, {
        usos_actuales: nuevosUsos,
        usado: nuevosUsos >= maxUsos,
        usado_por: EMAIL,
        usado_at: new Date().toISOString(),
      });
      if (r.status === 200 || r.status === 204) {
        ok('UPDATE cat_invitaciones_b2c', `usos_actuales → ${nuevosUsos}/${maxUsos}`);
      } else {
        fail('UPDATE cat_invitaciones_b2c', `HTTP ${r.status} — ${JSON.stringify(r.data).slice(0,200)}`);
      }
    } else {
      warn('UPDATE cat_invitaciones_b2c', 'SKIP — invitacionId no disponible');
    }

    // ── 8. INSERT cat_clientes_vehiculos ─────────────────────────────────
    console.log('\n[ PASO 8 ] INSERT cat_clientes_vehiculos');
    if (!clienteId) {
      fail('INSERT cat_clientes_vehiculos', 'SKIP — sin cliente_id');
    } else {
      // Obtener una marca real
      const marcasRes = await restGet('cat_marcas_terminales', 'activo=eq.true&select=id,nombre&limit=1', userJwt);
      const primeraMarca = marcasRes.data?.[0];

      // Intentar primero con marca_terminal_id (DDL real)
      let payload, usedCol;
      if (primeraMarca) {
        payload  = { cliente_id: clienteId, marca_terminal_id: primeraMarca.id, modelo: 'Test Modelo', anio: 2020, version: '1.6 GNC', principal: true };
        usedCol  = `marca_terminal_id=${primeraMarca.id} (${primeraMarca.nombre})`;
      } else {
        payload  = { cliente_id: clienteId, marca_nombre: 'Ford', modelo: 'Test Modelo', anio: 2020, version: '1.6 GNC', principal: true };
        usedCol  = 'marca_nombre=Ford (fallback — sin marcas en cat_marcas_terminales)';
      }

      const r = await restPost('cat_clientes_vehiculos', payload, userJwt);

      if (r.status === 201) {
        const row = Array.isArray(r.data) ? r.data[0] : r.data;
        vehiculoId = row?.id;
        ok(`INSERT cat_clientes_vehiculos (${usedCol})`, `vehiculo_id=${vehiculoId}`);

        // Verificar SELECT
        const check = await restGet('cat_clientes_vehiculos', `id=eq.${vehiculoId}`, userJwt);
        if (check.data?.length > 0) {
          ok('SELECT cat_clientes_vehiculos', JSON.stringify(check.data[0]).slice(0, 120));
        }
      } else {
        const errMsg = JSON.stringify(r.data).slice(0, 300);

        // Detectar schema mismatch
        if (errMsg.includes('marca_terminal_id') && primeraMarca) {
          fail('INSERT cat_clientes_vehiculos',
            `SCHEMA MISMATCH — DDL no tiene marca_terminal_id. Columna incorrecta. Error: ${errMsg}`);
          // Retry con marca_nombre
          const r2 = await restPost('cat_clientes_vehiculos',
            { cliente_id: clienteId, marca_nombre: primeraMarca.nombre, modelo: 'Test Modelo', anio: 2020, version: '1.6 GNC', principal: true },
            userJwt);
          if (r2.status === 201) {
            const row2 = Array.isArray(r2.data) ? r2.data[0] : r2.data;
            vehiculoId = row2?.id;
            ok('INSERT cat_clientes_vehiculos RETRY (marca_nombre)', `vehiculo_id=${vehiculoId} — js/vehiculos.js es CORRECTO, no hay bug`);
          } else {
            fail('INSERT cat_clientes_vehiculos RETRY (marca_nombre)', `HTTP ${r2.status} — ${JSON.stringify(r2.data).slice(0,200)}`);
          }
        } else if (errMsg.includes('marca_nombre')) {
          fail('INSERT cat_clientes_vehiculos',
            `BUG CONFIRMADO — DDL usa marca_nombre (texto) pero insertamos marca_terminal_id (UUID). Corregir payload. Error: ${errMsg}`);
        } else {
          fail('INSERT cat_clientes_vehiculos', `HTTP ${r.status} — ${errMsg}`);
        }
      }
    }

  } // end if userJwt

  // ── 9. CLEANUP ───────────────────────────────────────────────────────────
  console.log('\n[ PASO 9 ] Cleanup');
  {
    if (vehiculoId && userJwt) {
      const r = await restDelete('cat_clientes_vehiculos', `id=eq.${vehiculoId}`, userJwt);
      info(`Vehículo ${vehiculoId} eliminado (HTTP ${r.status})`);
    }
    if (clienteId && userJwt) {
      const r = await restDelete('cat_clientes_finales', `id=eq.${clienteId}`, userJwt);
      info(`Cliente ${clienteId} eliminado (HTTP ${r.status})`);
    }
    if (invitacionId) {
      // Decrementar usos_actuales si los incrementamos
      const cur = await restGet('cat_invitaciones_b2c', `id=eq.${invitacionId}&select=usos_actuales`);
      const currentUsos = cur.data?.[0]?.usos_actuales ?? 1;
      await restPatch('cat_invitaciones_b2c', `id=eq.${invitacionId}`, {
        usos_actuales: Math.max(0, currentUsos - 1),
        usado: false, usado_por: null, usado_at: null,
      });
      info(`Invitación ${invitacionId} decrementada`);
    }
    // auth.users solo se puede borrar con service_role — lo dejamos y avisamos
    if (authUserId) {
      info(`auth.users ${authUserId} — no se puede borrar sin service_role key. Borralo manualmente en Supabase Dashboard > Authentication > Users`);
    }
    ok('Cleanup BD (parcial)', 'cliente y vehículo eliminados; usuario auth requiere limpieza manual');
  }

  printReport();
}

function printReport() {
  const fails = report.filter(r => r.s.startsWith('❌'));
  const warns = report.filter(r => r.s.startsWith('⚠️'));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  REPORTE FINAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  report.forEach(r => {
    const d = r.detail ? `  → ${r.detail}` : '';
    console.log(`${r.s} ${r.label}${d}`);
  });
  console.log('─────────────────────────────────────────');
  console.log(`Total: ${report.length} checks | ❌ ${fails.length} | ⚠️  ${warns.length}`);
  if (fails.length === 0 && warns.length === 0) {
    console.log('🎉 Todo OK — listo para go-live');
  } else if (fails.length > 0) {
    console.log('🚨 HAY ERRORES — revisar antes del go-live');
  } else {
    console.log('⚠️  Hay warnings — revisar antes del go-live');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(fails.length > 0 ? 1 : 0);
}

run().catch(e => { fail('Error inesperado', e.message); printReport(); });
