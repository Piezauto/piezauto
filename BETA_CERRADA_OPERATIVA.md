# Piezauto — Operativa Diaria Beta Cerrada
**Fecha de arranque beta:** 01/06/2026  
**Estado del sistema:** modo pago manual (transferencia/efectivo) · MercadoPago en standby

---

## Cuentas de talleres — cómo crearlas

Los 4 talleres del Paquete necesitan una cuenta en Supabase Auth con metadata `role=taller`.

**Cuando el dueño tenga los emails de cada taller**, ejecutar UNO de estos métodos:

### Método A — curl (recomendado, una vez por taller)

```bash
curl -X POST 'https://mqxowotdeibllkitkije.supabase.co/auth/v1/admin/users' \
  -H "Authorization: Bearer TU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "EMAIL_DEL_TALLER",
    "password": "PASSWORD_TEMPORAL",
    "email_confirm": true,
    "user_metadata": {
      "role": "taller",
      "taller_id": "UUID_DEL_TALLER",
      "taller_nombre": "NOMBRE_DEL_TALLER"
    }
  }'
```

**UUIDs de los 4 talleres:**

| Taller | UUID |
|---|---|
| Franzoni Hermanos | `e5a732a0-ba98-4a9f-bca5-0d0c99bcc225` |
| Ingrao | `fc2ee987-c71e-4277-b0bc-813e5c12b7ce` |
| NOWAK | `d7e8b998-c313-4841-90ea-f4f9e9f0df77` |
| Caferata | `bcf96f7f-e46d-4677-b675-e65025cd0316` |

### Método B — Supabase Dashboard

1. Ir a Authentication → Users → "Add user"
2. Email y password del taller
3. Después de crear: Authentication → Users → clic en el usuario → "Edit user"
4. En "User metadata" pegar:
```json
{
  "role": "taller",
  "taller_id": "UUID_DEL_TALLER",
  "taller_nombre": "NOMBRE"
}
```

### Método C — DDL comentado en fase4_ddl.sql

Ver el bloque comentado al final de `fase4_ddl.sql` para referencia.

---

## Operativa diaria — Admin

### Gestión de pagos manuales

Cuando un cliente confirma pedido con pago por transferencia:
1. El pedido queda en `estado = 'pendiente'`
2. El admin contacta al cliente por WhatsApp con el CBU/alias
3. Cliente transfiere
4. Admin confirma en Supabase:

```sql
-- Confirmar pago de una operación
UPDATE cat_operaciones_b2c
SET estado = 'pagado', updated_at = NOW()
WHERE id = 'UUID_DE_LA_OPERACION';
```

O desde el panel admin: `/admin/operaciones-taller.html` → botón "Aprobar".

### Ver operaciones pendientes de pago

```sql
SELECT 
  o.id, o.total, o.metodo_pago, o.estado, o.created_at,
  c.nombre, c.apellido, c.telefono, c.email
FROM cat_operaciones_b2c o
JOIN cat_clientes_finales c ON c.id = o.cliente_id
WHERE o.estado = 'pendiente'
  AND o.taller_id IS NULL  -- sin taller asignado
ORDER BY o.created_at DESC;
```

### Ver operaciones pendientes de aprobación de taller

```sql
SELECT 
  o.id, o.total, o.estado, o.created_at,
  c.nombre, c.apellido, c.telefono,
  t.nombre AS taller
FROM cat_operaciones_b2c o
JOIN cat_clientes_finales c ON c.id = o.cliente_id
JOIN cat_recomendaciones_talleres t ON t.id = o.taller_id
WHERE o.pendiente_aprobacion_taller = TRUE
ORDER BY o.created_at DESC;
```

---

## Qué hacer si un taller no aprueba en 48hs

1. Llamar directamente al taller (datos en `cat_recomendaciones_talleres`)
2. Si no responde, reasignar la operación a otro taller:

```sql
UPDATE cat_operaciones_b2c
SET 
  taller_id = 'UUID_NUEVO_TALLER',
  notas = jsonb_set(notas::jsonb, '{taller,nombre}', '"Nuevo Taller"')::text,
  updated_at = NOW()
WHERE id = 'UUID_OPERACION';

-- También actualizar la notificación
UPDATE cat_notificaciones_talleres
SET taller_id = 'UUID_NUEVO_TALLER'
WHERE operacion_id = 'UUID_OPERACION';
```

3. Si se cancela definitivamente:

