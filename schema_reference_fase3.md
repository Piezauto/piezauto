# Schema Reference — Fase 3 (verificado vía PostgREST probe 2026-05-11)

Columnas verificadas directamente contra la BD de producción.
Método: probe de columna a columna vía PostgREST error 42703.

---

## cat_clientes_finales
Perfil del cliente B2C (vinculado a auth.users).

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| auth_user_id | uuid FK→auth.users.id | |
| nombre | text | |
| apellido | text | |
| email | text | |
| telefono | text | |
| provincia | text | |
| localidad | text | |
| lat | decimal | Coordenadas para cálculo de distancia a talleres |
| lng | decimal | |
| activo | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

**Columnas ausentes (confirmado):** direccion, calle, numero, codigo_postal, barrio, dni, cuit, nivel, verificado, notas.

La dirección de entrega se captura en `cat_operaciones_b2c.direccion_entrega` al momento del checkout.

---

## cat_clientes_vehiculos
Vehículos registrados por el cliente.

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK→cat_clientes_finales.id | |
| modelo | text | Texto libre: "Peugeot 208 2019" o similar |
| anio | integer | |
| patente | text | |
| color | text | |
| principal | boolean | TRUE = vehículo principal del cliente |
| activo | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

**Columnas ausentes:** marca (separada), marca_id, modelo_id, vin, motor, es_principal (usa `principal`).

---

## cat_recomendaciones_talleres
Talleres del Paquete Administrado Piezauto (y otros).
**4 talleres activos en producción** (Franzoni Hermanos, Ingrao, NOWAK, Caferata).
**RLS:** anon puede leer (política existente).

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | Nombre comercial |
| razon_social | text | |
| direccion | text | Dirección física |
| telefono | text | |
| email | text | Puede ser NULL |
| whatsapp | text | Para notificación directa |
| lat | decimal | Coordenadas para distancia |
| lng | decimal | |
| provincia | text | |
| localidad | text | |
| activo | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

**Columnas ausentes:** taller_id, distancia, es_paquete, descuento_porcentaje, calificacion.

---

## cat_creditos_clientes
Créditos/saldos a favor del cliente (ej: diferencial precio mostrador vs neto).

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK→cat_clientes_finales.id | |
| operacion_id | uuid FK→cat_operaciones_b2c.id | NULL si crédito manual |
| monto | decimal | Monto en ARS |
| tipo | text | Ej: 'diferencial_taller', 'ajuste_manual' |
| concepto | text | Descripción del crédito |
| created_at | timestamp | |

**Columnas ausentes:** taller_id, estado, activo, vencimiento.
**Sin updated_at** — tabla append-only.

---

## cat_operaciones_b2c
Cabecera del pedido B2C (carrito confirmado y operaciones).

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK→cat_clientes_finales.id | |
| estado | text (check) | pendiente/pagado/enviado/entregado/cancelado |
| total | decimal | |
| subtotal | decimal | |
| descuento | decimal | |
| notas | text | **En Fase 3: JSON con metodo_pago + taller + notas_cliente** |
| direccion_entrega | text | Dirección capturada en checkout |
| mp_preference_id | text | ID preferencia MercadoPago |
| mp_payment_id | text | ID pago MercadoPago |
| mp_status | text | Estado del pago MP (approved/pending/rejected) |
| created_at | timestamp | |
| updated_at | timestamp | |

**Columnas ausentes (requieren DDL Fase 4):** taller_id, metodo_pago, pendiente_aprobacion_taller.

**Estrategia Fase 3:** `notas` almacena JSON:
```json
{
  "metodo_pago": "manual",
  "taller": { "id": "uuid", "nombre": "...", "direccion": "...", "whatsapp": "..." },
  "notas_cliente": "texto libre"
}
```

---

## cat_operaciones_b2c_items
Líneas de cada operación.

| Columna | Tipo inferido | Notas |
|---|---|---|
| id | uuid PK | |
| operacion_id | uuid FK→cat_operaciones_b2c.id | |
| sku_id | uuid FK→cat_skus.id | |
| cantidad | integer | |
| precio_unitario | decimal | |
| subtotal | decimal | cantidad × precio_unitario |
| created_at | timestamp | |

**Columnas ausentes:** descripcion_snapshot, codigo_piezauto (requieren JOIN con cat_skus).

---

## cat_notificaciones_talleres
**NO EXISTE AÚN** — requiere DDL en `fase3_ddl.sql`.

En Fase 3 MVP: la notificación al taller se realiza vía el campo `notas` JSON de `cat_operaciones_b2c` y el panel admin (`/admin/operaciones-taller.html`).

---

## DDL requerido para Fase 3+ (ver fase3_ddl.sql)

```sql
-- Columnas nuevas en cat_operaciones_b2c
ALTER TABLE cat_operaciones_b2c ADD COLUMN IF NOT EXISTS taller_id UUID REFERENCES cat_recomendaciones_talleres(id);
ALTER TABLE cat_operaciones_b2c ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'manual';
ALTER TABLE cat_operaciones_b2c ADD COLUMN IF NOT EXISTS pendiente_aprobacion_taller BOOLEAN DEFAULT FALSE;

-- Nueva tabla de notificaciones
CREATE TABLE IF NOT EXISTS cat_notificaciones_talleres (...);
```

El checkout Fase 3 funciona sin este DDL (usa notas JSON). El DDL mejora la integridad relacional y habilita el panel de talleres.

---

## Estados válidos de cat_operaciones_b2c

| Estado | Descripción |
|---|---|
| pendiente | Carrito activo o pedido esperando pago/confirmación |
| pagado | Pago confirmado (MP o manual) |
| enviado | En camino al cliente |
| entregado | Recibido por el cliente |
| cancelado | Cancelado por cualquier parte |
