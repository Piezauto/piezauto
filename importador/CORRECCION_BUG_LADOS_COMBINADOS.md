# CORRECCIÓN CRÍTICA #3 - BUG LADOS_COMBINADOS

**Bug detectado:** 26/04/2026 20:50h  
**Versión corregida:** importador_catalogo_v3.py

---

## 🐛 BUG CRÍTICO ENCONTRADO

**Ubicación:** Líneas 531-541 - Función `autogenerar_lados_combinados()`

**Problema:**
El importador creaba **3 equivalencias con el MISMO codigo_proveedor** para lados_combinados:

```python
# Equivalencia padre
(padre_id, proveedor_id, "XB7000")  # OK

# Equivalencia hijo D
(hijo_d_id, proveedor_id, "XB7000")  # DUPLICATE KEY!

# Equivalencia hijo I
(hijo_i_id, proveedor_id, "XB7000")  # Nunca llega
```

**Constraint violada:**
```sql
UNIQUE (proveedor_id, codigo_proveedor)
```

**Resultado:**
- Primera equivalencia (padre): OK
- Segunda equivalencia (hijo D): **FALLA con duplicate key**
- Transacción completa abortada → rollback

---

## ✅ CORRECCIÓN APLICADA

**Líneas 531-541 modificadas:**

```python
# Equivalencia hijo D (activa) - usar sufijo -D en codigo_proveedor
db.ejecutar_query(query_equiv, (
    hijo_d_id, proveedor_id, f"{sku_padre.codigo_proveedor}-D",
    sku_padre.precio_lista, sku_padre.precio_neto, True
))

# Equivalencia hijo I (activa) - usar sufijo -I en codigo_proveedor
db.ejecutar_query(query_equiv, (
    hijo_i_id, proveedor_id, f"{sku_padre.codigo_proveedor}-I",
    sku_padre.precio_lista, sku_padre.precio_neto, True
))
```

**Ahora cada equivalencia es única:**
- Padre: `(proveedor_id, "XB7000")`
- Hijo D: `(proveedor_id, "XB7000-D")`
- Hijo I: `(proveedor_id, "XB7000-I")`

---

## 📊 EJEMPLO FAROSDAM

**Código del proveedor:** XB7000 (Barrero Delantero/Trasero Chevrolet)

**SKUs generados:**
1. Padre: PZ-00036 (inactivo_venta)
2. Hijo D: PZ-00037 (activo_venta)
3. Hijo I: PZ-00038 (activo_venta)

**Equivalencias creadas:**
| sku_id | codigo_proveedor | activo |
|---|---|---|
| padre | XB7000 | FALSE |
| hijo_d | XB7000-D | TRUE |
| hijo_i | XB7000-I | TRUE |

**Constraint UNIQUE satisfecha:** ✅

---

## 🔍 IMPACTO

**Proveedores afectados:**
- Todos los que tienen `lados_combinados`
- Farosdam: 111 códigos con este tipo
- Cromosol: 313 códigos
- DM: 601 códigos
- Etc.

**Total estimado:** ~7.500 códigos en el catálogo completo

**Sin esta corrección:** NINGÚN proveedor con lados_combinados podría cargarse.

---

## 🎯 RESULTADO ESPERADO POST-CORRECCIÓN

**Para Farosdam:**

```
Total filas procesadas: 8153
Validadas: 8153
Rechazadas: 0
Lados combinados (padres): 111
Lados combinados (hijos): 222
```

**En cat_equivalencias:**
```sql
SELECT COUNT(*) FROM cat_equivalencias;
-- 8375 (8153 + 111 padre + 111 hijo_d + 111 hijo_i - 111 padre originales)
```

Espera, déjame corregir:
- 8153 SKUs en XLSX
- 111 son lados_combinados (111 códigos del proveedor)
- Cada uno genera: 1 padre + 1 hijo D + 1 hijo I = 3 SKUs
- Total SKUs físicos: 8153 - 111 + (111 × 3) = 8042 + 333 = **8375**

**Equivalencias:**
- 8042 simples: 1 equivalencia cada uno = 8042
- 111 lados_combinados: 3 equivalencias cada uno = 333
- **Total equivalencias: 8375**

---

## 📦 ARCHIVO CORREGIDO

**importador_catalogo_v3.py**

**Cambios respecto a v2:**
- Línea 532: `f"{sku_padre.codigo_proveedor}-D"`
- Línea 538: `f"{sku_padre.codigo_proveedor}-I"`

---

## 🚀 ACCIÓN REQUERIDA

### 1. Descargar v3

**Reemplazar** importador con **importador_catalogo_v3.py**

### 2. Re-ejecutar test Farosdam

```powershell
python importador_catalogo.py --proveedor Farosdam --archivo Farosdam.xlsx
```

### 3. Verificar resultado

```powershell
Get-Content importador.log -Tail 30
```

**Esperado:**
```
[OK] Transaccion confirmada
=== RESUMEN DE INGESTA ===
Total filas procesadas: 8153
Validadas: 8153
Rechazadas: 0
```

**En Supabase:**
```sql
SELECT COUNT(*) FROM cat_skus;  -- 8375
SELECT COUNT(*) FROM cat_equivalencias;  -- 8375
```

---

## 📝 ERRORES RESUELTOS (ACUMULADO)

1. ✅ Strings vacíos en ENUMs → `limpiar_valor_opcional()`
2. ✅ Caracteres Unicode en logging → ASCII puro
3. ✅ Equivalencias duplicadas lados_combinados → Sufijos -D / -I

---

*CTO - Comisión Directiva Piezauto*  
*26 de abril de 2026 - 20:55h*
