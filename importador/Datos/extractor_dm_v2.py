#!/usr/bin/env python3
"""
Extractor DM - Búsqueda de códigos Cromosol en dmcompras.com
Método: Requests + BeautifulSoup (web scraping HTML)
"""

import requests
from bs4 import BeautifulSoup
import time
import csv
import json
from datetime import datetime
from typing import Dict, List, Optional

# ═══════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════

URL_BASE = "https://dmcompras.com/"

# Cookies de sesión activa (Cliente 885)
COOKIES = {
    'id': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkaXJlY2Npb24iOiJBdi4gR29iZXJuYWRvciBWZXJnYXJhIDM1NjciLCJjdWl0IjoiMjAxMzM0MDEzMiIsInRlbGVmb25vIjoiMjE5NzI0NzEiLCJlbmNhcmdhZG9fY29tcHJhcyI6IiIsImVuY2FyZ2Fkb19wYWdvcyI6IiIsImxvY2FsaWRhZCI6Ikh1cmxpbmdoYW0iLCJwcm92aW5jaWEiOiJCdWVub3MgQWlyZXMiLCJwcmltZXJfZW1haWwiOiJwaWV6YXV0bzFAZ21haWwuY29tIiwic2VndW5kb19lbWFpbCI6InBpY2hpX21hZEBob3RtYWlsLmNvbSIsImNvZWZpY2llbnRlIjoiNDUiLCJwYWRyb25lc19jdXN0b20iOltdLCJwYXNzd29yZCI6ImYyMjAxZiIsImNoYXQiOiJkNWNhNTZjYzA3YmEwNjE0NTIxYzkzZWY1ZjE5NjliOCIsImNvcmRvYmEiOiIwIiwibnJvY2xpZW50ZSI6Ijg4NSIsInBlcmNlbnQiOiIxMy42IiwiY29kZSI6IjQ1ZTQwIiwiaWF0IjoxNzc2NDI5ODYxfQ.Twz9iqB3rP5NSlXfKM_WC4L0ugKK0mU2EA4mUmEEV5s',
    '_hjSessionUser_2974264': 'eyJpZCI6ImY5NDBhOWUwLThhN2MtNTAwMS1hNTE4LWFjZjZkZTM1YmRmMCIsImNyZWF0ZWQiOjE3NzY0Mjk4NjE3NTQsImV4aXN0aW5nIjp0cnVlfQ==',
    '_gid': 'GA1.2.2096944714.1777291690',
    '_hjSession_2974264': 'eyJpZCI6IjVjYzMyZmQ2LWFkODQtNGE4NC04ZTg5LTUyMWI2NmE1MmIzNSIsImMiOjE3Nzc3MzA2OTExNTMsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MX0=',
    '_ga': 'GA1.2.184471483.1776429862',
    '_ga_N7ZKB7MLSG': 'GS2.1.s1777730179$o34$g1$t1777731360$j60$l0$h0'
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-AR,es;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
}

# Tiempos de espera (segundos)
DELAY_ENTRE_BUSQUEDAS = 0.5  # 0.5 seg = ~120 búsquedas/min = 4h para 24k códigos
TIMEOUT_REQUEST = 10

# ═══════════════════════════════════════════════════════════
# FUNCIONES CORE
# ═══════════════════════════════════════════════════════════

