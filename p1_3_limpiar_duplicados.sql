-- P1-3: Limpieza de duplicados en cat_taller_personal y cat_taller_aseguradoras
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar duplicados en cat_taller_personal (conserva el de menor id)
DELETE FROM cat_taller_personal a
USING cat_taller_personal b
WHERE a.id > b.id
  AND a.taller_id = b.taller_id
  AND a.nombre = b.nombre
  AND COALESCE(a.cargo, '') = COALESCE(b.cargo, '')
  AND COALESCE(a.tarifa_hora, 0) = COALESCE(b.tarifa_hora, 0);

-- 2. Eliminar duplicados en cat_taller_aseguradoras (conserva el de menor id)
DELETE FROM cat_taller_aseguradoras a
USING cat_taller_aseguradoras b
WHERE a.id > b.id
  AND a.taller_id = b.taller_id
  AND a.nombre = b.nombre
  AND COALESCE(a.contacto, '') = COALESCE(b.contacto, '')
  AND COALESCE(a.telefono, '') = COALESCE(b.telefono, '');

-- 3. Unique index para prevenir duplicados futuros en personal
CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_taller_nombre_cargo
  ON cat_taller_personal (taller_id, nombre, COALESCE(cargo, ''));

-- 4. Unique index para prevenir duplicados futuros en aseguradoras
CREATE UNIQUE INDEX IF NOT EXISTS uq_aseguradora_taller_nombre
  ON cat_taller_aseguradoras (taller_id, nombre);
