CREATE TABLE IF NOT EXISTS configuracion (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clave          TEXT        UNIQUE NOT NULL,
  valor          TEXT,
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

INSERT INTO configuracion (clave, valor) VALUES
  ('nombre_negocio',       'Piezauto'),
  ('telefono',             ''),
  ('whatsapp',             ''),
  ('email',                ''),
  ('direccion',            ''),
  ('horario',              'Lun–Vie 9–18hs'),
  ('instagram',            ''),
  ('facebook',             ''),
  ('costo_envio',          '0'),
  ('envio_gratis_desde',   '0')
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
