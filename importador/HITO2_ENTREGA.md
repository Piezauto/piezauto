# HITO 2 — IMPORTADOR COMPLETO Y LISTO PARA TESTING

**Estado:** ✅ Código completado, listo para ejecutar  
**Archivos disponibles:** 8 de 9 proveedores (falta Delviso)  
**Próximo paso:** Ejecutar test con Farosdam y validar resultados

---

## CÓDIGO COMPLETADO

### Funcionalidades implementadas

✅ **Validación de estructura XLSX**
- Verifica hoja "Normalizado"
- Valida columnas requeridas (18 columnas)
- Detecta archivos vacíos

✅ **Procesamiento completo de 5 tipos de lados**
- `lados_combinados` → autogenera padre + hijo D + hijo I
- `juego_indivisible` → SKU único con lado = 'Ambos'
- `kit` → SKU único con lado = 'N/A'
- `lado_explicito` → SKU único con lado del XLSX
- `sin_lado` → SKU único con lado = 'N/A'

✅ **Generación de códigos Piezauto secuenciales**
- Formato: PZ-00001, PZ-00002, ...
- Secuencial automático desde última entrada

✅ **Detección inteligente de tipo de fabricante**
- `fabricante_real`: Mahle, TYC, Bosch, Gates, etc.
- `etiqueta_origen`: Importado, Nacional, Original, IMP, NAC, ORIG
- `etiqueta_categoria`: Taiwan, Ind.Arg., Brasil, Genérico, Universal
- `marca_proveedor`: Autoclip, SG, Delviso, Por identificar

✅ **Creación automática de fabricantes y familias**
- Si no existen, se crean on-the-fly
- Identidad por tripla (nombre, tipo, familia)

✅ **Equivalencias proveedor ↔ SKU Piezauto**
- Cada SKU tiene N equivalencias (1 por proveedor)
- Snapshot de precios al momento de la carga

✅ **Sistema de logging completo**
- Consola + archivo importador.log
- Trazabilidad de errores por fila

✅ **Transacciones con rollback automático**
- Si falla 1 SKU, rollback completo del proveedor
- Base de datos queda consistente

---

## ARCHIVOS DISPONIBLES EN PROJECT

### Archivos v4 (5 proveedores)
1. **Cromosol_Normalizado_v4.xlsx** — 24.045 SKUs, 313 lados combinados
2. **BBA_Normalizado_v4.xlsx** — 10.765 SKUs, 0 lados combinados
3. **Otero_Normalizado_v4.xlsx** — 14.171 SKUs, 70 lados combinados
4. **DM_Normalizado_v4.xlsx** — 28.889 SKUs, 601 lados combinados
5. **Farosdam_Normalizado_v4.xlsx** — 8.153 SKUs, 111 lados combinados ⭐ **RECOMENDADO PARA TEST**

### Archivos v2/v3 (3 proveedores)
6. **Vaer_Normalizado_v3.xlsx** — 5.654 SKUs, 56 lados combinados
7. **Expoyer_Normalizado_v2.xlsx** — 101.306 SKUs, 823 lados combinados
8. **SG_Normalizado_v2.xlsx** — 5.689 SKUs, 194 lados combinados

### Faltante
9. **Delviso_Normalizado_v2.xlsx** — NO disponible en Project

**Total disponible:** 198.672 SKUs (94% del catálogo proyectado)

---

## INSTRUCCIONES DE TESTING

### PASO 1: Configurar credenciales Supabase

Editar `/home/claude/.env` y completar el password:

```bash
SUPABASE_HOST=db.mqxowotdeibllkitkije.supabase.co
SUPABASE_DB=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=TU_PASSWORD_REAL_AQUI  # ← COMPLETAR ESTO
SUPABASE_PORT=5432
```

### PASO 2: Instalar dependencias

```bash
cd /home/claude
pip install -r requirements.txt
```

### PASO 3: Ejecutar test con Farosdam

**¿Por qué Farosdam?**
- Tamaño medio (8.153 SKUs)
- Tiene lados combinados (111) para validar autogeneración
- Tiene SKUs simples (8.042) para validar creación normal
- Más rápido que Expoyer (101k SKUs) para test inicial

```bash
chmod +x test_importador.sh
./test_importador.sh
```

O manualmente:

```bash
python3 importador_catalogo.py \
    --proveedor Farosdam \
    --archivo /mnt/project/Farosdam_Normalizado_v4.xlsx
```

### PASO 4: Validar resultados en Supabase

Ejecutar estas queries en Supabase SQL Editor:

```sql
-- 1. Contar SKUs creados
SELECT COUNT(*) as total_skus FROM cat_skus;
-- Esperado: ~8.264 (8.153 originales + 111 padres lados_combinados)

-- 2. Contar por tipo_lados
SELECT tipo_lados, COUNT(*) as cantidad
FROM cat_skus
GROUP BY tipo_lados
ORDER BY cantidad DESC;

-- 3. Contar lados combinados
SELECT 
    COUNT(*) FILTER (WHERE es_padre = TRUE) as padres,
    COUNT(*) FILTER (WHERE es_padre = FALSE AND codigo_raiz IS NOT NULL) as hijos
FROM cat_skus
WHERE tipo_lados = 'lados_combinados';
-- Esperado: padres=111, hijos=222

-- 4. Verificar equivalencias
SELECT COUNT(*) as total_equivalencias FROM cat_equivalencias;
-- Esperado: ~8.375 (8.153 normales + 111 padres + 222 hijos)

-- 5. Ver fabricantes creados
SELECT tipo, COUNT(*) as cantidad
FROM cat_fabricantes
GROUP BY tipo
ORDER BY cantidad DESC;

-- 6. Ver familias creadas
SELECT nombre, COUNT(s.id) as skus
FROM cat_familias f
LEFT JOIN cat_skus s ON s.familia_id = f.id
GROUP BY f.nombre
ORDER BY skus DESC;
```

