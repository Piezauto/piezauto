# CONTEXTO_CTO — Piezauto

> Documento de referencia técnica completo. Última actualización: 2026-04-21.
> Usarlo como contexto inicial en cada nueva sesión con Claude Code.

---

## 1. Descripción del proyecto

**Piezauto** es un e-commerce de autopartes para el AMBA (Área Metropolitana de Buenos Aires, Argentina). El negocio tiene local físico en Zona Oeste y una red de talleres asociados (programa Point).

Tiene tres módulos principales:

| Módulo | Acceso | Descripción |
|---|---|---|
| **Tienda** | Público | Catálogo, búsqueda por auto, carrito, checkout, perfil de usuario |
| **Admin** | `/admin` (contraseña) | Gestión total del negocio |
| **Point** | `/point` (contraseña por taller) | Panel para talleres asociados |

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JS vanilla (sin frameworks, sin bundlers) |
| Backend | Supabase (PostgreSQL + Storage + RLS) |
| Hosting | Netlify (sitio estático) |
| Email | EmailJS (transaccional desde el frontend) |
| Pago | MercadoPago (SDK JS — **pendiente de configurar**) |
| Analytics | dataLayer GTM-ready (`js/analytics.js`) |
| PWA | Service Worker (`sw.js`) + `manifest.json` |

### URLs de producción

| Servicio | URL |
|---|---|
| Supabase proyecto | `https://mqxowotdeibllkitkije.supabase.co` |
| Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8` |
| Sitio Netlify | pendiente de conectar a dominio |
| Dominio final | `piezauto.com.ar` (a configurar en Netlify DNS) |

### Cliente Supabase

El cliente se inicializa en `js/supabase.js` y se expone como `window.db` globalmente. Todas las páginas incluyen este script antes de sus scripts propios. Configuración: `persistSession: false`, `autoRefreshToken: false` (auth manual, no usa Supabase Auth).

---

## 3. Estructura de archivos

### HTML — Tienda (público)

| Archivo | Descripción |
|---|---|
| `index.html` | Home: banners, buscador por auto, categorías destacadas, ofertas, talleres |
| `catalogo.html` | Catálogo general con filtros (categoría, marca, precio, auto) |
| `categoria.html` | Catálogo filtrado por categoría (usa `?slug=`) |
| `producto.html` | Ficha de producto: galería, precio, compatibilidades, reseñas, preguntas |
| `busqueda.html` | Resultados de búsqueda por texto y por auto |
| `ofertas.html` | Productos en oferta, countdown, sección liquidación |
| `favoritos.html` | Lista de favoritos (localStorage `pz_favoritos`) |
| `comparar.html` | Comparador de hasta 3 productos |
| `checkout.html` | Carrito + formulario de compra + selección de pago y entrega |
| `seguimiento.html` | Seguimiento de pedido por ID |
| `usuario.html` | Perfil: datos, historial de pedidos, fidelización, puntos, vehículos, referidos |
| `talleres.html` | Listado de talleres Point con mapa y servicios |
| `marcas.html` | Página de marcas de productos |
| `nosotros.html` | Página institucional |
| `privacidad.html` | Política de privacidad |
| `terminos.html` | Términos y condiciones |
| `unirse-point.html` | Landing de captación de talleres para el programa Point |
| `mantenimiento.html` | Pantalla de mantenimiento (redirect automático desde `js/mantenimiento.js`) |
| `404.html` | Página de error 404 |

### HTML — Admin

| Archivo | Descripción |
|---|---|
| `admin/login.html` | Login con rate limiting (3 intentos → 5 min bloqueo) |
| `admin/index.html` | Panel completo: dashboard, productos, categorías, pedidos, talleres, cupones, combos, devoluciones, reportes, configuración, mensajes, logística, facturación Point, marcas, modelos, banners, reseñas, proveedores |
| `admin/proveedores.html` | Gestión de proveedores y lista de precios |
| `admin/test.html` | Checklist de QA con 40 ítems y pruebas técnicas automáticas |

### HTML — Point (talleres)

| Archivo | Descripción |
|---|---|
| `point/index.html` | Login de talleres + recuperación de contraseña por email |
| `point/dashboard.html` | Panel completo: turnos, agenda semanal/diaria, presupuestos, clientes, inventario, finanzas, mensajes, perfil. Mobile: bottom nav con swipe y pull-to-refresh |

### HTML — Docs / Dev

| Archivo | Descripción |
|---|---|
| `docs/manual_admin.html` | Manual de uso del panel admin |
| `mp_proxy.html` | Instrucciones para configurar el proxy de MercadoPago |

### JavaScript

| Archivo | Descripción |
|---|---|
| `js/supabase.js` | Cliente Supabase (`window.db`). **No modificar sin actualizar credenciales** |
| `js/mantenimiento.js` | Verifica modo mantenimiento en Supabase y redirige si está activo. Excluye `/admin`, `/point`, `mantenimiento` |
| `js/checkout.js` | Lógica completa de checkout: carrito, cupones, descuentos por volumen, nivel de usuario, puntos, referidos, EmailJS, MP, acumulación de puntos |
| `js/usuario.js` | Perfil de usuario: datos, pedidos, vehículos, fidelización, puntos, historial |
| `js/analytics.js` | Tracking GTM-ready: `trackAddToCart`, `trackPurchase`, `trackProductView`, etc. |
| `js/whatsapp-widget.js` | Widget flotante de WhatsApp, número desde tabla `configuracion` |
| `js/config-topbar.js` | Topbar informativa configurable desde admin |
| `js/autocomplete.js` | Autocompletado de búsqueda de productos |
| `js/mini-carrito.js` | Mini carrito desplegable en el header |
| `js/catalogo.js` | Lógica de carga y filtros del catálogo |
| `js/talleres.js` | Mapa y filtros de la página de talleres |
| `js/notifications.js` | Notificaciones push para usuarios logueados |
| `js/index.js` | Lógica del home: banners, buscador por auto, productos destacados |
| `admin/admin.js` | Toda la lógica del panel admin (~2.500 líneas) |
| `admin/pagos.js` | Módulo de facturación Point (cargos, pagos, cuenta corriente) |
| `admin/proveedores.js` | Lógica del módulo de proveedores |
| `point/dashboard.js` | Lógica del panel Point (turnos, agenda, finanzas, inventario, etc.) |
| `sw.js` | Service Worker para PWA (caché offline) |

### CSS

| Archivo | Descripción |
|---|---|
| `css/estilos.css` | Hoja de estilos global. Variables CSS: `--rojo:#E63946`, `--negro:#1a1a1a`, `--gris-claro:#f8f8f8`, `--radio:8px`, `--sombra:0 2px 12px rgba(0,0,0,0.08)` |

