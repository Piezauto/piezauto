-- C-2: Función de libro mayor del wallet (cat_creditos_clientes)
-- Ejecutar en Supabase SQL Editor

CREATE OR REPLACE FUNCTION wallet_movimiento(
  p_cliente_id uuid,
  p_tipo text,
  p_monto numeric,
  p_concepto text,
  p_operacion_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_actual numeric;
  v_saldo_nuevo numeric;
  v_mov_id uuid;
BEGIN
  IF p_tipo NOT IN ('credito', 'debito', 'reversion') THEN
    RAISE EXCEPTION 'Tipo inválido. Usar: credito, debito, reversion';
  END IF;

  SELECT credito_saldo INTO v_saldo_actual
  FROM cat_clientes_finales WHERE id = p_cliente_id FOR UPDATE;

  IF v_saldo_actual IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado: %', p_cliente_id;
  END IF;

  IF p_tipo IN ('credito', 'reversion') THEN
    v_saldo_nuevo := v_saldo_actual + p_monto;
  ELSE
    IF v_saldo_actual < p_monto THEN
      RAISE EXCEPTION 'Saldo insuficiente. Actual: %, requerido: %', v_saldo_actual, p_monto;
    END IF;
    v_saldo_nuevo := v_saldo_actual - p_monto;
  END IF;

  INSERT INTO cat_creditos_clientes (cliente_id, operacion_id, tipo, monto, concepto, saldo_post)
  VALUES (p_cliente_id, p_operacion_id, p_tipo, p_monto, p_concepto, v_saldo_nuevo)
  RETURNING id INTO v_mov_id;

  UPDATE cat_clientes_finales
  SET credito_saldo = v_saldo_nuevo, updated_at = NOW()
  WHERE id = p_cliente_id;

  RETURN v_mov_id;
END;
$$;

GRANT EXECUTE ON FUNCTION wallet_movimiento(uuid, text, numeric, text, uuid) TO authenticated;

-- También otorgar a service_role para que el webhook del Worker pueda llamarla
GRANT EXECUTE ON FUNCTION wallet_movimiento(uuid, text, numeric, text, uuid) TO service_role;
