-- ============================================================================
-- MIGRACIÓN: POSICION_ENUM FEMENINO → MASCULINO
-- Fecha: 26/04/2026
-- Razón: Consistencia con lenguaje del sector automotriz argentino
-- ============================================================================

-- IMPORTANTE: Ejecutar DESPUÉS de validar test Farosdam exitoso
-- Este script cambia los valores del ENUM posicion de femenino a masculino
-- para que coincida con los archivos v5 del COO

-- ============================================================================
-- 1. VERIFICAR ESTADO ACTUAL
-- ============================================================================

-- Ver valores actuales del ENUM
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'posicion_enum'::regtype
ORDER BY enumsortorder;

-- Resultado esperado:
-- Delantera
-- Trasera
-- N/A

-- Ver distribución de valores en cat_skus (debe estar vacía o con Farosdam)
SELECT posicion, COUNT(*) 
FROM cat_skus 
GROUP BY posicion;

-- ============================================================================
-- 2. RENOMBRAR ENUM ACTUAL
-- ============================================================================

ALTER TYPE posicion_enum RENAME TO posicion_enum_old;

-- ============================================================================
-- 3. CREAR NUEVO ENUM CON VALORES EN MASCULINO
-- ============================================================================

CREATE TYPE posicion_enum AS ENUM ('Delantero', 'Trasero', 'N/A');

-- ============================================================================
-- 4. ACTUALIZAR COLUMNA EN cat_skus
-- ============================================================================

-- Si la tabla está vacía (COUNT = 0), este paso es instantáneo
-- Si tiene datos de Farosdam y esos datos están en masculino, falla
-- En ese caso, primero hay que limpiar la tabla

-- Opción A: Si cat_skus tiene datos en femenino (no debería)
ALTER TABLE cat_skus 
  ALTER COLUMN posicion TYPE posicion_enum 
  USING posicion::text::posicion_enum;

-- Opción B: Si cat_skus está vacía (esperado)
ALTER TABLE cat_skus 
  ALTER COLUMN posicion TYPE posicion_enum;

-- ============================================================================
-- 5. ELIMINAR ENUM ANTIGUO
-- ============================================================================

DROP TYPE posicion_enum_old;

-- ============================================================================
-- 6. VERIFICAR RESULTADO
-- ============================================================================

-- Ver nuevos valores del ENUM
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'posicion_enum'::regtype
ORDER BY enumsortorder;

-- Resultado esperado:
-- Delantero
-- Trasero
-- N/A

-- Verificar que la columna esté usando el nuevo tipo
SELECT 
    column_name, 
    data_type, 
    udt_name 
FROM information_schema.columns 
WHERE table_name = 'cat_skus' 
  AND column_name = 'posicion';

-- Resultado esperado:
-- column_name | data_type     | udt_name
-- posicion    | USER-DEFINED  | posicion_enum

-- ============================================================================
-- NOTAS
-- ============================================================================

/*
CONTEXTO:
- Los 12 archivos v5 del COO usan valores masculinos: "Delantero", "Trasero"
- El DDL original tenía valores femeninos: "Delantera", "Trasera"
- Decisión tomada: cambiar el ENUM al masculino (coincide con sector)

TIMING:
- Ejecutar DESPUÉS de validar test Farosdam exitoso
- Ejecutar ANTES de la carga masiva de 266k SKUs

ALTERNATIVA (si hubiera datos):
Si por alguna razón hubiera datos en cat_skus en femenino que queremos preservar:

1. Crear ENUM temporal con ambos valores:
   CREATE TYPE posicion_temp AS ENUM ('Delantera', 'Trasera', 'Delantero', 'Trasero', 'N/A');

2. Migrar columna:
   ALTER TABLE cat_skus ALTER COLUMN posicion TYPE posicion_temp USING posicion::text::posicion_temp;

3. Actualizar valores:
   UPDATE cat_skus SET posicion = 'Delantero' WHERE posicion = 'Delantera';
   UPDATE cat_skus SET posicion = 'Trasero' WHERE posicion = 'Trasera';

4. Crear ENUM final:
   CREATE TYPE posicion_enum_new AS ENUM ('Delantero', 'Trasero', 'N/A');

5. Migrar y limpiar:
   ALTER TABLE cat_skus ALTER COLUMN posicion TYPE posicion_enum_new USING posicion::text::posicion_enum_new;
   DROP TYPE posicion_enum_old;
   DROP TYPE posicion_temp;
   ALTER TYPE posicion_enum_new RENAME TO posicion_enum;
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