### Archivos de configuración / deploy

| Archivo | Descripción |
|---|---|
| `netlify.toml` | Redirects (`/admin`, `/point`, `404`) + headers de caché y seguridad |
| `manifest.json` | PWA manifest |
| `robots.txt` | Directivas para crawlers |
| `sitemap.xml` | Mapa del sitio para SEO |
| `favicon.svg` | Ícono del sitio |
| `CLAUDE.md` | Instrucciones para Claude Code (no borrar) |
| `deploy.md` | Guía de deploy paso a paso |
| `emailjs_setup.md` | Guía de configuración de EmailJS con template HTML |
| `analytics_setup.md` | Guía de configuración de analytics |
| `README.md` | Descripción general del proyecto |

### SQL — Migraciones (ejecutar en orden en Supabase SQL Editor)

| Archivo | Qué crea / modifica |
|---|---|
| `autos_argentina.sql` | Tablas `marcas_auto` y `modelos_auto` con datos de Argentina |
| `sistema_productos_v2.sql` | Estructura base: `productos`, `categorias`, `compatibilidades`, `items_pedido` |
| `configuracion.sql` | Tabla `configuracion` (clave/valor) |
| `cupones.sql` | Tabla `cupones` |
| `agregar_cupones_pedidos.sql` | Columnas `cupon_codigo`, `descuento_aplicado` en `pedidos` |
| `agregar_notas_turnos.sql` | Columna `nota_interna` en `turnos` |
| `agregar_universal.sql` | Columna `universal BOOLEAN` en `productos` |
| `notificaciones.sql` | Tabla `notificaciones` (admin) |
| `banners.sql` | Tabla `banners` |
| `resenas_productos.sql` | Tabla `resenas_productos` |
| `descuentos_volumen.sql` | Tabla `descuentos_volumen` |
| `vendedores.sql` | Tabla `vendedores` |
| `mensajes_internos.sql` | Tabla `mensajes_internos` |
| `preguntas_producto.sql` | Tabla `preguntas_producto` |
| `notificaciones_usuario.sql` | Tabla `notificaciones_usuario` |
| `agregar_origen.sql` | Columna `origen` en `pedidos` |
| `agregar_descuentos_proveedor.sql` | Columnas de descuento en tabla proveedores |
| `agregar_campos_pago_proveedor.sql` | Campos de pago en proveedores |
| `pagos_proveedores.sql` | Tabla `pagos_proveedores` |
| `referidos.sql` | Tabla `referidos` con crédito disponible |
| `agregar_oferta_inicio.sql` | Columnas de oferta en home |
| `agregar_herrajes.sql` | Categoría/tipo herrajes |
| `agregar_dias_atencion.sql` | Columna `dias_atencion` en `talleres` |
| `agregar_facturacion_proveedor.sql` | Módulo de facturación proveedor |
| `agregar_recargo_nofiscal.sql` | Columna de recargo en pedidos sin factura |
| `niveles_usuario.sql` | Tabla `niveles_usuario` (bronce/plata/oro) |
| `solicitudes_point.sql` | Tabla `solicitudes_point` (unirse al programa) |
| `movimientos_cuenta_corriente.sql` | Tabla `movimientos_cuenta_corriente` (Point) |
| `inventario_taller.sql` | Tabla `inventario_taller` |
| `admin_credenciales.sql` | Setup inicial de credenciales admin en `configuracion` |
| `recuperacion_codigos.sql` | Tabla `recuperacion_codigos` para reset de contraseña de talleres |
| `combos.sql` | Tablas `combos` y `combo_productos` |
| `devoluciones.sql` | Tabla `devoluciones` + función `aprobar_devolucion()` |
| `agregar_puntos_usuarios.sql` | Columna `puntos_acumulados` en `usuarios` + tabla `puntos_historial` |
| `limpieza_duplicados.sql` | Script de mantenimiento para limpiar registros duplicados |
| `consultas.sql` | Consultas de referencia / debugging |

