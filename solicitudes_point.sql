-- ============================================================
-- SOLICITUDES PARA UNIRSE A LA RED PIEZAUTO POINT
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitudes_point (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_taller       TEXT        NOT NULL,
  nombre_dueno        TEXT        NOT NULL,
  telefono            TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  localidad           TEXT        NOT NULL,
  cantidad_empleados  INTEGER,
  especialidades      TEXT[]      DEFAULT '{}',
  mensaje             TEXT,
  estado              TEXT        NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'contactado', 'aprobado', 'rechazado')),
  notas_internas      TEXT,
  creado_en           TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitudes_point_estado ON solicitudes_point(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_point_email  ON solicitudes_point(email);
CREATE INDEX IF NOT EXISTS idx_solicitudes_point_fecha  ON solicitudes_point(creado_en DESC);

-- Especialidades posibles (referencia):
-- 'mecanica_general', 'chapa_pintura', 'electricidad', 'gomeria',
-- 'aire_acondicionado', 'transmision', 'frenos', 'suspension',
-- 'computacion_automotriz', 'alineacion_balanceo'

COMMENT ON TABLE solicitudes_point IS
  'Solicitudes de talleres que quieren unirse a la red Piezauto Point';
COMMENT ON COLUMN solicitudes_point.estado IS
  'pendiente=nuevo | contactado=en proceso | aprobado=listo | rechazado=no apto';
