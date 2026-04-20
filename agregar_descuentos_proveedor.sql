-- Agregar descuento_2 y descuento_3 a la tabla proveedores (descuentos en cascada)
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS descuento_2 numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_3 numeric(5,2) DEFAULT 0;

-- Índice no necesario para estas columnas (son de configuración, no de filtrado)
-- El descuento en cascada se calcula como:
--   precio_neto = lista × (1 - d1/100) × (1 - d2/100) × (1 - d3/100) × (1 + iva/100)
