ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS tipo_comprobante       text,
  ADD COLUMN IF NOT EXISTS recargo_personalizado  numeric(6,2);

-- Poblar tipo_comprobante en base al iva_porcentaje existente para los registros actuales
UPDATE proveedores
SET tipo_comprobante = CASE
  WHEN iva_porcentaje = 21   THEN 'factura_a'
  WHEN iva_porcentaje = 10.5 THEN 'medio_iva'
  WHEN iva_porcentaje = 0    THEN 'sin_iva'
  ELSE 'personalizado'
END
WHERE tipo_comprobante IS NULL;

UPDATE proveedores
SET recargo_personalizado = iva_porcentaje
WHERE tipo_comprobante = 'personalizado' AND recargo_personalizado IS NULL;
