-- ============================================================
-- Workstream B + C — DDL
-- Aplicar en Supabase SQL Editor en orden
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. Columnas nuevas en cat_vehiculo_trabajos
--    (necesarias antes de crear el trigger)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE cat_vehiculo_trabajos
  ADD COLUMN IF NOT EXISTS taller_externo_nombre    TEXT,
  ADD COLUMN IF NOT EXISTS taller_externo_telefono  TEXT,
  ADD COLUMN IF NOT EXISTS taller_externo_direccion TEXT,
  ADD COLUMN IF NOT EXISTS taller_externo_localidad TEXT,
  ADD COLUMN IF NOT EXISTS servicio_codigo          TEXT, -- alias legible del servicio_id
  ADD COLUMN IF NOT EXISTS taller_externo_id        UUID; -- se llena por trigger

-- Ampliar el CHECK de origen para incluir 'taller_externo'
-- (PostgreSQL requiere DROP + ADD para modificar CHECK inline)
ALTER TABLE cat_vehiculo_trabajos DROP CONSTRAINT IF EXISTS cat_vehiculo_trabajos_origen_check;
ALTER TABLE cat_vehiculo_trabajos
  ADD CONSTRAINT cat_vehiculo_trabajos_origen_check
    CHECK (origen IN ('manual','or','turno','taller_externo'));

-- ─────────────────────────────────────────────────────────────
-- WORKSTREAM B — Validación de servicios por taller
-- ─────────────────────────────────────────────────────────────
ALTER TABLE cat_taller_servicios
  ADD COLUMN IF NOT EXISTS estado_validacion TEXT NOT NULL DEFAULT 'auto_declarado'
    CHECK (estado_validacion IN ('auto_declarado','en_revision','aprobado','suspendido')),
  ADD COLUMN IF NOT EXISTS fecha_solicitud   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS fecha_aprobacion  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_suspension  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aprobado_por      TEXT,
  ADD COLUMN IF NOT EXISTS motivo_estado     TEXT,
  ADD COLUMN IF NOT EXISTS documentacion_url TEXT,
  ADD COLUMN IF NOT EXISTS notas_admin       TEXT;

-- Auto-aprobar talleres del Paquete Beta para sus servicios actuales
UPDATE cat_taller_servicios
SET estado_validacion = 'aprobado',
    fecha_aprobacion  = NOW(),
    aprobado_por      = 'Sistema (Paquete Beta)',
    motivo_estado     = 'Aprobación automática para talleres del Paquete Beta'
WHERE taller_id IN (
  SELECT id FROM cat_recomendaciones_talleres
  WHERE nombre ILIKE ANY(ARRAY['%Franzoni%','%Ingrao%','%NWK%','%Nowak%','%Caferata%'])
);

CREATE INDEX IF NOT EXISTS idx_taller_servicios_estado ON cat_taller_servicios(estado_validacion);

-- ─────────────────────────────────────────────────────────────
-- WORKSTREAM C — Talleres externos capturados
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_talleres_externos_capturados (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  TEXT NOT NULL,
  telefono_normalizado    TEXT,
  telefono_raw            TEXT,
  direccion               TEXT,
  localidad               TEXT,
  cantidad_menciones      INTEGER DEFAULT 1,
  primer_avistamiento     TIMESTAMPTZ DEFAULT NOW(),
  ultimo_avistamiento     TIMESTAMPTZ DEFAULT NOW(),
  estado_comercial        TEXT NOT NULL DEFAULT 'detectado'
    CHECK (estado_comercial IN ('detectado','pre_contacto','contactado','interesado','negociando','onboarded','rechazado','descartado')),
  primer_contacto_fecha   TIMESTAMPTZ,
  ultima_actividad_fecha  TIMESTAMPTZ,
  responsable_comercial   TEXT,
  notas_comerciales       TEXT,
  motivo_descarte         TEXT,
  taller_red_id           UUID REFERENCES cat_recomendaciones_talleres(id) ON DELETE SET NULL,
  fecha_onboarding        TIMESTAMPTZ,
  servicios_mencionados   JSONB DEFAULT '[]',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_talleres_ext_tel       ON cat_talleres_externos_capturados(telefono_normalizado);
CREATE INDEX IF NOT EXISTS idx_talleres_ext_estado    ON cat_talleres_externos_capturados(estado_comercial);
CREATE INDEX IF NOT EXISTS idx_talleres_ext_menciones ON cat_talleres_externos_capturados(cantidad_menciones DESC);

-- FK desde trabajos al taller externo
ALTER TABLE cat_vehiculo_trabajos
  ADD CONSTRAINT fk_trabajo_taller_externo
    FOREIGN KEY (taller_externo_id)
    REFERENCES cat_talleres_externos_capturados(id)
    ON DELETE SET NULL
  NOT VALID; -- NO VALID para no bloquear si hay filas existentes (se valida en background)

-- RLS
ALTER TABLE cat_talleres_externos_capturados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talleres_externos_admin_all" ON cat_talleres_externos_capturados
  FOR ALL TO authenticated USING (TRUE);

-- ─────────────────────────────────────────────────────────────
-- Función: normalizar teléfono
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION normalizar_telefono(tel TEXT)
RETURNS TEXT AS $$
BEGIN
  IF tel IS NULL THEN RETURN NULL; END IF;
  RETURN regexp_replace(tel, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─────────────────────────────────────────────────────────────
-- Trigger: capturar taller externo al insertar trabajo
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_capturar_taller_externo()
RETURNS TRIGGER AS $$
DECLARE
  v_tel_norm         TEXT;
  v_taller_externo_id UUID;
  v_servicio         TEXT;
BEGIN
  IF NEW.origen != 'taller_externo' OR NEW.taller_externo_telefono IS NULL THEN
    RETURN NEW;
  END IF;

  v_tel_norm := normalizar_telefono(NEW.taller_externo_telefono);
  v_servicio := COALESCE(NEW.servicio_codigo, NEW.servicio_id, 'general');

  SELECT id INTO v_taller_externo_id
  FROM cat_talleres_externos_capturados
  WHERE telefono_normalizado = v_tel_norm
  LIMIT 1;

  IF v_taller_externo_id IS NOT NULL THEN
    UPDATE cat_talleres_externos_capturados
    SET
      cantidad_menciones    = cantidad_menciones + 1,
      ultimo_avistamiento   = NOW(),
      servicios_mencionados = CASE
        WHEN servicios_mencionados @> to_jsonb(v_servicio) THEN servicios_mencionados
        ELSE servicios_mencionados || to_jsonb(v_servicio)
      END,
      updated_at = NOW()
    WHERE id = v_taller_externo_id;
  ELSE
    INSERT INTO cat_talleres_externos_capturados (
      nombre, telefono_normalizado, telefono_raw,
      direccion, localidad, servicios_mencionados
    ) VALUES (
      COALESCE(NEW.taller_externo_nombre, 'Taller sin nombre'),
      v_tel_norm,
      NEW.taller_externo_telefono,
      NEW.taller_externo_direccion,
      NEW.taller_externo_localidad,
      to_jsonb(ARRAY[v_servicio])
    ) RETURNING id INTO v_taller_externo_id;
  END IF;

  NEW.taller_externo_id := v_taller_externo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_capturar_taller_externo ON cat_vehiculo_trabajos;
CREATE TRIGGER trg_capturar_taller_externo
  BEFORE INSERT ON cat_vehiculo_trabajos
  FOR EACH ROW
  EXECUTE FUNCTION fn_capturar_taller_externo();
