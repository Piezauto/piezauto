#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DM IMAGENES v1 — Piezauto
CTO — 12 de mayo de 2026

Vincula imágenes del catálogo DM a cat_skus en Supabase.

DESCUBRIMIENTO CLAVE:
  Las imágenes DM están en S3 público con URL determinista:
  codigo_dm "01/028/011" → https://s3.amazonaws.com/distribuidoradm/01-028-011.jpg
  NO se requiere Playwright. No hay descarga ni re-hosting.

MODOS:
  --preview   : Procesa primeras 50 filas, genera vinculacion_preview_50.csv. SIN writes.
  --execute   : Corre la vinculación masiva. REQUIERE aprobación CEO previa.
  --verify-50 : Hace HEAD request a cada URL del preview para confirmar existencia en S3.

USO:
  # Preview (siempre primero):
  python3 dm_imagenes_v1.py --preview

  # Verificar URLs del preview contra S3:
  python3 dm_imagenes_v1.py --verify-50

  # Ejecución masiva (solo después de aprobación CEO):
  python3 dm_imagenes_v1.py --execute

VARIABLES DE ENTORNO REQUERIDAS:
  SUPABASE_URL         https://mqxowotdeibllkitkije.supabase.co
  SUPABASE_SERVICE_KEY <service_role_key>
  CSV_PATH             Ruta al dm_extraccion_completa_20260505.csv

NOTAS TÉCNICAS:
  - R2 no requerido: imágenes se vinculan por URL S3 directa (egress $0 para nosotros)
  - Schema: requiere que ALTER TABLE ya esté ejecutado (codigo_dm, imagen_url en cat_skus)
  - Bulk limit: Operación sobre ~38k SKUs → requiere aprobación CEO (regla +5k)
  - Checkpoint: vinculacion_checkpoint.csv — reanudable en caso de corte
