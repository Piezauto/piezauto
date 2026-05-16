# Hallazgos análisis Cromosol web — referencia para diseño UI mostrador (Hito 4)

**De:** COO — Comisión Directiva
**Para:** CTO + Coordinador
**Fecha:** 27 de abril de 2026
**Estado:** Documento de referencia. NO bloqueante. Input para diseño UI Hito 4.

---

## Contexto

Se realizó análisis del sistema web del proveedor Cromosol (uno de los principales del catálogo Piezauto, 24.045 SKUs) mediante un agente externo de extracción dirigida. Objetivo: validar lógica de aplicaciones cruzadas y referenciar el modelo de presentación del proveedor para el diseño de la UI de mostrador.

Cromosol es el referente de la categoría — su sistema web (SLAweb) es el más maduro de los 14 proveedores procesados. Las observaciones siguientes sirven como benchmark para superar la UX que ofrece Cromosol a sus clientes mayoristas.

---

## Hallazgo 1 — Convención de generaciones por marca/modelo

**Hallazgo**: Cromosol no usa una sola convención. Aplica nomenclaturas distintas según marca y modelo:

| Marca | Modelo | Convención usada |
|---|---|---|
| Volkswagen | Gol, Saveiro, Senda, Gacel, Polo Classic, Caddy | G1, G2, G3, G4 |
| Volkswagen | Golf | MK3, MK4-I, MK4-II |
| Volkswagen | Passat | B4, B5-I, B5-II |
| Peugeot | 206 | F1, F2 |
| Citroën | Berlingo, Jumper | FI, FII (romanos) |
| Fiat | Palio, Siena | (no aparece en muestra, según estándar de mercado: FASE I, II, III, IV) |

Cromosol incluso es **internamente inconsistente**: vimos "206 F1" y "Berlingo FI" en el mismo catálogo (uno con arábigo, otro con romano).

**Implicancia para UI mostrador**: el sistema Piezauto debe **respetar la convención del fabricante** y NO unificar todo a un formato único (decisión del dueño Piezauto). Las búsquedas por generación deben tolerar:

- "G3" / "Generación 3" / "3ra Gen" (VW Gol/Saveiro)
- "MK4" / "Mark 4" / "Mk4" (VW Golf, Ford Escort)
- "FASE II" / "F2" / "FII" / "Fase 2" (Fiat, Citroën)
- "B5" / "B5-I" / "B5-II" (Passat)

**Recomendación técnica**: el campo `version` del modelo SQL debe permitir un autocompletado dinámico por marca/modelo. No fuerce un ENUM cerrado; mantenga el campo como string libre con sugerencias contextuales.

---

## Hallazgo 2 — Aplicaciones cruzadas: Cromosol modela 1 SKU con N aplicaciones en lista plana

**Hallazgo**: Cromosol presenta una pieza con **una sola fila de SKU** que tiene **una lista plana** de aplicaciones (no tabla normalizada). Ejemplo: la tuerca antirrobo `4513/7` aparece con 32 aplicaciones cross-marca (Ford Galaxy + Seat Cordoba + Seat Inca + Seat Toledo + 28 modelos Volkswagen).

Las aplicaciones tienen formato de texto: `Marca Modelo Generación Años - TODOS 0` donde el sufijo "TODOS 0" parece ser metadata interna del proveedor.

**Implicancia para UI mostrador**: el modelo Piezauto ya soporta esto correctamente (campo `aplicaciones` con separador `;`, demostrado con LAM 463 SKUs cruzados y el caso AX010940 con 39 aplicaciones).

**Recomendación técnica para Hito 4**:
1. Mostrar las aplicaciones como **chips o tags** clicables, no como bloque de texto plano (mejora UX vs Cromosol).
2. Cada chip al click filtra el catálogo a los SKUs que aplican a esa marca/modelo/generación.
3. El input del operador del mostrador puede aceptar marca + modelo + generación + año, y el sistema busca por **match parcial** dentro del campo `aplicaciones`.

---

## Hallazgo 3 — Lado D/I: tres convenciones combinadas

**Hallazgo**: Cromosol codifica el lado de tres formas simultáneas:

1. **Sufijo del código**: `800/11I`, `1985/D`, `8856/D` (donde `I` = izquierdo, `D` = derecho).
2. **Campo "Lado" en pestaña Información adicional**: con valores `Conductor` (= I, izquierdo en Argentina) o `Acompañante` (= D, derecho).
3. **Embebido en descripción**: "Delantera", "Trasera", "Inferior", "Superior" sin lado D/I cuando la pieza es central.

Cuando hay par D/I, son **dos SKUs distintos** con códigos casi idénticos. Ejemplos confirmados: `8856/D` y `8856/I`, `1985/D` y `1985/I`.

**Implicancia para Piezauto**: nuestro modelo ya distingue:
- `tipo_lados = lado_explicito` (sufijo en código del proveedor) — para casos como Cromosol con `/D` y `/I`.
- `tipo_lados = lados_combinados` (1 código del proveedor → 2 SKUs físicos) — para proveedores que entregan un solo código.

**Recomendación técnica para Hito 4**: la UI debe mostrar piezas D/I siempre **agrupadas** cuando son par. Si el operador busca "manija exterior 206 F1" debería ver ambos lados juntos con etiquetas visuales claras "Conductor" / "Acompañante" (vocabulario del operador argentino) en lugar de Der/Izq técnico.

**Sugerencia adicional**: agregar campo `sku_par_lado_opuesto` opcional en `cat_skus` con FK al SKU del lado contrario. Permite navegación lateral instantánea ("ver el otro lado").

---

## Hallazgo 4 — Stock por sucursal categórico, no numérico (para Cromosol web)

**Aclaración importante**: Cromosol publica en su web stock **categórico** ("Entrega Inmediata" / "No Disponible") para **6 sucursales fijas**: Hooke, Warnes, Zona Oeste, Zona Sur, Mendoza, Tucumán.

**Pero** los archivos XLSX que Cromosol entrega como cliente mayorista a Piezauto traen **stock numérico por sucursal** (decisión del dueño Piezauto: usamos lo del XLSX, no lo de la web).

**Implicancia para `cat_stock_proveedor`**:
- Cromosol seguirá modelado con `stock_numerico` por sucursal según los XLSX (sin cambio).
- Las 6 sucursales confirmadas (Hooke, Warnes, Zona Oeste, Zona Sur, Mendoza, Tucumán) son la lista canónica.
- En la pasada v6 de stock voy a usar estos nombres exactos como valor del campo `ubicacion`.

**Nada que cambiar del lado del modelo** — solo confirmación de las sucursales.

---

## Hallazgo 5 — Filtros en Cromosol y oportunidad de UX

**Hallazgo**: Cromosol ofrece estos filtros en panel lateral:

- Marca vehículo (55 marcas listadas)
- Grupo modelo (depende de marca seleccionada)
- Versión
- Posición (D/I/Delantero/Trasero/Inferior/Superior)
- Empresa (Cromosol/BBA/TYC/Ilegor — las 4 razones sociales del grupo)
- Fabricante (texto libre de fabricantes externos: VIC, TYC, ARGENTA, FREMEC, etc.)
- Rubro

**Lo que Cromosol NO ofrece**:
- ❌ Filtro por **año** del vehículo (el operador filtra modelo y busca a ojo en la descripción).
- ❌ Filtro por **generación** explícito (solo en descripción).
- ❌ Filtro por **OEM** en panel lateral (sí en buscador de texto).

**Recomendación técnica para Hito 4**: el sistema Piezauto puede **superar la UX de Cromosol** ofreciendo estos filtros adicionales:

1. **Filtro por año** calculado desde el campo `aplicaciones` (parseando rangos `2010/2015`).
2. **Filtro por generación** parseando el campo `version` o substring de `aplicaciones`.
3. **Filtro por OEM directo en panel lateral** (Piezauto tiene 166k SKUs con OEM cargado).
4. **Filtro por fabricante** con autocompletado.
5. **Filtro combinado** marca + modelo + año + generación (selección encadenada).

Esto vuelve nuestro mostrador más rápido que el de Cromosol.

---

## Hallazgo 6 — Códigos de fabricante: Cromosol no los expone

**Hallazgo**: en la muestra extraída, Cromosol muestra el campo `codigo_fabricante` solo como duplicado del código Cromosol. Antes era posible que mostrara el código real del fabricante externo (ej. VIC `5W0941043`), pero según observación del dueño "puede que lo haya dejado de mostrar" — los proveedores suelen ocultar estos datos para evitar que el cliente compre directo al fabricante.

