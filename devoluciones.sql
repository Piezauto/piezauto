-- Tabla de devoluciones de pedidos
CREATE TABLE IF NOT EXISTS devoluciones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      UUID NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  motivo         TEXT NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  items          JSONB NOT NULL DEFAULT '[]',
  -- items: [{ producto_id, nombre, cantidad, precio_unitario }]
  nota_interna   TEXT,
  nota_credito_nro TEXT,
  monto_credito  NUMERIC(10,2),
  revertido_stock BOOLEAN NOT NULL DEFAULT false,
  creado_por     TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devoluciones_pedido ON devoluciones (pedido_id);
CREATE INDEX IF NOT EXISTS idx_devoluciones_estado ON devoluciones (estado);

-- Trigger para actualizado_en
CREATE OR REPLACE FUNCTION set_devoluciones_actualizado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_devoluciones_actualizado
  BEFORE UPDATE ON devoluciones
  FOR EACH ROW EXECUTE FUNCTION set_devoluciones_actualizado();

-- RLS
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_select_all" ON devoluciones FOR SELECT USING (true);
CREATE POLICY "dev_all_auth"   ON devoluciones FOR ALL    USING (true);

-- Secuencia para número de nota de crédito
CREATE SEQUENCE IF NOT EXISTS nota_credito_seq START 1000;

-- Función para aprobar devolución + revertir stock + generar nota de crédito
CREATE OR REPLACE FUNCTION aprobar_devolucion(p_devolucion_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  dev    RECORD;
  item   JSONB;
  nro    TEXT;
BEGIN
  SELECT * INTO dev FROM devoluciones WHERE id = p_devolucion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devolución no encontrada'; END IF;
  IF dev.estado <> 'pendiente' THEN RAISE EXCEPTION 'La devolución ya fue procesada'; END IF;

  -- Revertir stock
  FOR item IN SELECT * FROM jsonb_array_elements(dev.items)
  LOOP
    UPDATE productos
    SET stock = stock + (item->>'cantidad')::INT
    WHERE id = (item->>'producto_id')::UUID;
  END LOOP;

  -- Número de nota de crédito
  nro := 'NC-' || LPAD(nextval('nota_credito_seq')::TEXT, 6, '0');

  UPDATE devoluciones SET
    estado = 'aprobada',
    revertido_stock = true,
    nota_credito_nro = nro,
    actualizado_en = NOW()
  WHERE id = p_devolucion_id;

  RETURN nro;
END;
$$;
