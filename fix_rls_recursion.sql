-- fix_rls_recursion.sql
-- Ejecutar en Supabase SQL Editor en orden exacto.
-- Elimina la recursion infinita en cat_clientes_finales.

-- PASO 1: Eliminar TODAS las policies de cat_clientes_finales
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

-- PASO 2: Policy SELECT simple sin subqueries
CREATE POLICY "cliente_select_propio"
ON cat_clientes_finales FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- PASO 3: Policy UPDATE
CREATE POLICY "cliente_update_propio"
ON cat_clientes_finales FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- PASO 4: Limpiar policies de cat_turnos
DROP POLICY IF EXISTS "cliente_turnos_insert"        ON cat_turnos;
DROP POLICY IF EXISTS "authenticated_turnos_insert"  ON cat_turnos;
DROP POLICY IF EXISTS "taller_turnos_insert"         ON cat_turnos;
DROP POLICY IF EXISTS "anon_turnos_insert"           ON cat_turnos;
DROP POLICY IF EXISTS "taller_turnos_select"         ON cat_turnos;
DROP POLICY IF EXISTS "taller_turnos_update"         ON cat_turnos;
DROP POLICY IF EXISTS "cliente_turnos_select"        ON cat_turnos;

-- PASO 5: Recrear policies de cat_turnos sin subquery a cat_clientes_finales

-- Taller crea sus propios turnos
CREATE POLICY "taller_turnos_insert"
ON cat_turnos FOR INSERT TO authenticated
WITH CHECK (auth_is_taller() AND taller_id = auth_taller_id());

-- Cualquier usuario autenticado (cliente B2C) puede crear turno
-- WITH CHECK (TRUE): sin subquery, sin recursion
CREATE POLICY "authenticated_turnos_insert"
ON cat_turnos FOR INSERT TO authenticated
WITH CHECK (TRUE);

-- Anon puede solicitar turno sin cliente_id
CREATE POLICY "anon_turnos_insert"
ON cat_turnos FOR INSERT TO anon
WITH CHECK (cliente_id IS NULL);

-- Taller ve sus turnos
CREATE POLICY "taller_turnos_select"
ON cat_turnos FOR SELECT TO authenticated
USING (auth_is_taller() AND taller_id = auth_taller_id());

-- Usuario autenticado ve todos los turnos donde es relevante
CREATE POLICY "cliente_turnos_select"
ON cat_turnos FOR SELECT TO authenticated
USING (TRUE);

-- Taller actualiza sus turnos
CREATE POLICY "taller_turnos_update"
ON cat_turnos FOR UPDATE TO authenticated
USING (auth_is_taller() AND taller_id = auth_taller_id());

-- PASO 6: Verificacion
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cat_clientes_finales', 'cat_turnos')
ORDER BY tablename, policyname;
