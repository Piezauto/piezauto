# INSTRUCCIONES CARGA MASIVA - 12 PROVEEDORES

**Fecha:** 27 de abril de 2026  
**Archivos:** Sprint 5 COO completo  
**Estado:** ✅ Listo para ejecutar

---

## 📊 RESUMEN SPRINT 5

| Concepto | Cantidad |
|---|---:|
| **Proveedores** | 12 |
| **SKUs únicos** | 266.166 |
| **Lados combinados** | 7.970 (generarán 15.940 hijos D/I) |
| **Hijos pre-armados** | 42 (Francar) |
| **SKUs físicos proyectados** | ~274.136 |
| **Batches estimados** | ~548 (500 SKUs/batch) |
| **Tiempo estimado** | 6-8 horas |

---

## ⚠️ DECISIÓN PREVIA REQUERIDA

**Actualmente la base de datos tiene:**
- 8.375 SKUs de Farosdam (test Hito 2)
- 7 fabricantes
- 40 familias

**¿Limpiar la base antes de la carga masiva?**

### Opción A: LIMPIAR (RECOMENDADO)

**Ventajas:**
- Catálogo limpio desde cero
- Códigos Piezauto empiezan en PZ-00001
- Sin duplicados de Farosdam

**Cómo:**
```sql
-- En Supabase SQL Editor
TRUNCATE TABLE cat_equivalencias CASCADE;
TRUNCATE TABLE cat_skus CASCADE;
DELETE FROM cat_fabricantes;
DELETE FROM cat_familias;
DELETE FROM cat_proveedores;

-- Verificar limpieza
SELECT COUNT(*) FROM cat_skus;  -- Debe dar 0
```

**Luego:** Ejecutar carga masiva con los 12 proveedores (incluyendo Farosdam nuevamente)

---

### Opción B: AGREGAR (no recomendado)

**Ventajas:**
- Farosdam ya está cargado
- Solo cargar 11 proveedores

**Desventajas:**
- Códigos Piezauto continúan desde PZ-08376
- Mezcla test con producción
- Difícil auditoría

**Cómo:**
- Eliminar Farosdam del script de carga
- Ejecutar solo 11 proveedores

---

## ✅ MI RECOMENDACIÓN: OPCIÓN A (LIMPIAR)

**Razones:**
1. Test de Farosdam fue solo para validar importador
2. Queremos catálogo de producción limpio
3. Códigos secuenciales desde PZ-00001
4. Mejor para auditoría y trazabilidad

---

## 📋 PASOS PARA CARGA MASIVA

### PASO 1: Preparar archivos (YA HECHO ✅)

Los 12 archivos + índice CSV están en:
```
C:\Users\feded\OneDrive\Escritorio\piezauto\importador\
```

---

### PASO 2: Limpiar base de datos (SI OPCIÓN A)

**En Supabase SQL Editor:**
```sql
TRUNCATE TABLE cat_equivalencias CASCADE;
TRUNCATE TABLE cat_skus CASCADE;
DELETE FROM cat_fabricantes;
DELETE FROM cat_familias;
DELETE FROM cat_proveedores;

SELECT COUNT(*) FROM cat_skus;  -- Verificar = 0
```

---

### PASO 3: Ejecutar carga masiva

**En PowerShell:**
```powershell
cd C:\Users\feded\OneDrive\Escritorio\piezauto\importador

# Ejecutar script de carga masiva
.\carga_masiva.ps1
```

**El script:**
- Lee catalogo_index.csv
- Procesa los 12 proveedores secuencialmente
- Muestra progreso en tiempo real
- Si un proveedor falla, pregunta si continuar
- Al final muestra resumen completo

---

### PASO 4: Monitorear progreso (OPCIONAL)

**En otra ventana PowerShell:**
```powershell
# Ver log en tiempo real
Get-Content importador.log -Wait -Tail 20
```

**En Supabase SQL Editor (ejecutar cada 15 minutos):**
```sql
-- Ver progreso total
SELECT COUNT(*) FROM cat_skus;

-- Ver por proveedor
SELECT 
    p.nombre,
    COUNT(*) as skus
FROM cat_proveedores p
LEFT JOIN cat_equivalencias e ON e.proveedor_id = p.id
GROUP BY p.id, p.nombre
ORDER BY p.nombre;
```

---

### PASO 5: Validación final

