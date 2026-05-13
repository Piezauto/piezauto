-- ═══════════════════════════════════════════════════════════════
-- FIX: RLS cat_recomendaciones_talleres — acceso público para anon
-- Ejecutar en Supabase SQL Editor
-- CTO — 13 de mayo de 2026
-- ═══════════════════════════════════════════════════════════════

-- Verificar políticas existentes antes de crear
-- (si ya existe una con el mismo nombre, el CREATE falla — usar DROP IF EXISTS)
DROP POLICY IF EXISTS "public puede ver talleres activos" ON cat_recomendaciones_talleres;

CREATE POLICY "public puede ver talleres activos"
ON cat_recomendaciones_talleres
FOR SELECT TO anon, authenticated
USING (activo = true);

-- Verificación: debe devolver la fila del taller Franzoni sin autenticación
-- SELECT id, nombre FROM cat_recomendaciones_talleres
-- WHERE id = 'e5a732a0-ba98-4a9f-bca5-0d0c99bcc225';
