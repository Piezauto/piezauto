-- =============================================================
-- WORKSTREAM H — Compra programada predictiva
-- Aplicar en Supabase SQL Editor
-- NOTA: cat_servicios_catalogo puede no existir → servicio_codigo es TEXT
-- NOTA: cat_mantenimiento_intervalos debe existir para que
--       fn_detectar_oportunidades_compra() funcione
-- =============================================================

-- ─── 1. Descuentos configurables por servicio ────────────────
CREATE TABLE IF NOT EXISTS cat_descuentos_compra_programada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_codigo TEXT NOT NULL,

  descuento_solo_productos NUMERIC DEFAULT 0 CHECK (descuento_solo_productos >= 0 AND descuento_solo_productos <= 100),
  descuento_solo_servicio  NUMERIC DEFAULT 0 CHECK (descuento_solo_servicio  >= 0 AND descuento_solo_servicio  <= 100),
  descuento_combo          NUMERIC DEFAULT 0 CHECK (descuento_combo          >= 0 AND descuento_combo          <= 100),

  skus_sugeridos     JSONB DEFAULT '[]',
  dias_anticipacion  INTEGER DEFAULT 30,
  km_anticipacion    INTEGER DEFAULT 1000,

  activo     BOOLEAN DEFAULT TRUE,
  notas_admin TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(servicio_codigo)
);

INSERT INTO cat_descuentos_compra_programada (servicio_codigo, descuento_solo_productos, descuento_solo_servicio, descuento_combo)
VALUES
  ('aceite',          10, 0, 15),
  ('filtros',          8, 0, 12),
  ('frenos',           7, 0, 12),
  ('bateria',          5, 0, 10),
  ('neumaticos',       5, 5, 12),
  ('amortiguadores',   5, 0, 10),
  ('correa',           5, 0, 10),
  ('embrague',         5, 0, 10),
  ('suspension',       5, 0, 10),
  ('escape',           5, 0, 10),
  ('electrico',        5, 0, 10),
  ('vtv',              0, 5,  5),
  ('general',          5, 5, 10)
ON CONFLICT (servicio_codigo) DO NOTHING;

