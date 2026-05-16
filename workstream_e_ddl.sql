-- =============================================================
-- WORKSTREAM E — Wallet Piezauto (créditos + cashback + referidos)
-- Aplicar en Supabase SQL Editor
-- =============================================================

-- ─── 1. Wallet B2C ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_wallet_b2c (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES cat_clientes_finales(id) ON DELETE CASCADE,
  saldo         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  total_ganado  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_usado   NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cliente_id)
);

-- ─── 2. Movimientos wallet ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_wallet_movimientos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     UUID NOT NULL REFERENCES cat_wallet_b2c(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES cat_clientes_finales(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('credito','debito','vencimiento','ajuste')),
  concepto      TEXT NOT NULL,
  monto         NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  operacion_id  UUID REFERENCES cat_operaciones_b2c(id) ON DELETE SET NULL,
  vence_at      TIMESTAMPTZ,
  usado_at      TIMESTAMPTZ,
  saldo_post    NUMERIC(12,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_mov_cliente ON cat_wallet_movimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_wallet_mov_wallet  ON cat_wallet_movimientos(wallet_id);

-- ─── 3. Referidos de talleres ─────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_referidos_talleres (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id            UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  cliente_referente_id UUID REFERENCES cat_clientes_finales(id) ON DELETE SET NULL,
  estado               TEXT NOT NULL DEFAULT 'nuevo'
                         CHECK (estado IN ('nuevo','contactado','primera_compra','activo','inactivo')),
  monto_primera_compra NUMERIC(12,2),
  credito_generado     NUMERIC(12,2),
  credito_otorgado_at  TIMESTAMPTZ,
  notas                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referidos_taller  ON cat_referidos_talleres(taller_id);
CREATE INDEX IF NOT EXISTS idx_referidos_estado  ON cat_referidos_talleres(estado);

-- ─── 4. Función: aplicar movimiento wallet (atómico) ──────────
CREATE OR REPLACE FUNCTION fn_aplicar_movimiento_wallet(
  p_cliente_id  UUID,
  p_tipo        TEXT,
  p_concepto    TEXT,
  p_monto       NUMERIC,
  p_operacion_id UUID DEFAULT NULL,
  p_vence_at    TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wallet_id  UUID;
  v_saldo_post NUMERIC;
  v_mov_id     UUID;
BEGIN
  -- Obtener o crear wallet
  INSERT INTO cat_wallet_b2c(cliente_id)
    VALUES (p_cliente_id)
    ON CONFLICT (cliente_id) DO NOTHING;

  SELECT id INTO v_wallet_id FROM cat_wallet_b2c WHERE cliente_id = p_cliente_id;

  -- Lock fila
  PERFORM id FROM cat_wallet_b2c WHERE id = v_wallet_id FOR UPDATE;

  IF p_tipo IN ('credito','ajuste') THEN
    UPDATE cat_wallet_b2c
       SET saldo        = saldo + p_monto,
           total_ganado = total_ganado + p_monto,
           updated_at   = now()
     WHERE id = v_wallet_id;
  ELSIF p_tipo = 'debito' THEN
    UPDATE cat_wallet_b2c
       SET saldo       = saldo - p_monto,
           total_usado = total_usado + p_monto,
           updated_at  = now()
     WHERE id = v_wallet_id;
  ELSIF p_tipo = 'vencimiento' THEN
    UPDATE cat_wallet_b2c
       SET saldo       = GREATEST(0, saldo - p_monto),
           updated_at  = now()
     WHERE id = v_wallet_id;
  END IF;

  SELECT saldo INTO v_saldo_post FROM cat_wallet_b2c WHERE id = v_wallet_id;

  INSERT INTO cat_wallet_movimientos(
    wallet_id, cliente_id, tipo, concepto, monto,
    operacion_id, vence_at, saldo_post
  ) VALUES (
    v_wallet_id, p_cliente_id, p_tipo, p_concepto, p_monto,
    p_operacion_id, p_vence_at, v_saldo_post
  ) RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;

-- ─── 5. Función: vencer créditos caducos ─────────────────────
CREATE OR REPLACE FUNCTION fn_vencer_creditos_caducos()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_mov RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_mov IN
    SELECT m.id, m.cliente_id, m.monto, m.wallet_id
      FROM cat_wallet_movimientos m
     WHERE m.tipo = 'credito'
       AND m.vence_at IS NOT NULL
       AND m.vence_at < now()
       AND m.usado_at IS NULL
  LOOP
    PERFORM fn_aplicar_movimiento_wallet(
      v_mov.cliente_id,
      'vencimiento',
      'Crédito vencido',
      v_mov.monto
    );

    UPDATE cat_wallet_movimientos SET usado_at = now() WHERE id = v_mov.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─── 6. Trigger: cashback 1% en cada operación B2C ───────────
CREATE OR REPLACE FUNCTION fn_trigger_cashback_operacion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cashback NUMERIC;
BEGIN
  -- Solo operaciones completadas/confirmadas con cliente
  IF NEW.estado NOT IN ('confirmado','pagado','entregado') THEN
    RETURN NEW;
  END IF;
  IF OLD.estado IN ('confirmado','pagado','entregado') THEN
    RETURN NEW;
  END IF;
  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_cashback := ROUND(NEW.total * 0.01, 2);
  IF v_cashback < 0.01 THEN
    RETURN NEW;
  END IF;

  PERFORM fn_aplicar_movimiento_wallet(
    NEW.cliente_id,
    'credito',
    'Cashback 1% — Operación #' || LEFT(NEW.id::TEXT, 8),
    v_cashback,
    NEW.id,
    now() + INTERVAL '12 months'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cashback_operacion ON cat_operaciones_b2c;
CREATE TRIGGER trg_cashback_operacion
  AFTER UPDATE ON cat_operaciones_b2c
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_cashback_operacion();

-- ─── 7. RLS ──────────────────────────────────────────────────
ALTER TABLE cat_wallet_b2c          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_wallet_movimientos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_referidos_talleres   ENABLE ROW LEVEL SECURITY;

-- Wallet: cada cliente ve solo su fila
CREATE POLICY wallet_select_own ON cat_wallet_b2c
  FOR SELECT USING (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );

-- Movimientos: cada cliente ve solo los suyos
CREATE POLICY wallet_mov_select_own ON cat_wallet_movimientos
  FOR SELECT USING (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );

-- Referidos: solo lectura anon (el taller puede verse)
CREATE POLICY referidos_select_all ON cat_referidos_talleres
  FOR SELECT USING (true);

-- ─── 8. Views útiles ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_wallet_resumen AS
SELECT
  w.id,
  w.cliente_id,
  cf.nombre || ' ' || cf.apellido AS cliente_nombre,
  cf.email,
  w.saldo,
  w.total_ganado,
  w.total_usado,
  (SELECT COUNT(*) FROM cat_wallet_movimientos m WHERE m.wallet_id = w.id AND m.tipo = 'credito') AS cant_creditos,
  (SELECT COUNT(*) FROM cat_wallet_movimientos m WHERE m.wallet_id = w.id AND m.tipo = 'debito')  AS cant_usos,
  w.updated_at
FROM cat_wallet_b2c w
JOIN cat_clientes_finales cf ON cf.id = w.cliente_id;

-- ─── 9. Columna wallet_usado en operaciones (si no existe) ───
ALTER TABLE cat_operaciones_b2c ADD COLUMN IF NOT EXISTS wallet_usado NUMERIC(12,2) DEFAULT 0;
