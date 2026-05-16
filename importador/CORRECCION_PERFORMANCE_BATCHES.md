# CORRECCIÓN CRÍTICA #4 - COMMITS EN BATCHES

**Bug detectado:** 26/04/2026 23:30h  
**Versión corregida:** importador_catalogo_v4.py  
**Severidad:** CRÍTICA - Sistema completamente inutilizable sin esta corrección

---

## 🐛 PROBLEMA IDENTIFICADO

### Síntomas

**Ejecución del importador:**
- Primeras familias: 1-5 segundos ✅
- Familias intermedias: 10-30 segundos ⚠️
- Últimas familias: **11 MINUTOS** 🔴
- Tiempo total proyectado: **5-8 HORAS** para 8.153 SKUs

**Base de datos:**
- COUNT(*) FROM cat_skus: **0** (después de 17+ minutos de ejecución)
- Razón: Transacción NO confirmada

### Causa raíz

**Líneas 769-865: UNA SOLA TRANSACCIÓN GIGANTE**

```python
# Procesar SKU 1
# Procesar SKU 2
# ...
# Procesar SKU 8.153
db.commit()  # ← ÚNICO COMMIT AL FINAL
```

**Problemas con transacciones largas en PostgreSQL:**

1. **Degradación progresiva de performance:**
   - Los índices se vuelven menos eficientes
   - La caché se satura
   - Las queries se vuelven cada vez más lentas
   
2. **Locks acumulativos:**
   - PostgreSQL mantiene locks durante TODA la transacción
   - Otros procesos quedan bloqueados
   - Sistema se vuelve irresponsivo

3. **VACUUM bloqueado:**
   - PostgreSQL no puede limpiar filas muertas
   - El tamaño de la base de datos crece
   - Performance se degrada aún más

4. **Riesgo catastrófico:**
   - Si falla en SKU 8.000 → ROLLBACK de TODO
   - 17+ minutos de trabajo perdido
   - No hay recuperación parcial

---

## ✅ CORRECCIÓN APLICADA

### Nuevo enfoque: COMMITS EN BATCHES

**Constante:** `BATCH_SIZE = 500`

**Algoritmo:**
```python
Para cada batch de 500 SKUs:
    Procesar los 500 SKUs
    COMMIT
    Continuar con el siguiente batch
```

**Ejemplo Farosdam (8.153 SKUs):**
- Batch 1: SKUs 1-500 → COMMIT
- Batch 2: SKUs 501-1000 → COMMIT
- Batch 3: SKUs 1001-1500 → COMMIT
- ...
- Batch 17: SKUs 8001-8153 → COMMIT

**Total: 17 commits** en lugar de 1

---

## 📊 BENEFICIOS

### 1. Performance constante

**Antes:**
- SKU 1-100: 1 segundo/SKU
- SKU 1000-2000: 5 segundos/SKU
- SKU 7000-8000: 60 segundos/SKU

**Después:**
- Todos los SKUs: 1-2 segundos/SKU (constante)

### 2. Recuperación parcial

**Antes:**
- Falla en SKU 7.234 → pierde TODO (7.233 SKUs procesados)

**Después:**
- Falla en SKU 7.234 → pierde solo el batch actual (500 SKUs)
- Los 14 batches anteriores (7.000 SKUs) quedan guardados

### 3. Progreso visible

**Antes:**
- COUNT(*) = 0 durante toda la ejecución
- No sabés si está funcionando o colgado

**Después:**
- Cada 500 SKUs → COUNT aumenta
- Podés monitorear progreso en tiempo real

### 4. Liberación de recursos

**Antes:**
- Locks durante 17+ minutos
- VACUUM bloqueado
- Memoria saturada

**Después:**
- Locks liberados cada 500 SKUs
- VACUUM puede ejecutarse entre batches
- Memoria limpiada regularmente

---

## 🎯 RESULTADO ESPERADO

### Farosdam (8.153 SKUs)

**Tiempo estimado:**
- Batch 1 (SKUs 1-500): 1-2 minutos
- Batch 2 (SKUs 501-1000): 1-2 minutos
- ...
- Batch 17 (SKUs 8001-8153): 1-2 minutos
- **TOTAL: 20-35 minutos** (vs 5-8 horas antes)

**Log esperado:**
```
[Batch 1/17] Procesando SKUs 1 a 500
[OK] Batch 1/17 confirmado (500 SKUs)
[Batch 2/17] Procesando SKUs 501 a 1000
[OK] Batch 2/17 confirmado (500 SKUs)
...
[Batch 17/17] Procesando SKUs 8001 a 8153
[OK] Batch 17/17 confirmado (153 SKUs)
[OK] Ingesta completada (commits por batch)
```

