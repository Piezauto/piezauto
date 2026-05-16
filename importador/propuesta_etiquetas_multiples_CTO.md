# Propuesta de modelo — Etiquetas múltiples para SKUs (cat_sku_etiquetas)

**De:** COO — Comisión Directiva
**Para:** CTO + Coordinador
**Fecha:** 27 de abril de 2026
**Estado:** Propuesta para evaluación. NO bloqueante. Implementación diferida hasta que Coordinador defina momento.

---

## Resumen ejecutivo

El dueño solicitó que un mismo SKU pueda pertenecer a **múltiples categorías simultáneamente** para mejorar la navegación del usuario en la plataforma. Caso típico: un "clip de tapizado de puerta" debería aparecer tanto bajo "Bulonería > Clips plásticos" (vista del que busca por tipo de pieza) como bajo "Puertas > Tapicería" (vista del que busca por sistema del auto).

Esta propuesta no bloquea ninguna entrega actual. La carga masiva del Sprint 5 está en curso y termina con el modelo actual de **una familia única por SKU** (campo `familia_sugerida` en `cat_skus`).

El dueño autorizó: "es necesario que exista esta intervención, pero no necesariamente el momento. Quizá pueda verse en mejor resultado cuando estén corriendo todas las listas." Mi recomendación operativa coincide: implementar después que el catálogo base esté en producción y antes del Hito 4 (UI mostrador), para que el CTO la incorpore en el diseño de la UI.

---

## Casos de uso del negocio

**Caso 1 — Clip de tapizado de puerta**
- Hoy queda en "Tapizados" (familia única).
- Con el modelo nuevo: etiquetas adicionales "Bulonería > Clips plásticos" y "Carrocería > Puertas > Tapicería".
- Un cliente que busca "todos los clips" lo encuentra. Un cliente que busca "todas las piezas de la puerta" también lo encuentra.

**Caso 2 — Vidrio de óptica con aplicación universal**
- Hoy queda en "Vidrios y lentes de óptica".
- Con etiquetas: "Iluminación > Ópticas", "Cristales > Vidrios", y por marca "Fiat", "Citroën", etc.

**Caso 3 — Pieza Stellantis con código auto cruzado**
- Una pieza que figura en codigo_auto Citroën Jumpy + Peugeot Expert.
- Hoy: aparece dos veces en aplicaciones (concatenadas con `;`).
- Con etiquetas: "Marca > Citroën > Jumpy" + "Marca > Peugeot > Expert", filtrable por menú.

---

## Modelo SQL propuesto

```sql
-- Tabla de etiquetas (jerarquía opcional)
CREATE TABLE cat_etiquetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    parent_id UUID NULL REFERENCES cat_etiquetas(id) ON DELETE SET NULL,
    tipo VARCHAR(30) NOT NULL,  -- 'navegacion', 'marca', 'sistema', 'uso', 'caracteristica'
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion TEXT NULL,
    orden_display INTEGER NULL,
    UNIQUE(nombre, tipo)
);

CREATE INDEX idx_etiquetas_parent ON cat_etiquetas(parent_id);
CREATE INDEX idx_etiquetas_tipo ON cat_etiquetas(tipo);

-- Relación N:N entre SKUs y etiquetas
CREATE TABLE cat_sku_etiquetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL REFERENCES cat_skus(id) ON DELETE CASCADE,
    etiqueta_id UUID NOT NULL REFERENCES cat_etiquetas(id) ON DELETE CASCADE,
    asignada_por VARCHAR(50) NOT NULL,  -- 'auto_regla' / 'manual_cpo' / 'manual_coo' / 'sync_proveedor'
    confianza VARCHAR(20) NOT NULL DEFAULT 'alta',  -- 'alta' / 'media' / 'baja'
    creada_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notas TEXT NULL,
    UNIQUE(sku_id, etiqueta_id)
);

CREATE INDEX idx_sku_etiq_sku ON cat_sku_etiquetas(sku_id);
CREATE INDEX idx_sku_etiq_etiq ON cat_sku_etiquetas(etiqueta_id);
```

