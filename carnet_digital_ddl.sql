-- ============================================================
-- Carnet Digital del Vehículo — DDL
-- Aplicar en Supabase SQL Editor (dashboard.supabase.com)
-- Orden: ejecutar bloque por bloque o todo junto
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. cat_servicios_catalogo — tipos de servicio disponibles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_servicios_catalogo (
  id     TEXT PRIMARY KEY,
  nombre TEXT    NOT NULL,
  icono  TEXT,
  orden  INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- 2. cat_taller_servicios — servicios habilitados por taller
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_taller_servicios (
  taller_id   UUID REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  servicio_id TEXT REFERENCES cat_servicios_catalogo(id)       ON DELETE CASCADE,
  PRIMARY KEY (taller_id, servicio_id)
);

-- ─────────────────────────────────────────────────────────────
-- 3. cat_clientes_vehiculos — vehículos registrados por cliente
--    (tabla ya existe; agregar columnas si faltan)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_clientes_vehiculos (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id  UUID    REFERENCES cat_clientes_finales(id) ON DELETE CASCADE,
  marca       TEXT    NOT NULL,
  modelo      TEXT    NOT NULL,
  anio        INTEGER,
  patente     TEXT,
  vin         TEXT,
  km_actual   INTEGER DEFAULT 0,
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cat_clientes_vehiculos
  ADD COLUMN IF NOT EXISTS patente  TEXT,
  ADD COLUMN IF NOT EXISTS vin      TEXT,
  ADD COLUMN IF NOT EXISTS km_actual INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color    TEXT;

-- ─────────────────────────────────────────────────────────────
-- 4. cat_vehiculo_trabajos — historial de trabajos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_vehiculo_trabajos (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  vehiculo_id  UUID    REFERENCES cat_clientes_vehiculos(id) ON DELETE CASCADE,
  taller_id    UUID    REFERENCES cat_recomendaciones_talleres(id),
  or_id        UUID    REFERENCES cat_ordenes_reparacion(id),
  servicio_id  TEXT    REFERENCES cat_servicios_catalogo(id),
  descripcion  TEXT    NOT NULL,
  fecha        DATE    NOT NULL DEFAULT CURRENT_DATE,
  km_registrado INTEGER,
  notas        TEXT,
  origen       TEXT    DEFAULT 'manual' CHECK (origen IN ('manual','or','turno')),
  aprobado     BOOLEAN DEFAULT false,
  aprobado_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 5. cat_vehiculo_documentos — VTV, seguro, patente, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_vehiculo_documentos (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  vehiculo_id UUID    REFERENCES cat_clientes_vehiculos(id) ON DELETE CASCADE,
  tipo        TEXT    NOT NULL CHECK (tipo IN ('vtv','seguro','patente','otro')),
  nombre      TEXT    NOT NULL,
  url         TEXT,
  vence_at    DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 6. cat_recordatorios — definición de recordatorios
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_recordatorios (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  vehiculo_id    UUID    REFERENCES cat_clientes_vehiculos(id) ON DELETE CASCADE,
  cliente_id     UUID    REFERENCES cat_clientes_finales(id)   ON DELETE CASCADE,
  tipo           TEXT    NOT NULL CHECK (tipo IN ('km','fecha','vtv','seguro','aceite','general')),
  titulo         TEXT    NOT NULL,
  descripcion    TEXT,
  km_trigger     INTEGER,
  fecha_trigger  DATE,
  canal          TEXT    DEFAULT 'app' CHECK (canal IN ('app','whatsapp','email')),
  activo         BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 7. cat_recordatorios_log — log de recordatorios enviados
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_recordatorios_log (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  recordatorio_id UUID    REFERENCES cat_recordatorios(id) ON DELETE CASCADE,
  estado          TEXT    DEFAULT 'simulado' CHECK (estado IN ('simulado','enviado','error')),
  canal           TEXT,
  enviado_at      TIMESTAMPTZ DEFAULT now(),
  detalle         TEXT
);

-- ─────────────────────────────────────────────────────────────
-- 8. Preferencias en cat_clientes_finales
-- ─────────────────────────────────────────────────────────────
ALTER TABLE cat_clientes_finales
  ADD COLUMN IF NOT EXISTS autoaprobar_trabajos BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_canal          TEXT    DEFAULT 'app';

-- ─────────────────────────────────────────────────────────────
-- 9. INSERT — 13 servicios del catálogo
-- ─────────────────────────────────────────────────────────────
INSERT INTO cat_servicios_catalogo (id, nombre, icono, orden) VALUES
  ('aceite',         'Cambio de aceite',           '🛢️',  1),
  ('frenos',         'Frenos',                     '🔴',  2),
  ('amortiguadores', 'Amortiguadores',              '🔧',  3),
  ('neumaticos',     'Neumáticos',                  '🛞',  4),
  ('bateria',        'Batería',                     '🔋',  5),
  ('filtros',        'Filtros (aire/combustible)',  '🌬️',  6),
  ('correa',         'Correa de distribución',      '⚙️',  7),
  ('embrague',       'Embrague',                    '🚗',  8),
  ('electrico',      'Eléctrico / alternador',      '⚡',  9),
  ('suspension',     'Suspensión',                  '🏎️', 10),
  ('escape',         'Escape / caño de escape',     '💨', 11),
  ('vtv',            'VTV / inspección técnica',    '📋', 12),
  ('general',        'Servicio general',            '🔩', 13)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. RLS — habilitar y políticas básicas
-- ─────────────────────────────────────────────────────────────

ALTER TABLE cat_servicios_catalogo       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_taller_servicios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_clientes_vehiculos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_vehiculo_trabajos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_vehiculo_documentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_recordatorios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_recordatorios_log        ENABLE ROW LEVEL SECURITY;

-- Servicios catálogo: lectura pública
CREATE POLICY "servicios_select_all" ON cat_servicios_catalogo
  FOR SELECT USING (true);

-- Taller servicios: lectura pública; escritura solo autenticados
CREATE POLICY "taller_servicios_select_all" ON cat_taller_servicios
  FOR SELECT USING (true);
CREATE POLICY "taller_servicios_write_auth" ON cat_taller_servicios
  FOR ALL USING (auth.role() = 'authenticated');

-- Vehículos: cada cliente ve solo los suyos
CREATE POLICY "vehiculos_select_own" ON cat_clientes_vehiculos
  FOR SELECT USING (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );
CREATE POLICY "vehiculos_insert_own" ON cat_clientes_vehiculos
  FOR INSERT WITH CHECK (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );
CREATE POLICY "vehiculos_update_own" ON cat_clientes_vehiculos
  FOR UPDATE USING (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );
CREATE POLICY "vehiculos_delete_own" ON cat_clientes_vehiculos
  FOR DELETE USING (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );

-- Trabajos: lectura/escritura para dueño del vehículo
CREATE POLICY "trabajos_select_own" ON cat_vehiculo_trabajos
  FOR SELECT USING (
    vehiculo_id IN (
      SELECT cv.id FROM cat_clientes_vehiculos cv
      JOIN cat_clientes_finales cf ON cf.id = cv.cliente_id
      WHERE cf.auth_user_id = auth.uid()
    )
  );
CREATE POLICY "trabajos_insert_own" ON cat_vehiculo_trabajos
  FOR INSERT WITH CHECK (
    vehiculo_id IN (
      SELECT cv.id FROM cat_clientes_vehiculos cv
      JOIN cat_clientes_finales cf ON cf.id = cv.cliente_id
      WHERE cf.auth_user_id = auth.uid()
    )
  );

-- Documentos: igual que trabajos
CREATE POLICY "documentos_select_own" ON cat_vehiculo_documentos
  FOR SELECT USING (
    vehiculo_id IN (
      SELECT cv.id FROM cat_clientes_vehiculos cv
      JOIN cat_clientes_finales cf ON cf.id = cv.cliente_id
      WHERE cf.auth_user_id = auth.uid()
    )
  );
CREATE POLICY "documentos_insert_own" ON cat_vehiculo_documentos
  FOR INSERT WITH CHECK (
    vehiculo_id IN (
      SELECT cv.id FROM cat_clientes_vehiculos cv
      JOIN cat_clientes_finales cf ON cf.id = cv.cliente_id
      WHERE cf.auth_user_id = auth.uid()
    )
  );
CREATE POLICY "documentos_delete_own" ON cat_vehiculo_documentos
  FOR DELETE USING (
    vehiculo_id IN (
      SELECT cv.id FROM cat_clientes_vehiculos cv
      JOIN cat_clientes_finales cf ON cf.id = cv.cliente_id
      WHERE cf.auth_user_id = auth.uid()
    )
  );

-- Recordatorios: dueño del vehículo
CREATE POLICY "recordatorios_select_own" ON cat_recordatorios
  FOR SELECT USING (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );
CREATE POLICY "recordatorios_insert_own" ON cat_recordatorios
  FOR INSERT WITH CHECK (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );
CREATE POLICY "recordatorios_update_own" ON cat_recordatorios
  FOR UPDATE USING (
    cliente_id IN (
      SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
    )
  );

-- Log recordatorios: solo lectura para autenticados
CREATE POLICY "recordatorios_log_select" ON cat_recordatorios_log
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "recordatorios_log_insert_auth" ON cat_recordatorios_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
