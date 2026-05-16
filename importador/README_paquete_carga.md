# PAQUETE DE CARGA — Catálogo Piezauto Sprint 5+

**Generado por:** COO — Comisión Directiva
**Fecha:** 28 de abril de 2026
**Estado:** Listo para procesamiento por importador del CTO

---

## Contenido del paquete

### 1. Archivos del catálogo (14 proveedores)

Estos son los 14 archivos XLSX a cargar al sistema mediante el importador Python del CTO:

| # | Archivo | SKUs | Estado carga |
|---|---|---:|---|
| 1 | `Cromosol.xlsx` | 24.045 | ✅ Ya cargado en producción |
| 2 | `BBA.xlsx` | 10.765 | ✅ Ya cargado en producción |
| 3 | `Otero.xlsx` | 14.171 | ⏳ Pendiente |
| 4 | `DM.xlsx` | 28.889 | ⏳ Pendiente |
| 5 | `Farosdam.xlsx` | 8.153 | ⏳ Pendiente |
| 6 | `Vaer.xlsx` | 5.654 | ⏳ Pendiente |
| 7 | `Delviso.xlsx` | 11.848 | ⏳ Pendiente |
| 8 | `Expoyer.xlsx` | 101.306 | ⏳ Pendiente |
| 9 | `SG.xlsx` | 5.689 | ⏳ Pendiente |
| 10 | `Surpiezas.xlsx` | 53.709 | ⏳ Pendiente |
| 11 | `Bark1.xlsx` | 1.289 | ⏳ Pendiente |
| 12 | `Francar.xlsx` | 648 | ⏳ Pendiente |
| 13 | `Fragata.xlsx` | 8.262 | ⏳ Pendiente (proveedor nuevo) |
| 14 | `LAM.xlsx` | 1.578 | ⏳ Pendiente (proveedor nuevo) |
| | **TOTAL** | **276.006** | |

**Estructura de cada archivo**:
- 4 hojas: `Normalizado`, `Casos a revisar` (si aplica), `Resumen por familia`, `Distribución tipo_lados`
- 20 columnas estándar (cerradas en Sprint 3-5)
- Algunos archivos tienen hojas adicionales:
  - `Fragata.xlsx`: hoja "Stock proveedor (preview v6)" con conteo SI/SIN STOCK
  - `LAM.xlsx`: hoja "SKUs con aplic. cruzadas" con detalle de los 463 SKUs cruzados

### 2. Índice maestro

**`catalogo_index.csv`** — listado de los 14 proveedores con metadata de carga:

Columnas: `proveedor`, `archivo`, `sku_count`, `descuento_default`, `fabricante_default`, `observaciones`.

El importador del CTO debe usar este archivo para:
- Saber qué archivos procesar en qué orden (si aplica priorización)
- Configurar `descuento_default` en `cat_proveedores`
- Configurar `fabricante_default` cuando aplica
- Registrar observaciones operativas en metadata del proveedor

### 3. Archivos SQL para UPDATE post-carga

Estos UPDATEs deben aplicarse **después** que termine la carga masiva, sobre los proveedores ya cargados:

**`cromosol_update_familia.sql`** — UPDATE de 270 SKUs Cromosol que cambian a familia "Vidrios y lentes de óptica".

**`buloneria_update_cargados.sql`** — UPDATE de 387 SKUs (383 Cromosol + 4 BBA) que cambian a familia "Bulonería y fijaciones".

Ambos UPDATEs son idempotentes (se pueden ejecutar más de una vez sin problema).

### 4. Material complementario para análisis

**`reporte_inconsistencias_sprint5.xlsx`** — reporte de inconsistencias detectadas durante Sprint 5 (familias no aprobadas, marcas no canónicas, etc.). Sin acción inmediata requerida.

**`cruce_OEM_completo.xlsx`** — análisis de OEMs compartidos entre los 14 proveedores. Material informativo para CPO.

**`cruce_OEM_Stellantis.xlsx`** — equivalencias comerciales entre los 14 proveedores y Stellantis. Material para CPO.

**`equivalencias_comerciales_entre_proveedores.xlsx`** — pares de SKUs en distintos proveedores con OEM coincidente y descripción similar (alternativas comerciales para misma aplicación).

**`Stellantis_PREVIEW.xlsx`** — preview del catálogo Stellantis (88.809 SKUs). **NO entra en la carga masiva actual** — entrega aparte para revisión del dueño antes de cargar.

### 5. Documentos para Coordinador / CFO / CTO

**`propuesta_etiquetas_multiples_CTO.md`** — modelo SQL para implementar etiquetas múltiples por SKU (`cat_sku_etiquetas`). Implementación diferida.

