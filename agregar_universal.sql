-- agregar_universal.sql
-- Agregar columna universal a la tabla productos
-- Ejecutar en el SQL Editor de Supabase Dashboard

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS universal BOOLEAN NOT NULL DEFAULT FALSE;

-- Actualizar el schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificar
-- SELECT id, nombre, universal FROM productos LIMIT 5;
