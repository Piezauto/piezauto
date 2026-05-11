-- Hito 4 — Policy RLS SELECT para validación de invitaciones
-- Ejecutar en Supabase SQL Editor (producción)
--
-- Problema: usuarios anónimos (no logueados aún) no pueden leer
-- cat_invitaciones_b2c → validarCodigoInvitacion() devuelve "inválido"
-- aunque el código exista con usado=false.
--
-- Verificación ANTES:
-- SELECT codigo, usos_actuales, max_usos, usado FROM cat_invitaciones_b2c WHERE codigo = 'BETA-TEST01';

-- Permite que cualquiera (anon + autenticado) valide un código por su código exacto
CREATE POLICY "anon puede validar invitaciones"
ON cat_invitaciones_b2c
FOR SELECT TO anon, authenticated
USING (true);

-- Verificación DESPUÉS: abrir /registro.html con BETA-TEST01 → no debe devolver "inválido"
