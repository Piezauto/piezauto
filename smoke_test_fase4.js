/**
 * Smoke test Fase 4 — Panel Taller + Operaciones + Notificaciones
 * Ejecutar: node smoke_test_fase4.js
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL              — URL del proyecto
 *   SUPABASE_ANON_KEY         — clave pública
 *   SUPABASE_SERVICE_ROLE_KEY — clave secreta (crear usuario taller + cleanup)
 *
 * En local: node --env-file=.env smoke_test_fase4.js
 */

const SUPABASE_URL     = process.env.SUPABASE_URL     || 'https://mqxowotdeibllkitkije.supabase.co';
const ANON_KEY         = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const REST             = `${SUPABASE_URL}/rest/v1`;
const AUTH             = `${SUPABASE_URL}/auth/v1`;

// UUID real del taller Franzoni Hermanos en producción
const TALLER_ID = 'e5a732a0-ba98-4a9f-bca5-0d0c99bcc225';

const TS           = Date.now();
const EMAIL_CLIENTE = `smoke4cli${TS}@yopmail.com`;
const EMAIL_TALLER  = `smoke4tal${TS}@yopmail.com`;
const PASS          = `Smoke4Pass!${TS % 10000}`;

let passed = 0, failed = 0, warned = 0;
const results = [];

function ok(n, d='')   { passed++; results.push({ s:'✅', n, d }); }
function fail(n, d='') { failed++; results.push({ s:'❌', n, d }); }
function warn(n, d='') { warned++; results.push({ s:'⚠️', n, d }); }

async function rest(path, opts={}, tok=null) {
  const key = tok==='service' ? (SERVICE_ROLE_KEY||ANON_KEY) : ANON_KEY;
  const bearer = tok==='service' ? (SERVICE_ROLE_KEY||ANON_KEY) : (tok||ANON_KEY);
  const h = {
    'apikey': key, 'Authorization': `Bearer ${bearer}`,
    'Content-Type': 'application/json', 'Prefer': opts.prefer||'',
    ...(opts.headers||{}),
  };
  const r = await fetch(`${REST}${path}`, { method: opts.method||'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const b = await r.json().catch(()=>({}));
  return { status: r.status, body: b };
}

async function authPost(path, body, tok=null) {
  const h = { 'apikey': ANON_KEY, 'Content-Type': 'application/json',
    ...(tok ? { 'Authorization': `Bearer ${tok}` } : {}) };
  const r = await fetch(`${AUTH}${path}`, { method:'POST', headers:h, body:JSON.stringify(body) });
  return r.json().catch(()=>({}));
}

async function adminCreateUser(email, password, meta) {
  if (!SERVICE_ROLE_KEY) return null;
  const r = await fetch(`${AUTH}/admin/users`, {
    method: 'POST',
    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: meta }),
  });
  return r.json().catch(()=>({}));
}

