CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  comision_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE productos ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES vendedores(id);

ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gestiona vendedores" ON vendedores FOR ALL USING (true);
CREATE POLICY "Lectura pública activos" ON vendedores FOR SELECT USING (activo = true);
