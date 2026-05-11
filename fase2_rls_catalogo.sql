-- Fase 2 — RLS SELECT para catálogo B2C
-- Ejecutar en Supabase SQL Editor antes de que la búsqueda funcione.
-- Permite que usuarios anónimos y autenticados lean el catálogo.

-- cat_skus: solo activos y activos_venta
CREATE POLICY "anon puede leer skus activos"
ON cat_skus FOR SELECT TO anon, authenticated
USING (activo = TRUE AND activo_venta = TRUE);

-- cat_familias: todas las activas
CREATE POLICY "anon puede leer familias"
ON cat_familias FOR SELECT TO anon, authenticated
USING (activo = TRUE);

-- cat_proveedores: todos los activos
CREATE POLICY "anon puede leer proveedores"
ON cat_proveedores FOR SELECT TO anon, authenticated
USING (activo = TRUE);

-- cat_codigos_fabrica: todos los activos
CREATE POLICY "anon puede leer codigos fabrica"
ON cat_codigos_fabrica FOR SELECT TO anon, authenticated
USING (activo = TRUE);

-- cat_skus_codigos_fabrica: lectura libre (es tabla de relación)
CREATE POLICY "anon puede leer skus_codigos_fabrica"
ON cat_skus_codigos_fabrica FOR SELECT TO anon, authenticated
USING (TRUE);

-- cat_fabricantes: todos los activos (para join en ficha producto)
CREATE POLICY "anon puede leer fabricantes"
ON cat_fabricantes FOR SELECT TO anon, authenticated
USING (activo = TRUE);

-- cat_equivalencias: solo las activas (para alternativas cross-proveedor)
CREATE POLICY "anon puede leer equivalencias activas"
ON cat_equivalencias FOR SELECT TO anon, authenticated
USING (activo = TRUE);

-- cat_operaciones_b2c: solo el propio cliente puede ver sus operaciones
CREATE POLICY "cliente ve sus operaciones"
ON cat_operaciones_b2c FOR SELECT TO authenticated
USING (cliente_id = (
  SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
));

CREATE POLICY "cliente inserta operaciones"
ON cat_operaciones_b2c FOR INSERT TO authenticated
WITH CHECK (cliente_id = (
  SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid()
));

CREATE POLICY "cliente actualiza sus operaciones borrador"
ON cat_operaciones_b2c FOR UPDATE TO authenticated
USING (
  cliente_id = (SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid())
  AND estado = 'pendiente'
);

CREATE POLICY "cliente elimina sus operaciones borrador"
ON cat_operaciones_b2c FOR DELETE TO authenticated
USING (
  cliente_id = (SELECT id FROM cat_clientes_finales WHERE auth_user_id = auth.uid())
  AND estado = 'pendiente'
);

-- cat_operaciones_b2c_items: acceso via operacion del propio cliente
CREATE POLICY "cliente ve items de sus operaciones"
ON cat_operaciones_b2c_items FOR SELECT TO authenticated
USING (
  operacion_id IN (
    SELECT o.id FROM cat_operaciones_b2c o
    JOIN cat_clientes_finales c ON c.id = o.cliente_id
    WHERE c.auth_user_id = auth.uid()
  )
);

CREATE POLICY "cliente inserta items en sus operaciones borrador"
ON cat_operaciones_b2c_items FOR INSERT TO authenticated
WITH CHECK (
  operacion_id IN (
    SELECT o.id FROM cat_operaciones_b2c o
    JOIN cat_clientes_finales c ON c.id = o.cliente_id
    WHERE c.auth_user_id = auth.uid() AND o.estado = 'borrador'
  )
);

CREATE POLICY "cliente actualiza items de sus operaciones borrador"
ON cat_operaciones_b2c_items FOR UPDATE TO authenticated
USING (
  operacion_id IN (
    SELECT o.id FROM cat_operaciones_b2c o
    JOIN cat_clientes_finales c ON c.id = o.cliente_id
    WHERE c.auth_user_id = auth.uid() AND o.estado = 'borrador'
  )
);

CREATE POLICY "cliente elimina items de sus operaciones borrador"
ON cat_operaciones_b2c_items FOR DELETE TO authenticated
USING (
  operacion_id IN (
    SELECT o.id FROM cat_operaciones_b2c o
    JOIN cat_clientes_finales c ON c.id = o.cliente_id
    WHERE c.auth_user_id = auth.uid() AND o.estado = 'borrador'
  )
);
