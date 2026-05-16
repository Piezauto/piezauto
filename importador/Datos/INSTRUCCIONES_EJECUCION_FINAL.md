# 🚀 EXTRACCIÓN DM - INSTRUCCIONES FINALES

## ✅ TODO LISTO PARA EJECUTAR

**Archivos preparados:**
- ✅ 24,045 códigos Cromosol extraídos
- ✅ Script extractor configurado con cookies
- ✅ Tiempo estimado: ~3-4 horas

---

## 📋 EJECUTAR AHORA (copia y pega en terminal)

```bash
cd /mnt/user-data/outputs
python3 extractor_dm_v2.py codigos_cromosol_COMPLETO.txt
```

---

## 📊 QUÉ VAS A VER

```
Procesando 24045 códigos de codigos_cromosol_COMPLETO.txt
[1/24045] Buscando 1... ✗ Sin resultados
[2/24045] Buscando 1000/1... ✗ Sin resultados
...
[7259/24045] Buscando 2477/AD... ✓ 2 resultados
[7260/24045] Buscando 2477/D... ✓ 1 resultados
...
[24045/24045] Buscando 9999/X... ✗ Sin resultados

✅ Procesamiento completo. Resultados en: resultados_dm_TIMESTAMP.csv
```

---

## ⏱️ TIMING ESPERADO

- **Velocidad:** ~120 códigos/minuto
- **Duración total:** 3-4 horas
- **Primeros resultados:** Aparecen alrededor del código #7,259

---

## 📁 OUTPUT FINAL

**Archivo CSV generado:**
`resultados_dm_YYYYMMDD_HHMMSS.csv`

**Columnas:**
- codigo_cromosol
- codigo_dm
- descripcion
- fabricante
- precio
- tiene_stock
- depositos_con_stock
- timestamp
- status

---

## 🔧 SI NECESITÁS PAUSAR/REANUDAR

**Detener:** Ctrl+C

**Reanudar:** El script NO tiene checkpoint. Si interrumpís, tenés que empezar de nuevo.

**Alternativa:** Dejalo corriendo toda la noche.

---

## ⚠️ IMPORTANTE

**NO cierres la terminal** mientras corre. El proceso se detendrá.

**Alternativa (ejecutar en background):**
```bash
nohup python3 extractor_dm_v2.py codigos_cromosol_COMPLETO.txt > log.txt 2>&1 &
tail -f log.txt  # Para ver progreso
```

---

## ✅ CUANDO TERMINE

El archivo CSV estará en:
`/mnt/user-data/outputs/resultados_dm_TIMESTAMP.csv`

**Avisame y seguimos con la sincronización a Supabase.**

---

**EJECUTÁ EL COMANDO Y DEJALO CORRER.**