**Implicancia**:
- Para SKUs Cromosol cargados en Piezauto, el campo `codigo_fabricante` queda **mayormente vacío**.
- En Sprint 5 detectamos que solo 12 SKUs Cromosol traen `codigo_fabricante` extraído desde la descripción.

**Recomendación**:
- **No bloqueante**: el sistema funciona sin este campo.
- Para enriquecimiento futuro, el CPO en Mes 2-3 puede:
  - Cruzar OEMs Cromosol con otros proveedores (Expoyer 87% cobertura OEM, BBA 77%) y por OEM compartido inferir el fabricante real.
  - Investigar manualmente con muestras pidiendo a Cromosol el código fabricante de SKUs específicos.

---

## Hallazgo 7 — Estructura UI de Cromosol (referencia)

La pantalla de detalle de producto en Cromosol tiene 4 bloques:

1. **Hero** — imagen grande con watermark + slider de miniaturas + datos primarios (descripción, fabricante, código, precios, botones AGREGAR y DISPONIBILIDAD).
2. **Tabs de información** — pestañas "Información adicional" (tabla clave-valor) y "Aplicaciones" (lista plana de texto).
3. **Modal Disponibilidad** — se abre con click; muestra Stock Envío + 6 cajas por sucursal.
4. **Productos relacionados** — carrusel horizontal.

**Recomendación para Hito 4**: el modal de Disponibilidad obliga a un click extra. Piezauto puede **mostrar stock en pantalla principal** sin modal — mejora velocidad de operación del mostrador.

---

## Hallazgo 8 — Códigos padeados con ceros en URLs

**Hallazgo**: las URLs de imagen Cromosol tienen el código "padeado" con ceros a longitud fija:

- `6241/5I` → `006241050I`
- `8050/10` → `0080500010`
- `8856/D` → `008856000D`

**Implicancia**: si en algún momento Piezauto necesita cruzar con datos de imágenes Cromosol o con otros sistemas internos del proveedor, esta es la regla de padding.

**Recomendación**: registrar la regla en backlog CPO como heurística de matching.

---

## Hallazgo 9 — Sufijo "- TODOS 0" en aplicaciones

**Hallazgo**: las aplicaciones en Cromosol terminan con sufijo `- TODOS 0` (ej: "Volkswagen Gol G1 1991/1995 - TODOS 0"). El "0" parece ser código de versión interno (TODOS = todas las versiones, 0 = código por defecto).

**Implicancia**: cuando Cromosol limita a una versión específica, el código probablemente cambia (`TRENDLINE 1`, `COMFORTLINE 2`, etc.). En la próxima actualización de lista Cromosol, voy a estar atento a esos casos.

**Recomendación**: ningún cambio inmediato. Si aparecen aplicaciones con versión específica en futuras listas, mapear al campo `version`.

---

## Resumen de acciones para CTO

| Hallazgo | Acción CTO | Cuándo |
|---|---|---|
| Convención generaciones por marca | Permitir `version` como string libre con sugerencias contextuales | Hito 4 UI |
| Aplicaciones cruzadas | Modelar como chips clicables, no texto plano | Hito 4 UI |
| Lado D/I como par | Considerar campo `sku_par_lado_opuesto` opcional | Hito 4 UI |
| 6 sucursales Cromosol | Confirmar lista canónica para `cat_stock_proveedor.ubicacion` | Pasada v6 |
| Filtros (año, generación, OEM) | Implementar en panel lateral del mostrador | Hito 4 UI |
| codigo_fabricante vacío | Sin acción inmediata, queda backlog CPO | Mes 2-3 |
| Estructura UI 4 bloques | Mostrar stock en pantalla principal sin modal | Hito 4 UI |
| Códigos padeados | Registrar regla en backlog CPO | Mes 2-3 |
| Sufijo TODOS 0 | Sin acción inmediata, monitoreo | Sync futuras |

---

## Mi posición

Este documento es referencia para diseño UI Hito 4. **No bloquea ninguna entrega actual**. Quedo disponible para clarificar cualquier punto cuando el CTO arranque ese hito.

— COO, Comisión Directiva Piezauto
