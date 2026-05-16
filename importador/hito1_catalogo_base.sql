-- ============================================================================
-- PIEZAUTO - CATÁLOGO BASE (Hito 1)
-- Fecha: 26 de abril de 2026
-- Autor: CTO
-- Aprobado: Comité Técnico Fase 2
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------

-- Tipo de lados (decisión comité: ENUM con 6 valores desde Sprint 4)
CREATE TYPE tipo_lados_enum AS ENUM (
  'lados_combinados',      -- Autogenera hijo D + hijo I
  'juego_indivisible',     -- NO desdobla, se vende como unidad (ej: kit embrague)
  'kit',                   -- NO desdobla (ej: kit distribución)
  'lado_explicito',        -- NO desdobla, lado se carga del sufijo del código
  'sin_lado',              -- Sin acción, sin lateralidad
  'hijo_de_padre_multiple' -- Hijo pre-armado de padre con N hijos (Sprint 4)
);

-- Lado del SKU
CREATE TYPE lado_enum AS ENUM (
  'N/A',    -- Sin lado
  'Der',    -- Derecho
  'Izq',    -- Izquierdo
  'Ambos'   -- Ambos lados (para juegos indivisibles)
);

-- Posición de la pieza
CREATE TYPE posicion_enum AS ENUM (
  'N/A',
  'Delantero',
  'Trasero',
  'Central'
);

-- Tipo de fabricante (decisión comité: 5 tipos)
CREATE TYPE tipo_fabricante_enum AS ENUM (
  'fabricante_real',        -- Mahle, TYC, Bosch, Gates
  'etiqueta_origen',        -- Importado, Nacional, Original
  'etiqueta_categoria',     -- Taiwan, Ind.Arg., Brasil (genéricos contextuales)
  'marca_proveedor',        -- Autoclip (Vaer), SG, Delviso-NAC
  'marca_canal_terminal'    -- Para uso futuro (marcas propias de canales)
);

-- Tipo de factura (decisión comité: 4 valores)
CREATE TYPE tipo_factura_enum AS ENUM (
  'factura_a',              -- A-A: operación formal pura, IVA crédito fiscal
  'factura_b_cf',           -- B: consumidor final, IVA neutral (débito fiscal)
  'factura_c_o_no_emitida', -- C o sin factura: IVA suma al costo
  'costo_no_facturable'     -- Costos en negro (ej: Cordobés)
);

-- ----------------------------------------------------------------------------
-- 2. TABLA: cat_fabricantes
-- ----------------------------------------------------------------------------

CREATE TABLE cat_fabricantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identidad: (nombre, tipo, familia) según decisión comité
  nombre TEXT NOT NULL,
  tipo tipo_fabricante_enum NOT NULL DEFAULT 'fabricante_real',
  
  -- Metadata
  pais TEXT,
  observaciones TEXT,
  
  -- Control
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sin UNIQUE global sobre nombre (decisión bloque 1)
-- La identidad real es la tripla (nombre, tipo, familia_id) validada en queries

COMMENT ON TABLE cat_fabricantes IS 'Fabricantes, etiquetas y marcas. Identidad por tripla (nombre, tipo, familia).';
COMMENT ON COLUMN cat_fabricantes.tipo IS 'Tipo: fabricante_real, etiqueta_origen, etiqueta_categoria, marca_proveedor, marca_canal_terminal';

-- ----------------------------------------------------------------------------
-- 3. TABLA: cat_familias
-- ----------------------------------------------------------------------------

CREATE TABLE cat_familias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT UNIQUE, -- Código corto para exports (ej: OPT, PAR, RAD)
  
  -- Rentabilidad
  rentabilidad_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  
  -- Clasificación
  requiere_vehiculo BOOLEAN DEFAULT TRUE,
  requiere_motor BOOLEAN DEFAULT FALSE,
  es_mecanica BOOLEAN DEFAULT FALSE,
  es_carroceria BOOLEAN DEFAULT FALSE,
  
  -- Control
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE cat_familias IS '65 familias totales (50 brief + 15 nuevas). Congeladas 6 meses desde aprobación.';

-- ----------------------------------------------------------------------------
-- 4. TABLA: cat_vehiculos
-- ----------------------------------------------------------------------------

