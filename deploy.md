# Deploy de Piezauto en Netlify

## Pre-requisitos

- Cuenta en [Netlify](https://netlify.com) (gratis)
- Proyecto en [Supabase](https://supabase.com) configurado
- Credenciales de MercadoPago (sandbox para pruebas, producción para lanzamiento)
- Cuenta en [EmailJS](https://emailjs.com) (gratis hasta 200 emails/mes)

---

## 1. Configurar Supabase

### 1.1 Correr las migraciones SQL (en orden)

En Supabase → SQL Editor, ejecutar cada archivo en este orden:

```
1. cupones.sql
2. agregar_cupones_pedidos.sql
3. agregar_notas_turnos.sql
4. agregar_universal.sql
5. consultas.sql
6. notificaciones.sql
7. banners.sql
8. resenas_productos.sql
```

### 1.2 Configurar Row Level Security

Verificar que todas las tablas tienen RLS activado (ya incluido en los .sql).
Para el admin, usar el `service_role` key (nunca exponer en el frontend).

### 1.3 Habilitar Realtime

En Supabase → Database → Replication:
- Habilitar `pedidos` para notificaciones en admin
- Habilitar `turnos` y `presupuestos` para notificaciones en Point

### 1.4 Configurar Storage (para imágenes de productos)

En Supabase → Storage → New bucket:
- Nombre: `productos`
- Público: sí
- Tamaño máximo: 5 MB
- Tipos permitidos: `image/jpeg, image/png, image/webp`

---

## 2. Configurar el cliente Supabase

Editar `js/supabase.js` con las credenciales del proyecto:

```js
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...tu-anon-key...';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Las credenciales se encuentran en Supabase → Settings → API.

---

## 3. Configurar MercadoPago

### 3.1 Crear cuenta de vendedor en MercadoPago

Registrarse en [mercadopago.com.ar](https://mercadopago.com.ar) como vendedor.

### 3.2 Obtener credenciales

En MercadoPago → Tu negocio → Credenciales:
- **Sandbox:** usar para pruebas (no cobra dinero real)
- **Producción:** usar cuando el sitio esté listo para vender

### 3.3 Configurar el proxy backend

Ver `mp_proxy.html` para instrucciones detalladas. Opciones:

**Opción A — Netlify Functions:**
```
netlify/functions/mp-preference.js
```

**Opción B — Supabase Edge Functions:**
```
supabase/functions/mp-preference/index.ts
```

### 3.4 Configurar en checkout.html

```js
var MP_PROXY_URL = 'https://tu-sitio.netlify.app/.netlify/functions/mp-preference';
var MP_PUBLIC_KEY = 'APP_USR-xxxxx'; // o TEST-xxxxx en sandbox
```

---

## 4. Configurar EmailJS

Ver `emailjs_setup.md` para instrucciones completas.

En checkout.html:
```js
const EMAILJS_SERVICE_ID  = 'tu_service_id';
const EMAILJS_TEMPLATE_ID = 'tu_template_id';
const EMAILJS_PUBLIC_KEY  = 'tu_public_key';
```

---

## 5. Deploy en Netlify

### 5.1 Deploy por arrastre (más simple)

1. Ir a [app.netlify.com](https://app.netlify.com)
2. Arrastrar la carpeta `piezauto/` al área de deploy
3. Netlify genera una URL del tipo `random-name.netlify.app`
4. En Site settings → Domain management → agregar dominio propio (opcional)

### 5.2 Deploy desde GitHub (recomendado)

1. Subir el proyecto a un repositorio GitHub
2. En Netlify → Add new site → Import from Git
3. Seleccionar el repositorio
4. Build command: *(vacío — es sitio estático)*
5. Publish directory: `.` (raíz del proyecto)
6. Deploy site

### 5.3 Deploy continuo

Cada `git push` a la rama principal despliega automáticamente.

---

## 6. Configurar dominio propio

En Netlify → Domain settings:
1. Agregar dominio: `piezauto.com.ar`
2. Netlify provee DNS gratuito y SSL automático via Let's Encrypt
3. Configurar registros DNS en tu registrador:
   ```
   CNAME  www    random-name.netlify.app
   A      @      75.2.60.5
   ```

---

## 7. Variables de entorno para Netlify Functions

Si usás el proxy de MercadoPago en Netlify Functions:

En Netlify → Site configuration → Environment variables:
```
MP_ACCESS_TOKEN = APP_USR-xxxxx-tu-access-token
```

---

## Checklist antes del lanzamiento público

### Supabase
- [ ] Todas las migraciones SQL corridas sin errores
- [ ] RLS habilitado en todas las tablas
- [ ] Realtime habilitado para `pedidos`, `turnos`, `presupuestos`
- [ ] Storage bucket `productos` creado y público
- [ ] `js/supabase.js` apunta al proyecto de producción (no al de desarrollo)

### MercadoPago
- [ ] Credenciales de **producción** configuradas (no sandbox)
- [ ] `MP_PROXY_URL` apunta al endpoint real
- [ ] `MP_PUBLIC_KEY` es la clave de producción
- [ ] Probado con una compra real de $1
- [ ] Webhooks/IPN configurados para actualizar estado del pedido

### EmailJS
- [ ] Service ID, Template ID y Public Key configurados en checkout.html
- [ ] Template de email probado con datos reales
- [ ] Cuenta con plan adecuado para el volumen esperado

### Contenido
- [ ] Datos bancarios para transferencia actualizados (CBU/alias real)
- [ ] Número de WhatsApp actualizado en todos los botones flotantes
- [ ] Dirección del local en checkout.html y nosotros.html
- [ ] Banners del homepage cargados desde el panel admin
- [ ] Categorías y productos cargados en Supabase
- [ ] Al menos 5 talleres activos en la red Point

### SEO y performance
- [ ] Meta tags revisados en todas las páginas
- [ ] Imágenes de productos en formato WebP (< 200 KB cada una)
- [ ] Favicon cargado (`favicon.ico` en la raíz)
- [ ] Google Analytics o Plausible configurado (opcional)

### Seguridad
- [ ] `service_role` key de Supabase NUNCA expuesta en el frontend
- [ ] Admin protegido con contraseña fuerte
- [ ] Panel Point solo accesible para talleres registrados
- [ ] RLS verificado: un usuario no puede ver pedidos ajenos

### Testing
- [ ] Flujo completo de compra probado (agregar al carrito → checkout → pago → confirmación)
- [ ] Registro y login de usuario probados
- [ ] Búsqueda de productos por auto probada
- [ ] Panel admin: crear/editar/eliminar producto
- [ ] Panel Point: crear turno, responder presupuesto
- [ ] Formulario de contacto (nosotros.html) probado
- [ ] Vista mobile probada en iOS y Android

---

## Estructura de archivos en producción

```
piezauto/
├── css/estilos.css
├── js/supabase.js          ← editar con credenciales reales
├── netlify/functions/      ← proxy de MercadoPago (si usás Netlify)
│   └── mp-preference.js
├── admin/
│   ├── index.html
│   └── proveedores.html
├── point/
│   ├── index.html
│   └── dashboard.html
├── *.html
├── *.sql                   ← NO se suben, son solo para referencia
├── deploy.md               ← este archivo
├── mp_proxy.html           ← solo para devs, podés excluirlo
└── netlify.toml            ← opcional, para redirects
```

### netlify.toml recomendado

```toml
[[redirects]]
  from = "/admin"
  to = "/admin/index.html"
  status = 200

[[redirects]]
  from = "/point"
  to = "/point/index.html"
  status = 200

[[headers]]
  for = "/*.html"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```
