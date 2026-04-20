-- =====================================================
--  Piezauto — Tabla: resenas_productos
--  Correr una vez en Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS resenas_productos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre      TEXT NOT NULL,
  puntuacion  SMALLINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario  TEXT,
  aprobada    BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para lectura rápida por producto
CREATE INDEX IF NOT EXISTS resenas_prod_idx ON resenas_productos (producto_id, aprobada, creado_en DESC);

-- Un usuario solo puede dejar una reseña por producto
CREATE UNIQUE INDEX IF NOT EXISTS resenas_usuario_prod_uniq ON resenas_productos (usuario_id, producto_id)
  WHERE usuario_id IS NOT NULL;

-- RLS
ALTER TABLE resenas_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leer resenas aprobadas"
  ON resenas_productos FOR SELECT
  TO anon, authenticated
  USING (aprobada = true);

CREATE POLICY "Insertar resena"
  ON resenas_productos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Vista materializada opcional: promedio por producto
-- Útil para mostrar el promedio en el catálogo sin calcular en JS
CREATE OR REPLACE VIEW vista_promedio_resenas AS
SELECT
  producto_id,
  ROUND(AVG(puntuacion)::NUMERIC, 1) AS promedio,
  COUNT(*)                            AS total
FROM resenas_productos
WHERE aprobada = true
GROUP BY producto_id;