"""

import os
import sys
import time
import logging
import argparse
import requests
import pandas as pd
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

SUPABASE_URL     = os.getenv("SUPABASE_URL", "https://mqxowotdeibllkitkije.supabase.co")
SUPABASE_KEY     = os.getenv("SUPABASE_SERVICE_KEY", "")
CSV_PATH         = os.getenv("CSV_PATH", "dm_extraccion_completa_20260505.csv")

S3_BASE_URL      = "https://s3.amazonaws.com/distribuidoradm"
PREVIEW_FILE     = "vinculacion_preview_50.csv"
CHECKPOINT_FILE  = "vinculacion_checkpoint.csv"
LOG_FILE         = "dm_imagenes_v1.log"

PREVIEW_N        = 50
BATCH_SIZE       = 200        # SKUs por request PATCH a Supabase
SLEEP_BETWEEN    = 3.0        # segundos entre requests — aumentado de 0.3 para evitar ReadTimeout en Supabase

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def supabase_headers() -> dict:
    return {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }


def codigo_dm_to_s3_url(codigo_dm: str) -> str:
    """
    Transforma codigo_dm en URL de imagen S3.
    Ejemplo: "01/028/011" → "https://s3.amazonaws.com/distribuidoradm/01-028-011.jpg"
    """
    filename = str(codigo_dm).replace("/", "-")
    return f"{S3_BASE_URL}/{filename}.jpg"


def cargar_csv(path: str) -> pd.DataFrame:
    log.info(f"Cargando CSV: {path}")
    df = pd.read_csv(path, low_memory=False)
    log.info(f"  Total filas: {len(df)}")
    log.info(f"  Status counts: {df['status'].value_counts().to_dict()}")
    return df


def filtrar_procesables(df: pd.DataFrame) -> pd.DataFrame:
    """
    Retiene filas con status='ok' (matched con DM).
    Ordena: calidad_match='alta' primero, luego 'ambigua'.
    """
    ok = df[df["status"] == "ok"].copy()
    ok["orden"] = ok["calidad_match"].map({"alta": 0, "ambigua": 1}).fillna(2)
    ok = ok.sort_values("orden").reset_index(drop=True)
    log.info(f"  Filas procesables (status=ok): {len(ok)}")
    log.info(f"    Alta calidad: {(ok['calidad_match']=='alta').sum()}")
    log.info(f"    Ambigua:      {(ok['calidad_match']=='ambigua').sum()}")
    return ok


# ─────────────────────────────────────────────────────────────────────────────
# VINCULACIÓN: encontrar SKUs por OEM o por Cromosol
# ─────────────────────────────────────────────────────────────────────────────


def _get_con_retry(url: str, headers: dict, params: dict = None, timeout: int = 30) -> "requests.Response | None":
    """
    GET con retry automático ante timeout o error de red.
    Hasta 3 intentos con backoff de 5s, 10s, 15s.
    """
    for intento in range(1, 4):
        try:
            r = requests.get(url, headers=headers, params=params, timeout=timeout)
            return r
        except (requests.exceptions.Timeout,
                requests.exceptions.ConnectionError,
                requests.exceptions.ReadTimeout) as e:
            espera = intento * 5
            log.warning(f"    GET timeout/error intento {intento}/3: {type(e).__name__}. Reintentando en {espera}s...")
            time.sleep(espera)
        except Exception as e:
            log.warning(f"    GET error inesperado: {e}")
            return None
    log.error(f"    GET falló tras 3 intentos: {url[:60]}")
    return None

def buscar_skus_por_oem(codigo_oem: str) -> list[str]:
    """
    Busca IDs de SKUs en cat_skus donde codigo_oem coincide.
    Retorna lista de UUIDs.
    """
    url = f"{SUPABASE_URL}/rest/v1/cat_skus"
    params = {
        "select":    "id",
        "codigo_oem": f"eq.{codigo_oem.strip()}",
    }
    r = requests.get(url, headers=supabase_headers(), params=params, timeout=30)
    if r.status_code == 200:
        return [row["id"] for row in r.json()]
    else:
        log.warning(f"    OEM lookup fail ({codigo_oem}): {r.status_code} {r.text[:100]}")
        return []


def buscar_skus_por_cromosol(codigo_cromosol: str) -> list[str]:
    """
    Busca SKUs vinculados a un codigo Cromosol via cat_equivalencias.
    Cromosol proveedor_id: se obtiene de cat_proveedores WHERE nombre='Cromosol'.
    """
    # Primero: resolver proveedor_id de Cromosol (puede cachearse)
    url_prov = f"{SUPABASE_URL}/rest/v1/cat_proveedores"
    r_prov = requests.get(
        url_prov,
        headers=supabase_headers(),
        params={"select": "id", "nombre": "eq.Cromosol"},
        timeout=30,
    )
    if r_prov.status_code != 200 or not r_prov.json():
        log.warning(f"    No se encontró proveedor Cromosol")
        return []

    cromosol_proveedor_id = r_prov.json()[0]["id"]

    # Luego: buscar en cat_equivalencias
    url_eq = f"{SUPABASE_URL}/rest/v1/cat_equivalencias"
    r_eq = requests.get(
        url_eq,
        headers=supabase_headers(),
        params={
            "select":           "sku_id",
            "proveedor_id":     f"eq.{cromosol_proveedor_id}",
            "codigo_proveedor": f"eq.{str(codigo_cromosol).strip()}",
        },
        timeout=30,
    )
    if r_eq.status_code == 200:
        return [row["sku_id"] for row in r_eq.json()]
    else:
        log.warning(f"    Cromosol equiv lookup fail ({codigo_cromosol}): {r_eq.status_code}")
        return []


def resolver_skus(row: pd.Series) -> tuple[list[str], str]:
    """
    Dado un row del CSV, retorna (lista_sku_ids, metodo_vinculacion).
    Prioridad: OEM directo > Cromosol equivalencia.
    """
    if pd.notna(row.get("codigo_oem")):
        skus = buscar_skus_por_oem(str(row["codigo_oem"]))
        if skus:
            return skus, "oem_directo"

    if pd.notna(row.get("codigo_cromosol")):
        skus = buscar_skus_por_cromosol(str(row["codigo_cromosol"]))
        if skus:
            return skus, "cromosol_equivalencia"

    return [], "sin_vinculacion"


# ─────────────────────────────────────────────────────────────────────────────
# VERIFICACIÓN S3
# ─────────────────────────────────────────────────────────────────────────────

def verificar_url_s3(url: str) -> bool:
    """HEAD request para confirmar que la imagen existe en S3."""
    try:
        r = requests.head(url, timeout=5, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
# UPDATE SUPABASE
# ─────────────────────────────────────────────────────────────────────────────

def actualizar_sku(sku_id: str, codigo_dm: str, imagen_url: str) -> bool:
    """
    PATCH un SKU con codigo_dm e imagen_url.
    Reintenta hasta 3 veces con backoff ante timeout o error de red.
    """
    url = f"{SUPABASE_URL}/rest/v1/cat_skus"
    for intento in range(1, 4):
        try:
            r = requests.patch(
                url,
                headers={**supabase_headers(), "Prefer": "return=minimal"},
                params={"id": f"eq.{sku_id}"},
                json={"codigo_dm": codigo_dm, "imagen_url": imagen_url},
                timeout=20,
            )
            return r.status_code in (200, 204)
        except (requests.exceptions.Timeout,
                requests.exceptions.ConnectionError,
                requests.exceptions.ReadTimeout) as e:
            espera = intento * 5
            log.warning(f"    Red/Timeout intento {intento}/3: {type(e).__name__}. Reintentando en {espera}s...")
            time.sleep(espera)
        except Exception as e:
            log.warning(f"    Error inesperado PATCH: {e}")
            return False
    log.error(f"    Fallo tras 3 intentos: {sku_id}")
    return False


# ─────────────────────────────────────────────────────────────────────────────
# MODO PREVIEW
# ─────────────────────────────────────────────────────────────────────────────

def modo_preview():
    """
    Procesa las primeras PREVIEW_N filas procesables.
    Consulta Supabase para resolver SKUs.
    Genera vinculacion_preview_50.csv.
    SIN ningún UPDATE a la base de datos.
    """
    log.info("═" * 60)
    log.info("MODO PREVIEW — Sin writes a la base de datos")
    log.info("═" * 60)

    if not SUPABASE_KEY:
        log.error("SUPABASE_SERVICE_KEY no configurada. Exportar variable de entorno.")
        sys.exit(1)

    df = cargar_csv(CSV_PATH)
    procesables = filtrar_procesables(df).head(PREVIEW_N)

    resultados = []
    for i, (_, row) in enumerate(procesables.iterrows(), 1):
        codigo_dm = str(row["codigo_dm"])
        url_imagen = codigo_dm_to_s3_url(codigo_dm)

        log.info(f"[{i:02d}/{PREVIEW_N}] {codigo_dm} → {url_imagen}")

        skus, metodo = resolver_skus(row)

        resultados.append({
            "codigo_dm":         codigo_dm,
            "url_imagen":        url_imagen,
            "skus_vinculados":   len(skus),
            "sku_ids":           "|".join(skus) if skus else "",
            "metodo_vinculacion": metodo,
            "calidad_match":     row.get("calidad_match", ""),
            "descripcion_dm":    row.get("descripcion_dm", ""),
            "codigo_oem":        row.get("codigo_oem", ""),
            "codigo_cromosol":   row.get("codigo_cromosol", ""),
        })

        time.sleep(SLEEP_BETWEEN)

    preview_df = pd.DataFrame(resultados)
    preview_df.to_csv(PREVIEW_FILE, index=False)

    # Resumen
    total_skus  = preview_df["skus_vinculados"].sum()
    con_match   = (preview_df["skus_vinculados"] > 0).sum()
    sin_match   = (preview_df["skus_vinculados"] == 0).sum()

    log.info("─" * 60)
    log.info(f"PREVIEW COMPLETADO")
    log.info(f"  Imágenes evaluadas : {len(preview_df)}")
    log.info(f"  Con SKUs vinculados: {con_match}")
    log.info(f"  Sin match          : {sin_match}")
    log.info(f"  Total SKUs a update: {total_skus}")
    log.info(f"  Archivo generado   : {PREVIEW_FILE}")
    log.info("─" * 60)
    log.info("Traer preview al CEO para aprobación antes de --execute")


# ─────────────────────────────────────────────────────────────────────────────
# MODO VERIFY-50
# ─────────────────────────────────────────────────────────────────────────────

def modo_verify_50():
    """
    Lee vinculacion_preview_50.csv y hace HEAD a cada URL S3.
    Confirma cuántas imágenes existen físicamente.
    """
    log.info("═" * 60)
    log.info("MODO VERIFY-50 — Verificando URLs S3")
    log.info("═" * 60)

    if not Path(PREVIEW_FILE).exists():
        log.error(f"Archivo no encontrado: {PREVIEW_FILE}. Ejecutar --preview primero.")
        sys.exit(1)

    df = pd.read_csv(PREVIEW_FILE)
    existentes = 0
    no_existen = 0
    errores    = []

    for i, row in df.iterrows():
        url = row["url_imagen"]
        ok  = verificar_url_s3(url)
        status = "✅" if ok else "❌"
        log.info(f"  {status} {url}")
        if ok:
            existentes += 1
        else:
            no_existen += 1
            errores.append(row["codigo_dm"])
        time.sleep(0.2)

    log.info("─" * 60)
    log.info(f"RESULTADO: {existentes}/{len(df)} URLs existen en S3")
    if errores:
        log.warning(f"  Sin imagen: {errores}")
    log.info("─" * 60)


# ─────────────────────────────────────────────────────────────────────────────
# MODO EXECUTE  (requiere aprobación CEO explícita)
# ─────────────────────────────────────────────────────────────────────────────

def modo_execute():
    """
    Ejecuta la vinculación masiva sobre todas las filas procesables.
    REQUIERE aprobación CEO. Operación sobre +5k SKUs.
    """
    log.info("═" * 60)
    log.info("MODO EXECUTE — Vinculación masiva")
    log.info("REQUIERE aprobación CEO — regla bulk +5k SKUs")
    log.info("═" * 60)

    if not SUPABASE_KEY:
        log.error("SUPABASE_SERVICE_KEY no configurada.")
        sys.exit(1)

    # Cargar checkpoint si existe (reanudable)
    procesados_dm = set()
    if Path(CHECKPOINT_FILE).exists():
        ck = pd.read_csv(CHECKPOINT_FILE)
        procesados_dm = set(ck["codigo_dm"].tolist())
        log.info(f"  Checkpoint: {len(procesados_dm)} ya procesados, continuando...")

    df = cargar_csv(CSV_PATH)
    procesables = filtrar_procesables(df)
    pendientes  = procesables[~procesables["codigo_dm"].isin(procesados_dm)]

    log.info(f"  Pendientes: {len(pendientes)}")
    log.info(f"  Procesados (checkpoint): {len(procesados_dm)}")

    checkpoint_rows = []
    ok_count  = 0
    err_count = 0
    skip_count = 0

    for i, (_, row) in enumerate(pendientes.iterrows(), 1):
        codigo_dm  = str(row["codigo_dm"])
        url_imagen = codigo_dm_to_s3_url(codigo_dm)

        skus, metodo = resolver_skus(row)

        try:
            if not skus:
                log.info(f"  [{i}] SKIP {codigo_dm} — sin SKUs match")
                skip_count += 1
            else:
                for sku_id in skus:
                    success = actualizar_sku(sku_id, codigo_dm, url_imagen)
                    if success:
                        ok_count += 1
                    else:
                        err_count += 1
                        log.warning(f"  PATCH fail: sku_id={sku_id} codigo_dm={codigo_dm}")

                log.info(f"  [{i}] OK {codigo_dm} → {len(skus)} SKUs ({metodo})")
        except Exception as e:
            log.error(f"  [{i}] ERROR INESPERADO en {codigo_dm}: {e} — continuando...")
            err_count += 1

        # Guardar en checkpoint
        checkpoint_rows.append({
            "codigo_dm": codigo_dm,
            "url_imagen": url_imagen,
            "skus_count": len(skus),
            "metodo": metodo,
            "timestamp": datetime.now().isoformat(),
        })

        # Flush checkpoint cada 100 filas
        if len(checkpoint_rows) % 100 == 0:
            pd.DataFrame(checkpoint_rows).to_csv(CHECKPOINT_FILE, index=False, mode="a",
                                                  header=not Path(CHECKPOINT_FILE).exists())
            checkpoint_rows = []

        time.sleep(SLEEP_BETWEEN)

    # Flush final
    if checkpoint_rows:
        pd.DataFrame(checkpoint_rows).to_csv(CHECKPOINT_FILE, index=False, mode="a",
                                              header=not Path(CHECKPOINT_FILE).exists())

    log.info("═" * 60)
    log.info(f"EXECUTE COMPLETADO")
    log.info(f"  SKUs actualizados: {ok_count}")
    log.info(f"  Errores PATCH    : {err_count}")
    log.info(f"  Sin match (skip) : {skip_count}")
    log.info(f"  Checkpoint       : {CHECKPOINT_FILE}")
    log.info("═" * 60)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DM Imagenes Vinculador v1")
    group  = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--preview",   action="store_true", help="Generar preview 50 filas (sin writes)")
    group.add_argument("--verify-50", action="store_true", help="Verificar URLs S3 del preview")
    group.add_argument("--execute",   action="store_true", help="Ejecutar vinculación masiva (requiere aprobación CEO)")
    args = parser.parse_args()

    if args.preview:
        modo_preview()
    elif args.verify_50:
        modo_verify_50()
    elif args.execute:
        # Doble confirmación por consola antes de execute
        print("\n⚠️  MODO EXECUTE — Operación sobre +38k SKUs")
        print("   Requiere aprobación CEO explícita (regla bulk +5k)")
        confirm = input("   Escribí APROBADO para continuar: ").strip()
        if confirm != "APROBADO":
            print("   Cancelado.")
            sys.exit(0)
        modo_execute()
