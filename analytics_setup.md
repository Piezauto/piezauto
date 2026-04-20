# Configuración de Google Analytics 4 — Piezauto

## Paso 1 — Crear cuenta y propiedad en GA4

1. Ingresá a [analytics.google.com](https://analytics.google.com)
2. Creá una cuenta con el nombre "Piezauto"
3. Creá una propiedad de tipo **Web**
4. Ingresá la URL del sitio y el nombre "Piezauto"
5. GA4 te va a dar un **Measurement ID** con formato `G-XXXXXXXXXX`

---

## Paso 2 — Activar el código en todos los archivos HTML

En cada archivo `.html` del proyecto vas a encontrar este bloque comentado cerca del cierre de `</head>`:

```html
<!-- ============================================================
  GOOGLE ANALYTICS — Agregar antes del lanzamiento a producción
  ...
  ============================================================ -->
```

Para activarlo:

1. Quitá los delimitadores `<!--` y `-->` del bloque
2. Reemplazá **ambas** ocurrencias de `G-XXXXXXXXXX` con tu Measurement ID real

### Comando para reemplazar el ID en todos los archivos (PowerShell)

```powershell
$id = "G-TU_ID_REAL"
Get-ChildItem -Path "." -Filter "*.html" -Recurse | ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace 'G-XXXXXXXXXX', $id |
    Set-Content $_.FullName -Encoding UTF8 -NoNewline
}
```

---

## Paso 3 — Verificar que funciona

1. Publicá el sitio
2. En Google Analytics, andá a **Informes → Tiempo real**
3. Abrí el sitio en otra pestaña
4. Deberías ver tu visita aparecer en el panel en tiempo real

---

## Paso 4 — Eventos recomendados para trackear (opcional)

Podés agregar eventos personalizados en el JS del sitio:

```js
// Agregar producto al carrito
gtag('event', 'add_to_cart', {
  currency: 'ARS',
  value: precio,
  items: [{ item_id: id, item_name: nombre, price: precio }]
});

// Iniciar checkout
gtag('event', 'begin_checkout', { currency: 'ARS', value: total });

// Compra completada
gtag('event', 'purchase', {
  transaction_id: pedidoId,
  currency: 'ARS',
  value: total
});
```

---

## Archivos donde está el placeholder

Los 21 archivos HTML del proyecto ya tienen el bloque comentado listo para activar:

- `index.html`
- `catalogo.html`, `categoria.html`, `busqueda.html`
- `producto.html`
- `checkout.html`
- `usuario.html`, `favoritos.html`, `seguimiento.html`
- `talleres.html`, `talleres.html`
- `ofertas.html`, `marcas.html`
- `nosotros.html`, `terminos.html`, `privacidad.html`, `comparar.html`
- `mp_proxy.html`
- `admin/index.html`, `admin/proveedores.html`
- `point/index.html`, `point/dashboard.html`
