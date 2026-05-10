-- Código de invitación de prueba para smoke test del Hito 4
-- Ejecutar en Supabase SQL Editor (producción)
-- Columnas reales de cat_invitaciones_b2c (verificadas 2026-05-10):
--   id, codigo, email_destino, usado, usado_por, usado_at,
--   generado_por, expira_at, max_usos, usos_actuales, created_at, updated_at

INSERT INTO cat_invitaciones_b2c (codigo, max_usos, usos_actuales, generado_por, usado)
VALUES ('BETA-TEST01', 10, 0, 'sistema', false)
ON CONFLICT (codigo) DO UPDATE SET
  max_usos      = EXCLUDED.max_usos,
  usos_actuales = EXCLUDED.usos_actuales,
  usado         = EXCLUDED.usado;
