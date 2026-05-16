# ECOSISTEMA DIGITAL PIEZAUTO
**Documento de referencia — Arquitectura de plataformas**  
**Autor:** CTO  
**Fecha:** 26 de abril de 2026 (v2 — corregido post comité)  
**Distribución:** CFO, COO, CPO, CMO General, CMO-Marketplace, Coordinador

---

## 1. PIEZAUTO (Plataforma B2C)

### Qué es
**Ecommerce multicanal** para venta de autopartes al público minorista. No es solo un sitio web — es el ecosistema completo de venta al consumidor final.

### Componentes
- **Web pública** (piezauto.com.ar): catálogo, búsqueda, carrito, checkout
- **Integración Mercado Libre**: publicación automática de catálogo, sync de ventas
- **Integración FB Marketplace** (roadmap): ídem ML
- **POS mostrador físico** (admin interno): ventas en el local con el mismo catálogo

### Quién la usa
- **Público minorista**: dueños de autos que compran piezas para arreglar su vehículo
- **Usuario final sin cuenta de taller**: puede ser tallerista pequeño que compra como persona física

### Funcionalidades core

**MVP (próximos 3 meses):**
- Catálogo navegable por vehículo/familia/marca
- Búsqueda por código OEM, descripción, aplicación
- Carrito de compras con matriz de precios (efectivo, transferencia, débito, cuotas)
- Checkout con opción retiro en local / envío
- Seguimiento de pedido
- POS mostrador con mismo catálogo

**Visión completa (6-12 meses):**
- Historial de compras del usuario
- Lista de favoritos y comparador
- Recomendaciones "clientes que compraron esto también compraron"
- Sistema de puntos fidelidad
- Notificaciones de ofertas personalizadas

### Canales que integra
1. **Mostrador físico**: POS interno, factura en el momento
2. **Web propia**: piezauto.com.ar (dominio reservado, uso futuro cuando la app sea pública)
3. **Mercado Libre**: publicaciones automáticas desde catálogo
4. **FB Marketplace**: roadmap Q3 2026

### Precios
Usa la **matriz de precios de consumidor final**:
- Factura B (consumidor final): precio lista con IVA × (1 + CFT según cuotas) — IVA neutral (débito fiscal)
- Factura C o sin factura: precio lista con IVA × (1 + CFT según cuotas) — IVA suma al costo
- Neto piso para efectivo/transferencia/débito
- Sin descuentos por volumen
- Sin acceso a precios de taller

---

## 2. PIEZAUTO POINT (Plataforma B2B)

### Qué es exactamente
**Portal web exclusivo para talleres de chapa y pintura registrados**. Es una plataforma de autogestión donde los talleres:
- Ven catálogo con precios mayoristas diferenciados
- Arman pedidos con su descuento de taller
- Consultan stock en tiempo real
- Gestionan crédito y cuenta corriente
- Ven historial de compras y facturas

### Quién es el usuario
**Talleres de chapa y pintura con cuenta activa en Piezauto**. Requisitos para acceder:
- Registro formal como taller (CUIT, domicilio fiscal)
- Aprobación y validación por CFO (verificación de taller real)
- Descuento inicial y límite de crédito definidos por CFO
- Firma de convenio de cuenta corriente (si aplica)
- Usuario y contraseña propios (no comparten login con B2C)

### Diferencia con Piezauto
| Aspecto | Piezauto (B2C) | Piezauto Point (B2B) |
|---|---|---|
| Acceso | Público, sin login | Requiere cuenta de taller aprobada |
| Precios | Lista con IVA + cuotas | Neto mayorista + descuento de taller |
| Stock visible | Stock general | Stock reservado para talleres |
| Pago | Contado (efectivo, tarjeta, transferencia) | Cuenta corriente, cheques, contado |
| Facturación | B o C al consumidor final | A a taller (IVA crédito fiscal) |
| Descuentos | No aplica | Sí, según perfil del taller |
| Límite de compra | No | Sí (límite de crédito por taller) |

### Por qué es plataforma separada
**3 razones arquitectónicas:**

1. **Segmentación de precios**: no queremos que el público vea precios mayoristas (evitar arbitraje)
2. **Flujo de autenticación distinto**: talleres requieren aprobación y verificación, consumidores no
3. **Funcionalidades específicas B2B**: cuenta corriente, órdenes recurrentes, reserva de stock, gestión de crédito — irrelevante para B2C

**No es un "módulo de admin con vista pública"** — es una aplicación completa con lógica de negocio propia.

### Estado actual de desarrollo
- **Estructura base**: HTML + CSS completado (point/index.html, dashboard.html)
- **Autenticación**: esqueleto creado, falta integración con Supabase
- **Dashboard**: wireframe funcional, falta conexión a catálogo
- **Funcionalidades pendientes**: carrito B2B, cuenta corriente, límite de crédito, historial

