-- Código de invitación de prueba para smoke test del Hito 4
-- Ejecutar en Supabase SQL Editor (producción)

INSERT INTO cat_invitaciones_b2c (
  codigo,
  max_usos,
  usos_actuales,
  activo,
  usado,
  descripcion
)
VALUES (
  'BETA-TEST01',
  10,
  0,
  true,
  false,
  'Código de prueba interno — Hito 4 smoke test'
)
ON CONFLICT (codigo) DO UPDATE SET
  max_usos      = EXCLUDED.max_usos,
  usos_actuales = EXCLUDED.usos_actuales,
  activo        = EXCLUDED.activo,
  usado         = EXCLUDED.usado;
