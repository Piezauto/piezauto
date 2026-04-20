-- ══════════════════════════════════════════════════════
-- SISTEMA DE REFERIDOS
-- ══════════════════════════════════════════════════════

-- Tabla de referidos
-- referente_id: usuario que compartió el código
-- referido_id:  usuario que se registró usando el código
CREATE TABLE IF NOT EXISTS referidos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referente_id      uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  referido_id       uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  codigo_usado      text NOT NULL,
  credito_otorgado  numeric(10,2) DEFAULT 0,
  estado            text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'acreditado', 'cancelado')),
  creado_en         timestamptz DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_referidos_referente ON referidos(referente_id);
CREATE INDEX IF NOT EXISTS idx_referidos_codigo    ON referidos(codigo_usado);

-- El código único del usuario es: REPLACE(id::text, '-', '')[:8] en mayúsculas
-- Se genera en el cliente (JS) — no se almacena en la tabla usuarios

-- Permisos para el rol authenticated de Supabase
GRANT ALL ON referidos TO authenticated;

-- Vista opcional: resumen de referidos por usuario
CREATE OR REPLACE VIEW resumen_referidos AS
SELECT
  r.referente_id,
  u.nombre,
  u.apellido,
  COUNT(r.id)                          AS total_referidos,
  SUM(r.credito_otorgado)              AS credito_total,
  COUNT(r.id) FILTER (WHERE r.estado = 'acreditado') AS referidos_acreditados
FROM referidos r
JOIN usuarios u ON u.id = r.referente_id
GROUP BY r.referente_id, u.nombre, u.apellido;

GRANT SELECT ON resumen_referidos TO authenticated;
