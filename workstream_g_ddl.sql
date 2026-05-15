-- ============================================================
-- Workstream G — DDL: Roles, Usuarios Internos, Auditoría, Vistas
-- Aplicar en Supabase SQL Editor en orden
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Roles del equipo Piezauto
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  permisos    JSONB NOT NULL DEFAULT '{}',
  orden       INTEGER DEFAULT 0,
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO cat_admin_roles (codigo, nombre, descripcion, permisos, orden) VALUES
  ('owner', 'Owner', 'Acceso total sin restricciones',
   '{"all": true}'::jsonb, 1),
  ('admin_operativo', 'Admin operativo', 'Operaciones, turnos, comprobantes, validación de servicios',
   '{"operaciones": true, "turnos": true, "comprobantes": true, "invitaciones_beta": true, "validacion_servicios": true, "talleres_externos": false, "insights": false, "configuracion_sistema": false, "usuarios_internos": false}'::jsonb, 2),
  ('comercial', 'Comercial', 'Pipeline comercial, talleres externos, condiciones',
   '{"talleres_externos": true, "pipeline_comercial": true, "talleres_red": true, "condiciones_comerciales": true, "operaciones": false, "comprobantes": false, "insights": "limitado", "configuracion_sistema": false}'::jsonb, 3),
  ('soporte', 'Soporte', 'Resolución de tickets, lectura de operaciones',
   '{"operaciones": "lectura", "turnos": "lectura", "clientes": "lectura", "talleres_red": "lectura", "tickets": true, "insights": false, "configuracion_sistema": false}'::jsonb, 4),
  ('analista', 'Analista', 'Solo lectura sobre dashboards y reportes',
   '{"insights": true, "reportes": true, "operaciones": "lectura", "configuracion_sistema": false}'::jsonb, 5)
ON CONFLICT (codigo) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Usuarios internos de Piezauto
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_usuarios_internos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE,
  email         TEXT UNIQUE NOT NULL,
  nombre        TEXT NOT NULL,
  apellido      TEXT,
  rol_codigo    TEXT NOT NULL REFERENCES cat_admin_roles(codigo),
  activo        BOOLEAN DEFAULT TRUE,
  ultimo_acceso TIMESTAMPTZ,
  creado_por    UUID REFERENCES cat_usuarios_internos(id) ON DELETE SET NULL,
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_internos_rol   ON cat_usuarios_internos(rol_codigo);
CREATE INDEX IF NOT EXISTS idx_usuarios_internos_email ON cat_usuarios_internos(email);

