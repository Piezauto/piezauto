# Criterios de matching — UI Hito 4 (mostrador)

**De:** COO — Comisión Directiva
**Para:** CTO + Coordinador
**Fecha:** 28 de abril de 2026
**Estado:** Documento de referencia para el diseño UI del Hito 4. NO bloqueante.

---

## Propósito

Este documento define **cómo el sistema Piezauto debe matchear "lo que el cliente pide" contra "lo que tenemos en catálogo"**. Es input para el CTO en el diseño de la UI de mostrador y la lógica del backend de búsqueda.

El operador del mostrador (Piezauto humano) recibe consultas como:
- "Necesito una óptica para Gol G3"
- "Tenés el OEM 9808154980?"
- "Mandame todo lo que tengas para Berlingo FII"
- "Una manija de puerta delantera derecha del 206"

El sistema debe traducir esas consultas a consultas SQL eficientes contra el catálogo de **276.006 SKUs únicos** (más Stellantis cuando se cargue: 364.815).

---

## Universo de búsqueda

Métricas relevantes que el matcher debe considerar:

| Característica | Cantidad | Implicancia para el matcher |
|---|---:|---|
| SKUs totales (14 proveedores) | 276.006 | Búsqueda debe ser indexada, no scan completo |
| Con OEM cargado | 166.340 (60%) | Búsqueda por OEM es highway principal |
| Con OEM múltiple (separados por `;`) | 12.728 | El campo OEM es **lista**, no string único |
| Con lados combinados (padre + hijos D/I) | 8.188 padres → 16.376 hijos | UI debe agrupar D/I como "par" |
| Con lado explícito en código | 17.748 | Buscar "lado izquierdo" debe matchear sufijos `-I`, `/I`, `-IZQ`, etc. |
| Con aplicaciones cruzadas | 27.686 | Una pieza puede aplicar a 30+ modelos. Filtrar por modelo requiere parseo |
| Con código de fabricante externo | 4.152 (1.5%) | Búsqueda por código de fabricante es complemento |
| En familia REVISAR | 442 | Mostrar advertencia "clasificación pendiente CPO" |

---

## Estrategias de matching (jerarquía de prioridad)

El matcher debe intentar las estrategias **en orden**. Cuando una devuelve resultados, esas son las prioritarias. Si no devuelve nada, baja a la siguiente.

### Estrategia 1 — Match exacto por OEM (HIGHWAY)

**Ejemplo de input**: "9808154980"

**Lógica**:
1. Detectar que el input es un código alfanumérico de 6+ caracteres.
2. Buscar en `cat_skus.codigo_oem` (split por `;` para manejar OEMs múltiples).
3. **TAMBIÉN** buscar en `cat_skus.codigo_proveedor` (algunos proveedores usan el OEM como código).
4. **TAMBIÉN** buscar en `cat_skus.codigo_fabricante`.

**Resultado esperado**: 1-N SKUs que comparten el OEM. Mostrar **todos** ordenados por proveedor con stock primero (ver "Priorización de resultados" abajo).

**Importante**: si el OEM matchea SKUs de proveedores **distintos** (alta probabilidad gracias al cruce de OEMs Sprint 5), mostrar **todos como alternativas comerciales** — son productos físicos posiblemente distintos para la misma aplicación.

### Estrategia 2 — Match por código de proveedor

**Ejemplo de input**: "8856/D" o "5565/17I"

**Lógica**:
1. Detectar que el input contiene caracteres especiales (`/`, `-`, números) y mide menos de 15 chars.
2. Buscar en `cat_skus.codigo_proveedor` con LIKE para tolerar:
   - Padding con ceros (`8856/D` debería matchear `008856000D` también, según observación Cromosol web).
   - Variaciones de separador (`8856-D` debería matchear `8856/D`).

**Resultado esperado**: 1 SKU exacto del proveedor referenciado.

### Estrategia 3 — Match por descripción + filtros estructurados

**Ejemplo de input**: "óptica Gol G3 derecha"

**Lógica**:
1. Parsear el input identificando:
   - **Tipo de pieza**: "óptica" → familia "Ópticas"
   - **Marca**: "Gol" → marca Volkswagen, modelo Gol
   - **Generación**: "G3" → version "G3"
   - **Lado**: "derecha" → lado "Der"
2. Construir consulta SQL:
   ```sql
   SELECT * FROM cat_skus
   WHERE familia_sugerida = 'Ópticas'
     AND aplicaciones LIKE '%Volkswagen%' AND aplicaciones LIKE '%Gol%'
     AND (version = 'G3' OR aplicaciones LIKE '%G3%')
     AND lado IN ('Der', 'Ambos', 'N/A')
   ```