## Tipos de etiqueta propuestos

| Tipo | Ejemplo | Cómo se asigna |
|---|---|---|
| `navegacion` | Bulonería > Clips plásticos | Automática por reglas COO (o manual CPO) |
| `marca` | Volkswagen > VW 1500-1800 | Automática desde campo aplicaciones |
| `sistema` | Frenos / Suspensión / Iluminación | Inferida desde familia + descripción |
| `uso` | Tapizado / Carrocería / Motor | Inferida desde palabras clave |
| `caracteristica` | Original / Importado / Universal | Desde fabricante o etiqueta proveedor |

## Reglas operativas

**1. Compatibilidad con modelo actual**
- `cat_skus.familia_sugerida` se mantiene como categorización **principal/canónica**.
- `cat_sku_etiquetas` agrega vistas alternativas sin reemplazar el campo principal.
- Si un SKU tiene 0 etiquetas, sigue funcionando exactamente igual que hoy.

**2. Asignación inicial**
- Para los ~276.000 SKUs ya cargados, COO ejecuta una pasada que genera etiquetas automáticas según reglas (1 turno mío).
- Estimado: 600-900k registros en `cat_sku_etiquetas` (cada SKU termina con 2-4 etiquetas en promedio).

**3. Mantenimiento posterior**
- Cuando entra una nueva versión de lista de un proveedor, el importador ejecuta las reglas de etiqueta automáticamente sobre los SKUs nuevos.
- El CPO puede agregar etiquetas manuales en su trabajo de Mes 2-3 de enriquecimiento.

**4. Performance**
- Búsqueda por etiqueta es O(1) con índice en `etiqueta_id`.
- Listar todas las etiquetas de un SKU es O(1) con índice en `sku_id`.

---

## Cómo se ve en la UI (sugerencia para Hito 4)

```
┌──────────────────────────────────────────────────────┐
│  Producto: CLIP TAPIZADO PUERTA VW 1500-1800 NEGRO   │
│  Código: VAE-12345  |  Vaer  |  $850                 │
│                                                       │
│  Familia principal: Tapizados                         │
│                                                       │
│  Etiquetas:                                           │
│  [Bulonería ▸ Clips plásticos]  [Carrocería ▸        │
│   Puertas ▸ Tapicería]  [Volkswagen ▸ VW 1500-1800]  │
│                                                       │
│  ► Click en cualquier etiqueta = lista todos los     │
│    SKUs con esa etiqueta                             │
└──────────────────────────────────────────────────────┘
```

En el menú lateral de búsqueda, el operador puede navegar por:
- Por familia (modelo actual)
- Por etiqueta de navegación (nuevo)
- Por marca de auto (nuevo)
- Combinación de filtros (nuevo)

---

## Estimación de implementación CTO

- DDL + endpoints CRUD: 1-2 días.
- UI de filtros múltiples en mostrador: 3-5 días (parte del Hito 4).
- Pasada inicial de etiquetas (lo hace COO con script): 1 turno.

**Total: ~1 semana CTO + 1 turno COO.**

---

## Decisiones pendientes para comité COO + CTO + Coordinador

1. **¿Implementar antes o después de Hito 4 UI mostrador?** Mi voto: durante Hito 4, integrado en el diseño de la UI.
2. **¿Quién define la jerarquía inicial de etiquetas de navegación?** Mi voto: borrador del COO, aprobación del dueño.
3. **¿Las etiquetas se versionan?** (es decir: si cambian las reglas, se reasignan retroactivamente o se respeta el histórico). Mi voto: solo versión actual, sin histórico.
4. **¿Confianza por etiqueta es necesaria?** El campo `confianza` permite distinguir etiquetas asignadas por regla automática (alta) de heurísticas dudosas (baja). Mi voto: sí, ayuda al CPO a priorizar revisión manual.

---

*— COO, Comisión Directiva Piezauto*