---

## 4. Tablas de Supabase

### Tablas principales

| Tabla | Descripción |
|---|---|
| `productos` | Catálogo. Columnas clave: `precio_oferta` (nullable), `universal BOOLEAN`, `categoria_id`, `stock`, `imagenes TEXT[]` |
| `categorias` | Categorías con `slug` — usar slug para URLs |
| `compatibilidades` | FK: `modelo_id` (NO `modelo_auto_id` — bug histórico ya documentado) |
| `modelos_auto` | Join con FK explícita: `modelos_auto!modelo_id(...)` |
| `marcas_auto` | Marcas de vehículos |
| `pedidos` | Estados: nuevo/confirmado/preparando/enviado/entregado/cancelado. Columnas: `nombre_cliente`, `email_cliente`, `telefono_cliente`, `direccion_entrega`, `total`, `metodo_pago`, `estado`, `usuario_id`, `cupon_codigo`, `descuento_aplicado` |
| `items_pedido` | `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal` |
| `cupones` | `tipo`: porcentaje/fijo; `usos_actuales` se incrementa al usar |
| `usuarios` | Auth simple con `password_hash`. Sesión en `localStorage.pz_usuario`. Columna `puntos_acumulados INT DEFAULT 0` |
| `vehiculos_usuario` | `usuario_id`, `modelo_id`, `anio` |
| `talleres` | Auth con `password_hash`. Sesión en `sessionStorage.pz_taller`. Rate limiting en localStorage |
| `turnos` | `taller_id`, `fecha`, `hora`, `estado`: pendiente/confirmado/completado/cancelado |
| `presupuestos` | Solicitudes de clientes a talleres |
| `servicios_taller` | Servicios ofrecidos por cada taller |
| `configuracion` | Clave/valor para ajustes del sitio (ver sección 5) |
| `banners` | Banners del home con imagen, link, orden |
| `resenas_productos` | `rating`, `aprobada BOOLEAN`, `usuario_id` |
| `preguntas_producto` | Preguntas/respuestas en ficha de producto |
| `descuentos_volumen` | Descuentos por cantidad mínima por producto |
| `vendedores` | Vendedores internos asignables a productos |
| `mensajes_internos` | Mensajes entre talleres y admin |
| `notificaciones` | Notificaciones del sistema para admin |
| `notificaciones_usuario` | Notificaciones in-app para usuarios |
| `niveles_usuario` | Niveles de fidelización (bronce/plata/oro) con `usuario_id` |
| `referidos` | Sistema de referidos: `codigo_referido`, `credito_disponible`, `credito_usado` |
| `combos` | Bundles de productos con precio especial |
| `combo_productos` | Relación combo ↔ productos con cantidad |
| `devoluciones` | Estado: pendiente/aprobada/rechazada. `items JSONB`. Aprobación revierte stock |
| `puntos_historial` | Auditoría de movimientos de puntos por usuario. `tipo`: acumulacion/canje |
| `recuperacion_codigos` | Códigos temporales (6 dígitos, 30 min) para reset de contraseña de talleres |
| `inventario_taller` | Inventario de piezas de cada taller Point |
| `solicitudes_point` | Formulario de unirse al programa Point |
| `movimientos_cuenta_corriente` | Cuenta corriente de talleres Point |
| `pagos_proveedores` | Pagos a proveedores |

