-- ═══════════════════════════════════════════════════════════════
-- Bucket Supabase Storage: turno-imagenes
-- Ejecutar en Supabase SQL Editor
-- CTO — 13 de mayo de 2026
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('turno-imagenes', 'turno-imagenes', true)
ON CONFLICT (id) DO NOTHING;

-- Taller sube imágenes a su carpeta (path = turno_id/timestamp.ext)
CREATE POLICY "taller sube imagenes progreso"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'turno-imagenes'
  AND auth_is_taller()
);

-- Cualquiera puede leer (bucket público)
CREATE POLICY "publico ve imagenes progreso"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'turno-imagenes');

-- Taller puede eliminar sus propias imágenes
CREATE POLICY "taller elimina imagenes propias"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'turno-imagenes' AND auth_is_taller());

-- Verificación
SELECT id, name, public FROM storage.buckets WHERE id = 'turno-imagenes';
