-- ═══════════════════════════════════════════════════════════════════
-- SISTEMA DE TURNOS — DDL v1
-- CTO — 13 de mayo de 2026
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── PASO 0: ALTER tabla notificaciones ──────────────────────────────
-- operacion_id era NOT NULL — necesita ser nullable para notif de turnos
-- turno_id nuevo campo para vincular notificaciones a turnos

ALTER TABLE cat_notificaciones_talleres
  ALTER COLUMN operacion_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES cat_turnos(id) ON DELETE SET NULL;

-- Nota: el campo tipo no tiene CHECK constraint, se usan los nuevos
-- valores 'turno_confirmado','turno_cancelado','progreso_actualizado',
-- 'turno_finalizado' sin necesidad de ALTER adicional.

-- ── PASO 1: cat_turnos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_turnos (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id                       UUID        NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  cliente_id                      UUID        REFERENCES cat_clientes_finales(id) ON DELETE SET NULL,
  operacion_id                    UUID        REFERENCES cat_operaciones_b2c(id) ON DELETE SET NULL,
  presupuesto_id                  UUID        REFERENCES cat_taller_presupuestos(id) ON DELETE SET NULL,
  tipo                            TEXT        NOT NULL CHECK (tipo IN ('inspeccion_presupuesto','inicio_trabajo','consulta','reclamo')),
  estado                          TEXT        NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','en_proceso','finalizado','cancelado')),
  fecha                           DATE        NOT NULL,
  hora_inicio                     TIME        NOT NULL,
  hora_fin                        TIME        NOT NULL,
  motivo                          TEXT,
  notas_taller                    TEXT,
  notas_cliente                   TEXT,
  nombre_cliente                  TEXT,
  telefono_cliente                TEXT,
  vehiculo_marca                  TEXT,
  vehiculo_modelo                 TEXT,
  vehiculo_anio                   INTEGER,
  vehiculo_dominio                TEXT,
  calificacion_taller_al_cliente  INTEGER     CHECK (calificacion_taller_al_cliente BETWEEN 1 AND 5),
  calificacion_cliente_al_taller  INTEGER     CHECK (calificacion_cliente_al_taller BETWEEN 1 AND 5),
  resena_cliente                  TEXT,
  resena_taller                   TEXT,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_taller_fecha ON cat_turnos(taller_id, fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_cliente ON cat_turnos(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON cat_turnos(taller_id, estado);

-- ── PASO 2: cat_turno_progreso ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_turno_progreso (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id    UUID        NOT NULL REFERENCES cat_turnos(id) ON DELETE CASCADE,
  estado      TEXT        NOT NULL CHECK (estado IN ('recepcionado','en_diagnostico','esperando_piezas','en_reparacion','control_calidad','listo_entrega','entregado')),
  descripcion TEXT,
  imagen_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progreso_turno ON cat_turno_progreso(turno_id, created_at DESC);

-- ── PASO 3: cat_taller_disponibilidad ───────────────────────────────
CREATE TABLE IF NOT EXISTS cat_taller_disponibilidad (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id        UUID    NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  dia_semana       INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  tipo_turno       TEXT    NOT NULL CHECK (tipo_turno IN ('inspeccion_presupuesto','inicio_trabajo','consulta','reclamo')),
  hora_inicio      TIME    NOT NULL,
  hora_fin         TIME    NOT NULL,
  duracion_minutos INTEGER NOT NULL DEFAULT 60,
  capacidad_max    INTEGER NOT NULL DEFAULT 1,
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(taller_id, dia_semana, tipo_turno)
);

-- ── PASO 4: cat_taller_bloqueos ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_taller_bloqueos (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id   UUID    NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  fecha       DATE    NOT NULL,
  tipo_turno  TEXT    CHECK (tipo_turno IN ('inspeccion_presupuesto','inicio_trabajo','consulta','reclamo')),
  motivo      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(taller_id, fecha, tipo_turno)
);

-- ── PASO 5: RLS ─────────────────────────────────────────────────────
ALTER TABLE cat_turnos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_turno_progreso      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_taller_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_taller_bloqueos     ENABLE ROW LEVEL SECURITY;

-- cat_turnos — taller
CREATE POLICY "taller_turnos_select" ON cat_turnos
  FOR SELECT USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "taller_turnos_update" ON cat_turnos
  FOR UPDATE USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "taller_turnos_insert" ON cat_turnos
  FOR INSERT WITH CHECK (auth_is_taller() AND taller_id = auth_taller_id());

-- cat_turnos — cliente ve y solicita los suyos
CREATE POLICY "cliente_turnos_select" ON cat_turnos
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()));
CREATE POLICY "cliente_turnos_insert" ON cat_turnos
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id IN (SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid())
              OR cliente_id IS NULL);  -- invitados sin cuenta pueden solicitar con datos manuales

-- cat_turno_progreso
CREATE POLICY "taller_progreso_all" ON cat_turno_progreso
  FOR ALL USING (turno_id IN (SELECT id FROM cat_turnos WHERE taller_id = auth_taller_id()));
CREATE POLICY "cliente_progreso_select" ON cat_turno_progreso
  FOR SELECT TO authenticated
  USING (turno_id IN (
    SELECT id FROM cat_turnos WHERE cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  ));

-- cat_taller_disponibilidad — taller gestiona, público lee
CREATE POLICY "taller_disponibilidad_all" ON cat_taller_disponibilidad
  FOR ALL USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "public_disponibilidad_select" ON cat_taller_disponibilidad
  FOR SELECT TO anon, authenticated USING (TRUE);

-- cat_taller_bloqueos
CREATE POLICY "taller_bloqueos_all" ON cat_taller_bloqueos
  FOR ALL USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "public_bloqueos_select" ON cat_taller_bloqueos
  FOR SELECT TO anon, authenticated USING (TRUE);

-- ── PASO 6: VERIFICACIÓN ─────────────────────────────────────────────
SELECT table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS columnas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'cat_turnos',
    'cat_turno_progreso',
    'cat_taller_disponibilidad',
    'cat_taller_bloqueos'
  )
ORDER BY table_name;
-- Esperado: 4 filas