**Estado: 30% completado.** No es prioridad hasta que el catálogo esté operativo.

---

## 3. RELACIÓN ENTRE LAS DOS

### Comparten base de datos?
**SÍ.** Ambas usan la misma instancia de Supabase (mqxowotdeibllkitkije.supabase.co).

**Tablas compartidas:**
- `cat_skus`: catálogo único
- `cat_familias`, `cat_fabricantes`: metadata compartida
- `cat_vehiculos`, `cat_aplicaciones`: mismos vehículos y aplicaciones
- `cat_proveedores`, `cat_equivalencias`: gestión de stock compartida

**Tablas separadas:**
- `usuarios_b2c`: cuentas de consumidores finales (Piezauto)
- `usuarios_b2b`: cuentas de talleres (Piezauto Point)
- `ordenes_b2c`: pedidos de consumidores
- `ordenes_b2b`: pedidos de talleres
- `cuenta_corriente_talleres`: exclusivo B2B

### Comparten autenticación / cuentas?
**NO.** Sistemas de autenticación separados por seguridad y UX:

- **Piezauto (B2C)**: email + contraseña, login opcional (puede comprar como invitado)
- **Piezauto Point (B2B)**: CUIT + contraseña, login obligatorio, cuenta debe estar aprobada por CFO

**No hay "cuenta unificada"**. Un taller que quiera comprar como consumidor final usa Piezauto público sin login.

### Diferenciación de precios, stock, condiciones

#### PRECIOS
```sql
-- Piezauto (B2C): precio lista con IVA
-- Factura B: IVA neutral (débito fiscal)
-- Factura C o sin factura: IVA suma al costo
SELECT precio_neto * 1.21 as precio_venta
FROM cat_skus;

-- Piezauto Point (B2B): precio neto con descuento de taller
SELECT precio_neto * (1 - taller.descuento_porcentaje/100) as precio_venta
FROM cat_skus
JOIN talleres ON taller.id = current_user_taller;
```

#### STOCK
- **Piezauto (B2C)**: ve stock agregado (central + sucursales) sin detalle
- **Piezauto Point (B2B)**: ve stock por sucursal + puede reservar para retiro

#### CONDICIONES
| Condición | B2C | B2B |
|---|---|---|
| Forma de pago | Efectivo, tarjeta, transferencia | + Cuenta corriente, cheques |
| Plazo de pago | Contado | Hasta 30 días (según taller) |
| Envío | Retiro en local o envío a domicilio | + Retiro en sucursal específica |
| Factura | B o C | A (IVA discriminado) |
| Descuento por volumen | No | Sí (escala según taller) |

### Roadmap conjunto

**FASE 1 (Q2 2026): Catálogo operativo**
- Prioridad: Admin + importador XLSX
- Habilita: CPO puede enriquecer fabricantes
- Bloquea: ambas plataformas sin catálogo no funcionan

**FASE 2 (Q3 2026): Piezauto B2C**
- Prioridad: ecommerce público + POS mostrador
- Habilita: venta a consumidores finales
- Libera: integración ML

**FASE 3 (Q4 2026): Piezauto Point B2B**
- Prioridad: portal talleres + cuenta corriente
- Habilita: autogestión de talleres
- Libera: migración de talleres actuales desde Excel

**Orden justificado**: Piezauto B2C primero porque:
1. Genera ingresos inmediatos (mayor volumen de clientes)
2. No requiere aprobación manual de cuentas (menos fricción)
3. Flujo de pago más simple (contado, sin cuenta corriente)

---

## 4. ARQUITECTURA DE DOMINIOS Y URLs

**Decisión del dueño:**

### Dominios a registrar (no urgente)
- piezauto.com.ar (principal)
- piezauto.com
- piezauto.net

### Estructura de URLs
- **Piezauto B2C**: piezauto.com.ar/ (raíz)
- **Piezauto Point B2B**: piezauto.com.ar/point (path, no subdominio)

### Implicancias técnicas
**NO usar subdominio point.piezauto.com**. Arquitectura de routing y autenticación debe contemplar `/point` como path B2B autenticado dentro del mismo dominio raíz.

**Beneficios del approach de path:**
- Cookies compartidas (facilita logout/seguridad)
- Sesiones simplificadas
- SEO unificado (autoridad de dominio concentrada)
- Certificado SSL único
- Sin configuración DNS adicional

**Implementación:**
```javascript
// Routing
app.get('/', handleB2C);           // Público
app.get('/point/*', authenticateB2B, handleB2BRoutes); // Requiere login taller
```

---

## 5. IMPLICANCIAS PARA OTROS AGENTES

### Para CFO

