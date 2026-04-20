-- ══════════════════════════════════════════════════════════════════
-- SISTEMA DE PRODUCTOS v2 — Piezauto
-- Ejecutar en el SQL Editor de Supabase
-- ══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. Tabla PROVEEDORES — nuevas columnas de negocio
-- ────────────────────────────────────────────────────────────────
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric(5,2)  DEFAULT 0     NOT NULL,
  ADD COLUMN IF NOT EXISTS margen_venta         numeric(5,2)  DEFAULT 30    NOT NULL,
  ADD COLUMN IF NOT EXISTS iva_porcentaje       numeric(5,2)  DEFAULT 21    NOT NULL,
  ADD COLUMN IF NOT EXISTS condicion_pago       text,
  ADD COLUMN IF NOT EXISTS moneda               text          DEFAULT 'ARS' NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 2. Tabla ITEMS_PROVEEDOR — nuevas columnas descriptivas y de precio
-- ────────────────────────────────────────────────────────────────

-- Codificación y fabricante
ALTER TABLE items_proveedor
  ADD COLUMN IF NOT EXISTS codigo_propio      text,
  ADD COLUMN IF NOT EXISTS codigos_cruzados   text[],
  ADD COLUMN IF NOT EXISTS fabricante         text;

-- Vehículo asociado (informativo, sin FK)
ALTER TABLE items_proveedor
  ADD COLUMN IF NOT EXISTS marca_vehiculo    text,
  ADD COLUMN IF NOT EXISTS vehiculo          text,
  ADD COLUMN IF NOT EXISTS version_formato   text,
  ADD COLUMN IF NOT EXISTS anio_desde_pieza  int,
  ADD COLUMN IF NOT EXISTS anio_hasta_pieza  int;

-- Lado de montaje con check constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items_proveedor' AND column_name = 'lado'
  ) THEN
    ALTER TABLE items_proveedor
      ADD COLUMN lado text CHECK (lado IN ('D', 'I', 'ambos'));
  END IF;
END $$;

-- Cadena de precios (valores base — los calculados son GENERATED)
ALTER TABLE items_proveedor
  ADD COLUMN IF NOT EXISTS descuento_aplicado numeric(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_aplicado       numeric(5,2)  DEFAULT 21,
  ADD COLUMN IF NOT EXISTS margen_aplicado    numeric(5,2)  DEFAULT 30,
  ADD COLUMN IF NOT EXISTS activo             boolean        DEFAULT true;

-- Columnas GENERATED: precio con descuento
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items_proveedor' AND column_name = 'precio_con_descuento'
  ) THEN
    ALTER TABLE items_proveedor
      ADD COLUMN precio_con_descuento numeric(12,2) GENERATED ALWAYS AS (
        CASE WHEN precio_lista IS NOT NULL
          THEN ROUND(precio_lista * (1 - COALESCE(descuento_aplicado, 0) / 100), 2)
          ELSE NULL
        END
      ) STORED;
  END IF;
END $$;

-- Columnas GENERATED: precio neto (con descuento + IVA)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items_proveedor' AND column_name = 'precio_neto'
  ) THEN
    ALTER TABLE items_proveedor
      ADD COLUMN precio_neto numeric(12,2) GENERATED ALWAYS AS (
        CASE WHEN precio_lista IS NOT NULL
          THEN ROUND(
            precio_lista
            * (1 - COALESCE(descuento_aplicado, 0) / 100)
            * (1 + COALESCE(iva_aplicado, 21) / 100),
            2
          )
          ELSE NULL
        END
      ) STORED;
  END IF;
END $$;

-- Columnas GENERATED: precio de venta final (neto + margen)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items_proveedor' AND column_name = 'precio_venta'
  ) THEN
    ALTER TABLE items_proveedor
      ADD COLUMN precio_venta numeric(12,2) GENERATED ALWAYS AS (
        CASE WHEN precio_lista IS NOT NULL
          THEN ROUND(
            precio_lista
            * (1 - COALESCE(descuento_aplicado, 0) / 100)
            * (1 + COALESCE(iva_aplicado, 21) / 100)
            * (1 + COALESCE(margen_aplicado, 30) / 100),
            2
          )
          ELSE NULL
        END
      ) STORED;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 3. Tabla PRODUCTOS — campos extendidos para publicación
