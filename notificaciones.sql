-- =====================================================
--  Piezauto — Tabla: notificaciones internas
--  Correr una vez en Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT NOT NULL CHECK (tipo IN ('pedido','turno','presupuesto','stock','sistema')),
  titulo      TEXT NOT NULL,
  cuerpo      TEXT,
  leida       BOOLEAN NOT NULL DEFAULT FALSE,
  destinatario TEXT NOT NULL CHECK (destinatario IN ('admin','taller')),
  taller_id   UUID REFERENCES talleres(id) ON DELETE CASCADE,
  referencia_id UUID,
  referencia_tabla TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para lectura rápida
CREATE INDEX IF NOT EXISTS notif_dest_leida_idx ON notificaciones (destinatario, leida, creado_en DESC);
CREATE INDEX IF NOT EXISTS notif_taller_idx     ON notificaciones (taller_id, leida, creado_en DESC);

-- RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Admin puede leer todas; taller solo las suyas
CREATE POLICY "Insertar notificacion"
  ON notificaciones FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Leer notificaciones propias"
  ON notificaciones FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Marcar como leida"
  ON notificaciones FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Trigger: auto-notificar al admin cuando llega un pedido nuevo
CREATE OR REPLACE FUNCTION notificar_nuevo_pedido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notificaciones (tipo, titulo, cuerpo, destinatario, referencia_id, referencia_tabla)
  VALUES (
    'pedido',
    'Nuevo pedido recibido',
    'De: ' || COALESCE(NEW.nombre_cliente, 'cliente') || ' — $' || COALESCE(NEW.total::TEXT, '0'),
    'admin',
    NEW.id,
    'pedidos'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_pedido ON pedidos;
CREATE TRIGGER trg_notif_pedido
  AFTER INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION notificar_nuevo_pedido();

-- Trigger: auto-notificar al taller cuando llega un turno
CREATE OR REPLACE FUNCTION notificar_nuevo_turno()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notificaciones (tipo, titulo, cuerpo, destinatario, taller_id, referencia_id, referencia_tabla)
  VALUES (
    'turno',
    'Nuevo turno reservado',
    'Cliente: ' || COALESCE(NEW.nombre_cliente, 'cliente') || ' — ' || NEW.fecha || ' ' || LEFT(NEW.hora, 5),
    'taller',
    NEW.taller_id,
    NEW.id,
    'turnos'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_turno ON turnos;
CREATE TRIGGER trg_notif_turno
  AFTER INSERT ON turnos
  FOR EACH ROW EXECUTE FUNCTION notificar_nuevo_turno();

-- Trigger: auto-notificar al taller cuando llega un presupuesto
CREATE OR REPLACE FUNCTION notificar_nuevo_presupuesto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notificaciones (tipo, titulo, cuerpo, destinatario, taller_id, referencia_id, referencia_tabla)
  VALUES (
    'presupuesto',
    'Nueva solicitud de presupuesto',
    'De: ' || COALESCE(NEW.nombre_cliente, 'cliente') || ' — ' || LEFT(COALESCE(NEW.descripcion_trabajo, ''), 80),
    'taller',
    NEW.taller_id,
    NEW.id,
    'presupuestos'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_presupuesto ON presupuestos;
CREATE TRIGGER trg_notif_presupuesto
  AFTER INSERT ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION notificar_nuevo_presupuesto();
