-- ═══════════════════════════════════════════════════════════════
-- RLS: admin gestiona cat_invitaciones_b2c
-- Ejecutar en Supabase SQL Editor si hay RLS activa en esta tabla
-- CTO — 13 de mayo de 2026
-- ═══════════════════════════════════════════════════════════════

-- Verificar si RLS está activa
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'cat_invitaciones_b2c';

-- Si devuelve 't' (activa), ejecutar:
DROP POLICY IF EXISTS "admin gestiona invitaciones" ON cat_invitaciones_b2c;

CREATE POLICY "admin gestiona invitaciones"
ON cat_invitaciones_b2c FOR ALL TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

-- Nota: invitaciones-admin.html usa service_role key que bypasea RLS por defecto.
-- Esta policy es para acceso adicional via anon/authenticated si se necesita.
