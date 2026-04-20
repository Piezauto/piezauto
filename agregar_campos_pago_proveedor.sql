-- Nuevos campos de gestión de pagos en la tabla proveedores
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS limite_credito      numeric(12,2),
  ADD COLUMN IF NOT EXISTS dia_pago_preferido  text,
  ADD COLUMN IF NOT EXISTS condicion_pago_custom text;
