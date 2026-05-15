-- ============================================================
-- Workstream D — DDL: Onboarding lubricentros y tipos de establecimiento
-- Aplicar en Supabase SQL Editor en orden
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Ampliar cat_recomendaciones_talleres (tabla B2C pública)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE cat_recomendaciones_talleres
  ADD COLUMN IF NOT EXISTS tipo_establecimiento TEXT NOT NULL DEFAULT 'taller_chapa_pintura'
    CHECK (tipo_establecimiento IN (
      'taller_chapa_pintura',
      'taller_mecanico',
      'lubricentro',
      'gomeria',
      'electricidad_automotor',
      'cerrajeria_automotor',
      'mixto',
      'otro'
    )),
  ADD COLUMN IF NOT EXISTS duracion_turno_default      INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS atencion_express            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sin_turno_previo            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rango_precios_referencial   JSONB   DEFAULT '{}';

-- Ampliar talleres (tabla B2B admin) — mismas columnas para coherencia
ALTER TABLE talleres
  ADD COLUMN IF NOT EXISTS tipo_establecimiento TEXT NOT NULL DEFAULT 'taller_chapa_pintura'
    CHECK (tipo_establecimiento IN (
      'taller_chapa_pintura','taller_mecanico','lubricentro',
      'gomeria','electricidad_automotor','cerrajeria_automotor','mixto','otro'
    )),
  ADD COLUMN IF NOT EXISTS duracion_turno_default    INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS atencion_express          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sin_turno_previo          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rango_precios_referencial JSONB   DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────
-- Trigger: aplicar defaults según tipo de establecimiento
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_aplicar_defaults_tipo_establecimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_establecimiento = 'lubricentro' THEN
    NEW.duracion_turno_default := COALESCE(NULLIF(NEW.duracion_turno_default, 60), 30);
    NEW.atencion_express  := TRUE;
    NEW.sin_turno_previo  := TRUE;
  ELSIF NEW.tipo_establecimiento = 'gomeria' THEN
    NEW.duracion_turno_default := COALESCE(NULLIF(NEW.duracion_turno_default, 60), 30);
    NEW.atencion_express  := TRUE;
    NEW.sin_turno_previo  := TRUE;
  ELSIF NEW.tipo_establecimiento = 'taller_mecanico' THEN
    NEW.duracion_turno_default := COALESCE(NULLIF(NEW.duracion_turno_default, 60), 90);
  ELSIF NEW.tipo_establecimiento = 'taller_chapa_pintura' THEN
    NEW.duracion_turno_default := COALESCE(NULLIF(NEW.duracion_turno_default, 0), 60);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defaults_tipo_estab ON cat_recomendaciones_talleres;
CREATE TRIGGER trg_defaults_tipo_estab
  BEFORE INSERT OR UPDATE OF tipo_establecimiento ON cat_recomendaciones_talleres
  FOR EACH ROW
  EXECUTE FUNCTION fn_aplicar_defaults_tipo_establecimiento();

DROP TRIGGER IF EXISTS trg_defaults_tipo_estab_admin ON talleres;
CREATE TRIGGER trg_defaults_tipo_estab_admin
  BEFORE INSERT OR UPDATE OF tipo_establecimiento ON talleres
  FOR EACH ROW
  EXECUTE FUNCTION fn_aplicar_defaults_tipo_establecimiento();

-- ─────────────────────────────────────────────────────────────
-- Stock de productos por taller (lubricentros y mixtos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_taller_stock (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id            UUID     NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  sku_id               UUID     REFERENCES cat_skus(id) ON DELETE SET NULL,
  codigo_propio        TEXT,
  descripcion          TEXT     NOT NULL,
  marca                TEXT,
  unidad               TEXT     DEFAULT 'unidad',
  cantidad_actual      INTEGER  NOT NULL DEFAULT 0,
  cantidad_minima      INTEGER  DEFAULT 0,
  precio_costo         NUMERIC  DEFAULT 0,
  precio_venta         NUMERIC  DEFAULT 0,
  proveedor            TEXT,
  ultima_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  notas                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(taller_id, sku_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_taller ON cat_taller_stock(taller_id);
CREATE INDEX IF NOT EXISTS idx_stock_bajo   ON cat_taller_stock(taller_id, cantidad_actual)
  WHERE cantidad_actual <= cantidad_minima;

-- RLS (admin ve todo; la política de taller se activa cuando existan auth_is_taller / auth_taller_id)
ALTER TABLE cat_taller_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taller_stock_admin_all" ON cat_taller_stock
  FOR ALL TO authenticated USING (TRUE);

-- ─────────────────────────────────────────────────────────────
-- Vista: stock crítico por taller
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_stock_critico_por_taller AS
SELECT
  ts.taller_id,
  t.nombre AS taller_nombre,
  COUNT(*)  AS items_criticos,
  ARRAY_AGG(ts.descripcion ORDER BY (ts.cantidad_minima - ts.cantidad_actual) DESC) AS items
FROM cat_taller_stock ts
JOIN cat_recomendaciones_talleres t ON t.id = ts.taller_id
WHERE ts.cantidad_actual <= ts.cantidad_minima
GROUP BY ts.taller_id, t.nombre;
