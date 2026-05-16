-- LIMPIEZA DE CARGA PARCIAL: Otero
-- Ejecutar ANTES de reintentar la carga con v5.2

-- 1. Contar cuántos SKUs hay actualmente
SELECT COUNT(*) AS skus_otero_actuales
FROM cat_equivalencias e
JOIN cat_proveedores p ON p.id = e.proveedor_id
WHERE p.nombre = 'Otero';
-- Esperado: ~500 (batches 1 y 2 completos)

-- 2. Eliminar equivalencias de Otero
DELETE FROM cat_equivalencias
WHERE proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Otero');

-- 3. Eliminar SKUs huérfanos de Otero (los que no tienen equivalencias de otros proveedores)
DELETE FROM cat_skus
WHERE id IN (
    SELECT s.id 
    FROM cat_skus s
    LEFT JOIN cat_equivalencias e ON e.sku_id = s.id
    WHERE e.id IS NULL
);

-- 4. Verificar limpieza
SELECT COUNT(*) AS skus_otero_post_limpieza
FROM cat_equivalencias e
JOIN cat_proveedores p ON p.id = e.proveedor_id
WHERE p.nombre = 'Otero';
-- Esperado: 0
