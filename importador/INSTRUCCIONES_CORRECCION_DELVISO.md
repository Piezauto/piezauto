# CORRECCIÓN DELVISO + CONTINUACIÓN CARGA MASIVA

**Fecha:** 28 de abril de 2026  
**Problema:** Generador códigos Piezauto llegó a PZ-99999 y falló  
**Solución:** Importador v5.1 con formato 6 dígitos (PZ-000000 a PZ-999999)

---

## 🔴 PROBLEMA DETECTADO

El formato de códigos `PZ-XXXXX` (5 dígitos) alcanzó su límite en **PZ-99999**.

Cuando llegó a Delviso batch 33 (SKU ~8.248), intentó generar PZ-100000 pero:
1. El formato `:05d` solo soporta 5 dígitos
2. El ORDER BY alfabético hacía que "PZ-100000" < "PZ-99999"
3. Generaba PZ-100000 repetidamente → duplicate key error

**Resultado:**
- Delviso: 11.788 SKUs cargados ✅
- Delviso: 60 SKUs rechazados ❌ (todos por mismo error)

---

## ✅ FIX APLICADO EN v5.1

**Cambios:**
1. Formato: `PZ-{numero:05d}` → `PZ-{numero:06d}` (6 dígitos)
2. ORDER BY: por longitud primero, luego alfabético
3. Regex filter: solo códigos válidos `PZ-[números]` o `PZ-[números]-D/I`

**Capacidad:** De PZ-99999 a PZ-999999 (900.000 códigos adicionales)

---

## 📋 PASOS PARA CORREGIR

### PASO 1: Descargar importador v5.1

**El archivo está arriba** ↑ `importador_catalogo_v5_1.py`

Guardalo en: `C:\Users\feded\OneDrive\Escritorio\piezauto\importador\`

---

### PASO 2: Limpiar Delviso en Supabase

```sql
BEGIN;

DELETE FROM cat_equivalencias 
WHERE proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Delviso');

DELETE FROM cat_skus 
WHERE id NOT IN (SELECT DISTINCT sku_id FROM cat_equivalencias);

-- Verificar limpieza
SELECT COUNT(*) FROM cat_skus s
JOIN cat_equivalencias e ON e.sku_id = s.id
JOIN cat_proveedores p ON e.proveedor_id = p.id
WHERE p.nombre = 'Delviso';
-- Debe dar 0

COMMIT;
```

---

### PASO 3: Recargar Delviso con v5.1

```powershell
cd C:\Users\feded\OneDrive\Escritorio\piezauto\importador
python importador_catalogo_v5_1.py --proveedor Delviso --archivo Delviso.xlsx
```

**Esta vez debería terminar sin errores** (~55 min)

---

### PASO 4: Continuar con resto usando v5.1

**TODOS los siguientes deben usar v5.1** (no v5, no v4):

```powershell
# Otero (14k - ~1h 15min)
python importador_catalogo_v5_1.py --proveedor Otero --archivo Otero.xlsx
```

```powershell
# DM (28k - ~2h 30min)
python importador_catalogo_v5_1.py --proveedor DM --archivo DM.xlsx
```

```powershell
# Surpiezas (53k - ~4h 30min)
python importador_catalogo_v5_1.py --proveedor Surpiezas --archivo Surpiezas.xlsx
```

```powershell
# Expoyer (101k - ~8-9 horas - dejar nocturno)
python importador_catalogo_v5_1.py --proveedor Expoyer --archivo Expoyer.xlsx
```

---

## ⏱️ TIEMPO TOTAL RESTANTE

- Delviso (re-carga): ~55 min
- Otero: ~1h 15min
- DM: ~2h 30min
- Surpiezas: ~4h 30min
- Expoyer: ~8-9 horas

**Total:** ~17 horas desde ahora

---

## ✅ VERIFICACIÓN POST-CARGA

Después de cada proveedor, verificar con:

```sql
SELECT 
    p.nombre,
    COUNT(DISTINCT s.id) as skus
FROM cat_proveedores p
JOIN cat_equivalencias e ON e.proveedor_id = p.id
JOIN cat_skus s ON s.id = e.sku_id
WHERE p.nombre = 'NOMBRE_PROVEEDOR'
GROUP BY p.nombre;
```

---

*— CTO, Comisión Directiva Piezauto*