class ExtractorDM:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.cookies.update(COOKIES)
        
    def buscar_codigo(self, codigo_cromosol: str) -> Dict:
        """
        Busca un código de Cromosol en DM y retorna resultados.
        
        Args:
            codigo_cromosol: Código a buscar (ej: "2477/AD")
            
        Returns:
            Dict con resultados encontrados
        """
        try:
            # Realizar búsqueda (POST con form data)
            data = {
                'texto_buscar': codigo_cromosol  # Verificar nombre exacto del campo
            }
            
            response = self.session.post(
                URL_BASE,
                data=data,
                timeout=TIMEOUT_REQUEST
            )
            response.raise_for_status()
            
            # Parsear HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extraer resultados
            resultados = self._parsear_tabla_resultados(soup)
            
            return {
                'codigo_cromosol': codigo_cromosol,
                'timestamp': datetime.now().isoformat(),
                'resultados_encontrados': len(resultados),
                'resultados': resultados,
                'status': 'ok'
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'codigo_cromosol': codigo_cromosol,
                'timestamp': datetime.now().isoformat(),
                'resultados_encontrados': 0,
                'resultados': [],
                'status': 'error',
                'error': str(e)
            }
    
    def _parsear_tabla_resultados(self, soup: BeautifulSoup) -> List[Dict]:
        """
        Parsea la tabla HTML de resultados.
        
        Estructura detectada:
        - Columna 1: Código DM
        - Columna 2: Descripción
        - Columna 3: Fabricante/Origen
        - Columna 4: Precio
        """
        resultados = []
        
        # Buscar filas de la tabla
        tabla = soup.find('table')
        if not tabla:
            return resultados
        
        filas = tabla.find('tbody').find_all('tr') if tabla.find('tbody') else []
        
        for fila in filas:
            celdas = fila.find_all('td')
            
            if len(celdas) >= 4:
                resultado = {
                    'codigo_dm': celdas[0].get_text(strip=True),
                    'descripcion': celdas[1].get_text(strip=True),
                    'fabricante': celdas[2].get_text(strip=True),
                    'precio': self._limpiar_precio(celdas[3].get_text(strip=True)),
                    'stock': None  # Se puede agregar si se detecta en la tabla
                }
                
                resultados.append(resultado)
        
        return resultados
    
    def _limpiar_precio(self, precio_texto: str) -> Optional[float]:
        """Convierte texto de precio a float."""
        try:
            # Eliminar símbolos y convertir
            precio_limpio = precio_texto.replace('$', '').replace('.', '').replace(',', '.').strip()
            return float(precio_limpio)
        except (ValueError, AttributeError):
            return None
    
    def detectar_stock(self, soup: BeautifulSoup) -> Dict:
        """
        Detecta stock analizando imágenes uni-stock-si.png / uni-stock-no.png
        
        Returns:
            Dict con información de stock por depósito
        """
        stock_info = {
            'tiene_stock': False,
            'depositos_con_stock': [],
            'depositos_sin_stock': []
        }
        
        # Buscar imágenes de stock
        imagenes_stock = soup.find_all('img', src=lambda x: x and 'uni-stock' in x)
        
        for img in imagenes_stock:
            # Buscar el depósito asociado (generalmente en li hermano)
            deposito_elem = img.find_parent('li')
            if deposito_elem:
                deposito_nombre = deposito_elem.get_text(strip=True)
                
                if 'uni-stock-si.png' in img['src']:
                    stock_info['depositos_con_stock'].append(deposito_nombre)
                    stock_info['tiene_stock'] = True
                elif 'uni-stock-no.png' in img['src']:
                    stock_info['depositos_sin_stock'].append(deposito_nombre)
        
        return stock_info

# ═══════════════════════════════════════════════════════════
# PROCESAMIENTO BATCH
# ═══════════════════════════════════════════════════════════

def procesar_lote_codigos(codigos: List[str], archivo_salida: str):
    """
    Procesa un lote de códigos y guarda resultados en CSV.
    
    Args:
        codigos: Lista de códigos Cromosol a buscar
        archivo_salida: Path del CSV de salida
    """
    extractor = ExtractorDM()
    
    # Abrir CSV para escritura
    with open(archivo_salida, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'codigo_cromosol',
            'codigo_dm',
            'descripcion',
            'fabricante',
            'precio',
            'tiene_stock',
            'depositos_con_stock',
            'timestamp',
            'status'
        ])
        writer.writeheader()
        
        total = len(codigos)
        
        for idx, codigo in enumerate(codigos, 1):
            print(f"[{idx}/{total}] Buscando {codigo}...", end=' ')
            
            resultado = extractor.buscar_codigo(codigo)
            
            if resultado['status'] == 'ok' and resultado['resultados_encontrados'] > 0:
                # Escribir cada resultado encontrado
                for res in resultado['resultados']:
                    row = {
                        'codigo_cromosol': codigo,
                        'codigo_dm': res['codigo_dm'],
                        'descripcion': res['descripcion'],
                        'fabricante': res['fabricante'],
                        'precio': res['precio'],
                        'tiene_stock': res.get('stock', {}).get('tiene_stock', ''),
                        'depositos_con_stock': ','.join(res.get('stock', {}).get('depositos_con_stock', [])),
                        'timestamp': resultado['timestamp'],
                        'status': 'ok'
                    }
                    writer.writerow(row)
                
                print(f"✓ {resultado['resultados_encontrados']} resultados")
            else:
                # Sin resultados o error
                row = {
                    'codigo_cromosol': codigo,
                    'codigo_dm': '',
                    'descripcion': '',
                    'fabricante': '',
                    'precio': '',
                    'tiene_stock': '',
                    'depositos_con_stock': '',
                    'timestamp': resultado['timestamp'],
                    'status': resultado.get('status', 'sin_resultados')
                }
                writer.writerow(row)
                
                print(f"✗ Sin resultados")
            
            # Delay entre búsquedas
            if idx < total:
                time.sleep(DELAY_ENTRE_BUSQUEDAS)
    
    print(f"\n✅ Procesamiento completo. Resultados en: {archivo_salida}")

# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python extractor_dm.py <archivo_codigos.txt>")
        print("     python extractor_dm.py test  (ejecuta test AC-4)")
        sys.exit(1)
    
    if sys.argv[1] == "test":
        # Test con códigos AC-4
        print("═══ TEST AC-4 ═══")
        from test_ac4 import CODIGOS_AC4
        procesar_lote_codigos(
            CODIGOS_AC4,
            f"resultados_test_ac4_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        )
    else:
        # Leer códigos desde archivo
        archivo_entrada = sys.argv[1]
        with open(archivo_entrada, 'r') as f:
            codigos = [line.strip() for line in f if line.strip()]
        
        print(f"Procesando {len(codigos)} códigos de {archivo_entrada}")
        procesar_lote_codigos(
            codigos,
            f"resultados_dm_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        )
