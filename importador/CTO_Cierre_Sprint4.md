# CIERRE SPRINT 4 — AJUSTES MODELO hijo_de_padre_multiple

**De:** CTO  
**Para:** COO + Coordinador  
**Fecha:** 26 de abril de 2026  
**Estado:** Ajustes aprobados e implementados

---

## ✅ VALIDACIÓN DE AJUSTES

### (a) Sexto valor ENUM: hijo_de_padre_multiple

**APROBADO**. Es la generalización natural de `lados_combinados` para N hijos (en lugar de 2).

**Casos de uso Sprint 4:**
- Patrón 2 Francar: 1 código → 4 hijos (DD, DI, TD, TI)
- Patrón 3 Francar: 1 código → 6 hijos (3 versiones × 2 lados)
- Total: 42 hijos pre-armados

### (b) Modelo de dos columnas: padre_id + codigo_raiz

**APROBADO CON MEJORA DEL COO**. Propuesta superior a mi versión original (que eliminaba FK).

**Modelo implementado:**
```sql
padre_id UUID REFERENCES cat_skus(id)  -- FK para integridad referencial
codigo_raiz VARCHAR(60)                -- Código proveedor (sync incremental sin JOIN)
```

**Ventajas vs eliminar FK:**
- ✅ Mantiene integridad referencial (no se puede borrar padre sin borrar hijos)
- ✅ Sync incremental sin JOIN (`WHERE codigo_raiz = :codigo`)
- ✅ Reportes con FK fuerte para padre↔hijo
- ✅ Costo mínimo: 1 columna extra en 7.540 hijos (0.4% del catálogo)

**Regla de uso:**

| Caso | padre_id | codigo_raiz |
|---|---|---|
| SKU sin padre | NULL | NULL |
| Hijo de lados_combinados (D/I) | UUID del padre | codigo_proveedor del padre |
| Hijo de hijo_de_padre_multiple | UUID del padre | codigo_proveedor del padre |
| Padre (cualquiera) | NULL | NULL |

### (c) Lógica sync incremental

**APROBADO**. Extensión natural de propagación padre→hijos.

**Query de actualización:**
```sql
-- Actualiza padre + N hijos en un solo UPDATE
UPDATE cat_skus 
SET precio_lista = :nuevo_precio_lista,
    precio_neto = :nuevo_precio_neto,
    updated_at = NOW()
WHERE codigo_proveedor = :codigo_recibido    -- el padre
   OR codigo_raiz = :codigo_recibido;        -- los N hijos
```

**Sin JOIN, rápido por índice en codigo_raiz.**

---

## 📋 ARCHIVOS ENTREGADOS

### 1. migracion_sprint4.sql

Script ALTER TABLE para ejecutar en Supabase **ANTES de la carga masiva**.

**Ejecuta:**
1. `ALTER TYPE tipo_lados_enum ADD VALUE 'hijo_de_padre_multiple'`
2. `ALTER TABLE cat_skus RENAME COLUMN codigo_raiz TO padre_id`
3. `ALTER TABLE cat_skus ADD COLUMN codigo_raiz VARCHAR(60)`
4. `CREATE INDEX idx_cat_skus_codigo_raiz ON cat_skus(codigo_raiz)`

**Requisito:** cat_skus debe estar vacía (COUNT(*) = 0)

**Verificación incluida:**
- 6 valores en ENUM
- 2 columnas (padre_id, codigo_raiz)
- FK intacta en padre_id
- Índice creado en codigo_raiz

### 2. hito1_catalogo_base.sql (actualizado)

DDL regenerado con modelo Sprint 4 para futuros ambientes.

**Cambios:**
- tipo_lados_enum: 6 valores (agregado hijo_de_padre_multiple)
- cat_skus: padre_id (UUID FK) + codigo_raiz (VARCHAR)
- Índices actualizados
- Comentarios documentando Sprint 4

### 3. importador_catalogo.py (actualizado)

Importador extendido para manejar hijo_de_padre_multiple.

