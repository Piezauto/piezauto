-- ══════════════════════════════════════════════════════════════════════
-- limpieza_duplicados.sql
-- Elimina la marca "Citroen" (sin tilde) si existe como duplicado de
-- "Citroën" (con tilde), y reasigna sus modelos a la versión correcta.
-- Ejecutar en el SQL Editor de Supabase Dashboard.
-- ══════════════════════════════════════════════════════════════════════


-- PASO 1: Reasignar modelos de "Citroen" → "Citroën" (si los hay)
-- Evita perder datos de compatibilidad cargados bajo el nombre incorrecto.
UPDATE modelos_auto
SET marca_id = (
  SELECT id FROM marcas_auto WHERE nombre = 'Citroën' LIMIT 1
)
WHERE marca_id = (
  SELECT id FROM marcas_auto WHERE nombre = 'Citroen' LIMIT 1
)
  AND EXISTS (SELECT 1 FROM marcas_auto WHERE nombre = 'Citroën')
  AND EXISTS (SELECT 1 FROM marcas_auto WHERE nombre = 'Citroen');


-- PASO 2: Eliminar modelos huérfanos que ya existen en "Citroën"
-- (modelos que quedaron duplicados tras la reasignación)
DELETE FROM modelos_auto
WHERE marca_id = (
  SELECT id FROM marcas_auto WHERE nombre = 'Citroën' LIMIT 1
)
  AND (marca_id, nombre, anio_desde) IN (
    SELECT marca_id, nombre, anio_desde
    FROM modelos_auto
    GROUP BY marca_id, nombre, anio_desde
    HAVING COUNT(*) > 1
  );


-- PASO 3: Eliminar la marca "Citroen" sin tilde
DELETE FROM marcas_auto
WHERE nombre = 'Citroen'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto WHERE marca_id = (
      SELECT id FROM marcas_auto WHERE nombre = 'Citroen' LIMIT 1
    )
  );


-- PASO 4: Verificar resultado
SELECT nombre FROM marcas_auto WHERE nombre ILIKE '%citro%' ORDER BY nombre;
