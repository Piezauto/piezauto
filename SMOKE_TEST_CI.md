# Smoke Test CI — Configuración GitHub Actions

El workflow `.github/workflows/smoke-test.yml` corre el smoke test E2E
del Hito 4 en cada push/PR a `main`. Requiere 3 secrets de GitHub.

## Pasos para configurar

### 1. Abrí los secrets del repo

GitHub → repositorio `Piezauto/piezauto` → **Settings** →
**Secrets and variables** → **Actions** → **New repository secret**

### 2. Creá los 3 secrets

| Nombre del secret | Dónde encontrarlo | Valor |
|---|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → **Project URL** | `https://mqxowotdeibllkitkije.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → **Project API keys** → `anon public` | (clave que empieza con `eyJhbG...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → **Project API keys** → `service_role secret` | (clave secreta — nunca la expongas en código) |

> ⚠️ La `service_role` key tiene acceso total a la BD (bypasea RLS).
> Guardala solo como secret de GitHub, nunca la commitees al repo.

### 3. Confirmá el primer run

Después de agregar los 3 secrets, hacé cualquier push a `main` o
abrí la pestaña **Actions** del repo → seleccioná el workflow
**"Smoke Test — Hito 4 B2C"** → **Run workflow**.

Tiempo estimado de ejecución: **15–30 segundos**.

## Qué valida el smoke test

```
✅ Validación código BETA-TEST01
✅ signUp Supabase Auth (email confirmation OFF requerido)
✅ signIn Supabase Auth
✅ INSERT cat_clientes_finales (RLS auth.uid())
✅ UPDATE cat_invitaciones_b2c (usos_actuales++, usado_por=clienteId FK)
✅ INSERT cat_clientes_vehiculos (marca_terminal_id UUID FK)
✅ SELECT cat_clientes_vehiculos
✅ Verificar usos_actuales incrementado
✅ Cleanup completo (incluye auth.users con SERVICE_ROLE_KEY)
```

## Notas

- El smoke test crea y borra datos de prueba en producción.
  Las tablas quedan limpias al final de cada run.
- El código de invitación `BETA-TEST01` se usa y se revierte
  en cada run (usos_actuales vuelve al valor original).
- Sin `SUPABASE_SERVICE_ROLE_KEY`, el usuario de `auth.users`
  queda huérfano y hay que borrarlo manualmente en
  Supabase Dashboard → Authentication → Users.
