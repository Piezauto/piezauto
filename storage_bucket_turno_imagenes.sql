-- ═══════════════════════════════════════════════════════════════
-- Bucket Supabase Storage — turno-imagenes
-- CTO — 13 de mayo de 2026
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Crear bucket público para imágenes de progreso de turnos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'turno-imagenes',
  'turno-imagenes',
  true,
  5242880,  -- 5MB max por imagen
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: taller autenticado puede subir imágenes
DROP POLICY IF EXISTS "taller sube imagenes progreso" ON storage.objects;
CREATE POLICY "taller sube imagenes progreso"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'turno-imagenes'
  AND auth_is_taller()
);

-- Policy: lectura pública (para que el cliente vea el progreso)
DROP POLICY IF EXISTS "publico ve imagenes progreso" ON storage.objects;
CREATE POLICY "publico ve imagenes progreso"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'turno-imagenes');

-- Verificación
SELECT id, name, public FROM storage.buckets WHERE id = 'turno-imagenes';
-- Resultado esperado: 1 fila con public=true
