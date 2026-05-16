# SCRIPT DE VERIFICACIÓN - IMPORTADOR PIEZAUTO
# Verifica que estés usando la versión correcta con las correcciones aplicadas

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN VERSIÓN IMPORTADOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar directorio actual
$ubicacion = Get-Location
Write-Host "Ubicación actual: $ubicacion" -ForegroundColor Yellow
Write-Host ""

# Verificar existencia del archivo
if (-not (Test-Path "importador_catalogo.py")) {
    Write-Host "ERROR: No se encontró importador_catalogo.py" -ForegroundColor Red
    Write-Host "Asegurate de ejecutar este script desde el directorio del importador" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Archivo encontrado: importador_catalogo.py" -ForegroundColor Green
Write-Host ""

# Verificar función limpiar_valor_opcional
Write-Host "Verificando función limpiar_valor_opcional..." -ForegroundColor Yellow
$tiene_funcion = Select-String -Path "importador_catalogo.py" -Pattern "def limpiar_valor_opcional"

if ($tiene_funcion) {
    Write-Host "✓ Función limpiar_valor_opcional ENCONTRADA" -ForegroundColor Green
    Write-Host "  Línea: $($tiene_funcion.LineNumber)" -ForegroundColor Gray
} else {
    Write-Host "✗ Función limpiar_valor_opcional NO ENCONTRADA" -ForegroundColor Red
    Write-Host "  DEBES descargar la versión actualizada del importador" -ForegroundColor Red
    Write-Host ""
    Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "1. Descargá importador_catalogo.py desde /mnt/user-data/outputs/" -ForegroundColor White
    Write-Host "2. Reemplazá el archivo en este directorio" -ForegroundColor White
    Write-Host "3. Volvé a ejecutar este script" -ForegroundColor White
    exit 1
}

# Verificar uso en posicion (crear_sku_simple)
Write-Host ""
Write-Host "Verificando uso en crear_sku_simple..." -ForegroundColor Yellow
$uso_posicion = Select-String -Path "importador_catalogo.py" -Pattern "limpiar_valor_opcional\(sku\.posicion\)"

if ($uso_posicion) {
    Write-Host "✓ Limpieza de posicion implementada" -ForegroundColor Green
    Write-Host "  Ocurrencias: $($uso_posicion.Count)" -ForegroundColor Gray
} else {
    Write-Host "✗ Limpieza de posicion NO implementada" -ForegroundColor Red
    exit 1
}

# Verificar logging debug
Write-Host ""
Write-Host "Verificando logging debug..." -ForegroundColor Yellow
$debug_logging = Select-String -Path "importador_catalogo.py" -Pattern "logger\.debug.*posicion"

if ($debug_logging) {
    Write-Host "✓ Logging debug implementado" -ForegroundColor Green
} else {
    Write-Host "⚠ Logging debug no encontrado (no crítico)" -ForegroundColor Yellow
}

# Verificar dependencias
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN DE DEPENDENCIAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Python
try {
    $python_version = python --version 2>&1
    Write-Host "✓ Python: $python_version" -ForegroundColor Green
} catch {
    Write-Host "✗ Python no encontrado" -ForegroundColor Red
}

# Verificar psycopg
Write-Host ""
Write-Host "Verificando psycopg..." -ForegroundColor Yellow
$psycopg_check = python -c "import psycopg; print(psycopg.__version__)" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ psycopg instalado: $psycopg_check" -ForegroundColor Green
} else {
    Write-Host "✗ psycopg no instalado" -ForegroundColor Red
    Write-Host "  Ejecutá: pip install 'psycopg[binary]>=3.1.0' --break-system-packages" -ForegroundColor Yellow
}

# Resumen final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($tiene_funcion -and $uso_posicion) {
    Write-Host "✓ IMPORTADOR ACTUALIZADO CORRECTAMENTE" -ForegroundColor Green
    Write-Host "  Podés proceder con el test de Farosdam" -ForegroundColor Green
    Write-Host ""
    Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
    Write-Host "  python importador_catalogo.py --proveedor Farosdam --archivo Farosdam.xlsx" -ForegroundColor White
} else {
    Write-Host "✗ IMPORTADOR DESACTUALIZADO" -ForegroundColor Red
    Write-Host "  Descargá la versión actualizada" -ForegroundColor Red
}

Write-Host ""
