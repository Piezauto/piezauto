-- =====================================================
--  Piezauto — Migración: columnas nuevas en pedidos
--  Correr una vez en Supabase SQL Editor
-- =====================================================

-- Cupón aplicado y descuento
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cupon_codigo       TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS descuento_aplicado NUMERIC(10,2);

-- Localidad de entrega (por si no existe en tu tabla)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS localidad_entrega  TEXT;

-- Nota interna (usada en admin para seguimiento interno)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nota_interna       TEXT;

-- Relación con el usuario registrado (nullable — puede comprar sin cuenta)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS usuario_id         UUID REFERENCES usuarios(id) ON DELETE SET NULL;