**Nuevas funcionalidades:**
- Campo `codigo_padre_proveedor` en SKUNormalizado
- Función `crear_hijo_pre_armado()` para procesar hijos del XLSX
- Procesamiento en **dos fases**:
  - Fase 1: Padres y SKUs simples
  - Fase 2: Hijos pre-armados (busca padre por codigo_proveedor)
- Mapa `codigo_proveedor → padre_id` para vincular hijos
- Búsqueda de padres en base de datos si no están en carga actual

---

## 🎯 PRÓXIMOS PASOS

### AHORA (antes de carga masiva)

**1. Ejecutar migración Sprint 4 en Supabase**

```bash
# Verificar que cat_skus está vacía
psql ... -c "SELECT COUNT(*) FROM cat_skus;"
# Esperado: 0

# Ejecutar migración
psql ... < migracion_sprint4.sql

# Verificar resultado
psql ... -c "SELECT COUNT(*) FROM pg_enum WHERE enumtypid = 'tipo_lados_enum'::regtype;"
# Esperado: 6
```

**2. Validar estructura**

```sql
-- Ver columnas nuevas
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'cat_skus' AND column_name IN ('padre_id', 'codigo_raiz');

-- Ver ENUM extendido
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'tipo_lados_enum'::regtype;
```

### DESPUÉS (Sprint 5 - Consolidación)

**COO coordina con Coordinador** para autorizar arranque Sprint 5.

**Carga masiva:**
1. Procesar 9 proveedores Sprint 3 (v4 o v5 según COO)
2. Procesar 3 proveedores Sprint 4 (Surpiezas, Bark1, Francar)
3. Total: 266.166 SKUs únicos

**Importador automáticamente:**
- Detecta tipo_lados='hijo_de_padre_multiple'
- Procesa padre en Fase 1
- Procesa 42 hijos pre-armados en Fase 2
- Vincula vía padre_id (UUID FK) + codigo_raiz (VARCHAR)

---

## 📊 IMPACTO EN CATÁLOGO PROYECTADO

| Tipo SKU | Sprint 3 | Sprint 4 | Total |
|---|---:|---:|---:|
| SKUs únicos | 210.520 | 55.646 | 266.166 |
| Lados combinados (padres) | 7.498 | 10* | 7.508 |
| Hijos autogenerados D+I | 14.996 | 20 | 15.016 |
| Hijos pre-armados múltiples | 0 | 42 | 42 |
| **Total físico proyectado** | **225.516** | **55.708** | **281.224** |

*Francar tiene padres de hijo_de_padre_multiple que NO autogeneran hijos (los recibe pre-armados).

---

## ⚠️ NOTAS CRÍTICAS

### 1. Ejecutar migración ANTES de carga

La migración es **no destructiva** si cat_skus está vacía. Si ya hay datos, requiere coordinación especial.

### 2. Columna codigo_padre_proveedor opcional

Solo se usa en Francar (42 SKUs). Los otros 266.124 SKUs tienen este campo vacío en el XLSX.

El importador lo maneja automáticamente:
- Si `codigo_padre_proveedor` está vacío → Fase 1 (padre o simple)
- Si `codigo_padre_proveedor` tiene valor → Fase 2 (hijo pre-armado)

### 3. Validación de descripciones autogeneradas

COO entregó los 42 hijos con descripciones generadas por script. Están aislados en hoja "Descripciones autogeneradas" de Francar_Normalizado_v1.xlsx para validación del dueño.

Si se detectan inexactitudes, COO regenera Francar_v2 antes del Sprint 5.

### 4. Campo codigo_fabricante pendiente Sprint 5

COO hará pasada retroactiva v5 sobre Sprint 3 para agregar columna `codigo_fabricante` (entre codigo_oem y precio_lista).

El importador actual NO espera esta columna. Cuando COO entregue v5, actualizar COLUMNAS_OPCIONALES.

---

## ✅ ESTADO FINAL

**Modelo de datos:** Extendido y aprobado  
**DDL Hito 1:** Regenerado con cambios Sprint 4  
**Migración SQL:** Lista para ejecutar  
**Importador:** Actualizado con dos fases  
**Listo para:** Carga masiva Sprint 5

---

*— CTO, Comisión Directiva Piezauto*
