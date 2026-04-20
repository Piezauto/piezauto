-- Agregar campo puntos_acumulados a la tabla usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS puntos_acumulados INT NOT NULL DEFAULT 0;

-- Historial de movimientos de puntos (para transparencia)
CREATE TABLE IF NOT EXISTS puntos_historial (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pedido_id   UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('acumulacion', 'canje')),
  puntos      INT NOT NULL,  -- positivo = acumula, negativo = canje
  descripcion TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puntos_hist_usuario ON puntos_historial (usuario_id);
CREATE INDEX IF NOT EXISTS idx_puntos_hist_pedido  ON puntos_historial (pedido_id);

ALTER TABLE puntos_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_select_own" ON puntos_historial FOR SELECT USING (true);
CREATE POLICY "ph_all_auth"   ON puntos_historial FOR ALL    USING (true);

-- Reglas de conversión (referencia, no se almacenan en la DB):
--   Acumulación : $100 de compra = 1 punto
--   Canje       : 100 puntos = $500 de descuento

-- Ejemplo: inicializar puntos de usuarios existentes según sus pedidos
-- (ejecutar manualmente si querés retroactividad)
-- UPDATE usuarios u
-- SET puntos_acumulados = COALESCE((
--   SELECT FLOOR(SUM(p.total) / 100)
--   FROM pedidos p
--   WHERE p.email_cliente = u.email
--     AND p.estado NOT IN ('cancelado')
-- ), 0);