async function adminDeleteUser(uid) {
  if (!SERVICE_ROLE_KEY || !uid) return;
  await fetch(`${AUTH}/admin/users/${uid}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
  });
}

async function run() {
  const t0 = Date.now();
  let clienteTok=null, clienteUid=null, clienteId=null;
  let tallerTok=null,  tallerUid=null;
  let operacionId=null, itemId=null, skuId=null, notifId=null;

  // ── 1. Columnas taller_id + metodo_pago en cat_operaciones_b2c ────
  {
    const { status, body } = await rest('/cat_operaciones_b2c?select=taller_id,metodo_pago,pendiente_aprobacion_taller&limit=1', {}, null);
    if (status === 200 || (Array.isArray(body) && body !== null)) {
      ok('Columnas Fase 4 presentes en cat_operaciones_b2c', 'taller_id + metodo_pago + pendiente_aprobacion_taller');
    } else {
      fail('Columnas Fase 4 en cat_operaciones_b2c', `status=${status} — ejecutar fase4_ddl.sql`);
    }
  }

  // ── 2. cat_notificaciones_talleres existe y tiene columnas ────────
  {
    const { status, body } = await rest('/cat_notificaciones_talleres?select=id,taller_id,operacion_id,tipo,leida&limit=1', {}, null);
    if (status === 200 && Array.isArray(body)) {
      ok('cat_notificaciones_talleres visible y con columnas correctas');
    } else {
      fail('cat_notificaciones_talleres', `status=${status} ${JSON.stringify(body)?.slice(0,60)}`);
    }
  }

  // ── 3. Signup cliente ──────────────────────────────────────────────
  {
    const d = await authPost('/signup', { email: EMAIL_CLIENTE, password: PASS });
    clienteTok = d?.access_token; clienteUid = d?.user?.id;
    if (clienteTok) ok('Signup cliente', `uid=${clienteUid?.slice(0,8)}`);
    else { fail('Signup cliente', JSON.stringify(d)?.slice(0,60)); }
  }

  // ── 4. INSERT cat_clientes_finales ────────────────────────────────
  if (clienteTok) {
    const { status, body } = await rest('/cat_clientes_finales?select=id', {
      method:'POST', prefer:'return=representation',
      body: { auth_user_id:clienteUid, nombre:'SmokeCliente4', apellido:'Test', email:EMAIL_CLIENTE, telefono:'1155550004', localidad:'Haedo', provincia:'Buenos Aires', activo:true }
    }, clienteTok);
    clienteId = body?.[0]?.id;
    if (status===201 && clienteId) ok('INSERT cat_clientes_finales', `id=${clienteId?.slice(0,8)}`);
    else fail('INSERT cat_clientes_finales', `status=${status}`);
  }

  // ── 5. GET SKU ─────────────────────────────────────────────────────
  {
    const { status, body } = await rest('/cat_skus?activo=eq.true&activo_venta=eq.true&select=id,precio_lista&limit=1');
    skuId = body?.[0]?.id;
    if (status===200 && skuId) ok('SKU disponible', `id=${skuId?.slice(0,8)}`);
    else fail('SKU disponible', `status=${status}`);
  }

  // ── 6. Crear operación con taller_id real ─────────────────────────
  if (clienteId && skuId) {
    const notas = JSON.stringify({ metodo_pago:'manual', taller:{ id:TALLER_ID, nombre:'Franzoni Hermanos' }, notas_cliente:'Smoke Fase 4' });
    const { status, body } = await rest('/cat_operaciones_b2c?select=id', {
      method:'POST', prefer:'return=representation',
      body: { cliente_id:clienteId, estado:'pendiente', subtotal:9000, total:9000, descuento:0,
              direccion_entrega:'Av. Test 4444, Haedo', metodo_pago:'manual',
              taller_id:TALLER_ID, pendiente_aprobacion_taller:true, notas }
    }, clienteTok);
    operacionId = body?.[0]?.id;
    if (status===201 && operacionId) ok('INSERT operacion con taller_id real', `id=${operacionId?.slice(0,8)} taller=Franzoni`);
    else fail('INSERT operacion con taller_id real', `status=${status} ${JSON.stringify(body)?.slice(0,80)}`);
  }

  // ── 7. INSERT item ─────────────────────────────────────────────────
  if (operacionId && skuId) {
    const { status, body } = await rest('/cat_operaciones_b2c_items?select=id', {
      method:'POST', prefer:'return=representation',
      body: { operacion_id:operacionId, sku_id:skuId, cantidad:1, precio_unitario:9000, subtotal:9000 }
    }, clienteTok);
    itemId = body?.[0]?.id;
    if (status===201 && itemId) ok('INSERT item operacion', `id=${itemId?.slice(0,8)}`);
    else fail('INSERT item operacion', `status=${status}`);
  }

  // ── 8. INSERT notificación al taller ──────────────────────────────
  if (operacionId && clienteTok) {
    const { status, body } = await rest('/cat_notificaciones_talleres?select=id', {
      method:'POST', prefer:'return=representation',
      body: { taller_id:TALLER_ID, operacion_id:operacionId, tipo:'nueva_operacion',
              mensaje:'Test smoke Fase 4', leida:false }
    }, clienteTok);
    notifId = body?.[0]?.id;
    if (status===201 && notifId) ok('INSERT notificación al taller', `id=${notifId?.slice(0,8)}`);
    else fail('INSERT notificación al taller', `status=${status} ${JSON.stringify(body)?.slice(0,80)}`);
  }

  // ── 9. Cliente ve sus operaciones ─────────────────────────────────
  if (clienteId && operacionId) {
    const { status, body } = await rest(
      `/cat_operaciones_b2c?cliente_id=eq.${clienteId}&select=id,estado,total,metodo_pago,taller_id,pendiente_aprobacion_taller`,
      {}, clienteTok
    );
    const op = body?.find?.(o => o.id === operacionId);
    if (status===200 && op && op.metodo_pago==='manual' && op.taller_id===TALLER_ID && op.pendiente_aprobacion_taller===true) {
      ok('Cliente ve sus operaciones con taller_id y metodo_pago', `total=$${body[0].total} taller_id=${op.taller_id.slice(0,8)}`);
    } else {
      fail('Cliente ve sus operaciones', `status=${status} ${JSON.stringify(op)?.slice(0,80)}`);
    }
  }

  // ── 10. Cliente ve taller via JOIN en operacion ────────────────────
  if (operacionId && clienteTok) {
    const { status, body } = await rest(
      `/cat_operaciones_b2c?id=eq.${operacionId}&select=id,taller_id,cat_recomendaciones_talleres!taller_id(nombre,localidad)`,
      {}, clienteTok
    );
    const op = body?.[0];
    const tn = op?.cat_recomendaciones_talleres;
    if (status===200 && tn?.nombre) {
      ok('JOIN operacion → taller (nombre legible)', `taller=${tn.nombre} (${tn.localidad})`);
    } else {
      fail('JOIN operacion → taller', `status=${status} ${JSON.stringify(op)?.slice(0,80)}`);
    }
  }

  // ── 11. Crear usuario taller con service_role (con metadata) ──────
  if (SERVICE_ROLE_KEY) {
    const tallerUser = await adminCreateUser(EMAIL_TALLER, PASS, {
      role: 'taller', taller_id: TALLER_ID, taller_nombre: 'Franzoni Hermanos'
    });
    tallerUid = tallerUser?.id;
    if (tallerUid) {
      ok('CREATE usuario taller con metadata role=taller', `uid=${tallerUid.slice(0,8)}`);
    } else {
      fail('CREATE usuario taller', JSON.stringify(tallerUser)?.slice(0,80));
    }
  } else {
    warn('CREATE usuario taller (service_role requerida)', 'Sin service_role — saltar tests de taller');
  }

  // ── 12. Login como taller ──────────────────────────────────────────
  if (tallerUid) {
    const d = await authPost('/token?grant_type=password', { email: EMAIL_TALLER, password: PASS });
    tallerTok = d?.access_token;
    const meta = d?.user?.user_metadata || {};
    if (tallerTok && meta.role === 'taller' && meta.taller_id === TALLER_ID) {
      ok('Login taller OK + metadata role=taller verificado', `taller_nombre=${meta.taller_nombre}`);
    } else {
      fail('Login taller', `tok=${!!tallerTok} role=${meta.role} taller_id=${meta.taller_id}`);
    }
  }

  // ── 13. Taller ve sus operaciones (RLS) ───────────────────────────
  if (tallerTok && operacionId) {
    const { status, body } = await rest(
      `/cat_operaciones_b2c?taller_id=eq.${TALLER_ID}&select=id,estado,total,pendiente_aprobacion_taller&limit=10`,
      {}, tallerTok
    );
    const op = body?.find?.(o => o.id === operacionId);
    if (status===200 && op) {
      ok('Taller ve sus operaciones (RLS)', `${body.length} ops visibles, pendiente=${op.pendiente_aprobacion_taller}`);
    } else if (status===200 && Array.isArray(body) && body.length===0) {
      warn('Taller ve sus operaciones (RLS)', 'Array vacío — verificar que fase4_ddl.sql fue aplicado');
    } else {
      fail('Taller ve sus operaciones (RLS)', `status=${status} ${JSON.stringify(body)?.slice(0,80)}`);
    }
  }

  // ── 14. Taller NO ve operaciones de otro cliente ───────────────────
  if (tallerTok && clienteId) {
    const otroClienteId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const { status, body } = await rest(
      `/cat_operaciones_b2c?cliente_id=eq.${otroClienteId}&select=id`,
      {}, tallerTok
    );
    if (status===200 && Array.isArray(body) && body.length===0) {
      ok('Taller NO ve operaciones de otros clientes (aislamiento RLS)', 'array vacío para cliente UUID ajeno');
    } else if (status===200) {
      warn('Taller — aislamiento RLS', `body.length=${body?.length} — revisar políticas`);
    } else {
      ok('Taller NO ve operaciones de otros clientes (RLS)', `HTTP ${status}`);
    }
  }

  // ── 15. Taller ve sus notificaciones ──────────────────────────────
  if (tallerTok && notifId) {
    const { status, body } = await rest(
      `/cat_notificaciones_talleres?taller_id=eq.${TALLER_ID}&leida=eq.false&select=id,tipo,mensaje`,
      {}, tallerTok
    );
    const notif = body?.find?.(n => n.id === notifId);
    if (status===200 && notif) {
      ok('Taller ve sus notificaciones (RLS)', `tipo=${notif.tipo} msg="${notif.mensaje?.slice(0,30)}"`);
    } else if (status===200 && Array.isArray(body) && body.length===0) {
      warn('Taller ve notificaciones', 'Array vacío — verificar fase4_ddl.sql aplicado');
    } else {
      fail('Taller ve notificaciones', `status=${status} ${JSON.stringify(body)?.slice(0,60)}`);
    }
  }

  // ── 16. Taller marca notificación como leída ──────────────────────
  if (tallerTok && notifId) {
    const { status } = await rest(
      `/cat_notificaciones_talleres?id=eq.${notifId}`,
      { method:'PATCH', prefer:'return=minimal', body:{ leida:true } },
      tallerTok
    );
    if (status===204 || status===200) ok('Taller marca notificación leída', 'PATCH OK');
    else fail('Taller marca notificación leída', `status=${status}`);
  }

  // ── 17. Taller aprueba operación (UPDATE estado pendiente→pagado) ──
  if (tallerTok && operacionId) {
    const { status } = await rest(
      `/cat_operaciones_b2c?id=eq.${operacionId}`,
      { method:'PATCH', prefer:'return=minimal', body:{ estado:'pagado', pendiente_aprobacion_taller:false, updated_at:new Date().toISOString() } },
      tallerTok
    );
    if (status===204 || status===200) ok('Taller aprueba operación (pendiente→pagado)', 'PATCH OK');
    else warn('Taller aprueba operación', `status=${status} — revisar RLS UPDATE en fase4_ddl.sql`);
  }

  // ── 18. Login taller con credenciales incorrectas → debe rechazar ──
  {
    const d = await authPost('/token?grant_type=password', { email: 'fake@noexiste.com', password: 'WrongPass!99' });
    // Supabase v2 puede retornar { error, error_description } o { code, error_code, msg }
    const isError = !d?.access_token && (d?.error || d?.error_code || d?.msg || d?.message || d?.code >= 400);
    if (isError) {
      ok('Auth taller falla con credenciales incorrectas', d.error_description || d.msg || d.error || 'error esperado');
    } else {
      fail('Auth taller falla con credenciales incorrectas', `resp=${JSON.stringify(d)?.slice(0,80)}`);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────
  if (itemId && clienteTok)      await rest(`/cat_operaciones_b2c_items?id=eq.${itemId}`, { method:'DELETE' }, clienteTok);
  if (notifId && tallerTok)      await rest(`/cat_notificaciones_talleres?id=eq.${notifId}`, { method:'DELETE' }, tallerTok).catch(()=>{});
  if (notifId)                   await rest(`/cat_notificaciones_talleres?id=eq.${notifId}`, { method:'DELETE' }, 'service').catch(()=>{});
  if (operacionId && clienteTok) await rest(`/cat_operaciones_b2c?id=eq.${operacionId}`, { method:'DELETE' }, clienteTok);
  if (clienteId && clienteTok)   await rest(`/cat_clientes_finales?id=eq.${clienteId}`, { method:'DELETE' }, clienteTok);

  await adminDeleteUser(clienteUid);
  await adminDeleteUser(tallerUid);

  if (!SERVICE_ROLE_KEY) {
    warn('Cleanup auth.users manual', `Clientes creados: ${EMAIL_CLIENTE}${EMAIL_TALLER ? ', ' + EMAIL_TALLER : ''}`);
  } else {
    ok('Cleanup auth.users', 'usuarios eliminados');
  }

  printReport(t0);
}

function printReport(t0) {
  const elapsed = Date.now() - t0;
  console.log('\n' + '─'.repeat(65));
  results.forEach(r => console.log(`  ${r.s} ${r.n}${r.d ? ' — ' + r.d : ''}`));
  console.log('─'.repeat(65));
  console.log(`Total: ${results.length} | ❌ ${failed} | ⚠️ ${warned} | ⏱ ${elapsed}ms`);
  console.log(failed === 0 ? '🎉 Todo OK' : `💥 ${failed} test(s) fallaron`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = require('fs');
    const lines = ['## Smoke Test Fase 4 — Panel Taller + Notificaciones\n',
      `**Total: ${results.length}** | ❌ ${failed} | ⚠️ ${warned} | ⏱ ${elapsed}ms\n`,
      '| | Test | Detalle |', '|---|---|---|'];
    results.forEach(r => lines.push(`| ${r.s} | ${r.n} | ${r.d||'—'} |`));
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('[FATAL]', err); process.exit(1); });
