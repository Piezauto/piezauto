CREATE TABLE IF NOT EXISTS descuentos_volumen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_minima INTEGER NOT NULL CHECK (cantidad_minima > 0),
  descuento_porcentaje NUMERIC(5,2) NOT NULL CHECK (descuento_porcentaje > 0 AND descuento_porcentaje <= 100),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE descuentos_volumen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON descuentos_volumen FOR SELECT USING (activo = true);
CREATE POLICY "Escritura admin" ON descuentos_volumen FOR ALL USING (true);
