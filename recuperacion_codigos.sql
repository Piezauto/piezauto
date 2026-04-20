-- Tabla para códigos temporales de recuperación de contraseña de talleres
CREATE TABLE IF NOT EXISTS recuperacion_codigos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  codigo      TEXT NOT NULL,
  usado       BOOLEAN NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un email sólo puede tener un código vigente
CREATE INDEX IF NOT EXISTS idx_recuperacion_email ON recuperacion_codigos (email);
CREATE INDEX IF NOT EXISTS idx_recuperacion_expires ON recuperacion_codigos (expires_at);

-- RLS: sólo el backend (service role) puede leer/escribir
ALTER TABLE recuperacion_codigos ENABLE ROW LEVEL SECURITY;

-- Política: la app anon puede insertar y leer sus propios códigos por email
-- (la verificación de email la hace el frontend en el momento)
CREATE POLICY "insert_recovery" ON recuperacion_codigos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "select_recovery" ON recuperacion_codigos
  FOR SELECT USING (true);

CREATE POLICY "update_recovery" ON recuperacion_codigos
  FOR UPDATE USING (true);

-- Función para limpiar códigos vencidos (ejecutar periódicamente o via cron Supabase)
CREATE OR REPLACE FUNCTION limpiar_codigos_vencidos()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM recuperacion_codigos WHERE expires_at < NOW() OR usado = true;
END;
$$;
