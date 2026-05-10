-- Hito 4 — Policy RLS para UPDATE de invitaciones
-- Ejecutar en Supabase SQL Editor (producción)
--
-- Problema: usuarios autenticados no pueden incrementar usos_actuales
-- después de registrarse → el contador queda en 0.
--
-- Verificación ANTES:
-- SELECT codigo, usos_actuales, usado FROM cat_invitaciones_b2c WHERE codigo = 'BETA-TEST01';

CREATE POLICY "authenticated puede actualizar uso invitacion"
ON cat_invitaciones_b2c
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (usos_actuales <= max_usos);

-- Verificación DESPUÉS (registrar un usuario y confirmar que usos_actuales sube a 1):
-- SELECT codigo, usos_actuales, usado FROM cat_invitaciones_b2c WHERE codigo = 'BETA-TEST01';
