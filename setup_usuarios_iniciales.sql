-- ============================================================
-- Setup inicial — Usuarios Owner de Piezauto
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ir a Supabase > Authentication > Users > "Add user"
-- 2. Crear usuario para Fede: fede@piezauto.com (o el email real)
-- 3. Crear usuario para Ernesto: ernesto@piezauto.com (o el email real)
-- 4. Copiar el UUID de cada usuario desde la columna "User UID"
-- 5. Reemplazar PLACEHOLDER_FEDE_UUID y PLACEHOLDER_ERNESTO_UUID abajo
-- 6. Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

INSERT INTO cat_usuarios_internos
  (auth_user_id, email, nombre, apellido, rol_codigo, activo)
VALUES
  ('PLACEHOLDER_FEDE_UUID',    'fede@piezauto.com',    'Federico', 'Daranno', 'owner', TRUE),
  ('PLACEHOLDER_ERNESTO_UUID', 'ernesto@piezauto.com', 'Ernesto',  'Apellido','owner', TRUE)
ON CONFLICT (email) DO UPDATE
  SET auth_user_id = EXCLUDED.auth_user_id,
      activo       = TRUE,
      rol_codigo   = 'owner',
      updated_at   = NOW();

-- Verificar resultado
SELECT id, email, nombre, rol_codigo, activo, created_at
FROM cat_usuarios_internos
ORDER BY created_at;