-- ─────────────────────────────────────────────────────────────
-- Log de auditoría
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cat_audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID REFERENCES cat_usuarios_internos(id) ON DELETE SET NULL,
  usuario_email    TEXT,
  accion           TEXT NOT NULL,
  tabla_afectada   TEXT,
  registro_id      TEXT,
  cambios          JSONB,
  ip_address       TEXT,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_usuario ON cat_audit_log(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tabla   ON cat_audit_log(tabla_afectada, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Funciones helper
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION usuario_tiene_permiso(p_user_id UUID, p_permiso TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_permisos JSONB;
BEGIN
  SELECT r.permisos INTO v_permisos
  FROM cat_usuarios_internos u
  JOIN cat_admin_roles r ON r.codigo = u.rol_codigo
  WHERE u.auth_user_id = p_user_id AND u.activo = TRUE;

  IF v_permisos IS NULL THEN RETURN FALSE; END IF;
  IF (v_permisos->>'all')::boolean = TRUE THEN RETURN TRUE; END IF;

  RETURN COALESCE((v_permisos->>p_permiso)::text IN ('true', 'lectura', 'limitado'), FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION rol_usuario_actual()
RETURNS TEXT AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol_codigo INTO v_rol
  FROM cat_usuarios_internos
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE cat_admin_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_usuarios_internos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_audit_log          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_authenticated" ON cat_admin_roles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "usuarios_internos_owner_all" ON cat_usuarios_internos
  FOR ALL TO authenticated USING (rol_usuario_actual() = 'owner');

CREATE POLICY "usuarios_internos_self_select" ON cat_usuarios_internos
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

CREATE POLICY "audit_log_insert" ON cat_audit_log
  FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "audit_log_select_priv" ON cat_audit_log
  FOR SELECT TO authenticated USING (rol_usuario_actual() IN ('owner', 'analista'));

-- ─────────────────────────────────────────────────────────────
-- Vistas para insights
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_metricas_globales AS
SELECT
  (SELECT COUNT(*) FROM cat_clientes_finales)                                                                              AS total_clientes,
  (SELECT COUNT(*) FROM cat_clientes_finales WHERE created_at >= NOW() - INTERVAL '30 days')                              AS clientes_nuevos_30d,
  (SELECT COUNT(*) FROM cat_operaciones_b2c)                                                                               AS total_operaciones,
  (SELECT COUNT(*) FROM cat_operaciones_b2c WHERE created_at >= NOW() - INTERVAL '30 days')                               AS operaciones_30d,
  (SELECT COALESCE(SUM(total),0) FROM cat_operaciones_b2c WHERE estado='completado' AND created_at >= NOW()-INTERVAL '30 days') AS facturacion_30d,
  (SELECT COUNT(*) FROM cat_recomendaciones_talleres WHERE activo = true)                                                  AS talleres_activos,
  (SELECT COUNT(*) FROM cat_talleres_externos_capturados)                                                                  AS talleres_externos_capturados,
  (SELECT COUNT(*) FROM cat_turnos WHERE created_at >= NOW() - INTERVAL '30 days')                                        AS turnos_30d,
  (SELECT COUNT(*) FROM cat_ordenes_reparacion WHERE estado NOT IN ('entregado','cancelado'))                              AS ors_activas,
  (SELECT COUNT(*) FROM cat_clientes_vehiculos)                                                                            AS vehiculos_registrados;

CREATE OR REPLACE VIEW v_top_talleres AS
SELECT
  t.id,
  t.nombre,
  t.localidad,
  COUNT(DISTINCT o.id)   AS total_operaciones,
  COUNT(DISTINCT tu.id)  AS total_turnos,
  COUNT(DISTINCT or_.id) AS total_ors,
  COALESCE(SUM(o.total), 0)                                 AS facturacion_total,
  COALESCE(AVG(tu.calificacion_cliente_al_taller), 0)       AS calif_promedio
FROM cat_recomendaciones_talleres t
LEFT JOIN cat_operaciones_b2c    o   ON o.taller_id   = t.id
LEFT JOIN cat_turnos             tu  ON tu.taller_id  = t.id
LEFT JOIN cat_ordenes_reparacion or_ ON or_.taller_id = t.id
WHERE t.activo = true
GROUP BY t.id, t.nombre, t.localidad
ORDER BY total_operaciones DESC;

CREATE OR REPLACE VIEW v_skus_mas_vendidos AS
SELECT
  s.id                                                              AS sku_id,
  s.descripcion,
  s.codigo_oem,
  s.precio_lista,
  COUNT(DISTINCT oi.operacion_id)                                   AS veces_vendido,
  SUM(oi.cantidad)                                                  AS unidades_vendidas,
  COALESCE(SUM(oi.cantidad * oi.precio_unitario), 0)                AS facturacion_total
FROM cat_skus s
INNER JOIN cat_operaciones_b2c_items oi ON oi.sku_id = s.id
INNER JOIN cat_operaciones_b2c       o  ON o.id = oi.operacion_id
WHERE o.estado = 'completado'
GROUP BY s.id, s.descripcion, s.codigo_oem, s.precio_lista
ORDER BY veces_vendido DESC
LIMIT 100;

CREATE OR REPLACE VIEW v_vehiculos_frecuentes AS
SELECT
  marca,
  modelo,
  anio,
  COUNT(*)                   AS cantidad,
  COUNT(DISTINCT cliente_id) AS clientes_distintos
FROM cat_clientes_vehiculos
WHERE marca IS NOT NULL
GROUP BY marca, modelo, anio
ORDER BY cantidad DESC
LIMIT 50;