---

## RESULTADOS ESPERADOS DEL TEST

### Farosdam (8.153 SKUs)

**SKUs en cat_skus:**
- 111 padres (lados_combinados, activo_venta=FALSE)
- 222 hijos D+I (lados_combinados, activo_venta=TRUE)
- 7.820 SKUs simples (sin_lado, activo_venta=TRUE)
- **Total: 8.153 SKUs** (coincide con el XLSX)

**Equivalencias en cat_equivalencias:**
- 111 × 1 = 111 (padres inactivos)
- 222 × 1 = 222 (hijos D+I activos)
- 7.820 × 1 = 7.820 (simples activos)
- **Total: 8.153 equivalencias**

**Familias en cat_familias:**
- ~40 familias (según COO)

**Fabricantes en cat_fabricantes:**
- Genérico (tipo: etiqueta_categoria)
- + otros fabricantes reales

---

## ERRORES COMUNES Y SOLUCIONES

### Error: No se pudo conectar a Supabase

**Causa:** Password incorrecto en .env

**Solución:** Verificar password en Supabase Dashboard > Settings > Database

### Error: Ya existe código Piezauto

**Causa:** Segunda ejecución sin limpiar base de datos

**Solución:** Ejecutar TRUNCATE antes de re-intentar:

```sql
TRUNCATE cat_equivalencias CASCADE;
TRUNCATE cat_skus CASCADE;
-- Fabricantes y familias se reutilizan
```

### Error: Falta columna tipo_lados

**Causa:** Archivo no es v4

**Solución:** Usar solo archivos v4 (Cromosol, BBA, Otero, DM, Farosdam)

---

## PRÓXIMOS PASOS DESPUÉS DEL TEST EXITOSO

### 1. Procesar los 8 proveedores disponibles

```bash
# Archivos v4 (prioridad)
python3 importador_catalogo.py --proveedor Cromosol --archivo /mnt/project/Cromosol_Normalizado_v4.xlsx
python3 importador_catalogo.py --proveedor BBA --archivo /mnt/project/BBA_Normalizado_v4.xlsx
python3 importador_catalogo.py --proveedor Otero --archivo /mnt/project/Otero_Normalizado_v4.xlsx
python3 importador_catalogo.py --proveedor DM --archivo /mnt/project/DM_Normalizado_v4.xlsx
python3 importador_catalogo.py --proveedor Farosdam --archivo /mnt/project/Farosdam_Normalizado_v4.xlsx

# Archivos v2/v3
python3 importador_catalogo.py --proveedor Vaer --archivo /mnt/project/Vaer_Normalizado_v3.xlsx
python3 importador_catalogo.py --proveedor Expoyer --archivo /mnt/project/Expoyer_Normalizado_v2.xlsx
python3 importador_catalogo.py --proveedor SG --archivo /mnt/project/SG_Normalizado_v2.xlsx
```

### 2. Validar catálogo completo

```sql
-- Total SKUs esperado: ~199k (sin Delviso que aporta 11.848)
SELECT COUNT(*) FROM cat_skus;

-- Distribución por tipo_lados
SELECT tipo_lados, COUNT(*) 
FROM cat_skus 
GROUP BY tipo_lados;

-- Lados combinados totales
-- Esperado: ~2.168 padres, ~4.336 hijos (según reporte COO sin Delviso)
SELECT es_padre, COUNT(*) 
FROM cat_skus 
WHERE tipo_lados = 'lados_combinados' 
GROUP BY es_padre;
```

### 3. Cargar 65 familias con rentabilidades (TO-DO)

Crear script SQL con las 65 familias y sus rentabilidades del CFO.

### 4. Cargar 200 vehículos argentinos (TO-DO)

Crear script SQL con los 200 vehículos iniciales.

### 5. Habilitar CPO Mes 1

Una vez confirmados los ~199k SKUs en base:
- ✅ Hito 2 completado
- 🚀 Disparador CPO Mes 1: enriquecimiento de fabricantes

---

## ARCHIVOS ENTREGADOS

1. **importador_catalogo.py** — Importador completo (680 líneas)
2. **requirements.txt** — Dependencias Python
3. **.env** — Template de configuración (REQUIERE PASSWORD)
4. **test_importador.sh** — Script de test con Farosdam
5. **README_IMPORTADOR.md** — Documentación completa
6. **HITO2_ENTREGA.md** — Este documento

---

**LISTO PARA EJECUTAR.** Solo falta completar el password de Supabase en `.env` y correr el test.

---

*Autor: CTO*  
*Fecha: 26 de abril de 2026*  
*Estado: Código completo, esperando test*
