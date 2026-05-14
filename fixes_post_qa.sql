-- ═══════════════════════════════════════════════════════════════
-- fixes_post_qa.sql — Ejecutar en Supabase SQL Editor
-- CTO — Piezauto — post-QA
-- ═══════════════════════════════════════════════════════════════

-- ── BUG 1: RLS cat_clientes_finales ──────────────────────────────
-- getClienteActual() retorna null porque el SELECT está bloqueado.
-- El usuario autenticado debe poder leer su propio perfil.

DROP POLICY IF EXISTS "cliente ve su propio perfil" ON cat_clientes_finales;

CREATE POLICY "cliente ve su propio perfil"
ON cat_clientes_finales FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Verificar: debe devolver 1 fila para el usuario de test
-- SELECT * FROM cat_clientes_finales WHERE auth_user_id = auth.uid();


-- ── BUG 4: cat_turnos — formato TIME y RLS INSERT ────────────────
-- Verificar que el INSERT funciona con los formatos correctos.
-- hora_inicio y hora_fin deben ser strings 'HH:MM' o 'HH:MM:SS'.
-- cliente_id puede ser NULL (clientes sin cuenta).

-- Test directo (sin autenticación — usa service_role para diagnóstico):
INSERT INTO cat_turnos (
  taller_id, tipo, estado, fecha,
  hora_inicio, hora_fin, nombre_cliente, motivo
)
VALUES (
  'e5a732a0-ba98-4a9f-bca5-0d0c99bcc225',
  'inspeccion_presupuesto',
  'pendiente',
  '2026-05-14',
  '08:00', '09:00',
  'Juan Pérez (TEST QA)', 'Prueba diagnóstico'
)
RETURNING id, taller_id, tipo, estado, fecha, hora_inicio;

-- Si el INSERT falla, el error estará en el RETURNING.
-- Luego borrar el registro de prueba:
-- DELETE FROM cat_turnos WHERE nombre_cliente = 'Juan Pérez (TEST QA)';

-- RLS INSERT para cliente autenticado (permite cliente_id NULL para usuarios sin cuenta):
DROP POLICY IF EXISTS "cliente_turnos_insert" ON cat_turnos;

CREATE POLICY "cliente_turnos_insert"
ON cat_turnos FOR INSERT TO authenticated
WITH CHECK (
  cliente_id IS NULL
  OR cliente_id IN (
    SELECT id FROM cat_clientes_finales
    WHERE auth_user_id = auth.uid()
  )
);

-- RLS INSERT para anon (formulario sin login):
DROP POLICY IF EXISTS "anon_turnos_insert" ON cat_turnos;

CREATE POLICY "anon_turnos_insert"
ON cat_turnos FOR INSERT TO anon
WITH CHECK (cliente_id IS NULL);


-- ── BUG 7: RLS cat_comprobantes_taller ───────────────────────────
-- El admin no puede insertar ni leer comprobantes.

DROP POLICY IF EXISTS "admin inserta comprobantes" ON cat_comprobantes_taller;
DROP POLICY IF EXISTS "admin lee comprobantes"     ON cat_comprobantes_taller;

CREATE POLICY "admin inserta comprobantes"
ON cat_comprobantes_taller FOR INSERT TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "admin lee comprobantes"
ON cat_comprobantes_taller FOR SELECT TO authenticated
USING (TRUE);


-- ── VERIFICACIÓN FINAL ───────────────────────────────────────────
-- Tablas con RLS habilitada y sus políticas:
SELECT
  t.tablename,
  t.rowsecurity AS rls_on,
  array_agg(p.policyname ORDER BY p.policyname) AS policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'cat_clientes_finales',
    'cat_turnos',
    'cat_comprobantes_taller'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
