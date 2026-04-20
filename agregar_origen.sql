-- Agregar columna "origen" a items_proveedor
-- Guarda el valor del campo Origen del Excel (ej: ORIGINAL, T-ORIGINAL, IMPORTADO, etc.)
ALTER TABLE items_proveedor ADD COLUMN IF NOT EXISTS origen TEXT;

-- Índice opcional para filtrar por origen en el catálogo de proveedores
CREATE INDEX IF NOT EXISTS idx_items_proveedor_origen ON items_proveedor(origen);
