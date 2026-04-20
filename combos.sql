-- Tabla de combos/bundles de productos
CREATE TABLE IF NOT EXISTS combos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  precio_especial NUMERIC(10,2) NOT NULL,
  imagen_url    TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  destacado     BOOLEAN NOT NULL DEFAULT false,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de relación combo ↔ productos
CREATE TABLE IF NOT EXISTS combo_productos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id   UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad   INT NOT NULL DEFAULT 1,
  UNIQUE (combo_id, producto_id)
);

CREATE INDEX IF NOT EXISTS idx_combo_productos_combo ON combo_productos (combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_productos_prod  ON combo_productos (producto_id);
CREATE INDEX IF NOT EXISTS idx_combos_activo         ON combos (activo);

-- Trigger para actualizar actualizado_en
CREATE OR REPLACE FUNCTION set_combos_actualizado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_combos_actualizado
  BEFORE UPDATE ON combos
  FOR EACH ROW EXECUTE FUNCTION set_combos_actualizado();

-- RLS
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "combos_select_all"  ON combos FOR SELECT USING (true);
CREATE POLICY "combos_all_auth"    ON combos FOR ALL    USING (true);
CREATE POLICY "cp_select_all"      ON combo_productos FOR SELECT USING (true);
CREATE POLICY "cp_all_auth"        ON combo_productos FOR ALL    USING (true);

-- Ejemplos de combos (opcional — comentar si no querés datos de prueba)
-- INSERT INTO combos (nombre, descripcion, precio_especial, destacado)
-- VALUES
--   ('Kit de frenos completo', 'Pastillas + discos delanteros y traseros', 45000, true),
--   ('Pack service 10.000 km', 'Filtro de aceite + filtro de aire + bujías', 18500, false);
