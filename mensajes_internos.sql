CREATE TABLE IF NOT EXISTS mensajes_internos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  de_taller_id UUID        NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  para_admin   BOOLEAN     NOT NULL DEFAULT true,
  mensaje      TEXT        NOT NULL,
  leido        BOOLEAN     NOT NULL DEFAULT false,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_taller
  ON mensajes_internos(de_taller_id, creado_en DESC);

ALTER TABLE mensajes_internos ENABLE ROW LEVEL SECURITY;
