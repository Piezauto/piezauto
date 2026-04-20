-- ══════════════════════════════════════════════════════
-- MÓDULO DE PAGOS A PROVEEDORES
-- ══════════════════════════════════════════════════════

-- Facturas recibidas de proveedores
CREATE TABLE IF NOT EXISTS facturas_proveedor (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id      uuid REFERENCES proveedores(id) ON DELETE CASCADE,
  numero_factura    text NOT NULL,
  tipo              text CHECK (tipo IN ('A', 'B', 'C', 'X', 'remito')),
  fecha_emision     date NOT NULL,
  fecha_vencimiento date,
  monto_total       numeric(12,2) NOT NULL,
  monto_pagado      numeric(12,2) DEFAULT 0,
  saldo_pendiente   numeric(12,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
  estado            text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagada', 'vencida')),
  notas             text,
  creado_en         timestamptz DEFAULT now()
);

-- Pagos realizados a proveedores (parciales o totales)
CREATE TABLE IF NOT EXISTS pagos_proveedor (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id      uuid REFERENCES facturas_proveedor(id) ON DELETE CASCADE,
  proveedor_id    uuid REFERENCES proveedores(id),
  fecha_pago      date NOT NULL,
  monto           numeric(12,2) NOT NULL,
  metodo          text CHECK (metodo IN ('transferencia', 'cheque', 'efectivo', 'debito')),
  numero_cheque   text,
  banco           text,
  comprobante_url text,
  notas           text,
  creado_en       timestamptz DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_facturas_proveedor_id  ON facturas_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado        ON facturas_proveedor(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_vencimiento   ON facturas_proveedor(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pagos_factura_id       ON pagos_proveedor(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha            ON pagos_proveedor(fecha_pago);

-- Permisos para el rol authenticated de Supabase
GRANT ALL ON facturas_proveedor TO authenticated;
GRANT ALL ON pagos_proveedor    TO authenticated;