### Claves en tabla `configuracion`

| Clave | Descripción |
|---|---|
| `nombre` | Nombre del negocio |
| `telefono` | Teléfono de contacto |
| `whatsapp` | Número para mostrar en panel admin |
| `wa_flotante` | Número para el widget flotante (`5491122548257`) |
| `email` | Email de contacto |
| `direccion` | Dirección del local |
| `horario` | Horario de atención |
| `instagram` | URL de Instagram |
| `facebook` | URL de Facebook |
| `admin_email` | Email del administrador |
| `admin_password_hash` | Hash de la contraseña del admin |
| `emailjs_service` | Service ID de EmailJS |
| `emailjs_template` | Template ID de EmailJS |
| `emailjs_key` | Public Key de EmailJS |
| `mp_public_key` | Clave pública de MercadoPago |
| `mp_access_token` | Access token de MercadoPago (⚠️ sensible) |
| `costo_envio` | Costo del envío AMBA en pesos |
| `envio_gratis_desde` | Monto mínimo para envío gratis |
| `ga_id` | Google Analytics ID |
| `wa_mensaje_bienvenida` | Mensaje inicial del widget de WhatsApp |
| `horarios_por_dia` | JSON con horarios por día de la semana |
| `modo_mantenimiento` | `"true"` activa el redirect a `mantenimiento.html` |
| `mantenimiento_mensaje` | Mensaje personalizado en pantalla de mantenimiento |
| `mantenimiento_eta` | Tiempo estimado de vuelta |

---

## 5. Estado de cada módulo

### ✅ Ecommerce — Tienda (COMPLETO)

- Home con banners, buscador por auto (marca/modelo/año), categorías, productos destacados, talleres
- Catálogo con filtros múltiples (categoría, marca, precio, auto seleccionado, universal)
- Ficha de producto: galería con zoom, thumbnails, compatibilidades, reseñas con estrellas, preguntas, productos relacionados, kit de herrajes
- Buscador con resultados en grilla y lista, filtros laterales
- Carrito en localStorage (`pz_carrito`), mini-carrito flotante en header
- Checkout: validaciones, cupones, descuentos por volumen, selector de fecha/hora, MercadoPago (UI lista, falta proxy), EmailJS de confirmación
- Seguimiento de pedido por ID con estados visuales
- Perfil de usuario: datos editables, historial de pedidos, vehículos guardados, fidelización (niveles), programa de puntos, referidos, favoritos
- Sistema de puntos: $100 compra = 1 punto, 100 puntos = $500 descuento. Visible en perfil y canjeable en checkout
- Comparador de productos (hasta 3)
- Favoritos (localStorage `pz_favoritos`)
- Modo mantenimiento: redirect automático a `mantenimiento.html` desde `js/mantenimiento.js`
- PWA: `manifest.json` + `sw.js` + iconos