CREATE TABLE cat_vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio_desde INTEGER,
  anio_hasta INTEGER,
  version TEXT,
  
  -- Segmentación
  tipo TEXT, -- Auto, Camioneta, Camión, Utilitario
  nacionalidad TEXT, -- Nacional, Importado
  
  -- Control
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehiculos_marca ON cat_vehiculos(marca);
CREATE INDEX idx_vehiculos_modelo ON cat_vehiculos(modelo);
CREATE INDEX idx_vehiculos_anio ON cat_vehiculos(anio_desde, anio_hasta);

COMMENT ON TABLE cat_vehiculos IS '200 vehículos argentinos (inicial). Expandible según necesidad.';

-- ----------------------------------------------------------------------------
-- 5. TABLA: cat_proveedores (MOVIDO ANTES DE cat_skus)
-- ----------------------------------------------------------------------------

CREATE TABLE cat_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  nombre TEXT NOT NULL UNIQUE,
  razon_social TEXT,
  cuit TEXT UNIQUE,
  
  -- Contacto
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  localidad TEXT,
  provincia TEXT,
  
  -- Condiciones comerciales
  descuento_comercial_porcentaje DECIMAL(5,2) DEFAULT 0.00,
  rentabilidad_override DECIMAL(5,2), -- NULL = no tiene override
  tipo_override_rentabilidad TEXT DEFAULT 'recomendado_only' CHECK (tipo_override_rentabilidad IN ('recomendado_only', 'todos_skus')),
  
  -- Periodicidad
  frecuencia_actualizacion_lista TEXT DEFAULT 'semanal',
  
  -- Control
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE cat_proveedores IS '~15 proveedores principales. Periodicidad acordada: actualización semanal.';
COMMENT ON COLUMN cat_proveedores.tipo_override_rentabilidad IS 'recomendado_only: solo aplica cuando es recomendado. todos_skus: aplica a todos sus SKUs.';

-- ----------------------------------------------------------------------------
-- 6. TABLA: cat_skus (núcleo del catálogo)
-- ----------------------------------------------------------------------------

CREATE TABLE cat_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  codigo_piezauto TEXT NOT NULL UNIQUE, -- PZ-00001, PZ-00001-D, PZ-00001-I
  
  -- Relación padre-hijo (Sprint 4: dos columnas)
  padre_id UUID REFERENCES cat_skus(id) ON DELETE CASCADE,  -- FK para integridad referencial
  codigo_raiz VARCHAR(60),  -- Código proveedor del padre (para sync incremental sin JOIN)
  es_padre BOOLEAN DEFAULT FALSE,
  tipo_lados tipo_lados_enum NOT NULL DEFAULT 'sin_lado', -- 6 valores desde Sprint 4
  
  -- Clasificación
  fabricante_id UUID NOT NULL REFERENCES cat_fabricantes(id),
  familia_id UUID NOT NULL REFERENCES cat_familias(id),
  
  -- Descripción
  descripcion TEXT NOT NULL,
  descripcion_corta TEXT, -- Para UI móvil
  
  -- Códigos de referencia
  codigo_oem TEXT, -- Múltiples separados por ';' (decisión bloque 5)
  codigo_interno TEXT, -- Código interno Piezauto (opcional)
  
  -- Precios (doble columna - decisión proyecto)
  precio_lista DECIMAL(12,2),
  precio_neto DECIMAL(12,2),
  
  -- Rentabilidad override
  rentabilidad_override DECIMAL(5,2), -- NULL = usa jerarquía familia/proveedor/default
  
  -- Recomendados (decisión CFO)
  recomendado_compra UUID REFERENCES cat_proveedores(id), -- A quién comprar
  recomendado_mostrador UUID REFERENCES cat_proveedores(id), -- Qué mostrar en POS
  recomendado_digital UUID REFERENCES cat_proveedores(id), -- Qué publicar online
  
  -- Atributos físicos
  lado lado_enum DEFAULT 'N/A',
  posicion posicion_enum DEFAULT 'N/A',
  carroceria TEXT,
  puertas TEXT,
  motor TEXT,
  caja TEXT,
  version TEXT,
  
  -- Aplicaciones (decisión bloque 3: TEXT soporta hasta 1GB)
  aplicaciones TEXT, -- Separador: " / " entre vehículos
  
  -- Observaciones
  observaciones TEXT,
  
  -- Control
  activo BOOLEAN DEFAULT TRUE,
  activo_venta BOOLEAN DEFAULT TRUE, -- FALSE para padres con lados_combinados
  fecha_alta DATE DEFAULT CURRENT_DATE,
  fecha_baja DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices principales
