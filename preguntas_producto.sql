CREATE TABLE IF NOT EXISTS preguntas_producto (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID        NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  pregunta    TEXT        NOT NULL,
  respuesta   TEXT,
  publico     BOOLEAN     NOT NULL DEFAULT false,
  usuario_id  UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preguntas_producto
  ON preguntas_producto(producto_id, creado_en DESC);

ALTER TABLE preguntas_producto ENABLE ROW LEVEL SECURITY;
