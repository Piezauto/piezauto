# Configuración de EmailJS para Piezauto

EmailJS permite enviar emails desde el frontend sin necesidad de backend.
Plan gratuito: 200 emails/mes. Suficiente para empezar.

---

## 1. Crear cuenta en EmailJS

1. Ir a [emailjs.com](https://www.emailjs.com)
2. Registrarse con una cuenta de Gmail (o la que uses para el negocio)
3. Verificar el email

---

## 2. Crear un Email Service

1. En el dashboard de EmailJS → **Email Services** → **Add New Service**
2. Seleccionar **Gmail** (o el proveedor que uses)
3. Conectar tu cuenta de Gmail
4. Nombre del servicio: `piezauto_pedidos`
5. Copiar el **Service ID** (ejemplo: `service_abc123`)

---

## 3. Crear el Template de email

1. En EmailJS → **Email Templates** → **Create New Template**
2. Nombre: `confirmacion_pedido`
3. Subject: `✅ Tu pedido #{{numero_pedido}} fue confirmado — Piezauto`

### HTML del template (pegar en el editor):

```html
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
  <div style="background:#1a1a1a;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">Pieza<span style="color:#E63946">auto</span></h1>
  </div>

  <div style="padding:32px 24px">
    <h2 style="color:#1a1a1a;margin-top:0">¡Pedido confirmado, {{nombre_cliente}}! ✅</h2>
    <p style="color:#555;font-size:15px">
      Recibimos tu pedido y ya lo estamos procesando. Te contactamos a la brevedad para coordinar la entrega.
    </p>

    <div style="background:#f8f8f8;border-radius:10px;padding:20px;margin:24px 0">
      <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;font-weight:700">Número de pedido</p>
      <p style="margin:0;font-size:24px;font-weight:900;color:#E63946">#{{numero_pedido}}</p>
    </div>

    <h3 style="color:#1a1a1a;border-bottom:2px solid #f0f0f0;padding-bottom:10px">Productos comprados</h3>
    <div style="white-space:pre-line;font-size:14px;color:#444;line-height:1.8">{{productos}}</div>

    <div style="background:#f8f8f8;border-radius:10px;padding:20px;margin:24px 0">
      <table style="width:100%;font-size:14px">
        <tr>
          <td style="color:#888;padding:4px 0">Email</td>
          <td style="font-weight:600;text-align:right">{{email_cliente}}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:4px 0">Teléfono</td>
          <td style="font-weight:600;text-align:right">{{telefono_cliente}}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:4px 0">Método de pago</td>
          <td style="font-weight:600;text-align:right">{{metodo_pago}}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:4px 0">Entrega</td>
          <td style="font-weight:600;text-align:right">{{metodo_envio}}</td>
        </tr>
        <tr style="border-top:2px solid #eee">
          <td style="padding-top:12px;font-size:16px;font-weight:700">Total</td>
          <td style="padding-top:12px;font-size:18px;font-weight:900;color:#E63946;text-align:right">{{total}}</td>
        </tr>
      </table>
    </div>

    <p style="font-size:13px;color:#888;margin-top:24px">
      Podés hacer el seguimiento de tu pedido en:
      <a href="https://tu-sitio.netlify.app/seguimiento.html" style="color:#E63946">piezauto.com.ar/seguimiento</a>
    </p>
  </div>

  <div style="background:#f0f0f0;padding:20px;text-align:center;font-size:12px;color:#888">
    <p style="margin:0"><strong>Piezauto</strong> — Zona Oeste, Buenos Aires</p>
    <p style="margin:8px 0 0">Si tenés dudas, escribinos por
      <a href="https://wa.me/5491100000000" style="color:#25D366">WhatsApp</a>
    </p>
  </div>
</div>
```

4. En **To Email**: `{{email_cliente}}`
5. En **From Name**: `Piezauto`
6. Guardar el template
7. Copiar el **Template ID** (ejemplo: `template_xyz789`)

---

## 4. Obtener la Public Key

1. En EmailJS → **Account** → **General**
2. Copiar el **Public Key** (ejemplo: `user_AbCdEfGhIjK`)

---

## 5. Configurar en checkout.html

Buscar estas variables al inicio del script y completarlas:

```js
var EMAILJS_SERVICE_ID  = 'service_abc123';   // tu Service ID
var EMAILJS_TEMPLATE_ID = 'template_xyz789';  // tu Template ID
var EMAILJS_PUBLIC_KEY  = 'user_AbCdEfGhIjK'; // tu Public Key
```

Si las tres variables están vacías, el email simplemente no se envía (no rompe el checkout).

---

## 6. Variables disponibles en el template

| Variable | Contenido |
|----------|-----------|
| `{{nombre_cliente}}` | Nombre y apellido |
| `{{email_cliente}}` | Email del comprador |
| `{{telefono_cliente}}` | Teléfono |
| `{{numero_pedido}}` | ID corto del pedido (8 chars) |
| `{{productos}}` | Lista de productos con cantidad y precio |
| `{{total}}` | Total formateado (ej: $12.500) |
| `{{metodo_pago}}` | transferencia / efectivo / mercadopago |
| `{{metodo_envio}}` | Retiro en local / Envío a domicilio |

---

## 7. Probar

1. Hacer una compra de prueba en el sitio
2. Verificar que llegue el email (revisar spam)
3. En EmailJS dashboard → **Email Logs** podés ver todos los envíos

---

## Límites del plan gratuito

- **200 emails/mes** gratuitos
- Sin tarjeta de crédito requerida
- Para más volumen: plan Starter ($9/mes, 1.000 emails) o Business ($19/mes, 5.000 emails)