CREATE INDEX idx_skus_codigo_piezauto ON cat_skus(codigo_piezauto);
CREATE INDEX idx_skus_fabricante ON cat_skus(fabricante_id);
CREATE INDEX idx_skus_familia ON cat_skus(familia_id);
CREATE INDEX idx_skus_padre_id ON cat_skus(padre_id); -- Para queries padre-hijos por FK
CREATE INDEX idx_skus_codigo_raiz ON cat_skus(codigo_raiz) WHERE codigo_raiz IS NOT NULL; -- Para sync incremental
CREATE INDEX idx_skus_tipo_lados ON cat_skus(tipo_lados); -- Para filtrar lados_combinados
CREATE INDEX idx_skus_activo ON cat_skus(activo, activo_venta);
CREATE INDEX idx_skus_descripcion_gin ON cat_skus USING gin(to_tsvector('spanish', descripcion)); -- Búsqueda full-text
CREATE INDEX idx_skus_aplicaciones_gin ON cat_skus USING gin(to_tsvector('spanish', aplicaciones)); -- Búsqueda por vehículo

COMMENT ON TABLE cat_skus IS 'Catálogo principal. ~217k SKUs proyectados con desdoblamiento de lados.';
COMMENT ON COLUMN cat_skus.padre_id IS 'FK al padre (UUID). NULL si no tiene padre. Mantiene integridad referencial.';
COMMENT ON COLUMN cat_skus.codigo_raiz IS 'Código proveedor del padre (VARCHAR). Para sync incremental sin JOIN. NULL si no tiene padre. Sprint 4.';
COMMENT ON COLUMN cat_skus.tipo_lados IS '6 valores desde Sprint 4: lados_combinados, juego_indivisible, kit, lado_explicito, sin_lado, hijo_de_padre_multiple.';
COMMENT ON COLUMN cat_skus.activo_venta IS 'FALSE para padres con lados_combinados (existen para agrupación, no se venden).';

-- ----------------------------------------------------------------------------
-- 7. TABLA: cat_equivalencias
-- ----------------------------------------------------------------------------

CREATE TABLE cat_equivalencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación SKU Piezauto ↔ código proveedor (N:1)
  sku_id UUID NOT NULL REFERENCES cat_skus(id) ON DELETE CASCADE,
  proveedor_id UUID NOT NULL REFERENCES cat_proveedores(id) ON DELETE CASCADE,
  codigo_proveedor TEXT NOT NULL,
  
  -- Precios históricos (snapshot al momento de la equivalencia)
  precio_lista_snapshot DECIMAL(12,2),
  precio_neto_snapshot DECIMAL(12,2),
  fecha_snapshot TIMESTAMP DEFAULT NOW(),
  
  -- Control
  activo BOOLEAN DEFAULT TRUE,
  fecha_alta DATE DEFAULT CURRENT_DATE,
  fecha_baja DATE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint: un proveedor no puede tener dos veces el mismo código
  UNIQUE(proveedor_id, codigo_proveedor)
);

CREATE INDEX idx_equivalencias_sku ON cat_equivalencias(sku_id);
CREATE INDEX idx_equivalencias_proveedor ON cat_equivalencias(proveedor_id);
CREATE INDEX idx_equivalencias_codigo ON cat_equivalencias(codigo_proveedor);
CREATE INDEX idx_equivalencias_activo ON cat_equivalencias(activo);

COMMENT ON TABLE cat_equivalencias IS 'Relación N:1 entre SKUs Piezauto y códigos de proveedor. Un proveedor nunca repite código.';

-- ----------------------------------------------------------------------------
-- 8. TABLA: cat_aplicaciones
-- ----------------------------------------------------------------------------

CREATE TABLE cat_aplicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación SKU ↔ vehículo (N:N)
  sku_id UUID NOT NULL REFERENCES cat_skus(id) ON DELETE CASCADE,
  vehiculo_id UUID NOT NULL REFERENCES cat_vehiculos(id) ON DELETE CASCADE,
  
  -- Especificidad de aplicación
  motor TEXT,
  caja TEXT,
  version TEXT,
  observaciones TEXT,
  
  -- Control
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(sku_id, vehiculo_id, motor, caja, version)
);

CREATE INDEX idx_aplicaciones_sku ON cat_aplicaciones(sku_id);
CREATE INDEX idx_aplicaciones_vehiculo ON cat_aplicaciones(vehiculo_id);

COMMENT ON TABLE cat_aplicaciones IS 'Relación N:N entre SKUs y vehículos. Permite búsqueda por marca/modelo/año.';

