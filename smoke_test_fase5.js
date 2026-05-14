#!/usr/bin/env node
// smoke_test_fase5.js — Piezauto Point + Sistema de Turnos
// Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Corre con: node smoke_test_fase5.js (Node 20, sin package.json)

const SUPABASE_URL     = process.env.SUPABASE_URL     || 'https://mqxowotdeibllkitkije.supabase.co';
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY         = process.env.SUPABASE_ANON_KEY;
const SITE_URL         = process.env.SITE_URL || 'https://piezauto.piezauto1.workers.dev';

if (!SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY no configurada'); process.exit(1); }

const hdrsService = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` };
const hdrsAnon    = { 'apikey': ANON_KEY || '', 'Authorization': `Bearer ${ANON_KEY || ''}` };

let passed = 0, failed = 0, warnings = 0;

function ok(label)   { console.log(`  ✅ ${label}`); passed++;   }
function fail(label) { console.error(`  ❌ ${label}`); failed++; }
function warn(label) { console.warn(`  ⚠️  ${label}`); warnings++; }

async function sbCount(tabla, extra = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=id${extra}&limit=1`, {
    headers: { ...hdrsService, 'Prefer': 'count=exact' }
  });
  const count = parseInt(r.headers.get('Content-Range')?.split('/')[1] || '0', 10);
  return { ok: r.ok, status: r.status, count };
}

async function sbCountAnon(tabla, extra = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=id${extra}&limit=1`, {
    headers: { ...hdrsAnon, 'Prefer': 'count=exact' }
  });
  return { ok: r.ok, status: r.status };
}

async function checkPage(path) {
  try {
    const r = await fetch(`${SITE_URL}${path}`, { redirect: 'follow' });
    return r.status;
  } catch (e) {
    return 0;
  }
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Smoke Test Fase 5 — Piezauto Point + Turnos');
  console.log(`  ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════\n');

  // ── 1–7: Tablas Point (cat_taller_*) ─────────────────────────────
  console.log('── Tablas Point ──');
  const tablasPunto = [
    'cat_taller_clientes',
    'cat_taller_presupuestos',
    'cat_taller_inventario',
    'cat_taller_cuenta_corriente',
    'cat_taller_proveedores',
    'cat_taller_gastos',
    'cat_comprobantes_taller',
  ];
  for (const tabla of tablasPunto) {
    const { ok: isOk, status } = await sbCount(tabla);
    if (isOk) ok(`${tabla} — accesible (service_role)`);
    else       fail(`${tabla} — HTTP ${status}`);
  }

  // ── 8–11: Tablas de turnos ────────────────────────────────────────
  console.log('\n── Tablas de turnos ──');

  // cat_turnos — verificar columnas clave
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cat_turnos?select=id,taller_id,tipo,estado,fecha,hora_inicio,hora_fin,nombre_cliente&limit=0`,
      { headers: hdrsService }
    );
    if (r.ok) ok('cat_turnos — existe con columnas correctas');
    else       fail(`cat_turnos — HTTP ${r.status}: ${await r.text()}`);
  } catch (e) { fail(`cat_turnos — ${e.message}`); }

  for (const tabla of ['cat_turno_progreso', 'cat_taller_disponibilidad', 'cat_taller_bloqueos']) {
    const { ok: isOk, status } = await sbCount(tabla);
    if (isOk) ok(`${tabla} — accesible`);
    else       fail(`${tabla} — HTTP ${status}`);
  }

  // ── 12: RLS cat_recomendaciones_talleres para anon ────────────────
  console.log('\n── RLS anon ──');
  {
    const { ok: isOk, status } = await sbCountAnon('cat_recomendaciones_talleres', '&activo=eq.true');
    if (isOk)           ok('cat_recomendaciones_talleres — SELECT accesible para anon (RLS OK)');
    else if (status === 403) fail('cat_recomendaciones_talleres — 403 para anon — ejecutar fix_rls_talleres_publico.sql');
    else                warn(`cat_recomendaciones_talleres — anon HTTP ${status}`);
  }

  // cat_taller_disponibilidad — debe ser pública también
  {
    const { ok: isOk, status } = await sbCountAnon('cat_taller_disponibilidad');
    if (isOk) ok('cat_taller_disponibilidad — SELECT accesible para anon');
    else      warn(`cat_taller_disponibilidad — anon HTTP ${status}`);
  }

  // cat_turnos — anon NO debe poder insertar sin auth
  {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cat_turnos`, {
      method: 'POST',
      headers: { ...hdrsAnon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ taller_id: '00000000-0000-0000-0000-000000000000', tipo: 'consulta', estado: 'pendiente', fecha: '2099-01-01', hora_inicio: '09:00', hora_fin: '10:00' }),
    });
    if (r.status === 401 || r.status === 403)
      ok('cat_turnos — INSERT bloqueado para anon sin auth (RLS OK)');
    else if (r.status === 400 || r.status === 422)
      ok('cat_turnos — INSERT rechazado por constraint (RLS activa)');
    else
      warn(`cat_turnos — INSERT anon devolvió HTTP ${r.status} (revisar RLS)`);
  }

  // ── 13–15: Páginas accesibles ─────────────────────────────────────
  console.log('\n── Páginas frontend ──');
  const paginas = [
    ['/taller/index.html',   'Panel taller — index'],
    ['/taller-perfil.html',  'Perfil público taller'],
    ['/solicitar-turno.html','Solicitar turno B2C'],
    ['/taller/agenda.html',  'Agenda taller'],
    ['/taller/presupuestos.html', 'Presupuestos taller'],
  ];
  for (const [path, label] of paginas) {
    const status = await checkPage(path);
    if (status === 200)      ok(`${label} — HTTP 200`);
    else if (status === 0)   warn(`${label} — no alcanzable (${SITE_URL})`);
    else                     fail(`${label} — HTTP ${status}`);
  }

  // ── Resumen ───────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} OK · ${warnings} avisos · ${failed} errores`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) { process.exit(1); }
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