**Cuando termine (6-8 horas después), ejecutar en Supabase:**

```sql
-- Query 1: Total SKUs
SELECT COUNT(*) FROM cat_skus;
-- Esperado: ~274.136

-- Query 2: Total equivalencias
SELECT COUNT(*) FROM cat_equivalencias;
-- Esperado: ~274.136

-- Query 3: Distribución por proveedor
SELECT 
    p.nombre,
    COUNT(DISTINCT e.sku_id) as skus
FROM cat_proveedores p
JOIN cat_equivalencias e ON e.proveedor_id = p.id
GROUP BY p.id, p.nombre
ORDER BY COUNT(*) DESC;

-- Query 4: Distribución tipo_lados
SELECT tipo_lados, COUNT(*) 
FROM cat_skus 
GROUP BY tipo_lados
ORDER BY COUNT(*) DESC;

-- Query 5: Total fabricantes
SELECT COUNT(*) FROM cat_fabricantes;

-- Query 6: Total familias
SELECT COUNT(*) FROM cat_familias;

-- Query 7: Rango códigos Piezauto
SELECT 
    MIN(codigo_piezauto) as primero,
    MAX(codigo_piezauto) as ultimo,
    COUNT(*) as total
FROM cat_skus;
-- Esperado: PZ-00001 a PZ-~274136
```

---

## ⏱️ TIMELINE ESTIMADO

| Proveedor | SKUs | Batches | Tiempo est. |
|---|---:|---:|---|
| Cromosol | 24.045 | 49 | 50-90 min |
| BBA | 10.765 | 22 | 20-40 min |
| Otero | 14.171 | 29 | 30-60 min |
| DM | 28.889 | 58 | 60-120 min |
| Farosdam | 8.153 | 17 | 20-40 min |
| Vaer | 5.654 | 12 | 15-25 min |
| Delviso | 11.848 | 24 | 25-50 min |
| Expoyer | 101.306 | 203 | 200-400 min |
| SG | 5.689 | 12 | 15-25 min |
| Surpiezas | 53.709 | 108 | 110-220 min |
| Bark1 | 1.289 | 3 | 5-10 min |
| Francar | 648 | 2 | 5-10 min |
| **TOTAL** | **266.166** | **~548** | **6-8 horas** |

**Nota:** Expoyer es el más grande (101k SKUs) y tomará ~3-6 horas solo.

---

## 🚨 QUÉ HACER SI FALLA UN PROVEEDOR

El script preguntará si continuar. **Opciones:**

### A. Continuar con el resto
- Presionar "S" cuando pregunte
- Los demás proveedores se cargarán
- Al final corregir el que falló y re-ejecutarlo solo

### B. Detener todo
- Presionar "N"
- Revisar el error en importador.log
- Corregir el problema
- Re-ejecutar carga masiva completa

---

## 📝 ARCHIVOS ENTREGABLES

En `/mnt/user-data/outputs/`:

1. ✅ `carga_masiva.ps1` - Script PowerShell automático
2. ✅ `importador_catalogo_v4.py` - Importador con batches
3. ✅ `requirements.txt` - Dependencias Python

---

## ⚠️ IMPORTANTE - ANTES DE EJECUTAR

**Verificar:**
- [ ] Importador v4 en directorio (importador_catalogo.py)
- [ ] 12 archivos XLSX en directorio
- [ ] catalogo_index.csv en directorio
- [ ] Conexión Supabase funcionando (.env correcto)
- [ ] Base de datos limpiada (si Opción A)
- [ ] Tiempo disponible (6-8 horas sin interrupciones)

---

## 🎯 RESULTADO ESPERADO

**Al finalizar:**
```
✓ CARGA MASIVA COMPLETADA EXITOSAMENTE
Proveedores exitosos: 12/12
SKUs procesados: 266.166
Duración total: ~07:30:00
```

**En Supabase:**
```
cat_skus: ~274.136
cat_equivalencias: ~274.136
cat_fabricantes: ~50-100
cat_familias: ~65-85
cat_proveedores: 12
```

---

## 📞 PRÓXIMO CHECKPOINT

**Después de la carga masiva exitosa:**
- Hito 3: Recargos + Órdenes + Matriz Precios
- Fecha estimada: 29-30/04

---

*CTO - Comisión Directiva Piezauto*  
*27 de abril de 2026*
