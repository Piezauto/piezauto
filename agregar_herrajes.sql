INSERT INTO categorias (nombre, slug, descripcion)
VALUES (
  'Herrajes',
  'herrajes',
  'Cilindros de arranque, cerraduras, alzavidrios, manijas y herrajes de carrocería'
)
ON CONFLICT (slug) DO NOTHING;
