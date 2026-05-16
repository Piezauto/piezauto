-- LIMPIEZA OTERO PARCIAL v2 (~1100 SKUs cargados)
-- Ejecutar ANTES de reintentar con v5.3

-- 1. Verificar cuántos SKUs de Otero hay
SELECT COUNT(*) AS skus_otero_actuales
FROM cat_equivalencias e
JOIN cat_proveedores p ON p.id = e.proveedor_id
WHERE p.nombre = 'Otero';
-- Esperado: ~1100

-- 2. Eliminar equivalencias de Otero
DELETE FROM cat_equivalencias
WHERE proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Otero');

-- 3. Eliminar SKUs huérfanos (sin equivalencias de otros proveedores)
DELETE FROM cat_skus
WHERE id IN (
    SELECT s.id 
    FROM cat_skus s
    LEFT JOIN cat_equivalencias e ON e.sku_id = s.id
    WHERE e.id IS NULL
);

-- 4. Verificar limpieza completa
SELECT COUNT(*) AS skus_otero_final
FROM cat_equivalencias e
JOIN cat_proveedores p ON p.id = e.proveedor_id
WHERE p.nombre = 'Otero';
-- Debe dar: 0
