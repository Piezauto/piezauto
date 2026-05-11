-- Fase 3 — DDL upgrade (ejecutar en Supabase SQL Editor)
-- Mejora la integridad relacional del flujo checkout + taller.
-- El checkout Fase 3 funciona SIN este DDL (usa notas JSON como fallback).
-- Aplicar antes de Fase 4 (panel de talleres).

-- ── 1. Columnas nuevas en cat_operaciones_b2c ──────────────────────

ALTER TABLE cat_operaciones_b2c
  ADD COLUMN IF NOT EXISTS taller_id UUID REFERENCES cat_recomendaciones_talleres(id),
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'manual' CHECK (metodo_pago IN ('manual','efectivo','mercadopago','debito')),
  ADD COLUMN IF NOT EXISTS pendiente_aprobacion_taller BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Tabla cat_notificaciones_talleres ──────────────────────────

CREATE TABLE IF NOT EXISTS cat_notificaciones_talleres (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id    UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id),
  operacion_id UUID NOT NULL REFERENCES cat_operaciones_b2c(id),
  tipo         TEXT NOT NULL DEFAULT 'nueva_operacion',
  mensaje      TEXT,
  leida        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_taller_leida ON cat_notificaciones_talleres (taller_id, leida);
CREATE INDEX IF NOT EXISTS idx_notif_operacion    ON cat_notificaciones_talleres (operacion_id);

ALTER TABLE cat_notificaciones_talleres ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS para cat_notificaciones_talleres ────────────────────────
-- (Solo el admin ve todas — los talleres no tienen auth propio aún)

CREATE POLICY "admin lee todas las notificaciones"
ON cat_notificaciones_talleres FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY "sistema inserta notificaciones"
ON cat_notificaciones_talleres FOR INSERT TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "admin actualiza notificaciones"
ON cat_notificaciones_talleres FOR UPDATE TO authenticated
USING (TRUE);

-- ── 4. RLS para cat_creditos_clientes ─────────────────────────────

ALTER TABLE cat_creditos_clientes ENABLE ROW LEVEL SECURITY;

-- El cliente ve solo sus propios créditos
CREATE POLICY "cliente ve sus creditos"
ON cat_creditos_clientes FOR SELECT TO authenticated
USING (
  cliente_id IN (
    SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
  )
);

-- Inserción solo desde el panel admin (autenticado con session de admin Supabase)
-- Para producción: reemplazar por una Edge Function con service_role
CREATE POLICY "admin inserta creditos"
ON cat_creditos_clientes FOR INSERT TO authenticated
WITH CHECK (TRUE);

-- Service role siempre tiene acceso completo (bypass RLS)

-- ── 5. Migrar notas JSON → columnas propias (opcional, Fase 4) ──────
-- Ejecutar SOLO después de que el código use las nuevas columnas:
--
-- UPDATE cat_operaciones_b2c
-- SET
--   metodo_pago = (notas::jsonb ->> 'metodo_pago'),
--   taller_id   = (
--     SELECT id FROM cat_recomendaciones_talleres
--     WHERE id::text = (notas::jsonb -> 'taller' ->> 'id')
--     LIMIT 1
--   )
-- WHERE notas IS NOT NULL AND notas != '' AND notas != '{}';