-- ─── 2. Oportunidades detectadas ─────────────────────────────
CREATE TABLE IF NOT EXISTS cat_oportunidades_compra_programada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID NOT NULL REFERENCES cat_clientes_finales(id) ON DELETE CASCADE,
  vehiculo_id UUID NOT NULL REFERENCES cat_clientes_vehiculos(id) ON DELETE CASCADE,
  servicio_codigo TEXT NOT NULL,

  tipo_trigger TEXT NOT NULL CHECK (tipo_trigger IN ('km_proximo','fecha_proxima','ambos')),
  km_estimados_restantes     INTEGER,
  dias_estimados_restantes   INTEGER,

  precio_productos_calculado     NUMERIC DEFAULT 0,
  precio_productos_con_descuento NUMERIC DEFAULT 0,
  descuento_productos_aplicado   NUMERIC DEFAULT 0,
  descuento_combo_aplicado       NUMERIC DEFAULT 0,

  skus_propuestos    JSONB DEFAULT '[]',
  taller_sugerido_id UUID REFERENCES cat_recomendaciones_talleres(id) ON DELETE SET NULL,

  estado TEXT NOT NULL DEFAULT 'detectada' CHECK (estado IN (
    'detectada','notificada','vista_cliente','comprada_productos',
    'agendado_servicio','combo_comprado','rechazada','expirada'
  )),

  fecha_deteccion    TIMESTAMPTZ DEFAULT NOW(),
  fecha_notificacion TIMESTAMPTZ,
  fecha_visualizacion TIMESTAMPTZ,
  fecha_accion_cliente TIMESTAMPTZ,
  fecha_expiracion   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days'),

  operacion_id UUID REFERENCES cat_operaciones_b2c(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oport_cliente ON cat_oportunidades_compra_programada(cliente_id, estado);
CREATE INDEX IF NOT EXISTS idx_oport_vehiculo ON cat_oportunidades_compra_programada(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_oport_estado   ON cat_oportunidades_compra_programada(estado, fecha_deteccion DESC);

-- ─── 3. Función detección de oportunidades ───────────────────
-- Requiere que cat_mantenimiento_intervalos exista con columnas:
-- vehiculo_id, tipo, activo, km_actual, cliente_id,
-- intervalo_km, ultimo_km, intervalo_meses, ultima_fecha
CREATE OR REPLACE FUNCTION fn_detectar_oportunidades_compra()
RETURNS INTEGER AS $$
DECLARE
  v_intervalo RECORD;
  v_descuento RECORD;
  v_count     INTEGER := 0;
  v_km_proximo  INTEGER;
  v_dias_proximo INTEGER;
BEGIN
  FOR v_intervalo IN
    SELECT mi.*, v.km_actual, v.cliente_id, v.id AS v_id
    FROM cat_mantenimiento_intervalos mi
    JOIN cat_clientes_vehiculos v ON v.id = mi.vehiculo_id
    WHERE mi.activo = TRUE
  LOOP
    v_km_proximo   := NULL;
    v_dias_proximo := NULL;

    IF v_intervalo.intervalo_km IS NOT NULL AND v_intervalo.ultimo_km IS NOT NULL THEN
      v_km_proximo := (v_intervalo.ultimo_km + v_intervalo.intervalo_km) - COALESCE(v_intervalo.km_actual, 0);
    END IF;

    IF v_intervalo.intervalo_meses IS NOT NULL AND v_intervalo.ultima_fecha IS NOT NULL THEN
      v_dias_proximo := EXTRACT(DAY FROM (v_intervalo.ultima_fecha + (v_intervalo.intervalo_meses || ' months')::INTERVAL - NOW()))::INTEGER;
    END IF;

    SELECT * INTO v_descuento
    FROM cat_descuentos_compra_programada
    WHERE servicio_codigo = v_intervalo.tipo AND activo = TRUE;

    IF v_descuento IS NULL THEN CONTINUE; END IF;

    IF (v_km_proximo IS NOT NULL   AND v_km_proximo   <= v_descuento.km_anticipacion   AND v_km_proximo   > -1000)
    OR (v_dias_proximo IS NOT NULL AND v_dias_proximo <= v_descuento.dias_anticipacion AND v_dias_proximo > -30) THEN

      IF NOT EXISTS (
        SELECT 1 FROM cat_oportunidades_compra_programada
        WHERE vehiculo_id       = v_intervalo.v_id
          AND servicio_codigo   = v_intervalo.tipo
          AND estado IN ('detectada','notificada','vista_cliente')
          AND fecha_expiracion  > NOW()
      ) THEN
        INSERT INTO cat_oportunidades_compra_programada (
          cliente_id, vehiculo_id, servicio_codigo,
          tipo_trigger, km_estimados_restantes, dias_estimados_restantes,
          skus_propuestos, descuento_productos_aplicado, descuento_combo_aplicado
        ) VALUES (
          v_intervalo.cliente_id, v_intervalo.v_id, v_intervalo.tipo,
          CASE
            WHEN v_km_proximo IS NOT NULL AND v_dias_proximo IS NOT NULL THEN 'ambos'
            WHEN v_km_proximo IS NOT NULL THEN 'km_proximo'
            ELSE 'fecha_proxima'
          END,
          v_km_proximo, v_dias_proximo,
          v_descuento.skus_sugeridos,
          v_descuento.descuento_solo_productos,
          v_descuento.descuento_combo
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ─── 4. RLS ──────────────────────────────────────────────────
ALTER TABLE cat_descuentos_compra_programada   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_oportunidades_compra_programada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "desc_compra_select_public" ON cat_descuentos_compra_programada
  FOR SELECT USING (TRUE);
CREATE POLICY "desc_compra_service_all" ON cat_descuentos_compra_programada
  FOR ALL USING (TRUE);

CREATE POLICY "oport_cliente_all" ON cat_oportunidades_compra_programada
  FOR ALL TO authenticated
  USING (cliente_id IN (SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()));
CREATE POLICY "oport_service_all" ON cat_oportunidades_compra_programada
  FOR ALL USING (TRUE);
