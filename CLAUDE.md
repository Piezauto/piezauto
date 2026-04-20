# Piezauto — Instrucciones para Claude Code

## Idioma y tono
Respondé **siempre en español argentino**: usá "vos", "ustedes", terminología coloquial argentina.
No uses "tú" ni términos de otras variedades del español.

## Qué es Piezauto
E-commerce de autopartes para el AMBA (Argentina). Tres módulos:
- **Tienda** – catálogo, búsqueda por auto, carrito, checkout, perfil de usuario
- **Admin** – gestión de productos, pedidos, talleres, cupones
- **Point** – panel de talleres asociados (turnos, presupuestos, clientes)

## Stack técnico
- HTML + CSS + JS vanilla (sin frameworks ni bundlers)
- Supabase como backend (PostgreSQL + Storage)
- El cliente Supabase está en `js/supabase.js`, se expone como `db` globalmente

## Tablas principales de Supabase
| Tabla | Notas clave |
|-------|-------------|
| `productos` | columna `universal BOOLEAN`, `precio_oferta` nullable, `categoria_id` FK |
| `categorias` | tiene `slug` — usarlo para URLs |
| `compatibilidades` | FK es `modelo_id` (NO `modelo_auto_id`) |
| `modelos_auto` | join con FK explícita: `modelos_auto!modelo_id(...)` |
| `marcas_auto` | |
| `pedidos` | `estado`: nuevo/confirmado/preparando/enviado/entregado/cancelado |
| `items_pedido` | `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal` |
| `cupones` | `tipo`: porcentaje/fijo; `usos_actuales` se incrementa al usar |
| `talleres` | auth por `password_hash`; sesión en `sessionStorage.pz_taller` |
| `turnos` | `taller_id`, `fecha`, `hora`, `estado`: pendiente/confirmado/completado/cancelado |
| `usuarios` | auth simple por `password_hash`; sesión en `localStorage.pz_usuario` |
| `vehiculos_usuario` | `usuario_id`, `modelo_id`, `anio` |
| `presupuestos` | solicitudes de clientes a talleres |
| `servicios_taller` | |

## Convenciones de código
- **Sin comentarios** salvo cuando el WHY es no obvio
- Lógica async: usar `await` separado por pasos, no joins complejos en una sola query
- Para FK ambigua en joins Supabase: `tabla!columna_fk(campos)`
- Paginación: `.select('*', { count: 'exact' }).range(from, to)`
- Carrito: `localStorage.pz_carrito` (array `[{id, nombre, precio, cantidad}]`)
- Auto seleccionado: `sessionStorage.pz_auto_seleccionado` (`{marca, modelo, anio, modelo_id}`)

## Sistema de diseño
```css
--rojo:       #E63946   /* acción principal, precios */
--rojo-dark:  #c1121f
--negro:      #1a1a1a   /* fondos header/sidebar */
--gris-claro: #f8f8f8
--gris:       #e0e0e0
--gris-text:  #666
--blanco:     #ffffff
--radio:      8px
--sombra:     0 2px 12px rgba(0,0,0,0.08)
```
Hoja global: `css/estilos.css`. Cada página puede tener `<style>` inline para estilos propios.

## Estructura de archivos
```
piezauto/
├── css/estilos.css
├── js/supabase.js
├── admin/
│   ├── index.html        ← panel admin
│   └── proveedores.html
├── point/
│   ├── index.html        ← login talleres
│   └── dashboard.html    ← panel taller
├── index.html            ← home / buscador por auto
├── catalogo.html
├── categoria.html
├── producto.html
├── checkout.html
├── usuario.html
├── ofertas.html
├── talleres.html
├── seguimiento.html
└── *.sql                 ← migraciones
```

## Errores conocidos / soluciones anteriores
- La columna de compat es `modelo_id`, no `modelo_auto_id`
- Race condition en `editarProducto`: setear `editandoId` ANTES de llamar `mostrarPanel`
- En catalogo.html el botón "Todas" necesita `data-cat-id="todas"` para que `seleccionarCategoria` lo encuentre
