#!/usr/bin/env python3
"""
Extrae TODOS los códigos Cromosol de Supabase
"""

import psycopg2
import csv

# CREDENCIALES SUPABASE
# TODO: Usuario debe completar
DB_CONFIG = {
    'host': 'COMPLETAR.supabase.co',  # ej: abc-xyz-123.supabase.co
    'port': 5432,
    'dbname': 'postgres',
    'user': 'postgres',
    'password': 'COMPLETAR'  # Password de Supabase
}

def extraer_codigos_cromosol():
    """Extrae todos los códigos Cromosol y los guarda en archivo."""
    
    print("Conectando a Supabase...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    print("Extrayendo códigos Cromosol...")
    
    query = """
        SELECT DISTINCT codigo_proveedor 
        FROM cat_equivalencias 
        WHERE proveedor_id = (
            SELECT id FROM cat_proveedores WHERE nombre = 'Cromosol'
        )
        ORDER BY codigo_proveedor;
    """
    
    cursor.execute(query)
    codigos = cursor.fetchall()
    
    # Guardar en archivo txt (un código por línea)
    archivo_salida = 'codigos_cromosol_COMPLETO.txt'
    
    with open(archivo_salida, 'w') as f:
        for (codigo,) in codigos:
            f.write(f"{codigo}\n")
    
    cursor.close()
    conn.close()
    
    print(f"✅ {len(codigos)} códigos extraídos")
    print(f"✅ Archivo: {archivo_salida}")
    
    return len(codigos)

if __name__ == "__main__":
    total = extraer_codigos_cromosol()
    print(f"\n🎯 LISTO: {total} códigos Cromosol guardados")
    print("📁 Archivo: codigos_cromosol_COMPLETO.txt")
    print("\n▶️ SIGUIENTE: python3 extractor_dm_v2.py codigos_cromosol_COMPLETO.txt")