**Matriz de IVA por canal (CORREGIDO):**
- **Piezauto (B2C) - Factura B**: IVA neutral (débito fiscal que se transfiere al fisco, no suma al costo)
- **Piezauto (B2C) - Factura C o sin factura**: IVA suma al costo real
- **Piezauto Point (B2B) - Factura A**: IVA discriminado, es crédito fiscal para el taller
- **POS mostrador**: puede ser B o C según cliente (persona física vs taller)

**Fórmulas de costo real por canal:**
```
B2C - Factura B: costo_real = precio_neto (IVA neutral, no suma al costo)
B2C - Factura C: costo_real = precio_neto * 1.21 (IVA suma al costo)
B2B formal: costo_real = precio_neto (IVA es crédito fiscal, no suma)
B2B con recargos no facturables: costo_real = precio_neto * (1 + recargos)
```

**Márgenes diferenciados:**
- B2C: margen bruto sobre precio con IVA (ej: 30% sobre $121)
- B2B: margen bruto sobre precio neto (ej: 15% sobre $100)

**Reportería requerida:**
- Ventas por canal (B2C, B2B, ML)
- Margen real por canal (considerando tipo_factura)
- Cuentas corrientes de talleres (saldos, vencimientos)

**Validación de talleres B2B:**
- CFO valida que sea taller real (inspección física o Google Maps)
- Define descuento inicial (default 10%, ajustable)
- Aprueba límite de crédito (si aplica cuenta corriente)

---

### Para COO

**Procesos diferenciados de fulfillment:**

| Proceso | B2C | B2B |
|---|---|---|
| Picking | Individual, por pedido | Batch, por taller |
| Empaque | Caja estándar con logo | Embalaje industrial |
| Envío | Correo / retiro en local | Retiro en sucursal / flete propio |
| Facturación | Automática al pago | Cierre mensual cuenta corriente |
| Devoluciones | 30 días sin usar | Solo defectos de fábrica |

**Stock reservado:**
- B2B puede reservar stock para retiro posterior (hasta 48hs)
- B2C no puede reservar (stock en tiempo real)

**Prioridad de picking:**
- Urgencias B2B (taller con auto en playa) > B2C > ML

---

### Para CPO

**Oportunidades de descuento desde el lado PROVEEDORES:**
- Negociación de descuentos comerciales con proveedores
- Identificación de proveedores alternativos con mejores márgenes
- Análisis de equivalencias para optimizar costos

**Enriquecimiento de catálogo:**
- Prioridad: SKUs que se venden más en B2C (mayor visibilidad)
- Secundario: SKUs específicos de talleres B2B

**Nota:** Validación de talleres, descuento inicial y límite de crédito son responsabilidad del CFO, no del CPO.

---

### Para CMO-Marketplace

**Qué SKUs van a qué canal:**

| Canal | SKUs a publicar | Criterio |
|---|---|---|
| **Piezauto web** | Todos los activos | Catálogo completo |
| **Mercado Libre** | Selección curada | Alta rotación + margen >25% + competencia baja |
| **FB Marketplace** | Selección curada | Piezas visuales (ópticas, paragolpes) + precio competitivo |
| **Piezauto Point** | Todos los activos | Catálogo completo B2B |

**Reglas de publicación ML:**
- No publicar SKUs con margen <20% (riesgo de pérdida con comisión ML)
- No publicar SKUs con stock <5 unidades (evitar cancelaciones)
- Actualizar precios cada 24hs (cache de tarifas ML)

**Comunicación diferenciada:**
- **B2C**: enfoque en precio final, facilidad de compra, rapidez de envío
- **B2B**: enfoque en descuento, stock disponible, plazo de pago

---

## RESUMEN EJECUTIVO PARA DIRECTIVA

**DOS PLATAFORMAS, UN ECOSISTEMA:**

1. **Piezauto** = B2C multicanal (web + ML + FB + mostrador)
   - Target: consumidor final
   - Precio: lista con IVA
   - Pago: contado
   - Prioridad: Q3 2026

2. **Piezauto Point** = B2B exclusivo talleres
   - Target: talleres registrados
   - Precio: neto con descuento
   - Pago: cuenta corriente
   - Prioridad: Q4 2026

**COMPARTEN:**
- Catálogo (base de datos única)
- Stock (visibilidad diferenciada)
- Admin (mismo panel de gestión)
- Dominio (path /point, no subdominio)

**NO COMPARTEN:**
- Autenticación (sistemas separados)
- Precios (matriz diferenciada)
- Condiciones comerciales

**ORDEN DE DESARROLLO:**
Catálogo → Piezauto B2C → Piezauto Point B2B

---

*Documento de referencia permanente. Actualizado por CTO según evolución del ecosistema.*
*Versión 2: Corregido post comité técnico Fase 2.*
