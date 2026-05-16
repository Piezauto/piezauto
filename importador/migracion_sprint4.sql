-- ============================================================================
-- MIGRACIÓN SPRINT 4 — Ajustes modelo hijo_de_padre_multiple
-- Fecha: 26 de abril de 2026
-- Autor: CTO
-- Aprobado: COO + Comité Técnico
-- ============================================================================
-- 
-- EJECUTAR SOLO SI cat_skus ESTÁ VACÍA
-- Verificar primero con: SELECT COUNT(*) FROM cat_skus;
-- Si COUNT(*) > 0, coordinar con COO antes de ejecutar
-- 
-- ============================================================================

-- ----------------------------------------------------------------------------
-- AJUSTE 1: Extender ENUM tipo_lados con sexto valor
-- ----------------------------------------------------------------------------

ALTER TYPE tipo_lados_enum ADD VALUE 'hijo_de_padre_multiple';

-- Verificación
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'tipo_lados_enum'::regtype 
ORDER BY enumsortorder;

-- Esperado: 6 valores
-- lados_combinados
-- juego_indivisible
-- kit
-- lado_explicito
-- sin_lado
-- hijo_de_padre_multiple

COMMENT ON TYPE tipo_lados_enum IS 'Tipos de lateralidad: 6 valores desde Sprint 4';

-- ----------------------------------------------------------------------------
-- AJUSTE 2: Modelo de dos columnas (padre_id UUID + codigo_raiz VARCHAR)
-- ----------------------------------------------------------------------------

-- Renombrar columna existente codigo_raiz → padre_id
ALTER TABLE cat_skus 
RENAME COLUMN codigo_raiz TO padre_id;

-- Agregar nueva columna codigo_raiz como VARCHAR
ALTER TABLE cat_skus 
ADD COLUMN codigo_raiz VARCHAR(60);

-- Crear índice para sync incremental rápido
CREATE INDEX idx_cat_skus_codigo_raiz 
ON cat_skus(codigo_raiz) 
WHERE codigo_raiz IS NOT NULL;

-- Verificar estructura
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cat_skus' 
  AND column_name IN ('padre_id', 'codigo_raiz')
ORDER BY column_name;

-- Esperado:
-- padre_id      | uuid    | NULL | YES
-- codigo_raiz   | varchar | 60   | YES

COMMENT ON COLUMN cat_skus.padre_id IS 'FK al padre (UUID). NULL si no tiene padre. Mantiene integridad referencial.';
COMMENT ON COLUMN cat_skus.codigo_raiz IS 'Código proveedor del padre (string). Para sync incremental sin JOIN. NULL si no tiene padre.';

-- ----------------------------------------------------------------------------
-- AJUSTE 3: Lógica de sync incremental (documentación)
-- ----------------------------------------------------------------------------

-- Esta query se usará en el módulo de sincronización incremental (Hito 6):
-- 
-- UPDATE cat_skus 
-- SET precio_lista = :nuevo_precio_lista,
--     precio_neto = :nuevo_precio_neto,
--     updated_at = NOW()
-- WHERE codigo_proveedor = :codigo_recibido    -- actualiza el padre
--    OR codigo_raiz = :codigo_recibido;        -- actualiza los N hijos
-- 
-- Luego registrar en historial:
-- 
-- INSERT INTO cat_historial_precios (sku_id, precio_anterior, precio_nuevo, tipo_precio, motivo)
-- SELECT id, precio_lista, :nuevo_precio_lista, 'lista', 'Actualización lista proveedor'
-- FROM cat_skus
-- WHERE codigo_proveedor = :codigo_recibido 
--    OR codigo_raiz = :codigo_recibido;

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN FINAL
-- ----------------------------------------------------------------------------

-- 1. Contar registros (debe ser 0 antes de carga masiva)
SELECT COUNT(*) as total_skus FROM cat_skus;

-- 2. Verificar ENUM extendido
SELECT COUNT(*) as valores_enum 
FROM pg_enum 
WHERE enumtypid = 'tipo_lados_enum'::regtype;
-- Esperado: 6

-- 3. Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'cat_skus' 
  AND indexname = 'idx_cat_skus_codigo_raiz';
-- Esperado: 1 fila

-- 4. Verificar constraints FK (padre_id debe mantener FK)
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'cat_skus' 
  AND kcu.column_name = 'padre_id'
  AND tc.constraint_type = 'FOREIGN KEY';
-- Esperado: 1 fila (cat_skus_padre_id_fkey)

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
-- 
-- ✓ tipo_lados_enum: 5 valores → 6 valores
-- ✓ cat_skus.codigo_raiz (UUID) → cat_skus.padre_id (UUID, mantiene FK)
-- ✓ cat_skus.codigo_raiz (VARCHAR(60), nuevo, indexado)
-- ✓ Lógica sync incremental: UPDATE por codigo_raiz sin JOIN
-- 
-- Próximo paso: Actualizar importador Hito 2 para:
-- 1. Reconocer tipo_lados = 'hijo_de_padre_multiple'
-- 2. Poblar padre_id (UUID) + codigo_raiz (VARCHAR) en hijos
-- 3. Procesar Francar con 42 hijos pre-armados
-- 
-- ============================================================================
-- FIN MIGRACIÓN
-- ============================================================================