### ✅ Admin (COMPLETO)

- Login con rate limiting (3 intentos → 5 min, usando localStorage `pz_admin_bloqueo`)
- Dashboard: ventas del mes, pedidos nuevos, usuarios, actividad reciente, stats avanzadas (heatmap horarios, tasa conversión, métodos de pago, tiempo hasta primera compra)
- Productos: CRUD completo, upload de imágenes a Supabase Storage, gestión de compatibilidades por marca/modelo/año, tags, variantes
- Categorías: CRUD, orden, icono
- Modelos: gestión de marcas y modelos de autos
- Marcas de productos: CRUD con logo
- Pedidos: tabla con filtros, detalle completo, cambio de estado, nota interna, notificación in-app al usuario. Email automático al cliente cuando pasa a "enviado" o "entregado"
- Logística: tracking number, transportista, cambio masivo de estado
- Talleres: CRUD, servicios, horarios, gestión de solicitudes Point
- Cupones: CRUD, tipo porcentaje/fijo, vencimiento, usos máximos
- Combos: bundles de productos con precio especial, selector de productos, destacado
- Devoluciones: gestión de solicitudes, búsqueda de pedido por número corto, aprobación (revierte stock automáticamente), generación de nota de crédito NC-XXXXXX
- Banners: CRUD con preview, orden drag-and-drop (visual), activo/inactivo
- Reseñas: moderación (aprobar/rechazar), respuesta del vendedor
- Preguntas: respuesta a preguntas de productos
- Mensajes internos: bandeja de entrada/salida entre talleres y admin
- Facturación Point: cargos por taller, pagos, cuenta corriente
- Reportes: ventas por período, top productos, gráfico de pedidos por mes, pedidos por estado, top taller, categorías más vendidas, métodos de pago, estadísticas avanzadas
- Configuración general: todos los campos de la tabla `configuracion`, horarios por día, toggle modo mantenimiento, preview de topbar informativa
- Panel de proveedores (módulo separado en `admin/proveedores.html`)
- EmailJS: se inicializa en la carga del admin leyendo credenciales de Supabase

### ✅ Point — Talleres (COMPLETO)

- Login con rate limiting + recuperación de contraseña por email (código temporal 6 dígitos, 30 min, tabla `recuperacion_codigos`, envío vía EmailJS)
- Dashboard con stats del taller (turnos del día, ingresos del mes, pendientes)
- Agenda semanal (grilla de bloques por hora) + vista diaria mobile
- Gestión de turnos: crear, editar, cambiar estado, notas
- Presupuestos: recibir solicitudes de clientes, responder con precio, aprobar/rechazar
- Clientes: historial de visitas por taller
- Inventario de piezas: stock por taller, alertas de bajo stock
- Finanzas: estadísticas del mes, gráfico de ingresos, exportar CSV
- Mensajes: bandeja con admin
- Perfil del taller: datos editables, servicios, horarios
- Mobile: bottom nav con 5 secciones (Dashboard, Turnos, Agenda, Mensajes, Perfil), swipe lateral entre secciones, pull-to-refresh, notificaciones push, polling de mensajes cada 60s

### ✅ Proveedores (FUNCIONAL, sin UI completa)

- Módulo separado (`admin/proveedores.html` + `admin/proveedores.js`)
- CRUD de proveedores, lista de precios, pagos
- **Sin importación masiva de listas de precios** (pendiente)

---

## 6. Pendientes — trabajo por hacer

### 🔴 Crítico para producción

#### MercadoPago (pago online)
- **Problema**: `MP_PROXY_URL = ''` en `js/checkout.js`. Sin proxy, el pago con MP muestra un alert y redirige como "pendiente".
- **Por qué necesita proxy**: Las credenciales de acceso (`access_token`) no pueden exponerse en el frontend. Hay que crear una Netlify Function que reciba los items, genere la preferencia de pago en el servidor y devuelva el `init_point`.
- **Cómo implementarlo**:
  1. Crear `netlify/functions/mp-preference.js` (ver instrucciones en `mp_proxy.html`)
  2. Agregar `MP_ACCESS_TOKEN` como variable de entorno en Netlify
  3. Setear `MP_PROXY_URL` en `js/checkout.js` con la URL de la function
  4. Setear `MP_PUBLIC_KEY` con la clave pública de producción
  5. Configurar webhooks de MP para actualizar `estado` del pedido automáticamente

