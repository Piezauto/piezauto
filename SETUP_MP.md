# Setup MercadoPago — Piezauto

## Estado actual
La estructura de integración está lista en `lib/mercadopago.js`.  
Las columnas `mp_preference_id`, `mp_payment_id`, `mp_status` ya existen en `cat_operaciones_b2c`.

En modo manual (sin token), las operaciones quedan en estado `pendiente`  
y el admin confirma el pago por WhatsApp.

---

## Cuando tengás el MP_ACCESS_TOKEN

### Paso 1 — Crear el backend (Cloudflare Worker)

El ACCESS_TOKEN **nunca** va al frontend. Necesitás un intermediario:

```js
// worker.js (Cloudflare Worker)
// Deployar con: wrangler deploy

const ACCESS_TOKEN = env.MP_ACCESS_TOKEN; // Secret en Cloudflare Dashboard

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /crear-preferencia
    if (url.pathname === '/crear-preferencia' && request.method === 'POST') {
      const body = await request.json();
      const res  = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: res.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://piezauto.piezauto1.workers.dev' } });
    }

    // POST /webhook (notificaciones MP)
    if (url.pathname === '/webhook' && request.method === 'POST') {
      const body = await request.json();
      if (body.action === 'payment.updated' || body.type === 'payment') {
        const paymentId = body.data?.id;
        if (paymentId) {
          const pRes  = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
          });
          const payment = await pRes.json();
          // Actualizar Supabase con service_role key
          const supaUrl = env.SUPABASE_URL;
          const srKey   = env.SUPABASE_SERVICE_ROLE_KEY;
          const estado  = payment.status === 'approved' ? 'pagado' : payment.status === 'rejected' ? 'cancelado' : 'pendiente';
          await fetch(`${supaUrl}/rest/v1/cat_operaciones_b2c?mp_preference_id=eq.${payment.external_reference}`, {
            method:  'PATCH',
            headers: { 'apikey': srKey, 'Authorization': `Bearer ${srKey}`, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ estado, mp_payment_id: String(paymentId), mp_status: payment.status }),
          });
        }
      }
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }
};
```

### Paso 2 — Variables de entorno en Cloudflare

En Cloudflare Dashboard → Workers → piezauto-mp-proxy → Settings → Variables:

| Variable | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | `APP_USR-xxxxx-...` (productivo) o `TEST-xxxxx-...` (sandbox) |
| `SUPABASE_URL` | `https://mqxowotdeibllkitkije.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | La service_role key del proyecto |

### Paso 3 — Activar en el frontend

En `lib/mercadopago.js`, línea 15:
```js
const MP_BACKEND_URL = 'https://piezauto-mp-proxy.TU_USUARIO.workers.dev';
```

Luego descomentar el bloque `fetch` marcado con `[ACTIVAR CON TOKEN]`.

En `js/checkout-b2c.js`, en `confirmarPedido()`, reemplazar el bloque de MP:
```js
if (_metodoPago === 'mercadopago') {
  const items = cargarCarritoLocal();
  const pref = await mpCrearPreferencia({
    operacionId,
    items: items.map(i => ({ descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.precio })),
    pagador: { nombre: nombre + ' ' + apellido, email: _cliente.email, telefono },
    backUrls: {},
  });
  if (pref?.init_point) {
    await mpGuardarPreferencia(dbB2C, operacionId, pref.preference_id);
    window.location.href = pref.init_point;
    return;
  }
  mostrarMsg('No pudimos conectar con MercadoPago. Intentá con transferencia.', 'error');
  btn.disabled = false;
  return;
}
```

### Paso 4 — Configurar notificación webhook en MP

En MercadoPago Dashboard → Tu aplicación → Webhooks:
- URL: `https://piezauto-mp-proxy.TU_USUARIO.workers.dev/webhook`
- Eventos: `payment`

### Paso 5 — Test en sandbox

Usar credenciales TEST antes de ir a producción:
- `TEST_ACCESS_TOKEN` desde MP Dashboard → Credenciales de prueba
- Tarjetas de prueba: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards

---

## Notas

- La public key de MP (`MP_PUBLIC_KEY`) se usa solo si implementás Checkout Bricks en el frontend. Por ahora no es necesaria.
- El 0,8% de comisión por transferencia corresponde a MercadoPago Modo. Las tarjetas tienen comisión diferente (ver tarifario MP).
- La columna `mp_preference_id` en `cat_operaciones_b2c` ya existe y está lista para recibir el dato.
