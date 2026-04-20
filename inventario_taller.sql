-- ── INVENTARIO DE REPUESTOS PROPIOS DEL TALLER ──────────────────────
-- Cada taller puede registrar las piezas que tiene en stock propio.
-- Se usa para armar presupuestos sin depender del catálogo Piezauto.
CREATE TABLE IF NOT EXISTS inventario_taller (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id     UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  codigo        TEXT,
  descripcion   TEXT NOT NULL,
  cantidad      INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  precio_costo  NUMERIC(10,2),
  precio_venta  NUMERIC(10,2),
  unidad        TEXT DEFAULT 'unidad',
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÍNDICES ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_taller  ON inventario_taller(taller_id);
CREATE INDEX IF NOT EXISTS idx_inv_activo  ON inventario_taller(activo);
CREATE INDEX IF NOT EXISTS idx_inv_codigo  ON inventario_taller(codigo);

-- ── TRIGGER: actualizar fecha ────────────────────────────────────────
-- Reutiliza set_actualizado_en() si ya existe (del SQL de movimientos)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_actualizado_en') THEN
    CREATE FUNCTION set_actualizado_en()
    RETURNS TRIGGER AS $f$
    BEGIN NEW.actualizado_en := NOW(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_inv_updated ON inventario_taller;
CREATE TRIGGER trg_inv_updated
  BEFORE UPDATE ON inventario_taller
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ── RLS (activar si usás Row Level Security en Supabase) ─────────────
-- ALTER TABLE inventario_taller ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY inv_taller_own ON inventario_taller USING (auth.uid() = taller_id);