#### EmailJS — configurar credenciales en Supabase
- **Problema**: Las variables `emailjs_service`, `emailjs_template`, `emailjs_key` están vacías en la tabla `configuracion`.
- **Solución**: Crear cuenta en emailjs.com, configurar template (ver `emailjs_setup.md`), insertar en Supabase:
  ```sql
  insert into configuracion (clave, valor) values
    ('emailjs_service',  'service_XXXXXXX'),
    ('emailjs_template', 'template_XXXXXXX'),
    ('emailjs_key',      'XXXXXXXXXXXXXXX')
  on conflict (clave) do update set valor = excluded.valor;
  ```
- **Nota**: el template debe incluir la variable `{{estado_actualizado}}` para los emails de actualización de estado del admin. Si está vacía, es un email de confirmación de pedido nuevo.

### 🟡 Importante, no bloqueante

#### Importación masiva de productos
- Actualmente los productos se cargan uno por uno desde el panel admin.
- Falta: un importador CSV/Excel en el panel admin que lea columnas estándar (SKU, nombre, precio, categoría, stock) y haga upsert en la tabla `productos`.
- También falta importar listas de precios de proveedores directamente.

#### Google Analytics
- `js/analytics.js` tiene el tracking GTM-ready pero `GA_ID` es un placeholder (`G-XXXXXXXXXX`).
- Para activar: reemplazar por el ID real en la tabla `configuracion` (clave `ga_id`) o directo en el script.

#### Webhooks MercadoPago → Supabase
- Cuando se paga con MP, el pedido queda en estado "nuevo" hasta que el admin lo actualiza manualmente.
- Implementar webhook (Netlify Function o Supabase Edge Function) que reciba notificaciones de MP y actualice `pedidos.estado` automáticamente.

#### Dominio propio
- Configurar `piezauto.com.ar` en Netlify DNS.
- Actualizar todos los links hardcodeados en `emailjs_setup.md`, `robots.txt`, `sitemap.xml`, y metas OG que usan `piezauto.com.ar`.

#### Imagen OG por defecto
- `og:image` apunta a `https://piezauto.com.ar/img/og-default.jpg` — crear/subir esa imagen.

### 🟢 Mejoras futuras (no urgentes)

- Notificaciones push reales (actualmente usa `Notification API` local)
- Sistema de delivery con seguimiento en tiempo real
- Integración con correo argentino / OCA / Andreani para tracking automático
- App móvil nativa (PWA ya está, pero una app nativa mejoraría UX)
- Sistema de reviews verificadas (vincular reseña a pedido)
- Chat en tiempo real entre cliente y admin (actualmente solo WhatsApp)

---

## 7. Bugs conocidos

| Bug | Estado | Detalle |
|---|---|---|
| FK compatibilidades | Documentado en CLAUDE.md | La columna es `modelo_id`, NO `modelo_auto_id`. Los joins deben usar `modelos_auto!modelo_id(...)` |
| Race condition editarProducto | **Corregido** | `editandoId` debe setearse ANTES de llamar `mostrarPanel` |
| Botón "Todas" en catálogo | **Corregido** | Necesita `data-cat-id="todas"` para que `seleccionarCategoria` lo encuentre |
| emailjs_setup.md desactualizado | Menor | El template de ejemplo usa `{{metodo_envio}}` pero el código ahora envía `{{metodo_entrega}}`. Actualizar el template en EmailJS dashboard |
| MP en modo demo | Activo | Sin proxy configurado, MercadoPago muestra alert y redirige a seguimiento como "pendiente". No es un error, es comportamiento intencional hasta configurar el proxy |
| `mp_access_token` en configuracion | Riesgo de seguridad | Si se guarda en la tabla `configuracion` (accesible con anon key + RLS), puede filtrarse. Usar variables de entorno en Netlify en su lugar |

---

## 8. Sistema de autenticación

