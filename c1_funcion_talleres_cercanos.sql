-- C-1: Función para talleres del Paquete más cercanos al cliente
-- Ejecutar en Supabase SQL Editor

CREATE OR REPLACE FUNCTION talleres_cercanos_paquete(
  p_lat numeric,
  p_lng numeric,
  p_limit integer DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  nombre text,
  localidad text,
  lat numeric,
  lng numeric,
  distancia_km numeric,
  telefono text,
  logo_url text,
  especialidades text[],
  tipo_establecimiento text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.nombre, t.localidad, t.lat, t.lng,
    ROUND(
      (6371 * acos(
        cos(radians(p_lat)) * cos(radians(t.lat)) *
        cos(radians(t.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(t.lat))
      ))::numeric, 2
    ) AS distancia_km,
    t.telefono, t.logo_url, t.especialidades, t.tipo_establecimiento
  FROM cat_recomendaciones_talleres t
  WHERE t.paquete_socio = TRUE
    AND t.activo = TRUE
    AND t.lat IS NOT NULL
    AND t.lng IS NOT NULL
  ORDER BY distancia_km ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION talleres_cercanos_paquete(numeric, numeric, integer) TO authenticated, anon;
