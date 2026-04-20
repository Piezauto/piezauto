-- ============================================================
-- SISTEMA DE FIDELIZACIÓN PIEZAUTO
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Tabla principal: nivel de cada usuario
CREATE TABLE IF NOT EXISTS niveles_usuario (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id      UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nivel           TEXT        NOT NULL DEFAULT 'bronce'
                              CHECK (nivel IN ('bronce', 'plata', 'oro')),
  compras_totales INTEGER     NOT NULL DEFAULT 0,
  puntos_totales  INTEGER     NOT NULL DEFAULT 0,
  actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id)
);

-- Tabla historial de puntos
CREATE TABLE IF NOT EXISTS puntos_historial (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pedido_id   UUID        REFERENCES pedidos(id) ON DELETE SET NULL,
  puntos      INTEGER     NOT NULL,
  descripcion TEXT,
  tipo        TEXT        NOT NULL DEFAULT 'ganado'
              CHECK (tipo IN ('ganado', 'canjeado')),
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- Función para calcular nivel automáticamente según compras
CREATE OR REPLACE FUNCTION actualizar_nivel_usuario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.compras_totales >= 16 THEN
    NEW.nivel := 'oro';
  ELSIF NEW.compras_totales >= 6 THEN
    NEW.nivel := 'plata';
  ELSE
    NEW.nivel := 'bronce';
  END IF;
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_nivel ON niveles_usuario;
CREATE TRIGGER trigger_nivel
  BEFORE INSERT OR UPDATE ON niveles_usuario
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_nivel_usuario();

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_niveles_usuario_id   ON niveles_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_puntos_historial_uid ON puntos_historial(usuario_id);
CREATE INDEX IF NOT EXISTS idx_puntos_historial_pid ON puntos_historial(pedido_id);

-- RLS: cada usuario solo ve sus propios datos
ALTER TABLE niveles_usuario   ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos_historial  ENABLE ROW LEVEL SECURITY;

-- (Ajustar políticas según tu esquema de auth; con auth simple por password_hash
-- el acceso se controla desde el frontend usando el usuario_id de la sesión)

-- Beneficios por nivel:
-- bronce: envío gratis en compras >= $50.000
-- plata:  5% descuento adicional
-- oro:    10% descuento + atención prioritaria
COMMENT ON COLUMN niveles_usuario.nivel IS
  'bronce=0-5 compras | plata=6-15 compras | oro=16+ compras';
