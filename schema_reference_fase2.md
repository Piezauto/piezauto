# Schema Reference — Fase 2 (verificado vía PostgREST probe 2026-05-10)

Columnas verificadas directamente contra la BD de producción.
Método: probe de columna a columna vía PostgREST error 42703.

---

## cat_skus
Catálogo principal. ~393k SKUs (incluyendo padres inactivos).

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| codigo_piezauto | text UNIQUE | Formato PZ-00001, PZ-00001-D, PZ-00001-I |
| padre_id | uuid FK→cat_skus.id | NULL si no tiene padre |
| codigo_raiz | varchar(60) | Código proveedor del padre (para sync incremental) |
| es_padre | boolean | TRUE para padres lados_combinados |
| tipo_lados | enum | lados_combinados/juego_indivisible/kit/lado_explicito/sin_lado/hijo_de_padre_multiple |
| fabricante_id | uuid FK→cat_fabricantes.id | |
| familia_id | uuid FK→cat_familias.id | |
| descripcion | text NOT NULL | Campo para full-text search (GIN index) |
| descripcion_corta | text | Para UI móvil |
| codigo_oem | text | Múltiples separados por ';' |
| codigo_interno | text | Código interno Piezauto (opcional) |
| precio_lista | decimal(12,2) | Puede ser NULL |
| precio_neto | decimal(12,2) | Puede ser NULL |
| rentabilidad_override | decimal(5,2) | NULL = usa jerarquía |
| recomendado_compra | uuid FK→cat_proveedores.id | |
| recomendado_mostrador | uuid FK→cat_proveedores.id | |
| recomendado_digital | uuid FK→cat_proveedores.id | |
| lado | enum | N/A / Der / Izq / Ambos |
| posicion | enum | N/A / Delantero / Trasero / Central |
| carroceria | text | |
| puertas | text | |
| motor | text | |
| caja | text | |
| version | text | |
| aplicaciones | text | Campo para full-text search (GIN index). Sep " / " entre vehículos |
| observaciones | text | |
| activo | boolean | |
| activo_venta | boolean | FALSE para padres lados_combinados |
| fecha_alta | date | |
| fecha_baja | date | |
| created_at | timestamp | |
| updated_at | timestamp | |

**Índices relevantes para búsqueda:**
- `idx_skus_descripcion_gin` — GIN sobre `to_tsvector('spanish', descripcion)`
- `idx_skus_aplicaciones_gin` — GIN sobre `to_tsvector('spanish', aplicaciones)`
- `idx_skus_activo` — sobre `(activo, activo_venta)`

**Query de búsqueda recomendado:**
```sql
SELECT * FROM cat_skus
WHERE activo = TRUE AND activo_venta = TRUE
  AND to_tsvector('spanish', descripcion || ' ' || coalesce(aplicaciones,''))
      @@ plainto_tsquery('spanish', :query)
ORDER BY precio_lista NULLS LAST
LIMIT 20 OFFSET :offset;
```

---

## cat_familias
95 familias en producción.

| Columna | Tipo inferido |
|---|---|
| id | uuid PK |
| nombre | text UNIQUE NOT NULL |
| codigo | text UNIQUE |
| rentabilidad_porcentaje | decimal(5,2) |
| activo | boolean |
| created_at | timestamp |
| updated_at | timestamp |

---

## cat_proveedores
15 proveedores en producción (incluye Stellantis).

| Columna | Tipo inferido |
|---|---|
| id | uuid PK |
| nombre | text UNIQUE NOT NULL |
| activo | boolean |
| descuento_comercial_porcentaje | decimal(5,2) |
| created_at | timestamp |
| updated_at | timestamp |

---

## cat_codigos_fabrica
88.809 filas — códigos OEM de fábrica (Stellantis y otros terminales).

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| codigo_fabrica | text | Código OEM de la terminal (ej: 9808154980) |
| marca_auto | text | Marca del vehículo al que aplica (ej: "Peugeot") |
| lado | text | Lado de montaje |
| posicion | text | Posición de montaje |
| aplicaciones | text | Vehículos a los que aplica |
| observaciones | text | |
| activo | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

---

## cat_skus_codigos_fabrica
98.625 vínculos SKU ↔ código de fábrica.

| Columna | Tipo inferido | Notas |
|---|---|---|
| sku_id | uuid FK→cat_skus.id | |
| codigo_fabrica_id | uuid FK→cat_codigos_fabrica.id | |
| confianza | numeric/text | Score de match (alto/medio/bajo o 0-100) |

**Sin columna id propia** — PK compuesta probable: (sku_id, codigo_fabrica_id).

---

## cat_operaciones_b2c
Carrito y pedidos B2C (borrador y confirmados).

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK→cat_clientes_finales.id | |
| estado | text (check) | Valores válidos: pendiente / pagado / enviado / entregado / cancelado |
| total | decimal | Total con descuento |
| subtotal | decimal | Subtotal sin descuento |
| descuento | decimal | Monto descontado |
| notas | text | Notas del cliente |
| direccion_entrega | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

---

## cat_operaciones_b2c_items
Líneas de cada operación.

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| operacion_id | uuid FK→cat_operaciones_b2c.id | |
| sku_id | uuid FK→cat_skus.id | |
| cantidad | integer | |
| precio_unitario | decimal | Precio al momento de agregar |
| subtotal | decimal | cantidad × precio_unitario |
| created_at | timestamp | |

**Sin columnas de snapshot** (descripcion, codigo_piezauto) — JOIN con cat_skus requerido para mostrar.

---

## RLS — BLOQUEADOR CRÍTICO

Todas las tablas cat_ tienen RLS activo sin política SELECT para anon/authenticated.
Esto significa que las queries del frontend devolverán arrays vacíos.

**SQL requerido antes de que la búsqueda funcione:**
Ver archivo `fase2_rls_catalogo.sql` — ejecutar en Supabase SQL Editor.

---

## cat_equivalencias (tabla relacionada, no en scope principal)
Relación SKU ↔ proveedor para búsqueda de alternativas cross-proveedor.

| Columna | Tipo inferido |
|---|---|
| id | uuid PK |
| sku_id | uuid FK→cat_skus.id |
| proveedor_id | uuid FK→cat_proveedores.id |
| codigo_proveedor | text |
| precio_lista_snapshot | decimal |
| precio_neto_snapshot | decimal |
| activo | boolean |
| created_at | timestamp |
| updated_at | timestamp |
