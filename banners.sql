-- =====================================================
--  Piezauto — Tabla: banners del homepage
--  Correr una vez en Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS banners (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_imagen   TEXT NOT NULL,
  url_destino  TEXT,
  texto_alt    TEXT,
  orden        INTEGER NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para el carrusel (solo activos, ordenados)
CREATE INDEX IF NOT EXISTS banners_activo_orden_idx ON banners (activo, orden ASC);

-- RLS: solo lectura pública; escritura vía service_role desde admin
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leer banners activos"
  ON banners FOR SELECT
  TO anon, authenticated
  USING (true);

-- Datos de ejemplo para el homepage
INSERT INTO banners (url_imagen, url_destino, texto_alt, orden, activo) VALUES
  ('https://placehold.co/1200x400/1a1a1a/ffffff?text=Piezauto+%E2%80%94+Hasta+30%25+OFF+en+frenos', 'ofertas.html', 'Hasta 30% OFF en frenos', 1, true),
  ('https://placehold.co/1200x400/E63946/ffffff?text=Red+Piezauto+Point+%E2%80%94++300+talleres+en+el+AMBA', 'talleres.html', 'Red de talleres Piezauto Point', 2, true),
  ('https://placehold.co/1200x400/2a2a2a/ffffff?text=Filtros+y+aceites+%E2%80%94+Stock+disponible', 'categoria.html?slug=filtros', 'Filtros y aceites', 3, true)
ON CONFLICT DO NOTHING;