```sql
UPDATE cat_operaciones_b2c
SET estado = 'cancelado', pendiente_aprobacion_taller = FALSE, updated_at = NOW()
WHERE id = 'UUID_OPERACION';
```

---

## Emitir códigos de invitación beta

Los códigos beta permiten que nuevos clientes se registren.

```sql
-- Crear un código nuevo
INSERT INTO cat_invitaciones_b2c (codigo, max_usos, expira_at)
VALUES ('BETA-' || upper(substr(gen_random_uuid()::text, 1, 6)), 1, NOW() + INTERVAL '30 days');

-- Ver todos los códigos activos
SELECT codigo, max_usos, usos_actuales, expira_at
FROM cat_invitaciones_b2c
WHERE expira_at > NOW()
ORDER BY created_at DESC;
```

---

## Verificar estado del sistema

### Resumen diario

```sql
-- Dashboard rápido
SELECT 
  estado,
  COUNT(*) AS cantidad,
  SUM(total) AS monto_total
FROM cat_operaciones_b2c
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY estado
ORDER BY cantidad DESC;
```

### Notificaciones sin leer por taller

```sql
SELECT 
  t.nombre AS taller,
  COUNT(*) AS sin_leer
FROM cat_notificaciones_talleres n
JOIN cat_recomendaciones_talleres t ON t.id = n.taller_id
WHERE n.leida = FALSE
GROUP BY t.nombre;
```

### Clientes registrados este mes

```sql
SELECT COUNT(*) FROM cat_clientes_finales
WHERE created_at >= date_trunc('month', CURRENT_DATE);
```

### SKUs más vendidos

```sql
SELECT 
  s.codigo_piezauto, s.descripcion,
  SUM(i.cantidad) AS unidades_vendidas,
  SUM(i.subtotal) AS facturado
FROM cat_operaciones_b2c_items i
JOIN cat_skus s ON s.id = i.sku_id
JOIN cat_operaciones_b2c o ON o.id = i.operacion_id
WHERE o.estado IN ('pagado','enviado','entregado')
GROUP BY s.id, s.codigo_piezauto, s.descripcion
ORDER BY unidades_vendidas DESC
LIMIT 10;
```

---

## Paneles disponibles

| Panel | URL | Quién lo usa |
|---|---|---|
| Catálogo / búsqueda | `/buscar.html` | Clientes |
| Ficha producto | `/producto.html?id=UUID` | Clientes |
| Carrito | `/carrito.html` | Clientes |
| Checkout | `/checkout-b2c.html` | Clientes |
| Mis operaciones | `/operaciones.html` | Clientes |
| Registro | `/registro.html` | Clientes |
| Login | `/login.html` | Clientes |
| Admin — operaciones taller | `/admin/operaciones-taller.html` | Admin Piezauto |
| Admin — productos | `/admin/index.html` | Admin Piezauto |
| Panel taller — login | `/taller/login.html` | Talleres |
| Panel taller — dashboard | `/taller/dashboard.html` | Talleres |
| Panel taller — operaciones | `/taller/operaciones.html` | Talleres |

---

## Activar MercadoPago

Cuando el token productivo esté disponible, seguir las instrucciones paso a paso en `SETUP_MP.md`.  
Resumen del proceso:
1. Crear Cloudflare Worker con el código de `SETUP_MP.md`
2. Agregar secrets: `MP_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. Setear `MP_BACKEND_URL` en `lib/mercadopago.js`
4. Descomentar el bloque `fetch` en `lib/mercadopago.js`
5. Activar el botón MercadoPago en `checkout-b2c.html` (eliminar el bloque de "Próximamente")
6. Configurar webhook en MercadoPago Dashboard

---

## Contactos de los talleres del Paquete

| Taller | Localidad | WhatsApp |
|---|---|---|
| Franzoni Hermanos | Villa Tesei | 1122222222 |
| Ingrao | Hurlingham | 1122222223 |
| NOWAK | Hurlingham | 1122222224 |
| Caferata | Caseros | 1122222225 |

---

## Checklist pre-launch (01/06)

- [ ] Aplicar `fase4_ddl.sql` en Supabase SQL Editor
- [ ] Crear cuentas auth de los 4 talleres (pedir emails a los talleres)
- [ ] Confirmar que los talleres pueden loguearse en `/taller/login.html`
- [ ] Probar el flujo completo: registro → búsqueda → carrito → checkout → gracias → operaciones
- [ ] Enviar primer lote de códigos de invitación a beta testers
- [ ] Verificar que CI sigue verde: https://github.com/Piezauto/piezauto/actions