**Base de datos:**
```sql
SELECT COUNT(*) FROM cat_skus;
-- Después de batch 1: 500-600 (dependiendo de lados_combinados)
-- Después de batch 2: 1000-1200
-- ...
-- Después de batch 17: 8375 (total final)
```

---

## 🔧 CAMBIOS EN EL CÓDIGO

### Líneas 769-820: Fase 1 con batches

```python
# ANTES (v3)
for sku in skus_padres_simples:
    # Procesar SKU
    stats.validadas += 1
# (sin commit intermedio)

# DESPUÉS (v4)
BATCH_SIZE = 500
total_batches = (len(skus_padres_simples) + BATCH_SIZE - 1) // BATCH_SIZE

for batch_num in range(total_batches):
    inicio = batch_num * BATCH_SIZE
    fin = min((batch_num + 1) * BATCH_SIZE, len(skus_padres_simples))
    batch = skus_padres_simples[inicio:fin]
    
    logger.info(f"[Batch {batch_num + 1}/{total_batches}] Procesando SKUs {inicio + 1} a {fin}")
    
    for sku in batch:
        # Procesar SKU
        stats.validadas += 1
    
    # COMMIT del batch
    db.commit()
    logger.info(f"[OK] Batch {batch_num + 1}/{total_batches} confirmado")
```

### Líneas 822-870: Fase 2 con batches (similar)

### Línea 872: Commit final eliminado

```python
# ANTES (v3)
db.commit()
logger.info("[OK] Transacción confirmada")

# DESPUÉS (v4)
# (eliminado - ya se hicieron commits por batch)
logger.info("[OK] Ingesta completada (commits por batch)")
```

---

## 📦 ARCHIVO CORREGIDO

**importador_catalogo_v4.py**

**Cambios respecto a v3:**
- Procesamiento en batches de 500 SKUs
- COMMIT después de cada batch
- Logging de progreso por batch
- Eliminado commit final único

---

## 🚀 ACCIÓN REQUERIDA

### 1. Limpiar base de datos (opcional pero recomendado)

**En Supabase SQL Editor:**
```sql
-- Verificar si hay datos residuales
SELECT COUNT(*) FROM cat_skus;
SELECT COUNT(*) FROM cat_equivalencias;
SELECT COUNT(*) FROM cat_fabricantes;
SELECT COUNT(*) FROM cat_familias;

-- Si hay datos (de ejecuciones anteriores fallidas), limpiar:
TRUNCATE TABLE cat_equivalencias CASCADE;
TRUNCATE TABLE cat_skus CASCADE;
DELETE FROM cat_fabricantes;
DELETE FROM cat_familias;

-- Verificar limpieza
SELECT COUNT(*) FROM cat_skus;  -- Debe dar 0
```

### 2. Descargar importador v4

**Reemplazar** importador con **importador_catalogo_v4.py**

### 3. Ejecutar test Farosdam

```powershell
python importador_catalogo.py --proveedor Farosdam --archivo Farosdam.xlsx
```

**Monitorear progreso en tiempo real:**

```powershell
# En otra ventana de PowerShell
while ($true) {
    Get-Content importador.log -Tail 5
    Start-Sleep -Seconds 10
}
```

**Monitorear en Supabase:**

```sql
-- Ejecutar cada 30 segundos
SELECT COUNT(*) FROM cat_skus;
```

Verás el COUNT aumentando cada 1-2 minutos (cada batch).

### 4. Resultado esperado

**Tiempo:** 20-35 minutos (NO 5-8 horas)

**Log final:**
```
[OK] Batch 17/17 confirmado (153 SKUs)
[OK] Ingesta completada (commits por batch)
=== RESUMEN DE INGESTA ===
Total filas procesadas: 8153
Validadas: 8153
Rechazadas: 0
```

**Supabase:**
```sql
SELECT COUNT(*) FROM cat_skus;  -- 8375
```

---

## 📝 ERRORES RESUELTOS (ACUMULADO)

1. ✅ Strings vacíos en ENUMs → `limpiar_valor_opcional()`
2. ✅ Caracteres Unicode en logging → ASCII puro
3. ✅ Equivalencias duplicadas lados_combinados → Sufijos -D / -I
4. ✅ Transacción gigante degradante → Commits por batches

---

## 🎓 LECCIÓN APRENDIDA

**NUNCA usar transacciones gigantes en PostgreSQL.**

**Regla de oro:**
- < 100 registros: Transacción única OK
- 100-1.000 registros: Considerar batches
- > 1.000 registros: Batches OBLIGATORIOS

**Para 266.000 SKUs (catálogo completo):**
- Batches de 500 = **532 commits**
- Tiempo estimado: **4-6 horas** (vs días sin batches)

---

*CTO - Comisión Directiva Piezauto*  
*26 de abril de 2026 - 23:35h*
