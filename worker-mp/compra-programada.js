export async function ejecutarDeteccionComprasProgramadas(env) {
  const base = env.SUPABASE_URL;
  const key  = env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Detectar nuevas oportunidades
  const rpc = await fetch(`${base}/rest/v1/rpc/fn_detectar_oportunidades_compra`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: '{}',
  });
  const detectadas = rpc.ok ? await rpc.json() : 0;

  // 2. Marcar detectadas → notificadas (estado: detectada → notificada)
  const patch = await fetch(
    `${base}/rest/v1/cat_oportunidades_compra_programada?estado=eq.detectada`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        estado: 'notificada',
        fecha_notificacion: new Date().toISOString(),
      }),
    }
  );

  // 3. Expirar oportunidades vencidas
  const expire = await fetch(
    `${base}/rest/v1/cat_oportunidades_compra_programada?estado=in.(detectada,notificada,vista_cliente)&fecha_expiracion=lt.${new Date().toISOString()}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ estado: 'expirada' }),
    }
  );

  return { detectadas, notificadas: patch.ok, expiradas: expire.ok };
}