3. Ranking por proveedor con stock + relevancia.

**Tolerancia a variaciones**:
- "óptica" debe matchear también "optica" (sin tilde) y "faro delantero".
- "Gol G3" debe matchear "Gol III" (algunos proveedores usan romanos sueltos).
- "derecha" → "Der", "D", "DERECHO", "ACOMPAÑANTE" (en Argentina conductor=I, acompañante=D).

### Estrategia 4 — Match por familia + filtros

**Ejemplo de input**: "todo lo de paragolpes para Hilux"

**Lógica**:
1. Reconocer "paragolpes" → familias `Paragolpes delanteros`, `Paragolpes traseros`, `Soportes paragolpe`.
2. Reconocer "Hilux" → marca Toyota, modelo Hilux.
3. Devolver TODOS los SKUs que cumplan ambos filtros.

---

## Manejo de aplicaciones cruzadas

**27.686 SKUs** del catálogo tienen aplicaciones cruzadas (un mismo SKU sirve para múltiples modelos de auto). Ejemplo extremo: una tuerca antirrobo Cromosol aplica a 32 modelos distintos (Ford Galaxy + Seat Cordoba + Toledo + 28 Volkswagen).

**Regla del matcher**: el campo `aplicaciones` es una **lista de strings separados por `;` o ` / `**, donde cada string tiene formato:

```
Marca | Descripción Modelo Generación Años
```

Ejemplo: `Volkswagen | Manija exterior Gol G3 99/05 / Volkswagen | Manija exterior Saveiro G3 99/05 / Citroën | Manija exterior Berlingo FI 98/10`.

**Cuando el cliente busca "Saveiro G3"**, el matcher debe:
1. Separar el campo `aplicaciones` por delimitadores.
2. Para cada aplicación individual, verificar si menciona "Saveiro G3".
3. Si **al menos una aplicación matchea**, el SKU es resultado válido.

**El matcher NO debe operar sobre el string completo** (eso fue el bug v1 del script de generaciones). Operar siempre por aplicación individual.

---

## Manejo de lados D/I

### Cuando el SKU tiene `tipo_lados = lados_combinados` (8.188 padres)

El sistema autogenera 2 hijos: uno con sufijo `-D`, otro con `-I`. **El padre queda `inactivo_venta = TRUE`** (no se vende, es solo agrupador).

**Para la UI**:
- Si el cliente busca el OEM o la descripción de la pieza padre, el matcher debe devolver **los dos hijos** (D + I), NO el padre.
- La UI debe agruparlos visualmente como "par":
  ```
  ┌─ Manija exterior Gol G3 99/05 ─────┐
  │ ⚪ Conductor (I) — código PZA-1234I │
  │ ⚪ Acompañante (D) — código PZA-1234D │
  └────────────────────────────────────┘
  ```
- El operador selecciona el lado que necesita el cliente.

### Cuando el SKU tiene `tipo_lados = lado_explicito` (17.748)

El lado ya está en el sufijo del código del proveedor. **NO se autogenera nada**: cada SKU es único.

**Para la UI**: si la búsqueda no especifica lado, mostrar **ambos lados juntos** cuando son par (detectar pares por mismo prefijo de código + diferente sufijo).

### Cuando el SKU tiene `tipo_lados = juego_indivisible` (5.520)

Es un juego de N piezas iguales (4 pastillas, 8 bujías). 1 SKU = N piezas. **NO se desdobla**.

**Para la UI**: mostrar la cantidad explícita en la descripción (ej. "JUEGO 4 PASTILLAS").

### Cuando el SKU tiene `tipo_lados = kit` (4.831)

Es un kit de piezas distintas (kit homocinética, kit distribución). **NO se desdobla**.

**Para la UI**: mostrar como producto único.

### Cuando el SKU tiene `tipo_lados = sin_lado` (175.861)

Pieza única o lado individual sin desdoblar. Caso default.

---

## Vocabulario tolerante (Argentina)

El matcher debe **tolerar el vocabulario natural del operador argentino**:

