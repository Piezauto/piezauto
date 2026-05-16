// Cron diario 03:00 — vencimiento de créditos de wallet Piezauto
// Llamado desde scheduled() en worker.js cuando el trigger es "0 3 * * *"

export async function ejecutarVencimientosWallet(env) {
  const SUPABASE_URL     = env.SUPABASE_URL;
  const SUPABASE_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    console.error('[wallet-vencimientos] Faltan env vars SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    return { ok: false, error: 'missing_env' };
  }

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_vencer_creditos_caducos`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE,
      'Authorization': `Bearer ${SUPABASE_SERVICE}`,
    },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    console.error('[wallet-vencimientos] Error en RPC:', resp.status, txt);
    return { ok: false, status: resp.status };
  }

  const data = await resp.json().catch(() => null);
  console.log(`[wallet-vencimientos] Créditos vencidos: ${data ?? 0}`);
  return { ok: true, vencidos: data ?? 0 };
}
