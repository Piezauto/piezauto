-- Fase 4 — DDL + RLS para panel de talleres
-- Ejecutar en Supabase SQL Editor antes de activar /taller/*
--
-- Prerequisito: fase3_ddl.sql ya aplicado (taller_id, metodo_pago,
--   pendiente_aprobacion_taller en cat_operaciones_b2c,
--   cat_notificaciones_talleres ya existe).
--
-- Esta migración agrega RLS específico para que los talleres
-- lean/editen SOLO sus propias operaciones.

-- ── Helpers ───────────────────────────────────────────────────────────
-- Función que extrae el taller_id del JWT del usuario logueado.
-- Retorna NULL si no es un usuario taller.
CREATE OR REPLACE FUNCTION auth_taller_id() RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT ((auth.jwt() -> 'user_metadata') ->> 'taller_id')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth_is_taller() RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT ((auth.jwt() -> 'user_metadata') ->> 'role') = 'taller';
$$;

-- ── cat_operaciones_b2c — taller SELECT ───────────────────────────────
-- El taller ve las operaciones donde su taller_id coincide.
-- (La política de cliente ya existe: "cliente ve sus operaciones")

CREATE POLICY "taller ve sus operaciones"
ON cat_operaciones_b2c FOR SELECT TO authenticated
USING (
  auth_is_taller() AND taller_id = auth_taller_id()
);

-- El taller puede UPDATE sus operaciones (aprobar/rechazar + notas)
CREATE POLICY "taller actualiza sus operaciones"
ON cat_operaciones_b2c FOR UPDATE TO authenticated
USING (
  auth_is_taller() AND taller_id = auth_taller_id()
)
WITH CHECK (
  estado IN ('pendiente', 'pagado', 'cancelado')
);

-- ── cat_operaciones_b2c_items — taller SELECT ─────────────────────────
CREATE POLICY "taller ve items de sus operaciones"
ON cat_operaciones_b2c_items FOR SELECT TO authenticated
USING (
  operacion_id IN (
    SELECT id FROM cat_operaciones_b2c
    WHERE auth_is_taller() AND taller_id = auth_taller_id()
  )
);

-- ── cat_clientes_finales — taller ve sus clientes ─────────────────────
CREATE POLICY "taller ve clientes de sus operaciones"
ON cat_clientes_finales FOR SELECT TO authenticated
USING (
  auth_is_taller() AND
  id IN (
    SELECT cliente_id FROM cat_operaciones_b2c
    WHERE taller_id = auth_taller_id()
  )
);

-- ── cat_notificaciones_talleres — taller SELECT + UPDATE ──────────────
CREATE POLICY "taller ve sus notificaciones"
ON cat_notificaciones_talleres FOR SELECT TO authenticated
USING (
  auth_is_taller() AND taller_id = auth_taller_id()
);

CREATE POLICY "taller marca leidas sus notificaciones"
ON cat_notificaciones_talleres FOR UPDATE TO authenticated
USING (
  auth_is_taller() AND taller_id = auth_taller_id()
)
WITH CHECK (TRUE);

-- ── cat_notificaciones_talleres — cliente puede insertar ──────────────
-- El INSERT lo hace el cliente al confirmar checkout (su token autenticado).
-- La política ya existe en fase3_ddl.sql ("sistema inserta notificaciones").
-- Si no fue aplicada, descomentar:
-- CREATE POLICY "cliente inserta notificaciones"
-- ON cat_notificaciones_talleres FOR INSERT TO authenticated
-- WITH CHECK (TRUE);

-- ── Crear cuentas de taller (instrucciones para el dueño) ────────────
-- Ver BETA_CERRADA_OPERATIVA.md → sección "Cuentas de taller"
-- El dueño debe ejecutar vía la API admin de Supabase (service_role):
--
-- curl -X POST 'https://mqxowotdeibllkitkije.supabase.co/auth/v1/admin/users' \
--   -H "Authorization: Bearer SERVICE_ROLE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "EMAIL_DEL_TALLER",
--     "password": "PASSWORD_SEGURA",
--     "email_confirm": true,
--     "user_metadata": {
--       "role": "taller",
--       "taller_id": "UUID_DEL_TALLER",
--       "taller_nombre": "NOMBRE_DEL_TALLER"
--     }
--   }'
--
-- UUIDs de los 4 talleres del Paquete:
--   Franzoni Hermanos: e5a732a0-ba98-4a9f-bca5-0d0c99bcc225
--   Ingrao:            fc2ee987-c71e-4277-b0bc-813e5c12b7ce
--   NOWAK:             d7e8b998-c313-4841-90ea-f4f9e9f0df77
--   Caferata:          bcf96f7f-e46d-4677-b675-e65025cd0316
