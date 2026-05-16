# IMPORTADOR DE CATÁLOGO PIEZAUTO — Hito 2

Importador Python que procesa archivos XLSX v4 normalizados del COO y los carga en Supabase.

## Estado del desarrollo

✅ **Implementado:**
- Estructura base con 6 etapas de ingesta
- Validación de estructura XLSX
- Lectura de SKUs normalizados
- Autogeneración de lados combinados (padre + hijo D + hijo I)
- Manejo de fabricantes con identidad triple (nombre, tipo, familia)
- Sistema de logging completo

⏳ **Pendiente (esperando v4 del COO):**
- Lógica completa de matcheo de duplicados
- Procesamiento de SKUs sin lados combinados
- Detección de SKUs desaparecidos
- Resolución manual por lote
- Carga de 65 familias iniciales
- Carga de 200 vehículos argentinos

## Requisitos

```bash
Python 3.9+
pip install -r requirements.txt
```

## Configuración

1. Copiar `.env.example` a `.env`
2. Completar credenciales de Supabase en `.env`

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

## Uso

### Importar un proveedor individual

```bash
python importador_catalogo.py \
  --proveedor Cromosol \
  --archivo /path/to/Cromosol_Normalizado_v4.xlsx
```

### Ejemplos por proveedor

```bash
# Cromosol (24.045 SKUs, 312 lados combinados)
python importador_catalogo.py --proveedor Cromosol --archivo Cromosol_Normalizado_v4.xlsx

# BBA (10.765 SKUs, 0 lados combinados)
python importador_catalogo.py --proveedor BBA --archivo BBA_Normalizado_v4.xlsx

# Expoyer (101.306 SKUs, 631 lados combinados)
python importador_catalogo.py --proveedor Expoyer --archivo Expoyer_Normalizado_v4.xlsx

# Delviso (11.848 SKUs, 5.330 lados combinados — el más complejo)
python importador_catalogo.py --proveedor Delviso --archivo Delviso_Normalizado_v4.xlsx
```

## Estructura del XLSX v4 esperada

Hoja: **Normalizado**

Columnas requeridas:
- `codigo_proveedor` (str)
- `descripcion_original` (str)
- `fabricante` (str)
- `familia_sugerida` (str)
- `codigo_oem` (str, opcional)
- `precio_lista` (float, opcional)
- `precio_neto` (float, opcional)
- `aplicaciones` (str)
- `tipo_lados` (enum: lados_combinados, juego_indivisible, kit, lado_explicito, sin_lado)
- `lado` (enum: N/A, Der, Izq, Ambos)
- `observaciones` (str, opcional)

Columnas opcionales:
- `carroceria`, `puertas`, `posicion`, `motor`, `caja`, `version`

## Lógica de lados combinados

Cuando `tipo_lados = 'lados_combinados'`:

1. **Padre**: `codigo_piezauto = PZ-{codigo_proveedor}`, `activo_venta = FALSE`
2. **Hijo D**: `codigo_piezauto = PZ-{codigo_proveedor}-D`, `lado = 'Der'`, `activo_venta = TRUE`
3. **Hijo I**: `codigo_piezauto = PZ-{codigo_proveedor}-I`, `lado = 'Izq'`, `activo_venta = TRUE`
4. **Equivalencias**: 
   - Padre → código proveedor (inactiva)
   - Hijo D → código proveedor (activa)
   - Hijo I → código proveedor (activa)

**Importante:** Costo hijo = costo padre (sin división por 2)

## 6 Etapas de ingesta

### Etapa 1: Validación estructura
- Verifica hoja "Normalizado"
- Verifica columnas requeridas
- Valida que haya datos

### Etapa 2: Detección códigos
- Lee todas las filas del XLSX
- Convierte a objetos `SKUNormalizado`
- Detecta códigos OEM, precio_lista, precio_neto

### Etapa 3: Matcheo SKU
- Busca o crea fabricante (por tripla: nombre, tipo, familia)
- Busca o crea familia
- Identifica si el SKU ya existe (por código proveedor)

### Etapa 4: Detección desaparecidos
- Compara códigos actuales vs última ingesta
- Marca SKUs que desaparecieron como inactivos

### Etapa 5: Resolución manual por lote
- Genera reporte de conflictos
- Espera decisión manual para ambigüedades

### Etapa 6: Aplicación
- Inserta o actualiza SKUs
- Genera padre + hijos si `tipo_lados = 'lados_combinados'`
- Registra en `cat_historial_precios` si hubo cambios

## Logging

Los logs se escriben en:
- **Consola**: nivel INFO
- **Archivo**: `importador.log` (nivel INFO)

Ejemplo de salida:
```
2026-04-26 15:30:00 - INFO - === INICIANDO INGESTA: Cromosol ===
2026-04-26 15:30:01 - INFO - ✓ Conexión a Supabase establecida
2026-04-26 15:30:02 - INFO - === ETAPA 1: Validando estructura ===
2026-04-26 15:30:02 - INFO - ✓ Estructura válida: 24045 filas de datos
2026-04-26 15:30:03 - INFO - === ETAPA 2: Leyendo SKUs del XLSX ===
2026-04-26 15:30:05 - INFO - ✓ Leídos 24045 SKUs del XLSX
2026-04-26 15:30:06 - INFO - === ETAPAS 3-6: Procesando SKUs ===
...
2026-04-26 15:35:00 - INFO - ✓ Transacción confirmada
2026-04-26 15:35:00 - INFO - === RESUMEN DE INGESTA ===
2026-04-26 15:35:00 - INFO - Total filas procesadas: 24045
2026-04-26 15:35:00 - INFO - Validadas: 24045
2026-04-26 15:35:00 - INFO - Lados combinados (padres): 312
2026-04-26 15:35:00 - INFO - Lados combinados (hijos): 624
```

## Manejo de errores

- **Rollback automático**: Si falla cualquier SKU, toda la transacción se revierte
- **Log detallado**: Cada error se registra con número de fila
- **Resumen final**: Lista de errores al terminar

## Próximos pasos (cuando llegue v4 del COO)

1. Completar lógica de SKUs sin lados combinados
2. Implementar matcher de duplicados robusto
3. Agregar carga de 65 familias iniciales
4. Agregar carga de 200 vehículos argentinos
5. Procesar los 9 proveedores en batch
6. Generar reporte consolidado

## Notas técnicas

- **Identidad de fabricante**: (nombre, tipo, familia) — no solo nombre
- **Codes OEM**: múltiples separados por `;`
- **Aplicaciones**: string largo (hasta 17k chars soportado)
- **Stock**: NO se procesa en esta etapa (Hito posterior)
- **Precios**: se guardan ambos (lista y neto) si el proveedor los trae

---

**Autor:** CTO  
**Fecha:** 26 de abril de 2026  
**Hito:** 2 — Importador funcional
