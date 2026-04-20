CREATE TABLE IF NOT EXISTS notificaciones_usuario (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo     TEXT        NOT NULL,
  mensaje    TEXT        NOT NULL,
  leido      BOOLEAN     NOT NULL DEFAULT false,
  tipo       TEXT        NOT NULL DEFAULT 'sistema'
               CHECK (tipo IN ('pedido', 'producto', 'oferta', 'sistema')),
  link       TEXT,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_usuario
  ON notificaciones_usuario(usuario_id, leido, creado_en DESC);

ALTER TABLE notificaciones_usuario ENABLE ROW LEVEL SECURITY;

-- Columnas de logística en pedidos (requeridas por el módulo de logística)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_seguimiento TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS transportista TEXT;

-- Columnas de servicios del taller (requeridas por drag&drop y destacados)
ALTER TABLE servicios_taller ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false;
ALTER TABLE servicios_taller ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