El proyecto NO usa Supabase Auth. Usa auth manual:

| Rol | Cómo se autentica | Dónde se guarda la sesión |
|---|---|---|
| Admin | Contraseña hasheada en `configuracion.admin_password_hash` | `sessionStorage.pz_admin` |
| Taller | `talleres.password_hash` | `sessionStorage.pz_taller` |
| Usuario | `usuarios.password_hash` | `localStorage.pz_usuario` (JSON con `{id, nombre, email, ...}`) |

Rate limiting: 3 intentos fallidos → 5 minutos de bloqueo en localStorage (`pz_admin_bloqueo`, `pz_taller_bloqueo`).

Auto seleccionado: `sessionStorage.pz_auto_seleccionado` (`{marca, modelo, anio, modelo_id}`).

---

## 9. Convenciones del código

- Sin comentarios salvo WHY no obvio
- Lógica async: `await` por pasos, sin joins complejos en una sola query
- FK ambigua en Supabase: `tabla!columna_fk(campos)`
- Paginación: `.select('*', { count: 'exact' }).range(from, to)`
- Carrito: `localStorage.pz_carrito` → array `[{id, nombre, precio, cantidad, imagen}]`
- CSS: todo en `css/estilos.css` + `<style>` inline por página para estilos propios
- Sin frameworks, sin TypeScript, sin bundlers

---

## 10. Comandos git

El proyecto actualmente **no está en un repositorio git**. Para inicializarlo y subir a GitHub:

```bash
# Desde la carpeta del proyecto
cd "C:\Users\feded\OneDrive\Escritorio\piezauto"

# Inicializar el repositorio
git init
git branch -M main

# Crear .gitignore antes del primer commit
echo "*.txt" >> .gitignore
echo "CUENTA SUPEBASE.txt" >> .gitignore
echo "Nuevo documento de texto.txt" >> .gitignore
echo ".claude/" >> .gitignore

# Primer commit
git add .
git commit -m "chore: estado completo piezauto — ecommerce, admin, point listos para deploy"

# Conectar a GitHub (crear el repo en github.com primero)
git remote add origin https://github.com/TU_USUARIO/piezauto.git
git push -u origin main
```

Para commits posteriores:
```bash
git add -A
git commit -m "descripción del cambio"
git push
```

Para conectar Netlify al repositorio:
1. En [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
2. Seleccionar el repositorio
3. Publish directory: `.` (punto, raíz del proyecto)
4. Build command: vacío
5. Deploy site

---

## 11. Cómo continuar el trabajo en un nuevo chat

### Contexto mínimo a pegar al inicio del chat

```
Estoy trabajando en Piezauto, un e-commerce de autopartes para el AMBA.
Stack: HTML/CSS/JS vanilla + Supabase (window.db global) + Netlify.
El archivo CONTEXTO_CTO.md en la raíz tiene el estado completo del proyecto.
El archivo CLAUDE.md tiene las instrucciones técnicas (convenciones, tablas, errores conocidos).
Supabase URL: https://mqxowotdeibllkitkije.supabase.co
Proyecto en: C:\Users\feded\OneDrive\Escritorio\piezauto
```

### Preguntas útiles para enfocar el trabajo

- "Leé CONTEXTO_CTO.md y CLAUDE.md y después ayudame con [tarea]"
- "Qué falta para activar MercadoPago?"
- "Implementá el importador CSV de productos en el panel admin"
- "Configurá los webhooks de MP para actualizar el estado del pedido"

### Archivos que Claude Code debe leer primero en cada sesión

1. `CLAUDE.md` — instrucciones y convenciones del proyecto
2. `CONTEXTO_CTO.md` — este archivo
3. El archivo específico a modificar

---

## 12. Información de contacto y accesos

| Dato | Valor |
|---|---|
| Email del owner | fededaranno@gmail.com |
| Teléfono negocio | 011-2197-2471 |
| WhatsApp negocio | +54 9 11 2254-8257 |
| Dirección | Av. Vergara 3567, Hurlingham, Buenos Aires |
| Horario | Lun-Vie 9-18hs |
| Instagram | instagram.com/piezauto |
| Facebook | facebook.com/piezauto |
| Email contacto | info@piezauto.com |
