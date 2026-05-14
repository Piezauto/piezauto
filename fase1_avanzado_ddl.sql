-- fase1_avanzado_ddl.sql
-- Funcionalidades avanzadas Piezauto Point — Fase 1
-- Ejecutar completo en Supabase SQL Editor

-- Personal del taller
CREATE TABLE IF NOT EXISTS cat_taller_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('chapista','pintor','mecanico','electricista','administrativo','otro')),
  telefono TEXT,
  email TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  costo_hora NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ordenes de reparacion
CREATE TABLE IF NOT EXISTS cat_ordenes_reparacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES cat_taller_clientes(id) ON DELETE SET NULL,
  turno_id UUID REFERENCES cat_turnos(id) ON DELETE SET NULL,
  presupuesto_id UUID REFERENCES cat_taller_presupuestos(id) ON DELETE SET NULL,
  numero_or TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'recepcion' CHECK (estado IN (
    'recepcion','diagnostico','esperando_autorizacion','esperando_piezas',
    'en_reparacion','en_pintura','control_calidad','listo','entregado','cancelado'
  )),
  vehiculo_marca TEXT,
  vehiculo_modelo TEXT,
  vehiculo_anio INTEGER,
  vehiculo_dominio TEXT NOT NULL,
  vehiculo_color TEXT,
  vehiculo_km INTEGER,
  vehiculo_combustible TEXT,
  tiene_seguro BOOLEAN DEFAULT FALSE,
  compania_seguro TEXT,
  nro_poliza TEXT,
  nro_siniestro TEXT,
  nro_peritacion TEXT,
  perito_nombre TEXT,
  monto_franquicia NUMERIC DEFAULT 0,
  descripcion_ingreso TEXT,
  diagnostico TEXT,
  trabajos_realizar JSONB DEFAULT '[]',
  firma_cliente_svg TEXT,
  firma_cliente_nombre TEXT,
  firma_fecha TIMESTAMPTZ,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_estimada_entrega DATE,
  fecha_entrega_real DATE,
  total_piezas NUMERIC DEFAULT 0,
  total_mo NUMERIC DEFAULT 0,
  total_seguro NUMERIC DEFAULT 0,
  total_cliente NUMERIC DEFAULT 0,
  notas_internas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(taller_id, numero_or)
);

-- Fotos de OR
CREATE TABLE IF NOT EXISTS cat_or_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  or_id UUID NOT NULL REFERENCES cat_ordenes_reparacion(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso','proceso','entrega','dano','otro')),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horas de trabajo por operario
CREATE TABLE IF NOT EXISTS cat_or_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  or_id UUID NOT NULL REFERENCES cat_ordenes_reparacion(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL REFERENCES cat_taller_personal(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  horas NUMERIC NOT NULL DEFAULT 0,
  costo_hora NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC GENERATED ALWAYS AS (horas * costo_hora) STORED,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aseguradoras
CREATE TABLE IF NOT EXISTS cat_taller_aseguradoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recordatorios
CREATE TABLE IF NOT EXISTS cat_taller_recordatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES cat_recomendaciones_talleres(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES cat_taller_clientes(id) ON DELETE CASCADE,
  or_id UUID REFERENCES cat_ordenes_reparacion(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('vtv','service','cumpleanos','inactividad','or_lista','or_demorada','custom')),
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp','email','ambos')),
  mensaje TEXT NOT NULL,
  fecha_envio TIMESTAMPTZ NOT NULL,
  enviado BOOLEAN DEFAULT FALSE,
  enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_or_taller    ON cat_ordenes_reparacion(taller_id, estado);
CREATE INDEX IF NOT EXISTS idx_or_dominio   ON cat_ordenes_reparacion(vehiculo_dominio);
CREATE INDEX IF NOT EXISTS idx_or_fotos     ON cat_or_fotos(or_id);
CREATE INDEX IF NOT EXISTS idx_or_horas     ON cat_or_horas(or_id);
CREATE INDEX IF NOT EXISTS idx_personal_taller ON cat_taller_personal(taller_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON cat_taller_recordatorios(fecha_envio) WHERE enviado = FALSE;

-- RLS
ALTER TABLE cat_taller_personal      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_ordenes_reparacion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_or_fotos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_or_horas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_taller_aseguradoras  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_taller_recordatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taller_personal_all"      ON cat_taller_personal      FOR ALL USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "taller_or_all"            ON cat_ordenes_reparacion   FOR ALL USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "taller_aseguradoras_all"  ON cat_taller_aseguradoras  FOR ALL USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "taller_recordatorios_all" ON cat_taller_recordatorios FOR ALL USING (auth_is_taller() AND taller_id = auth_taller_id());
CREATE POLICY "taller_or_fotos_all"      ON cat_or_fotos FOR ALL USING (
  or_id IN (SELECT id FROM cat_ordenes_reparacion WHERE taller_id = auth_taller_id())
);
CREATE POLICY "taller_or_horas_all"      ON cat_or_horas FOR ALL USING (
  or_id IN (SELECT id FROM cat_ordenes_reparacion WHERE taller_id = auth_taller_id())
);
CREATE POLICY "cliente_or_select" ON cat_ordenes_reparacion FOR SELECT TO authenticated
  USING (NOT auth_is_taller());
CREATE POLICY "cliente_or_fotos_select" ON cat_or_fotos FOR SELECT TO authenticated
  USING (TRUE);

-- Bucket fotos OR
INSERT INTO storage.buckets (id, name, public) VALUES ('or-fotos', 'or-fotos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "taller sube fotos or" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'or-fotos' AND auth_is_taller());
CREATE POLICY "publico ve fotos or" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'or-fotos');

-- Verificacion
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'cat_taller_personal','cat_ordenes_reparacion','cat_or_fotos',
    'cat_or_horas','cat_taller_aseguradoras','cat_taller_recordatorios'
  )
ORDER BY table_name;