-- ────────────────────────────────────────────────────────────────
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS codigo_propio     text,
  ADD COLUMN IF NOT EXISTS codigos_cruzados  text[],
  ADD COLUMN IF NOT EXISTS fabricante        text,
  ADD COLUMN IF NOT EXISTS marca_vehiculo    text,
  ADD COLUMN IF NOT EXISTS vehiculo          text,
  ADD COLUMN IF NOT EXISTS version_formato   text,
  ADD COLUMN IF NOT EXISTS anio_desde        int,
  ADD COLUMN IF NOT EXISTS anio_hasta        int,
  ADD COLUMN IF NOT EXISTS precio_lista      numeric(12,2);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'lado'
  ) THEN
    ALTER TABLE productos
      ADD COLUMN lado text CHECK (lado IN ('D', 'I', 'ambos'));
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 4. Tabla secuencial para código propio
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codigos_propios_secuencia (
  categoria_slug text PRIMARY KEY,
  ultimo_numero  int  DEFAULT 0 NOT NULL
);

-- ────────────────────────────────────────────────────────────────
-- 5. Función: autogenerar_codigo_propio(slug, lado)
--    Devuelve: PZA-[SLUG3]-[00001]-[D/I/B]
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION autogenerar_codigo_propio(
  p_categoria_slug text,
  p_lado           text
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_numero   int;
  v_slug     text;
  v_sufijo   text;
  v_clave    text;
BEGIN
  v_clave  := COALESCE(p_categoria_slug, 'GEN');
  v_slug   := UPPER(LEFT(v_clave, 3));
  v_sufijo := CASE p_lado
                WHEN 'D' THEN 'D'
                WHEN 'I' THEN 'I'
                ELSE 'B'
              END;

  INSERT INTO codigos_propios_secuencia (categoria_slug, ultimo_numero)
  VALUES (v_clave, 1)
  ON CONFLICT (categoria_slug) DO UPDATE
    SET ultimo_numero = codigos_propios_secuencia.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_numero;

  RETURN 'PZA-' || v_slug || '-' || LPAD(v_numero::text, 5, '0') || '-' || v_sufijo;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 6. Función: asignar_codigos_propios_importacion(importacion_id)
--    Asigna código propio a todos los items de una importación
--    que aún no lo tienen. Llamar desde JS post-import.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION asignar_codigos_propios_importacion(
  p_importacion_id uuid
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  rec     RECORD;
  v_cod   text;
  v_count int := 0;
BEGIN
  FOR rec IN
    SELECT ip.id, ip.lado, c.slug AS cat_slug
    FROM   items_proveedor ip
    LEFT   JOIN categorias c ON c.id = ip.categoria_id
    WHERE  ip.importacion_id = p_importacion_id
      AND  ip.codigo_propio IS NULL
  LOOP
    v_cod := autogenerar_codigo_propio(rec.cat_slug, rec.lado);
    UPDATE items_proveedor SET codigo_propio = v_cod WHERE id = rec.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 7. Índices de rendimiento
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_items_prov_codigo_propio   ON items_proveedor (codigo_propio);
CREATE INDEX IF NOT EXISTS idx_items_prov_marca_vehiculo  ON items_proveedor (marca_vehiculo);
CREATE INDEX IF NOT EXISTS idx_items_prov_vehiculo        ON items_proveedor (vehiculo);
CREATE INDEX IF NOT EXISTS idx_items_prov_lado            ON items_proveedor (lado);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_propio    ON productos (codigo_propio);

-- ────────────────────────────────────────────────────────────────
-- 8. RLS: la función necesita permisos para ejecutarse desde anon
-- ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION autogenerar_codigo_propio(text, text)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION asignar_codigos_propios_importacion(uuid)      TO anon, authenticated;
GRANT ALL ON TABLE codigos_propios_secuencia                             TO anon, authenticated;
