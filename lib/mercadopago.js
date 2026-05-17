// lib/mercadopago.js — Integración MercadoPago Modo
// Estado: PRODUCCION activa.
//
// Cuando el dueño cargue las credenciales:
//   1. Ver SETUP_MP.md para instrucciones.
//   2. Quitar los comentarios de las secciones marcadas con [ACTIVAR CON TOKEN].
//   3. Configurar el endpoint de backend (Supabase Edge Function o Cloudflare Worker).
//
// En modo manual (sin token): las operaciones quedan en estado 'pendiente'
// y el admin confirma el pago manualmente.

// ── Configuración ──────────────────────────────────────────────────
// [ACTIVAR CON TOKEN] Reemplazar con URL del backend cuando esté disponible.
const MP_BACKEND_URL = 'https://piezauto.piezauto1.workers.dev';
const MP_PUBLIC_KEY  = 'APP_USR-1004f166-8b70-4107-9f97-01ff8f795ede';

// ── Crear preferencia de pago ──────────────────────────────────────
//
// Llama al backend (Cloudflare Worker o Edge Function) que tiene
// el ACCESS_TOKEN y crea la preferencia en MercadoPago.
//
// Retorna: { init_point, preference_id } si OK, null si no configurado.
//
// [ACTIVAR CON TOKEN] Descomentar el bloque fetch cuando MP_BACKEND_URL esté seteado.

async function mpCrearPreferencia({ operacionId, items, pagador, backUrls }) {
  if (!MP_BACKEND_URL) {
    console.warn('[MP] MP_BACKEND_URL no configurado — modo manual activo.');
    return null;
  }

   const payload = {
    external_reference: operacionId,
    items: items.map(i => ({
      title:       i.descripcion || 'Autoparte',
      quantity:    i.cantidad,
      unit_price:  Number(i.precio_unitario),
      currency_id: 'ARS',
    })),
    payer: {
      name:  pagador.nombre,
      email: pagador.email,
      phone: { number: pagador.telefono },
    },
    back_urls: {
      success: backUrls.success || `${window.location.origin}/gracias?op=${operacionId}&pago=aprobado`,
      failure: backUrls.failure || `${window.location.origin}/gracias?op=${operacionId}&pago=fallido`,
      pending: backUrls.pending || `${window.location.origin}/gracias?op=${operacionId}&pago=pendiente`,
    },
    auto_return: 'approved',
    notification_url: `${MP_BACKEND_URL}/webhook`,
    statement_descriptor: 'PIEZAUTO',
  };

  try {
    const res  = await fetch(`${MP_BACKEND_URL}/crear-preferencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error MP');
    return { init_point: data.init_point, preference_id: data.id };
  } catch (err) {
    console.error('[MP] Error al crear preferencia:', err);
    return null;
  }
 
}

// ── Guardar preference_id en la operación ─────────────────────────
async function mpGuardarPreferencia(dbB2C, operacionId, preferenceId) {
  if (!preferenceId) return;
  await dbB2C.from('cat_operaciones_b2c').update({
    mp_preference_id: preferenceId,
  }).eq('id', operacionId);
}

// ── Manejar retorno de MP ──────────────────────────────────────────
// Llamar desde gracias.html cuando llega con ?pago=aprobado/fallido/pendiente
async function mpManejarRetorno(dbB2C, operacionId, estadoPago) {
  const mapEstado = { aprobado: 'pagado', fallido: 'cancelado', pendiente: 'pendiente' };
  const nuevoEstado = mapEstado[estadoPago];
  if (!nuevoEstado || !operacionId) return;

  await dbB2C.from('cat_operaciones_b2c').update({
    mp_status:    estadoPago,
    estado:       nuevoEstado,
    updated_at:   new Date().toISOString(),
  }).eq('id', operacionId);
}

// ── Verificar pago vía webhook ─────────────────────────────────────
// El webhook debe implementarse en el backend (Cloudflare Worker / Edge Function).
// Ver SETUP_MP.md → Sección "Webhook".
//
// Lógica esperada del webhook:
//   1. Recibir POST de MercadoPago con { action, data.id }
//   2. Consultar /v1/payments/:id con el ACCESS_TOKEN
//   3. Si status === 'approved': UPDATE cat_operaciones_b2c SET estado='pagado', mp_payment_id=id
//   4. Si status === 'rejected': UPDATE estado='cancelado'
//   5. Devolver HTTP 200 a MercadoPago (si no, reintenta)