| Lo que escribe el operador | Lo que debe matchear el sistema |
|---|---|
| "óptica" / "optica" / "faro" / "luz delantera" | familia `Ópticas` |
| "stop" / "luz trasera" / "farol patente" | familia `Faros traseros` o `Luces de freno` |
| "manguera" / "manguerita" / "caño" | familia `Mangueras` |
| "Conductor" / "izquierdo" / "izq" / "I" | `lado = Izq` |
| "Acompañante" / "derecho" / "der" / "D" | `lado = Der` |
| "G3" / "Generación 3" / "3ra Gen" / "fase 3" | `version = G3` (con tolerancia por marca, ver decisión 28/04) |
| "MK4" / "Mark 4" / "Mk4" / "G4" (en Golf) | `version = MK4` para VW Golf |
| "FASE II" / "F2" / "FII" / "Fase 2" | `version = FASE II` para Fiat |
| "Citroën" / "Citroen" / "citroen" | marca Citroën (sin importar tilde) |
| "Volkswagen" / "VW" / "Volk" | marca Volkswagen |

**Implementación**: tabla de sinónimos `cat_sinonimos_busqueda` con columnas `(termino_input, termino_canonico, tipo)` donde tipo ∈ `{familia, marca, modelo, lado, version}`. El matcher hace JOIN contra esta tabla antes de la búsqueda.

---

## Priorización de resultados (ranking)

Cuando una búsqueda devuelve múltiples SKUs, el orden importa para que el operador encuentre rápido. **Orden recomendado**:

1. **Coincidencia exacta de OEM** primero.
2. **SKUs con stock declarado `disponible`** (de `cat_stock_proveedor`).
3. **SKUs con stock `consultar`** (probable que haya).
4. **SKUs con stock `crítico`** (poca cantidad).
5. **SKUs sin stock declarado** (proveedores que no traen stock).
6. **SKUs con stock `sin_stock`** (no hay) — **mostrar en gris al final**.

Dentro de cada nivel, ordenar por:
- **Especificidad de aplicación**: SKU que aplica solo al modelo buscado antes que SKU que aplica a 30 modelos.
- **Proveedor con descuento mayor** para Piezauto (mejor margen).

---

## Filtros de panel lateral (UI sugerida)

Basado en hallazgos del análisis Cromosol web (Cromosol no ofrece año ni generación → oportunidad para Piezauto):

```
┌─ FILTROS ────────────────────────┐
│ Marca de auto                    │
│ ▢ Volkswagen (78.234 SKUs)       │
│ ▢ Ford (45.123 SKUs)             │
│ ▢ Fiat (38.451 SKUs)             │
│ ...                              │
│                                  │
│ Modelo                           │
│ (depende de marca)               │
│                                  │
│ Año                              │
│ [1995] —— [2024]   [slider]      │
│                                  │
│ Generación                       │
│ ▢ G1  ▢ G2  ▢ G3  ▢ G4           │
│ ▢ MK1 ▢ MK4 ▢ FASE I ▢ FASE II   │
│                                  │
│ Familia / Rubro                  │
│ ▢ Ópticas                        │
│ ▢ Paragolpes delanteros          │
│ ...                              │
│                                  │
│ Lado                             │
│ ◉ Cualquiera                     │
│ ○ Conductor (I)                  │
│ ○ Acompañante (D)                │
│                                  │
│ Stock                            │
│ ▢ Solo con stock disponible      │
│                                  │
│ Proveedor                        │
│ ▢ Cromosol (24.045)              │
│ ▢ Expoyer (101.306)              │
│ ...                              │
└──────────────────────────────────┘
```

**Diferenciador clave vs Cromosol**: ofrecer filtros por **año** y **generación** que Cromosol web NO tiene.

---

## Equivalencias comerciales (recomendaciones cruzadas)

Cuando un SKU está sin stock, el sistema debe sugerir alternativas usando el archivo `equivalencias_comerciales_entre_proveedores.xlsx` que generé (12.529 pares con OEM coincidente entre proveedores).

**Lógica sugerida**:
1. Cliente busca y selecciona un SKU específico (ej. Cromosol XYZ).
2. Sistema detecta que está `sin_stock`.
3. Sistema busca en `equivalencias_comerciales` el OEM compartido.
4. Sistema sugiere: "Hay alternativas para esta pieza en otros proveedores":
   - Expoyer ABC — disponible — $X
   - BBA DEF — consultar — $Y
5. **Importante**: aclarar que son **alternativas comerciales** (productos potencialmente distintos), no idénticos. La UI debe usar la palabra "alternativa", NO "duplicado".

---

## Casos especiales del catálogo Piezauto

### SKUs en familia REVISAR (442)

Mostrar etiqueta visual "Clasificación pendiente CPO" cuando aparezcan en resultados. **NO ocultar** — el operador puede necesitarlos. Solo aclarar que la clasificación de familia es provisoria.

Detalle:
- DM 398 (mayoría: descripciones específicas de rubro como "Cazoleta tanque", "Suncho tanque" — en Sprint 5+ resolví 264 de estos 398 con razonamiento semántico).
- Francar 38 (mayoría: ménsulas, escuadras de pedalera).
- Expoyer 6 (descripción "0" — datos faltantes del proveedor).

