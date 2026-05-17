-- C-3: Query manual — detectar operaciones con aprobación vencida (>48hs)
-- Ejecutar periódicamente en Supabase SQL Editor (o convertir a pg_cron en fase futura)

-- Ver operaciones expiradas (sin acción aún)
SELECT
  op.id,
  op.cliente_id,
  op.taller_id,
  op.total,
  op.credito_aplicado,
  op.created_at,
  NOW() - op.created_at AS tiempo_transcurrido
FROM cat_operaciones_b2c op
WHERE op.pendiente_aprobacion_taller = TRUE
  AND op.mp_status = 'approved'
  AND op.created_at < NOW() - INTERVAL '48 hours'
ORDER BY op.created_at ASC;

-- Auto-rechazar operaciones expiradas (devolver crédito wallet si corresponde)
-- PRECAUCIÓN: ejecutar solo tras revisar el SELECT anterior
DO $$
DECLARE
  op RECORD;
BEGIN
  FOR op IN
    SELECT id, cliente_id, credito_aplicado
    FROM cat_operaciones_b2c
    WHERE pendiente_aprobacion_taller = TRUE
      AND mp_status = 'approved'
      AND created_at < NOW() - INTERVAL '48 hours'
  LOOP
    -- Marcar como rechazada por tiempo
    UPDATE cat_operaciones_b2c
    SET estado = 'cancelado',
        pendiente_aprobacion_taller = FALSE,
        notas = COALESCE(notas::jsonb, '{}'::jsonb) || '{"rechazo_automatico": true}'::jsonb,
        updated_at = NOW()
    WHERE id = op.id;

    -- Revertir wallet si había crédito aplicado
    IF COALESCE(op.credito_aplicado, 0) > 0 THEN
      PERFORM wallet_movimiento(
        op.cliente_id,
        'reversion',
        op.credito_aplicado,
        'Reversión automática — taller no aprobó en 48hs (op #' || LEFT(op.id::text, 8) || ')',
        op.id
      );
    END IF;

    RAISE NOTICE 'Op % rechazada automáticamente', op.id;
  END LOOP;
END $$;
