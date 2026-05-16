#!/bin/bash
# Test del importador con Farosdam (8.153 SKUs, 111 lados combinados)

echo "=== TEST IMPORTADOR HITO 2 ==="
echo ""
echo "Proveedor: Farosdam"
echo "Archivo: /mnt/project/Farosdam_Normalizado_v4.xlsx"
echo "SKUs esperados: 8.153"
echo "Lados combinados esperados: 111"
echo ""

# Verificar que existe el archivo
if [ ! -f "/mnt/project/Farosdam_Normalizado_v4.xlsx" ]; then
    echo "ERROR: Archivo no encontrado"
    exit 1
fi

# Verificar que existe el .env
if [ ! -f ".env" ]; then
    echo "ERROR: Archivo .env no encontrado"
    echo "Copia .env.example a .env y completa las credenciales de Supabase"
    exit 1
fi

# Instalar dependencias
echo "Instalando dependencias..."
pip install -q -r requirements.txt

echo ""
echo "Ejecutando importador..."
echo ""

python3 importador_catalogo.py \
    --proveedor Farosdam \
    --archivo /mnt/project/Farosdam_Normalizado_v4.xlsx

echo ""
echo "=== FIN TEST ==="
