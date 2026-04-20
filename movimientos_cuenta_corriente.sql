-- ── FACTURACIÓN INTERNA A TALLERES ──────────────────────────────────
-- Facturas generadas cuando un taller hace pedidos de productos
-- o cuando el admin crea un cargo manual
CREATE TABLE IF NOT EXISTS facturas_talleres (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id        UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  concepto         TEXT NOT NULL,
  monto            NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  fecha_vencimiento DATE,
  estado           TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
  pedido_id        UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  nota             TEXT,
  creado_por       TEXT DEFAULT 'admin',
  creado_en        TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ── MOVIMIENTOS DE CUENTA CORRIENTE ─────────────────────────────────
-- Historial completo de débitos y créditos por taller
CREATE TABLE IF NOT EXISTS movimientos_cuenta_corriente (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id       UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  factura_id      UUID REFERENCES facturas_talleres(id) ON DELETE SET NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('cargo', 'pago', 'ajuste')),
  monto           NUMERIC(10,2) NOT NULL,
  descripcion     TEXT,
  saldo_anterior  NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_nuevo     NUMERIC(10,2) NOT NULL DEFAULT 0,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── SALDO EN TABLA TALLERES ──────────────────────────────────────────
-- Saldo deudor positivo = el taller nos debe plata
ALTER TABLE talleres
  ADD COLUMN IF NOT EXISTS cuenta_corriente_saldo NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ── ÍNDICES ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_facturas_taller  ON facturas_talleres(taller_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado  ON facturas_talleres(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_venc    ON facturas_talleres(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_mcc_taller       ON movimientos_cuenta_corriente(taller_id);
CREATE INDEX IF NOT EXISTS idx_mcc_creado       ON movimientos_cuenta_corriente(creado_en DESC);

-- ── TRIGGER: actualizar fecha en facturas_talleres ───────────────────
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facturas_updated ON facturas_talleres;
CREATE TRIGGER trg_facturas_updated
  BEFORE UPDATE ON facturas_talleres
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