-- ----------------------------------------------------------------------------
-- 9. TABLA: cat_historial_precios
-- ----------------------------------------------------------------------------

CREATE TABLE cat_historial_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación
  sku_id UUID NOT NULL REFERENCES cat_skus(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES cat_proveedores(id), -- NULL si es cambio manual
  
  -- Cambio
  precio_anterior DECIMAL(12,2),
  precio_nuevo DECIMAL(12,2) NOT NULL,
  tipo_precio TEXT NOT NULL CHECK (tipo_precio IN ('lista', 'neto')),
  
  -- Metadata
  fecha_cambio TIMESTAMP DEFAULT NOW(),
  motivo TEXT, -- 'Actualización lista proveedor', 'Corrección manual', 'Propagado desde padre'
  usuario TEXT, -- Email del usuario admin que hizo el cambio manual
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_historial_sku ON cat_historial_precios(sku_id);
CREATE INDEX idx_historial_fecha ON cat_historial_precios(fecha_cambio);
CREATE INDEX idx_historial_proveedor ON cat_historial_precios(proveedor_id);

COMMENT ON TABLE cat_historial_precios IS 'Historial append-only de cambios de precio. Decisión bloque 3: nunca DELETE, siempre INSERT.';

-- ----------------------------------------------------------------------------
-- 10. TABLA: cat_auditoria_fabricantes
-- ----------------------------------------------------------------------------

CREATE TABLE cat_auditoria_fabricantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación
  sku_id UUID REFERENCES cat_skus(id) ON DELETE CASCADE,
  
  -- Cambio
  fabricante_anterior_id UUID REFERENCES cat_fabricantes(id),
  fabricante_nuevo_id UUID NOT NULL REFERENCES cat_fabricantes(id),
  
  -- Metadata (decisión comité: evidencia + bulk_operation)
  fecha_cambio TIMESTAMP DEFAULT NOW(),
  usuario TEXT NOT NULL, -- 'CPO', 'sistema', email usuario admin
  motivo TEXT,
  evidencia TEXT, -- URL, path a documento, descripción de la fuente
  bulk_operation BOOLEAN DEFAULT FALSE, -- TRUE si es parte de enriquecimiento masivo
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auditoria_fab_sku ON cat_auditoria_fabricantes(sku_id);
CREATE INDEX idx_auditoria_fab_fecha ON cat_auditoria_fabricantes(fecha_cambio);
CREATE INDEX idx_auditoria_fab_bulk ON cat_auditoria_fabricantes(bulk_operation); -- Para reportes de progreso CPO

COMMENT ON TABLE cat_auditoria_fabricantes IS 'Trazabilidad de enriquecimiento CPO. Soporta bulk operations con evidencia.';
COMMENT ON COLUMN cat_auditoria_fabricantes.evidencia IS 'URL, path a documento, o descripción de la fuente del enriquecimiento.';
COMMENT ON COLUMN cat_auditoria_fabricantes.bulk_operation IS 'TRUE para operaciones masivas. Facilita reportes de progreso del CPO.';

-- ----------------------------------------------------------------------------
-- 11. FABRICANTE PLACEHOLDER "Por identificar"
-- ----------------------------------------------------------------------------

INSERT INTO cat_fabricantes (nombre, tipo, pais, observaciones)
VALUES (
  'Por identificar',
  'marca_proveedor',
  NULL,
  'Placeholder para SKUs pendientes de enriquecimiento CPO. ~68k SKUs (32% del catálogo) inicialmente.'
);

COMMENT ON TABLE cat_fabricantes IS 'Incluye fabricante placeholder "Por identificar" para SKUs sin fabricante conocido.';

-- ----------------------------------------------------------------------------
-- 12. TRIGGERS DE ACTUALIZACIÓN
-- ----------------------------------------------------------------------------

-- Trigger para updated_at en todas las tablas principales
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_cat_fabricantes
  BEFORE UPDATE ON cat_fabricantes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_cat_familias
  BEFORE UPDATE ON cat_familias
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_cat_skus
  BEFORE UPDATE ON cat_skus
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_cat_proveedores
  BEFORE UPDATE ON cat_proveedores
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_cat_equivalencias
  BEFORE UPDATE ON cat_equivalencias
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- FIN DDL HITO 1
-- ----------------------------------------------------------------------------

-- Verificación de tablas creadas
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'cat_%'
ORDER BY tablename;
