// recordatorios.js — Cron stub para recordatorios de vehículos
// Ejecutado por el cron trigger de Cloudflare Workers cada 6 horas.
// Cuando el sistema de mensajería esté listo, reemplazar los inserts
// con estado='simulado' por llamadas reales a WhatsApp/Email.

export async function ejecutarRecordatorios(env) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[recordatorios] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados');
    return;
  }

  const hoy = new Date().toISOString().slice(0, 10);

  // 1. Recordatorios por fecha que vencen hoy o antes y están activos
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cat_recordatorios?select=id,titulo,canal,cliente_id,vehiculo_id&activo=eq.true&fecha_trigger=lte.${hoy}`,
    {
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    console.error('[recordatorios] Error al obtener recordatorios:', res.status);
    return;
  }

  const recordatorios = await res.json();
  if (!recordatorios?.length) {
    console.log('[recordatorios] Sin recordatorios pendientes para hoy');
    return;
  }

  console.log(`[recordatorios] Procesando ${recordatorios.length} recordatorio(s)`);

  // 2. Para cada recordatorio, insertar log con estado='simulado'
  const logs = recordatorios.map(r => ({
    recordatorio_id: r.id,
    estado:          'simulado',
    canal:           r.canal || 'app',
    enviado_at:      new Date().toISOString(),
    detalle:         `Stub — fecha: ${hoy} — título: ${r.titulo}`,
  }));

  const insRes = await fetch(
    `${SUPABASE_URL}/rest/v1/cat_recordatorios_log`,
    {
      method:  'POST',
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(logs),
    }
  );

  if (!insRes.ok) {
    console.error('[recordatorios] Error insertando logs:', insRes.status);
    return;
  }

  console.log(`[recordatorios] ${logs.length} log(s) insertados como simulado`);

  // TODO: cuando el sistema de mensajería esté listo, reemplazar por:
  // - WhatsApp: llamar a la API de WhatsApp Business con plantilla
  // - Email: llamar a Resend / SendGrid
  // - App: marcar notificación en-app en cat_notificaciones_talleres o tabla propia
  // Luego actualizar estado de cat_recordatorios_log a 'enviado'
}
