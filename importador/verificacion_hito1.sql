-- ============================================================================
-- SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN - Hito 1
-- Ejecutar DESPUÉS de hito1_catalogo_base.sql en Supabase
-- ============================================================================

-- 1. Verificar ENUMs creados
SELECT 
  typname as enum_name,
  array_agg(enumlabel ORDER BY enumsortorder) as valores
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname LIKE '%_enum'
GROUP BY typname
ORDER BY typname;

-- Esperado: 
-- tipo_lados_enum: [lados_combinados, juego_indivisible, kit, lado_explicito, sin_lado]
-- lado_enum: [N/A, Der, Izq, Ambos]
-- posicion_enum: [N/A, Delantero, Trasero, Central]
-- tipo_fabricante_enum: [fabricante_real, etiqueta_origen, etiqueta_categoria, marca_proveedor, marca_canal_terminal]
-- tipo_factura_enum: [factura_a, factura_b_cf, factura_c_o_no_emitida, costo_no_facturable]

-- 2. Verificar tablas creadas
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamaño
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'cat_%'
ORDER BY tablename;

-- Esperado: 
-- cat_aplicaciones
-- cat_auditoria_fabricantes
-- cat_equivalencias
-- cat_fabricantes
-- cat_familias
-- cat_historial_precios
-- cat_proveedores
-- cat_skus
-- cat_vehiculos

-- 3. Verificar índices creados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'cat_%'
ORDER BY tablename, indexname;

-- 4. Verificar fabricante placeholder creado
SELECT 
  id,
  nombre,
  tipo,
  observaciones
FROM cat_fabricantes
WHERE nombre = 'Por identificar';

-- Esperado: 1 fila con tipo = 'marca_proveedor'

-- 5. Verificar triggers creados
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'set_timestamp%'
ORDER BY event_object_table;

-- Esperado: 5 triggers (cat_fabricantes, cat_familias, cat_skus, cat_proveedores, cat_equivalencias)

-- 6. Verificar constraints de FK
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'cat_%'
ORDER BY tc.table_name, kcu.column_name;

-- 7. Verificar constraints UNIQUE
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'cat_%'
ORDER BY tc.table_name, kcu.column_name;

-- Esperado:
-- cat_skus.codigo_piezauto
-- cat_familias.nombre
-- cat_familias.codigo
-- cat_proveedores.nombre
-- cat_proveedores.cuit
-- cat_equivalencias (proveedor_id, codigo_proveedor)

-- 8. Test de inserción básica (rollback automático)
BEGIN;

-- Insertar familia de prueba
INSERT INTO cat_familias (nombre, codigo, rentabilidad_porcentaje)
VALUES ('TEST_Familia', 'TST', 30.00)
RETURNING id, nombre, codigo, rentabilidad_porcentaje;

-- Insertar fabricante de prueba
INSERT INTO cat_fabricantes (nombre, tipo, pais)
VALUES ('TEST_Fabricante', 'fabricante_real', 'Argentina')
RETURNING id, nombre, tipo, pais;

-- Insertar SKU de prueba con lados_combinados
INSERT INTO cat_skus (
  codigo_piezauto,
  es_padre,
  tipo_lados,
  fabricante_id,
  familia_id,
  descripcion,
  precio_lista,
  precio_neto,
  lado,
  activo_venta
)
VALUES (
  'PZ-TEST-00001',
  TRUE,
  'lados_combinados',
  (SELECT id FROM cat_fabricantes WHERE nombre = 'TEST_Fabricante'),
  (SELECT id FROM cat_familias WHERE nombre = 'TEST_Familia'),
  'SKU de prueba - lados combinados',
  10000.00,
  8000.00,
  'N/A',
  FALSE
)
RETURNING id, codigo_piezauto, tipo_lados, es_padre, activo_venta;

ROLLBACK;

-- 9. Resumen ejecutivo
SELECT 
  'Hito 1 - Verificación completada' as status,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'cat_%') as tablas_creadas,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename LIKE 'cat_%') as indices_creados,
  (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name LIKE 'set_timestamp%') as triggers_creados,
  (SELECT count(*) FROM cat_fabricantes WHERE nombre = 'Por identificar') as fabricante_placeholder_ok;

-- ============================================================================
-- FIN VERIFICACIÓN
-- ============================================================================
