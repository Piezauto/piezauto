# ============================================================================
# SCRIPT DE CARGA MASIVA - 12 PROVEEDORES
# Piezauto - Hito 2 - Sprint 5
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CARGA MASIVA CATÁLOGO PIEZAUTO" -ForegroundColor Cyan
Write-Host "12 proveedores - 266.166 SKUs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Timestamp de inicio
$inicio = Get-Date
Write-Host "Inicio: $inicio" -ForegroundColor Green
Write-Host ""

# Leer índice CSV
$index = Import-Csv -Path "catalogo_index.csv"

# Contadores globales
$total_proveedores = $index.Count
$proveedores_exitosos = 0
$proveedores_fallidos = 0
$total_skus = 0

Write-Host "Proveedores a procesar: $total_proveedores" -ForegroundColor Yellow
Write-Host ""

# Procesar cada proveedor
foreach ($row in $index) {
    $proveedor = $row.proveedor
    $archivo = $row.archivo
    $sku_count = $row.sku_count
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "[$proveedores_exitosos/$total_proveedores] PROCESANDO: $proveedor" -ForegroundColor Cyan
    Write-Host "Archivo: $archivo" -ForegroundColor Gray
    Write-Host "SKUs esperados: $sku_count" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $inicio_proveedor = Get-Date
    
    # Ejecutar importador
    $resultado = python importador_catalogo.py --proveedor $proveedor --archivo $archivo 2>&1
    
    $fin_proveedor = Get-Date
    $duracion = $fin_proveedor - $inicio_proveedor
    
    # Verificar si fue exitoso
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $proveedor completado exitosamente" -ForegroundColor Green
        Write-Host "  Duración: $($duracion.ToString('hh\:mm\:ss'))" -ForegroundColor Gray
        $proveedores_exitosos++
        $total_skus += [int]$sku_count
    } else {
        Write-Host "✗ ERROR en $proveedor" -ForegroundColor Red
        Write-Host "  Ver importador.log para detalles" -ForegroundColor Red
        $proveedores_fallidos++
        
        # Preguntar si continuar
        Write-Host ""
        $continuar = Read-Host "¿Continuar con el siguiente proveedor? (S/N)"
        if ($continuar -ne "S" -and $continuar -ne "s") {
            Write-Host "Carga masiva interrumpida por el usuario" -ForegroundColor Yellow
            break
        }
    }
    
    Write-Host ""
}

# Resumen final
$fin = Get-Date
$duracion_total = $fin - $inicio

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proveedores exitosos: $proveedores_exitosos/$total_proveedores" -ForegroundColor Green
Write-Host "Proveedores fallidos: $proveedores_fallidos" -ForegroundColor $(if ($proveedores_fallidos -eq 0) { "Green" } else { "Red" })
Write-Host "SKUs procesados: $total_skus" -ForegroundColor Green
Write-Host ""
Write-Host "Inicio: $inicio" -ForegroundColor Gray
Write-Host "Fin: $fin" -ForegroundColor Gray
Write-Host "Duración total: $($duracion_total.ToString('hh\:mm\:ss'))" -ForegroundColor Yellow
Write-Host ""

# Verificar en Supabase
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN RECOMENDADA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecutar en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "SELECT COUNT(*) FROM cat_skus;" -ForegroundColor White
Write-Host "SELECT COUNT(*) FROM cat_equivalencias;" -ForegroundColor White
Write-Host "SELECT COUNT(*) FROM cat_fabricantes;" -ForegroundColor White
Write-Host "SELECT COUNT(*) FROM cat_familias;" -ForegroundColor White
Write-Host ""
Write-Host "SELECT proveedor, COUNT(*) " -ForegroundColor White
Write-Host "FROM cat_proveedores p " -ForegroundColor White
Write-Host "JOIN cat_equivalencias e ON e.proveedor_id = p.id " -ForegroundColor White
Write-Host "GROUP BY p.id, p.nombre " -ForegroundColor White
Write-Host "ORDER BY p.nombre;" -ForegroundColor White
Write-Host ""

if ($proveedores_exitosos -eq $total_proveedores) {
    Write-Host "✓ CARGA MASIVA COMPLETADA EXITOSAMENTE" -ForegroundColor Green
} else {
    Write-Host "⚠ CARGA MASIVA COMPLETADA CON ERRORES" -ForegroundColor Yellow
}
