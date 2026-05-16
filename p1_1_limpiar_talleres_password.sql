-- P1-1: Limpiar password_hash en texto plano de la tabla talleres
-- Ya no se usa: el auth de talleres migró a Supabase Auth (user_metadata.role='taller')
-- Ejecutar en Supabase SQL Editor
UPDATE talleres SET password_hash = NULL WHERE password_hash IS NOT NULL;
