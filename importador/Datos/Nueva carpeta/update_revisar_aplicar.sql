BEGIN;

-- =====================================================================
-- UPDATE familia para los 439 SKUs en REVISAR
-- Generado por COO: 2026-05-01
-- Total SKUs: 439
-- =====================================================================

-- Reanálisis semántico Sprint 5+:
-- 97 resueltos por regex + 342 por razonamiento semántico = 439 total
-- 3 SKUs Expoyer descripción "0" siguen en REVISAR para CPO Mes 2-3

UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '01/045/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '01/045/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '01/045/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '01/045/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '01/045/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '01/045/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '01/045/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/078/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '01/079/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '01/079/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tazas rueda')
  WHERE codigo_proveedor = '01/125/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/078/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/078/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/078/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/078/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '02/079/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '02/079/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '02/079/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '03/045/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '03/045/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '03/045/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '03/045/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '03/045/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '03/045/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '03/045/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '04/079/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tazas rueda')
  WHERE codigo_proveedor = '04/125/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/045/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '05/078/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/045/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/078/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/078/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/078/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/078/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '06/079/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '06/079/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '06/079/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '06/079/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tazas rueda')
  WHERE codigo_proveedor = '06/125/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '08/079/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '08/079/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Antenas')
  WHERE codigo_proveedor = '08/079/015' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/016' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '09/045/020' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '11/045/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '11/045/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '17/045/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Baúles')
  WHERE codigo_proveedor = 'FDUNA-050' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Baúles')
  WHERE codigo_proveedor = 'FDUNA-051' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Combustible (*)')
  WHERE codigo_proveedor = 'FSIENA-017' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Combustible (*)')
  WHERE codigo_proveedor = 'FSIENA-018' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = 'FESC-011/12' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Pasaruedas')
  WHERE codigo_proveedor = 'FFAL-020/21' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Estribos')
  WHERE codigo_proveedor = 'F100-070/71' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Estribos')
  WHERE codigo_proveedor = 'F100-072/73' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'F100-017/18' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'F100-014-A' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Combustible (*)')
  WHERE codigo_proveedor = 'F100-056' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Combustible (*)')
  WHERE codigo_proveedor = 'F100-057' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Pasaruedas')
  WHERE codigo_proveedor = 'P404-019/20' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lunetas')
  WHERE codigo_proveedor = 'P504-055' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Pasaruedas')
  WHERE codigo_proveedor = 'P504-058/59' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Molduras laterales')
  WHERE codigo_proveedor = 'PT6B-021/22' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Molduras laterales')
  WHERE codigo_proveedor = 'PT6B-023/24' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Molduras laterales')
  WHERE codigo_proveedor = 'PT6B-025/26' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'PT6B-010/11' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'PT6B-012/13' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sensores')
  WHERE codigo_proveedor = '1081441WI' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Expoyer');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Combustible (*)')
  WHERE codigo_proveedor = 'FFF13030113I' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Expoyer');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sensores')
  WHERE codigo_proveedor = '1920KZI' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Expoyer');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Paragolpes delanteros')
  WHERE codigo_proveedor = '01/132/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '01/134/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '01/134/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/154/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '01/154/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '01/180/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '01/180/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '01/180/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '01/180/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '01/181/012' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '02/046/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/048/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/048/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/048/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/048/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '02/071/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '02/071/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '02/071/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '02/071/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '02/071/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '02/071/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '02/071/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Comandos eléctricos')
  WHERE codigo_proveedor = '02/105/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '02/134/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/154/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/154/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/154/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/175/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/175/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '02/175/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '02/181/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '03/071/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '03/071/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '03/096/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '03/134/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '03/154/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '03/154/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '03/154/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '03/154/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '03/175/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '03/180/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '03/181/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '04/071/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '04/071/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '04/091/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '04/091/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '04/134/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '04/154/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '04/154/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '04/154/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '04/175/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '04/181/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '05/013/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '05/071/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '05/071/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '05/071/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '05/071/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Capots')
  WHERE codigo_proveedor = '05/075/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '05/096/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '05/096/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '05/096/012' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '05/096/014' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Comandos eléctricos')
  WHERE codigo_proveedor = '05/105/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '05/154/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '05/154/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '05/175/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '05/181/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '05/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '05/181/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '05/181/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '05/181/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '05/181/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '05/181/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '06/013/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '06/071/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '06/071/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '06/071/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Volantes')
  WHERE codigo_proveedor = '06/071/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '06/091/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '06/096/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '06/096/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Comandos eléctricos')
  WHERE codigo_proveedor = '06/105/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Paragolpes delanteros')
  WHERE codigo_proveedor = '06/132/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '06/134/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '06/134/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/154/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/154/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/154/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/175/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/175/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/175/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/175/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/175/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '06/180/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '06/180/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '06/181/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '07/180/012' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '07/181/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '07/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Guardabarros')
  WHERE codigo_proveedor = '08/013/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/042' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '09/154/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '09/180/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '09/180/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '09/180/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '09/181/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '09/181/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '10/096/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '18/180/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Parrillas')
  WHERE codigo_proveedor = '23/096/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '29/180/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Refrigeración (*)')
  WHERE codigo_proveedor = '32/180/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '32/181/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '05/107/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '05/107/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '05/107/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '05/107/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '05/107/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '05/107/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/126/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '06/126/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '07/126/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Cinturones de seguridad')
  WHERE codigo_proveedor = '08/007/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Cinturones de seguridad')
  WHERE codigo_proveedor = '08/007/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Cinturones de seguridad')
  WHERE codigo_proveedor = '08/007/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Cinturones de seguridad')
  WHERE codigo_proveedor = '08/007/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Cinturones de seguridad')
  WHERE codigo_proveedor = '08/007/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Cinturones de seguridad')
  WHERE codigo_proveedor = '08/007/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Cardan y crucetas')
  WHERE codigo_proveedor = '08/015/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/012' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/018' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/023' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/024' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/025' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/027' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/028' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/029' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/030' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/031' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/032' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/033' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/034' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/035' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/036' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/037' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/038' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/039' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/040' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/041' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/042' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/048' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/049' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/050' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/051' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/029/054' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tableros (chapería)')
  WHERE codigo_proveedor = '08/067/109' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/098/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/012' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '27/126/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '32/126/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '32/126/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '32/126/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tapizados')
  WHERE codigo_proveedor = '32/126/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/109/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lámparas')
  WHERE codigo_proveedor = '08/110/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lámparas')
  WHERE codigo_proveedor = '08/110/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lámparas')
  WHERE codigo_proveedor = '08/110/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lámparas')
  WHERE codigo_proveedor = '08/110/013' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/013' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/014' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/015' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/114/016' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/013' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/015' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/016' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/018' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/021' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/022' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/029' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/030' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/031' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/035' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/037' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/039' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/041' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/044' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/045' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/052' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/057' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/062' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/065' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/071' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/095' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/096' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/117' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/134' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/174' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/177' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/180' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/182' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/183' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/184' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/185' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/186' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/187' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Herramientas (*)')
  WHERE codigo_proveedor = '08/128/188' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/010' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/011' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/012' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/013' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/014' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/015' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/016' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/017' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/018' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/019' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/020' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Accesorios')
  WHERE codigo_proveedor = '08/131/021' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/137/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/137/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/137/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/164/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/164/021' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/164/022' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/164/025' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Sistema eléctrico (*)')
  WHERE codigo_proveedor = '08/164/027' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/002' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/003' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/008' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Lubricantes y químicos (*)')
  WHERE codigo_proveedor = '08/171/009' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Motores de arranque')
  WHERE codigo_proveedor = '09/129/001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'DM');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Soportes motor')
  WHERE codigo_proveedor = 'P504-011/12' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Soportes motor')
  WHERE codigo_proveedor = 'R6-003/4' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tazas rueda')
  WHERE codigo_proveedor = 'R12-032' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Tazas rueda')
  WHERE codigo_proveedor = 'R12-051' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Soportes motor')
  WHERE codigo_proveedor = 'R12-022/23' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Soportes motor')
  WHERE codigo_proveedor = 'R12-024/25' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Soportes motor')
  WHERE codigo_proveedor = 'R12-061/62' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Soportes motor')
  WHERE codigo_proveedor = 'R18-014/15' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'RTRAF-018' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'RTRAF-019' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'RTRAF-025' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Molduras laterales')
  WHERE codigo_proveedor = 'VWGOL-001' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Capots')
  WHERE codigo_proveedor = 'KOMBI-006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Capots')
  WHERE codigo_proveedor = 'KOMBI-007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'VWTREND-004' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'VWTREND-005' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'VWTREND-006' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');
UPDATE cat_skus SET familia_id = (SELECT id FROM cat_familias WHERE nombre = 'Puertas')
  WHERE codigo_proveedor = 'VWTREND-007' AND proveedor_id = (SELECT id FROM cat_proveedores WHERE nombre = 'Francar');

-- Verificación esperada:
-- SELECT COUNT(*) FROM cat_skus s
--   JOIN cat_familias f ON f.id = s.familia_id
--   WHERE f.nombre = 'REVISAR';
-- Debería retornar 3 (los Expoyer descripción "0")

COMMIT;