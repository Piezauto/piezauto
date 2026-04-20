-- =====================================================
--  Piezauto — Tabla de cupones de descuento
-- =====================================================

CREATE TABLE IF NOT EXISTS cupones (
  id                   UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo               TEXT         NOT NULL UNIQUE,
  descripcion          TEXT,
  tipo                 TEXT         NOT NULL CHECK (tipo IN ('porcentaje', 'fijo')),
  descuento_porcentaje NUMERIC(5,2),   -- p. ej. 15.00 = 15%  (solo cuando tipo='porcentaje')
  descuento_fijo       NUMERIC(10,2),  -- monto en pesos ARS   (solo cuando tipo='fijo')
  activo               BOOLEAN      NOT NULL DEFAULT true,
  fecha_vencimiento    TIMESTAMPTZ,    -- NULL = sin vencimiento
  usos_maximos         INTEGER,        -- NULL = usos ilimitados
  usos_actuales        INTEGER      NOT NULL DEFAULT 0,
  creado_en            TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cupones_codigo ON cupones (UPPER(codigo));

-- Row Level Security (desactivado para admin; ajustar según política)
-- ALTER TABLE cupones ENABLE ROW LEVEL SECURITY;

-- Ejemplos comentados para producción
-- INSERT INTO cupones (codigo, descripcion, tipo, descuento_porcentaje, activo, usos_maximos)
-- VALUES ('BIENVENIDO10', '10% de descuento para nuevos clientes', 'porcentaje', 10.00, true, 200);

-- INSERT INTO cupones (codigo, descripcion, tipo, descuento_fijo, activo)
-- VALUES ('ENVIOGRATIS', 'Envío gratis — campaña verano', 'fijo', 2500.00, true);
