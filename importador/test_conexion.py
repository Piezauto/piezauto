#!/usr/bin/env python3
"""Script de diagnóstico - detectar problema de conexión"""

import os
from dotenv import load_dotenv
import socket

print("=" * 60)
print("DIAGNÓSTICO CONEXIÓN SUPABASE")
print("=" * 60)

# 1. Verificar carga de .env
print("\n[1] Cargando .env...")
load_dotenv()

# 2. Mostrar variables (sin password)
print("\n[2] Variables de entorno:")
print(f"  SUPABASE_HOST: '{os.getenv('SUPABASE_HOST')}'")
print(f"  SUPABASE_DB: '{os.getenv('SUPABASE_DB')}'")
print(f"  SUPABASE_USER: '{os.getenv('SUPABASE_USER')}'")
print(f"  SUPABASE_PASSWORD: {'[PRESENTE]' if os.getenv('SUPABASE_PASSWORD') else '[FALTANTE]'}")
print(f"  SUPABASE_PORT: '{os.getenv('SUPABASE_PORT')}'")

# 3. Test de DNS
host = os.getenv('SUPABASE_HOST')
print(f"\n[3] Test DNS para '{host}'...")

if not host:
    print("  ❌ SUPABASE_HOST está vacío!")
else:
    try:
        ip = socket.gethostbyname(host)
        print(f"  ✅ Resuelve a: {ip}")
    except socket.gaierror as e:
        print(f"  ❌ NO PUEDE RESOLVER: {e}")
        print(f"\n[DEBUG] Host raw: {repr(host)}")
        print(f"[DEBUG] Host length: {len(host)} chars")
        print(f"[DEBUG] Host bytes: {host.encode()}")

# 4. Test de conexión TCP
port = int(os.getenv('SUPABASE_PORT', '5432'))
print(f"\n[4] Test conexión TCP a {host}:{port}...")

if host:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"  ✅ Puerto {port} está abierto")
        else:
            print(f"  ❌ Puerto {port} cerrado o inaccesible")
    except Exception as e:
        print(f"  ❌ Error: {e}")

# 5. Test psycopg
print(f"\n[5] Test conexión psycopg...")
try:
    import psycopg
    conn = psycopg.connect(
        host=os.getenv('SUPABASE_HOST'),
        dbname=os.getenv('SUPABASE_DB'),
        user=os.getenv('SUPABASE_USER'),
        password=os.getenv('SUPABASE_PASSWORD'),
        port=os.getenv('SUPABASE_PORT', '5432'),
        connect_timeout=10
    )
    print("  ✅ CONEXIÓN EXITOSA!")
    conn.close()
except Exception as e:
    print(f"  ❌ ERROR: {e}")

print("\n" + "=" * 60)
