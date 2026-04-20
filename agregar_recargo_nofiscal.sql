ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS recargo_no_fiscal_tipo       text    DEFAULT 'sin_recargo',
  ADD COLUMN IF NOT EXISTS recargo_no_fiscal_porcentaje numeric(6,2);

-- Poblar desde los campos anteriores si ya existen
UPDATE proveedores
SET
  recargo_no_fiscal_tipo = CASE
    WHEN tipo_comprobante = 'medio_iva'    THEN 'medio_iva'
    WHEN tipo_comprobante = 'personalizado' THEN 'personalizado'
    ELSE 'sin_recargo'
  END,
  recargo_no_fiscal_porcentaje = CASE
    WHEN tipo_comprobante = 'personalizado' THEN recargo_personalizado
    ELSE NULL
  END
WHERE recargo_no_fiscal_tipo IS NULL OR recargo_no_fiscal_tipo = 'sin_recargo';
