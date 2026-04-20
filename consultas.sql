-- =====================================================
--  Piezauto — Tabla: consultas
--  Correr una vez en Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS consultas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefono    TEXT,
  asunto      TEXT,
  mensaje     TEXT NOT NULL,
  leido       BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para listar sin leer rápido desde admin
CREATE INDEX IF NOT EXISTS consultas_leido_idx ON consultas (leido, creado_en DESC);

-- RLS: solo lectura/escritura anónima para insertar; admin usa service_role
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede enviar consulta"
  ON consultas FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
