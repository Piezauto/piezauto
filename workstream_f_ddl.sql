-- =============================================================
-- WORKSTREAM F — Comparador de presupuestos por zona geográfica
-- Aplicar en Supabase SQL Editor
-- NOTA: Si cat_servicios_catalogo no existe, cambiar la línea
--   servicio_codigo TEXT REFERENCES cat_servicios_catalogo(id)
-- por:
--   servicio_codigo TEXT
-- =============================================================

-- ─── 1. Solicitudes de presupuesto abierto ───────────────────
CREATE TABLE IF NOT EXISTS cat_solicitudes_presupuesto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES cat_clientes_finales(id) ON DELETE CASCADE,
  vehiculo_id UUID REFERENCES cat_clientes_vehiculos(id) ON DELETE SET NULL,

  servicio_codigo TEXT,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fotos_urls JSONB DEFAULT '[]',

  zona_centro_lat NUMERIC,
  zona_centro_lng NUMERIC,
  zona_radio_km NUMERIC NOT NULL DEFAULT 5,
  zona_localidades TEXT[],
  direccion_referencia TEXT,

  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN (
    'abierta', 'recibiendo_presupuestos', 'cliente_decidio', 'cerrada_sin_respuestas', 'cancelada'
  )),

  talleres_notificados INTEGER DEFAULT 0,
  presupuestos_recibidos INTEGER DEFAULT 0,
  taller_elegido_id UUID REFERENCES cat_recomendaciones_talleres(id) ON DELETE SET NULL,
  presupuesto_elegido_id UUID,

  fecha_limite_respuesta TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  fecha_decision_cliente TIMESTAMPTZ,

  notas_cliente TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sol_pres_cliente ON cat_solicitudes_presupuesto(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sol_pres_estado  ON cat_solicitudes_presupuesto(estado);

-- ─── 2. Talleres notificados por solicitud ────────────────────
CREATE TABLE IF NOT EXISTS cat_solicitudes_talleres_notificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES cat_solicitudes_presupuesto(id) ON DELETE CASCADE,
  taller_id    UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,

  estado TEXT NOT NULL DEFAULT 'notificado' CHECK (estado IN (
    'notificado', 'visto', 'respondio', 'rechazo', 'expirado'
  )),

  distancia_km NUMERIC,
  notificado_at TIMESTAMPTZ DEFAULT NOW(),
  visto_at      TIMESTAMPTZ,
  respondio_at  TIMESTAMPTZ,

  UNIQUE(solicitud_id, taller_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_solicitud ON cat_solicitudes_talleres_notificados(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_notif_taller    ON cat_solicitudes_talleres_notificados(taller_id, estado);

-- ─── 3. Presupuestos enviados por talleres ────────────────────
CREATE TABLE IF NOT EXISTS cat_presupuestos_respuesta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES cat_solicitudes_presupuesto(id) ON DELETE CASCADE,
  taller_id    UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,

  monto_estimado_min NUMERIC NOT NULL,
  monto_estimado_max NUMERIC,
  incluye_iva BOOLEAN DEFAULT TRUE,

  descripcion_propuesta TEXT NOT NULL,
  detalles_items JSONB DEFAULT '[]',

  tiempo_estimado_dias INTEGER,
  fecha_disponibilidad DATE,

  validez_hasta DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
  notas TEXT,

  estado TEXT NOT NULL DEFAULT 'enviado' CHECK (estado IN (
    'enviado', 'visto_cliente', 'elegido', 'descartado', 'expirado'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(solicitud_id, taller_id)
);

CREATE INDEX IF NOT EXISTS idx_pres_resp_solicitud ON cat_presupuestos_respuesta(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_pres_resp_taller    ON cat_presupuestos_respuesta(taller_id);

-- ─── 4. Geo en talleres (si no existe) ───────────────────────
ALTER TABLE cat_recomendaciones_talleres
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC;

-- ─── 5. Función Haversine ─────────────────────────────────────
CREATE OR REPLACE FUNCTION calc_distancia_km(lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_dlat NUMERIC;
  v_dlng NUMERIC;
  v_a    NUMERIC;
  v_c    NUMERIC;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN RETURN NULL; END IF;
  v_dlat := RADIANS(lat2 - lat1);
  v_dlng := RADIANS(lng2 - lng1);
  v_a := SIN(v_dlat/2)^2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(v_dlng/2)^2;
  v_c := 2 * ATAN2(SQRT(v_a), SQRT(1 - v_a));
  RETURN ROUND(6371 * v_c, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 6. Talleres en zona ──────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_talleres_en_zona(
  p_lat NUMERIC, p_lng NUMERIC, p_radio_km NUMERIC,
  p_servicio_codigo TEXT DEFAULT NULL,
  p_max_resultados INTEGER DEFAULT 10
) RETURNS TABLE (
  taller_id UUID, nombre TEXT, localidad TEXT,
  distancia_km NUMERIC, tipo_establecimiento TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.nombre,
    t.localidad,
    calc_distancia_km(p_lat, p_lng, t.lat, t.lng) AS dist,
    t.tipo_establecimiento
  FROM cat_recomendaciones_talleres t
  WHERE t.activo = TRUE
    AND t.lat IS NOT NULL
    AND t.lng IS NOT NULL
    AND calc_distancia_km(p_lat, p_lng, t.lat, t.lng) <= p_radio_km
  ORDER BY dist ASC
  LIMIT p_max_resultados;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── 7. Trigger: notificar talleres al crear solicitud ────────
CREATE OR REPLACE FUNCTION fn_notificar_talleres_solicitud()
RETURNS TRIGGER AS $$
DECLARE
  v_taller RECORD;
  v_count  INTEGER := 0;
BEGIN
  IF NEW.zona_centro_lat IS NULL OR NEW.zona_centro_lng IS NULL THEN RETURN NEW; END IF;

  FOR v_taller IN
    SELECT * FROM fn_talleres_en_zona(
      NEW.zona_centro_lat, NEW.zona_centro_lng,
      NEW.zona_radio_km, NEW.servicio_codigo, 10
    )
  LOOP
    INSERT INTO cat_solicitudes_talleres_notificados (solicitud_id, taller_id, distancia_km)
    VALUES (NEW.id, v_taller.taller_id, v_taller.distancia_km)
    ON CONFLICT (solicitud_id, taller_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  UPDATE cat_solicitudes_presupuesto
  SET talleres_notificados = v_count,
      estado = CASE WHEN v_count > 0 THEN 'recibiendo_presupuestos' ELSE 'cerrada_sin_respuestas' END
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_talleres ON cat_solicitudes_presupuesto;
CREATE TRIGGER trg_notificar_talleres
  AFTER INSERT ON cat_solicitudes_presupuesto
  FOR EACH ROW EXECUTE FUNCTION fn_notificar_talleres_solicitud();

-- ─── 8. Trigger: contador de respuestas ──────────────────────
CREATE OR REPLACE FUNCTION fn_actualizar_contador_respuestas()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cat_solicitudes_presupuesto
  SET presupuestos_recibidos = (
    SELECT COUNT(*) FROM cat_presupuestos_respuesta WHERE solicitud_id = NEW.solicitud_id
  )
  WHERE id = NEW.solicitud_id;

  UPDATE cat_solicitudes_talleres_notificados
  SET estado = 'respondio', respondio_at = NOW()
  WHERE solicitud_id = NEW.solicitud_id AND taller_id = NEW.taller_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contar_respuestas ON cat_presupuestos_respuesta;
CREATE TRIGGER trg_contar_respuestas
  AFTER INSERT ON cat_presupuestos_respuesta
  FOR EACH ROW EXECUTE FUNCTION fn_actualizar_contador_respuestas();

-- ─── 9. RLS ──────────────────────────────────────────────────
ALTER TABLE cat_solicitudes_presupuesto          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_solicitudes_talleres_notificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_presupuestos_respuesta           ENABLE ROW LEVEL SECURITY;

-- Cliente ve y gestiona sus propias solicitudes
CREATE POLICY "sol_pres_cliente_all" ON cat_solicitudes_presupuesto
  FOR ALL TO authenticated
  USING (cliente_id IN (SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()));

-- Cliente ve respuestas a sus solicitudes
CREATE POLICY "pres_resp_cliente_select" ON cat_presupuestos_respuesta
  FOR SELECT TO authenticated
  USING (solicitud_id IN (
    SELECT id FROM cat_solicitudes_presupuesto
    WHERE cliente_id IN (SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid())
  ));

-- Acceso anon/service para taller pages (usan service role key vía db)
CREATE POLICY "sol_pres_service_select" ON cat_solicitudes_presupuesto
  FOR SELECT USING (true);

CREATE POLICY "notif_service_all" ON cat_solicitudes_talleres_notificados
  FOR ALL USING (true);

CREATE POLICY "pres_resp_service_all" ON cat_presupuestos_respuesta
  FOR ALL USING (true);
