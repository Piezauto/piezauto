-- ── CREDENCIALES DEL PANEL ADMINISTRADOR ────────────────────────────
-- Ejecutar UNA sola vez en Supabase SQL Editor.
-- IMPORTANTE: Antes de ir a producción, cambiá la contraseña desde
-- el panel Admin > Configuración general.
--
-- La contraseña se compara en texto plano en la versión actual.
-- Para mayor seguridad, implementar hashing con bcrypt en el servidor.
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO configuracion (clave, valor, actualizado_en)
VALUES
  ('admin_email',         'admin@piezauto.com', NOW()),
  ('admin_password_hash', 'Piezauto2026',        NOW())
ON CONFLICT (clave)
DO UPDATE SET
  valor         = EXCLUDED.valor,
  actualizado_en = NOW();

-- ── VERIFICAR QUE SE INSERTARON CORRECTAMENTE ────────────────────────
SELECT clave, LEFT(valor, 4) || '****' AS valor_parcial, actualizado_en
FROM configuracion
WHERE clave IN ('admin_email', 'admin_password_hash');
