-- Agrega notas internas a la tabla turnos
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS notas_internas TEXT;
