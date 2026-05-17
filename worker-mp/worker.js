// piezauto-mp-proxy — Cloudflare Worker
// Deploy: cd worker-mp && npx wrangler deploy --name piezauto
import { ejecutarRecordatorios } from './recordatorios.js';
import { ejecutarVencimientosWallet } from './wallet-vencimientos.js';
import { ejecutarDeteccionComprasProgramadas } from './compra-programada.js';

const ALLOWED_ORIGINS = [
  'https://piezauto.piezauto1.workers.dev',
  'https://piezauto.pages.dev',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Llama a wallet_movimiento vía Supabase REST (service_role)
async function callWalletMovimiento(env, params) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/wallet_movimiento`, {
    method: 'POST',
    headers: {
      'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('[wallet_movimiento] error:', res.status, txt);
  }
  return res;
}

// PATCH sobre cat_operaciones_b2c
async function patchOperacion(env, opId, payload) {
  return fetch(
    `${env.SUPABASE_URL}/rest/v1/cat_operaciones_b2c?id=eq.${opId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(payload),
    }
  );
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // POST /crear-preferencia
    if (url.pathname === '/crear-preferencia' && request.method === 'POST') {
      try {
        const body = await request.json();
        const res  = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status:  res.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }

    // POST /webhook — notificaciones MP
    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));

        if (body.action === 'payment.updated' || body.type === 'payment') {
          const paymentId = body.data?.id;
          if (!paymentId) return new Response('OK');

          // Obtener detalles del pago desde MP
          const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` },
          });
          const payment = await pRes.json();
          const opId = payment.external_reference;
          if (!opId) return new Response('OK');

          // Obtener operación actual
          const opRes = await fetch(
            `${env.SUPABASE_URL}/rest/v1/cat_operaciones_b2c?id=eq.${opId}&select=id,taller_id,cliente_id,credito_aplicado,total`,
            {
              headers: {
                'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          );
          const ops = await opRes.json();
          const op = Array.isArray(ops) ? ops[0] : null;
          if (!op) return new Response('OK');

          const walletAplicado = parseFloat(op.credito_aplicado) || 0;

          if (payment.status === 'approved') {
            let nuevoEstado = 'pagado_confirmado';
            let pendienteAprobacion = false;

            // Si tiene taller, verificar autoaprobar_trabajos del cliente
            if (op.taller_id) {
              const cliRes = await fetch(
                `${env.SUPABASE_URL}/rest/v1/cat_clientes_finales?id=eq.${op.cliente_id}&select=autoaprobar_trabajos`,
                {
                  headers: {
                    'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                }
              );
              const clientes = await cliRes.json();
              const autoaprobar = clientes?.[0]?.autoaprobar_trabajos ?? false;

              if (!autoaprobar) {
                nuevoEstado = 'pendiente_aprobacion';
                pendienteAprobacion = true;
              } else {
                nuevoEstado = 'pagado';
              }
            } else {
              nuevoEstado = 'pagado';
            }

            // Actualizar operación
            await patchOperacion(env, opId, {
              estado:                      nuevoEstado,
              mp_payment_id:               String(paymentId),
              mp_status:                   payment.status,
              pendiente_aprobacion_taller: pendienteAprobacion,
              updated_at:                  new Date().toISOString(),
            });

            // Debitar wallet si el cliente había aplicado crédito
            if (walletAplicado > 0) {
              await callWalletMovimiento(env, {
                p_cliente_id:   op.cliente_id,
                p_tipo:         'debito',
                p_monto:        walletAplicado,
                p_concepto:     `Pago op #${opId.slice(0, 8)} vía MercadoPago`,
                p_operacion_id: opId,
              });
            }

            // Notificar taller si queda pendiente de aprobación
            if (pendienteAprobacion && op.taller_id) {
              await fetch(
                `${env.SUPABASE_URL}/rest/v1/cat_notificaciones_talleres`,
                {
                  method: 'POST',
                  headers: {
                    'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type':  'application/json',
                    'Prefer':        'return=minimal',
                  },
                  body: JSON.stringify({
                    taller_id:    op.taller_id,
                    operacion_id: opId,
                    tipo:         'pendiente_aprobacion',
                    mensaje:      `Operación pagada pendiente de aprobación — $${Number(op.total).toLocaleString('es-AR')}`,
                    leida:        false,
                  }),
                }
              );
            }

          } else if (payment.status === 'rejected') {
            await patchOperacion(env, opId, {
              estado:       'cancelado',
              mp_payment_id: String(paymentId),
              mp_status:    payment.status,
              updated_at:   new Date().toISOString(),
            });

            // Revertir wallet si se había reservado crédito
            if (walletAplicado > 0) {
              await callWalletMovimiento(env, {
                p_cliente_id:   op.cliente_id,
                p_tipo:         'reversion',
                p_monto:        walletAplicado,
                p_concepto:     `Reversión por pago rechazado — op #${opId.slice(0, 8)}`,
                p_operacion_id: opId,
              });
            }

          } else {
            // pending / in_process / etc.
            await patchOperacion(env, opId, {
              mp_payment_id: String(paymentId),
              mp_status:     payment.status,
              updated_at:    new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('[webhook] Error:', err);
      }
      return new Response('OK');
    }

    // Delegar en assets estáticos (sirve .html, CSS, JS, etc.)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not found', { status: 404 });
  },

  // Cron: cada 6 horas — procesar recordatorios pendientes
  async scheduled(event, env, ctx) {
    if (event.cron === '0 3 * * *') {
      ctx.waitUntil(ejecutarVencimientosWallet(env));
    } else if (event.cron === '0 4 * * *') {
      ctx.waitUntil(ejecutarDeteccionComprasProgramadas(env));
    } else {
      ctx.waitUntil(ejecutarRecordatorios(env));
    }
  },
};
