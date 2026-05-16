// piezauto-mp-proxy — Cloudflare Worker
// Deploy: cd worker-mp && npx wrangler deploy --name piezauto
import { ejecutarRecordatorios } from './recordatorios.js';
import { ejecutarVencimientosWallet } from './wallet-vencimientos.js';

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
      const body = await request.json();
      const res  = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method:  'POST',
        headers: {
          'Authorization':  `Bearer ${env.MP_ACCESS_TOKEN}`,
          'Content-Type':   'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status:  res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // POST /webhook — notificaciones MP
    if (url.pathname === '/webhook' && request.method === 'POST') {
      const body = await request.json();
      if (body.action === 'payment.updated' || body.type === 'payment') {
        const paymentId = body.data?.id;
        if (paymentId) {
          const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` },
          });
          const payment = await pRes.json();
          const estado  =
            payment.status === 'approved' ? 'pagado'   :
            payment.status === 'rejected' ? 'cancelado': 'pendiente';
          await fetch(
            `${env.SUPABASE_URL}/rest/v1/cat_operaciones_b2c?mp_preference_id=eq.${payment.external_reference}`,
            {
              method:  'PATCH',
              headers: {
                'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type':  'application/json',
              },
              body: JSON.stringify({
                estado,
                mp_payment_id: String(paymentId),
                mp_status:     payment.status,
              }),
            }
          );
        }
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
    } else {
      ctx.waitUntil(ejecutarRecordatorios(env));
    }
  },
};