**`hallazgos_cromosol_web_para_CTO.md`** — 9 hallazgos accionables del análisis de Cromosol web. Input para diseño UI Hito 4.

**`nota_grupo_Cromosol_BBA_TYC_Ilegor.md`** — hallazgo comercial: las 4 razones sociales son del mismo grupo. Sugerencia para revisión comercial CFO + dueño.

---

## Cambios estructurales aplicados (vs versiones previas)

### Sprint 5 inicial (12 proveedores)
- ✅ 9 archivos del Sprint 3 con barrido retroactivo aplicado.
- ✅ Estructura de 20 columnas finales (incluye `codigo_fabricante` y `codigo_raiz`).
- ✅ ENUM `tipo_lados` con 6 valores.
- ✅ Marca canónica unificada en campo `aplicaciones`.

### Paréntesis 1 (proveedores nuevos)
- ✅ Fragata agregado (8.262 SKUs, software DSLISTA).
- ✅ LAM agregado (1.578 SKUs, software DSLISTA FoxPro, dedup por código + concatenación de aplicaciones).

### Paréntesis 2 (familias nuevas transversales)
- ✅ Familia "Vidrios y lentes de óptica" creada y aplicada (1.659 SKUs reclasificados en 9 proveedores).
- ✅ Familia "Bulonería y fijaciones" creada y aplicada con criterio Opción C (9.795 SKUs reclasificados en 12 proveedores).

### Pendientes que NO están aplicados aún (post-carga masiva)
- ⏳ UPDATE de generaciones por marca (G1/G2/MK/FASE I/etc.) — Opción B aprobada.
- ⏳ Pasada v6 de stock por proveedor (Cromosol, Expoyer, Surpiezas, Fragata).

---

## Instrucciones para el CTO

### Carga de los 12 proveedores pendientes

Usar el script Python que ya está corriendo. Los archivos están listos para procesar uno a uno con el importador. No requieren tratamiento especial — son la misma estructura que Cromosol y BBA ya cargados.

**Orden sugerido** (ascendente por volumen para validar comportamiento del importador):

1. Bark1 (1.289)
2. Francar (648) — incluye 42 hijos pre-armados modelo extendido
3. LAM (1.578)
4. Vaer (5.654)
5. SG (5.689)
6. Farosdam (8.153)
7. Fragata (8.262)
8. Delviso (11.848)
9. Otero (14.171)
10. DM (28.889)
11. Surpiezas (53.709)
12. Expoyer (101.306) — el más grande, último

### UPDATEs post-carga

Cuando termine la carga de los 12 archivos, ejecutar en orden:

1. `cromosol_update_familia.sql` (270 SKUs Cromosol → "Vidrios y lentes de óptica")
2. `buloneria_update_cargados.sql` (387 SKUs Cromosol+BBA → "Bulonería y fijaciones")

### Pendientes que el CTO debería tener en agenda

Después de la carga masiva:

1. **DDL de `cat_stock_proveedor`** según modelo aprobado (mensaje COO previo).
2. **Avisar al COO** cuando esté listo para que ejecute pasada v6 de stock.
3. **Confirmar counts post-carga** para validación cruzada con archivos de origen.

---

## Pendientes globales (no afectan carga)

- **CFO**: aprobar 26 familias nuevas + rentabilidad default por familia.
- **Dueño**: revisar `Stellantis_PREVIEW.xlsx` y autorizar carga aparte.
- **Dueño**: definir descuento segmentado por familia para Stellantis.
- **Dueño**: decisión Longobucco / Novo Auto.
- **Coordinador**: definir momento de implementación de etiquetas múltiples (`cat_sku_etiquetas`).

---

## Validación final

Para verificar que el paquete está completo, el dueño puede ejecutar (en cualquier herramienta):

```python
import pandas as pd

# Verificación 1: índice
idx = pd.read_csv('catalogo_index.csv')
assert len(idx) == 14, f'Esperado 14 proveedores, encontrado {len(idx)}'
assert idx['sku_count'].sum() == 276006, 'Total SKUs no coincide'

# Verificación 2: cada archivo existe y tiene 20 columnas
import os
for _, row in idx.iterrows():
    archivo = row['archivo']
    assert os.path.exists(archivo), f'Archivo faltante: {archivo}'
    df = pd.read_excel(archivo, sheet_name='Normalizado')
    assert len(df.columns) == 20, f'{archivo}: {len(df.columns)} columnas (esperadas 20)'
    assert len(df) == row['sku_count'], f'{archivo}: SKUs no coinciden'

print('✅ Paquete validado correctamente')
```

---

*— COO, Comisión Directiva Piezauto*
