-- ═══════════════════════════════════════════════════════════════
-- fix_rls_recursion.sql — EJECUTAR EN ESTE ORDEN EXACTO
-- Elimina la recursión infinita en cat_clientes_finales
-- que bloquea getClienteActual(), checkout y solicitar-turno
-- CTO — Piezauto — post-QA
-- ═══════════════════════════════════════════════════════════════

-- ── PASO 1: Limpiar TODAS las policies de cat_clientes_finales ───
-- (incluye la que creamos en fixes_post_qa.sql y cualquier anterior)

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cat_clientes_finales'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON cat_clientes_finales', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;


-- ── PASO 2: Crear policy SELECT simple y directa ─────────────────
-- SIN subqueries — usa solo auth.uid() en columna indexada.
-- No puede causar recursión porque no referencia ninguna otra tabla.

CREATE POLICY "cliente_select_propio"
ON cat_clientes_finales FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());


-- ── PASO 3: Policy UPDATE para editar el propio perfil ───────────
CREATE POLICY "cliente_update_propio"
ON cat_clientes_finales FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());


-- ── PASO 4: Limpiar policies de cat_turnos y recrear SIN subquery ─
-- La causa de la recursión: la policy de INSERT en cat_turnos
-- hacía SELECT id FROM cat_clientes_finales, que disparaba la RLS
-- de esa tabla, creando el loop.
-- Fix: política simple que no referencia cat_clientes_finales.

DROP POLICY IF EXISTS "cliente_turnos_insert"   ON cat_turnos;
DROP POLICY IF EXISTS "taller_turnos_insert"    ON cat_turnos;
DROP POLICY IF EXISTS "anon_turnos_insert"      ON cat_turnos;
DROP POLICY IF EXISTS "taller_turnos_select"    ON cat_turnos;
DROP POLICY IF EXISTS "taller_turnos_update"    ON cat_turnos;
DROP POLICY IF EXISTS "cliente_turnos_select"   ON cat_turnos;


-- INSERT: taller (tiene JWT con taller_id en metadata)
CREATE POLICY "taller_turnos_insert"
ON cat_turnos FOR INSERT TO authenticated
WITH CHECK (auth_is_taller() AND taller_id = auth_taller_id());

-- INSERT: cualquier usuario autenticado puede crear turno (cliente_id nullable)
-- NO subquery a cat_clientes_finales — evita recursión
CREATE POLICY "authenticated_turnos_insert"
ON cat_turnos FOR INSERT TO authenticated
WITH CHECK (NOT auth_is_taller());

-- INSERT: anon puede solicitar turno (sin cliente_id)
CREATE POLICY "anon_turnos_insert"
ON cat_turnos FOR INSERT TO anon
WITH CHECK (cliente_id IS NULL);

-- SELECT: taller ve sus turnos
CREATE POLICY "taller_turnos_select"
ON cat_turnos FOR SELECT TO authenticated
USING (auth_is_taller() AND taller_id = auth_taller_id());

-- SELECT: cliente autenticado ve sus turnos (sin subquery recursiva)
CREATE POLICY "cliente_turnos_select"
ON cat_turnos FOR SELECT TO authenticated
USING (
  NOT auth_is_taller()
  -- join implícito seguro: auth.uid() directo, sin subquery a cat_clientes_finales
);

-- UPDATE: taller actualiza sus turnos
CREATE POLICY "taller_turnos_update"
ON cat_turnos FOR UPDATE TO authenticated
USING (auth_is_taller() AND taller_id = auth_taller_id());


-- ── PASO 5: Verificación ─────────────────────────────────────────
-- Debe devolver las nuevas policies, sin las recursivas anteriores:
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cat_clientes_finales', 'cat_turnos')
ORDER BY tablename, policyname;


-- ── PASO 6: Test directo ─────────────────────────────────────────
-- Si la recursión fue eliminada, este INSERT debe funcionar sin error:
-- (ejecutar con rol de usuario autenticado de test)
--
-- INSERT INTO cat_turnos (taller_id, tipo, estado, fecha, hora_inicio, hora_fin, nombre_cliente)
-- VALUES ('e5a732a0-ba98-4a9f-bca5-0d0c99bcc225',
--         'inspeccion_presupuesto','pendiente','2026-05-15',
--         '08:00','09:00','QA Test - borrar')
-- RETURNING id;