### Stellantis (cuando se cargue)

88.809 SKUs adicionales con características propias:
- **Todos con `fabricante = Stellantis`** (es catálogo de fábrica, no aftermarket).
- **codigo_oem = codigo_proveedor** (es OEM oficial).
- **Marcas múltiples**: Citroën, Peugeot, DS, Fiat, Stellantis (categorías comerciales).
- **Marca DS unificada**: cualquier consulta sobre "DS3", "DS4", "DS7" debe matchear `marca = DS`.

### Familia "Bulonería y fijaciones" (14.278 SKUs)

Familia transversal que abarca tornillos, tuercas, clips, grampas, etc. Cuando el cliente busca "clip de tapizado", el sistema debe devolver:
- Resultado primario: SKUs en familia `Tapizados` (donde el clip vive funcionalmente).
- Resultado secundario: SKUs en `Bulonería y fijaciones` con descripción "CLIP".

Cuando se implementen las **etiquetas múltiples** (modelo `cat_sku_etiquetas` propuesto), un mismo SKU clip de tapizado puede estar etiquetado en ambas categorías y la UI las muestra navegables desde cualquier lado.

### Familia "Vidrios y lentes de óptica" (1.659 SKUs)

Cuando el cliente busca "vidrio de óptica" debe matchear esta familia (no la familia "Cristales" que cubre parabrisas/ventanillas).

---

## Logging y feedback al operador

Para que el sistema mejore con el uso, el matcher debe loguear:

1. **Búsquedas sin resultados**: candidato a sumar al diccionario de sinónimos o detectar gaps de catálogo.
2. **Búsquedas con resultados pero el operador no clickeó ninguno**: el matcher devolvió cosas no relevantes.
3. **SKUs ofrecidos pero no vendidos**: cuando el operador finalmente vende algo distinto, registrar la diferencia para ajustar ranking.

Estos logs alimentan futuras mejoras del matcher (Hito 5+).

---

## Casos extremos (edge cases)

| Caso | Comportamiento esperado |
|---|---|
| Búsqueda con typos ("psarte" en lugar de "parte") | Tolerancia con distancia Levenshtein o trigrams |
| Búsqueda en MAYÚSCULA o minúscula | Case-insensitive en todos los campos texto |
| Cliente pide pieza por foto (futuro) | Fuera de scope Hito 4. Backlog Hito 6+ |
| Cliente da código de otro proveedor que no tenemos | Matchear por OEM si el código es OEM, sino sugerir búsqueda por descripción |
| OEM con guiones que el cliente escribe sin guiones | Normalizar antes de buscar (eliminar separadores) |
| Cliente busca por categoría muy amplia ("filtros") | Devolver todas las familias relacionadas: `Filtros`, `Aire acondicionado` (filtros de cabina), etc. |

---

## Performance esperada

Con 364.815 SKUs proyectados (incluyendo Stellantis):

- Búsqueda por OEM exacto: < 50 ms
- Búsqueda por código proveedor: < 50 ms
- Búsqueda por descripción + filtros: < 200 ms
- Sugerencia de equivalencias: < 300 ms

**Índices recomendados** para `cat_skus`:
- `codigo_proveedor` (B-tree)
- `codigo_oem` (GIN para búsqueda en lista separada por `;`)
- `codigo_fabricante` (B-tree)
- `(familia_sugerida, fabricante_id)` (compuesto)
- `aplicaciones` (GIN trigram para búsqueda por substring)

---

## Pendientes que afectan al matcher

Los siguientes pendientes pueden modificar las reglas:

1. **Aprobación CFO de las 41 familias nuevas**: si alguna se renombra, el vocabulario tolerante debe actualizarse.
2. **Implementación etiquetas múltiples (`cat_sku_etiquetas`)**: cuando exista, el matcher debe consultar también esta tabla para casos como "clip de tapizado".
3. **UPDATE de generaciones**: cuando se aplique post-carga, el campo `version` quedará coherente y la búsqueda por generación funcionará mejor.
4. **Stellantis cargado**: el matcher debe incluir el proveedor "Stellantis" en su universo.

---

## Mi posición

Este documento es **referencia para diseño**. El CTO va a tomar las decisiones técnicas finales. Quedo disponible para clarificar cualquier punto, profundizar en casos específicos o coordinar pruebas con consultas reales del mostrador cuando el Hito 4 esté en desarrollo.

— COO, Comisión Directiva Piezauto
