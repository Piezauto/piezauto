# Piezauto

E-commerce de autopartes para el AMBA (Argentina). Tres módulos: **Tienda**, **Admin** y **Point** (panel de talleres asociados).

## Stack

- HTML + CSS + JS vanilla (sin frameworks ni bundlers)
- [Supabase](https://supabase.com) como backend (PostgreSQL + Storage)
- [Netlify](https://netlify.com) para hosting estático
- [EmailJS](https://emailjs.com) para emails transaccionales

---

## Estructura de archivos

```
piezauto/
├── css/
│   └── estilos.css          ← hoja de estilos global
├── js/
│   ├── supabase.js          ← cliente Supabase (expone window.db)
│   ├── mantenimiento.js     ← redirect automático si hay mantenimiento
│   ├── checkout.js
│   └── usuario.js
├── admin/
│   ├── index.html           ← panel de administración
│   ├── login.html
│   ├── test.html            ← checklist de QA
│   └── admin.js
├── point/
│   ├── index.html           ← login de talleres
│   ├── dashboard.html       ← panel del taller
│   └── point.js
├── docs/
│   └── manual_admin.html
├── index.html               ← home / buscador por auto
├── catalogo.html
├── categoria.html
├── producto.html
├── checkout.html
├── usuario.html
├── ofertas.html
├── busqueda.html
├── talleres.html
├── seguimiento.html
├── favoritos.html
├── comparar.html
├── mantenimiento.html       ← pantalla de mantenimiento
├── 404.html
├── sw.js                    ← service worker (PWA)
├── manifest.json            ← PWA manifest
├── favicon.svg
├── sitemap.xml
├── robots.txt
└── netlify.toml
```

---

## Variables de configuración

Todas las variables del sitio se guardan en la tabla `configuracion` de Supabase (clave/valor). Las más importantes:

| Clave | Descripción |
|---|---|
| `nombre` | Nombre del negocio |
| `telefono` | Teléfono de contacto |
| `whatsapp` | Número para el widget flotante (formato: `5491112345678`) |
| `email` | Email de contacto |
| `admin_email` | Email del administrador |
| `admin_password_hash` | Hash de la contraseña del admin |
| `emailjs_service_id` | ID de servicio de EmailJS |
| `emailjs_template_id` | ID de template para confirmación de pedido |
| `emailjs_public_key` | Clave pública de EmailJS |
| `modo_mantenimiento` | `"true"` activa la pantalla de mantenimiento |
| `mantenimiento_mensaje` | Mensaje personalizado en la pantalla de mantenimiento |
| `mantenimiento_eta` | Tiempo estimado de vuelta (texto libre) |
| `wa_flotante` | Número de WhatsApp del botón flotante |

---

## Deploy en Netlify

1. Conectar el repositorio en [app.netlify.com](https://app.netlify.com)
2. Configurar:
   - **Publish directory:** `.` (raíz del repo)
   - **Build command:** (vacío, es sitio estático)
3. El archivo `netlify.toml` ya incluye los redirects y headers de caché/seguridad
4. No se necesitan variables de entorno en Netlify (las credenciales de Supabase están en `js/supabase.js` con la `anon key` pública)

---

## Configuración de Supabase

### Tablas principales

| Tabla | Descripción |
|---|---|
| `productos` | Catálogo con `precio_oferta` nullable, `universal BOOLEAN`, `categoria_id` FK |
| `categorias` | Con `slug` para URLs |
| `compatibilidades` | FK `modelo_id` → `modelos_auto` |
| `modelos_auto` / `marcas_auto` | Vehículos del catálogo |
| `pedidos` | Estado: nuevo / confirmado / preparando / enviado / entregado / cancelado |
| `items_pedido` | `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal` |
| `usuarios` | Auth simple con `password_hash`, `puntos_acumulados` |
| `vehiculos_usuario` | Vehículos guardados por el usuario |
| `cupones` | Tipo: porcentaje / fijo |
| `talleres` | Auth con `password_hash`; sesión en `sessionStorage.pz_taller` |
| `turnos` | Estado: pendiente / confirmado / completado / cancelado |
| `presupuestos` | Solicitudes de clientes a talleres |
| `servicios_taller` | Servicios ofrecidos por cada taller |
| `configuracion` | Clave/valor para ajustes del sitio |
| `banners` | Banners del home |
| `resenas_productos` | Reseñas con `rating`, `aprobada` |
| `combos` / `combo_productos` | Bundles de productos |
| `devoluciones` | Estado: pendiente / aprobada / rechazada; `items JSONB` |
| `puntos_historial` | Auditoría de movimientos de puntos por usuario |
| `recuperacion_codigos` | Códigos temporales para reset de contraseña de talleres |
| `notificaciones_usuario` | Notificaciones del sistema para usuarios |
| `niveles_usuario` | Configuración de niveles de fidelización |
| `referidos` | Sistema de referidos con crédito |
| `inventario_taller` | Inventario de piezas de cada taller |
| `mensajes_internos` | Mensajes entre talleres y admin |

### Migraciones SQL

Ejecutar en orden en el SQL Editor de Supabase:

1. `autos_argentina.sql` — marcas y modelos de autos
2. `sistema_productos_v2.sql` — estructura de productos y categorías
3. `configuracion.sql` — tabla de configuración
4. `cupones.sql`, `banners.sql`, `resenas_productos.sql`
5. `referidos.sql`, `niveles_usuario.sql`
6. `notificaciones.sql`, `notificaciones_usuario.sql`
7. `mensajes_internos.sql`, `inventario_taller.sql`
8. `combos.sql`, `devoluciones.sql`
9. `agregar_puntos_usuarios.sql`
10. `recuperacion_codigos.sql`
11. Resto de scripts `agregar_*.sql`

### Storage

Crear bucket `productos` en Supabase Storage con política de lectura pública.

---

## Autenticación

El sitio usa auth propia (sin Supabase Auth):

| Rol | Storage | Tabla |
|---|---|---|
| Admin | `sessionStorage.pz_admin` | `configuracion` (clave `admin_password_hash`) |
| Taller | `sessionStorage.pz_taller` | `talleres.password_hash` |
| Usuario | `localStorage.pz_usuario` | `usuarios.password_hash` |

---

## Programa de puntos

- Acumulación: $100 de compra = 1 punto
- Canje: 100 puntos = $500 de descuento
- Auditoría en tabla `puntos_historial`

---

## Contacto

Federico Daranno — fededaranno@gmail.com
