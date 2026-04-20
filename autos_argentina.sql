-- ══════════════════════════════════════════════════════════════════════
-- autos_argentina.sql
-- Mercado argentino de autos 1990-2025
-- Ejecutar una única vez en el SQL Editor de Supabase Dashboard
-- anio_hasta NULL = modelo vigente al momento de carga
-- ══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- MARCAS
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO marcas_auto (nombre)
SELECT v.nombre FROM (VALUES
  ('Ford'::text),
  ('Chevrolet'),
  ('Volkswagen'),
  ('Renault'),
  ('Peugeot'),
  ('Fiat'),
  ('Toyota'),
  ('Honda'),
  ('Nissan'),
  ('Citroën'),
  ('Hyundai'),
  ('Kia'),
  ('Jeep'),
  ('Mercedes-Benz'),
  ('BMW'),
  ('Audi'),
  ('Mitsubishi'),
  ('Suzuki'),
  ('Subaru'),
  ('Chery'),
  ('BAIC'),
  ('Geely'),
  ('BYD'),
  ('RAM'),
  ('Chrysler'),
  ('Dodge')
) AS v(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM marcas_auto WHERE nombre = v.nombre
);


-- ──────────────────────────────────────────────────────────────────────
-- FORD
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Ka'::text,        1997::integer, 2023::integer),
  ('Fiesta',          1996,          2019),
  ('Focus',           1999,          2019),
  ('EcoSport',        2003,          2023),
  ('Ranger',          1998,          NULL::integer),
  ('F-100',           1990,          1999),
  ('Falcon',          1990,          1991),
  ('Mondeo',          1998,          2014),
  ('Galaxy',          2006,          2014),
  ('Kuga',            2013,          2022),
  ('Bronco',          2022,          NULL::integer),
  ('Maverick',        2022,          NULL::integer),
  ('Territory',       2020,          NULL::integer),
  ('Puma',            2021,          NULL::integer),
  ('Transit',         1994,          NULL::integer),
  ('Tourneo',         2015,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Ford'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- CHEVROLET
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Corsa'::text,       1994::integer, 2012::integer),
  ('Corsa Classic',     2004,          2016),
  ('Astra',             1998,          2012),
  ('Vectra',            1994,          2008),
  ('Cruze',             2009,          NULL::integer),
  ('Onix',              2013,          NULL::integer),
  ('Tracker',           2013,          NULL::integer),
  ('S10',               1993,          NULL::integer),
  ('Montana',           2003,          2010),
  ('Montana',           2022,          NULL::integer),
  ('Spin',              2013,          2022),
  ('Equinox',           2004,          NULL::integer),
  ('Captiva',           2007,          2018),
  ('Meriva',            2002,          2012),
  ('Agile',             2009,          2015),
  ('Celta',             2000,          2015),
  ('Blazer',            1990,          2002),
  ('Silverado',         1994,          2007),
  ('D20',               1990,          1998),
  ('Cobalt',            2012,          2021)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Chevrolet'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- VOLKSWAGEN
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Gol'::text,     1994::integer, 2013::integer),
  ('Gol Trend',     2008,          NULL::integer),
  ('Golf',          1993,          NULL::integer),
  ('Polo',          2002,          NULL::integer),
  ('Vento',         2006,          2015),
  ('Vento',         2019,          NULL::integer),
  ('Suran',         2006,          2017),
  ('CrossFox',      2005,          2017),
  ('Fox',           2005,          2013),
  ('Amarok',        2010,          NULL::integer),
  ('Tiguan',        2009,          NULL::integer),
  ('T-Cross',       2019,          NULL::integer),
  ('Taos',          2021,          NULL::integer),
  ('Saveiro',       1992,          2021),
  ('Bora',          2001,          2012),
  ('Passat',        1997,          2014),
  ('Voyage',        2009,          2020),
  ('Up!',           2014,          2020),
  ('Virtus',        2018,          NULL::integer),
  ('Nivus',         2021,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Volkswagen'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- RENAULT
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Clio'::text,    1992::integer, NULL::integer),
  ('Megane',        1996,          NULL::integer),
  ('Laguna',        1994,          2007),
  ('Symbol',        1999,          2013),
  ('Logan',         2006,          NULL::integer),
  ('Sandero',       2007,          NULL::integer),
  ('Duster',        2011,          NULL::integer),
  ('Kangoo',        1997,          NULL::integer),
  ('Master',        1998,          NULL::integer),
  ('Fluence',       2011,          2015),
  ('Captur',        2013,          NULL::integer),
  ('Koleos',        2009,          2018),
  ('Oroch',         2016,          NULL::integer),
  ('R19',           1990,          2000),
  ('R9',            1990,          1995),
  ('R12',           1990,          1995),
  ('Twingo',        2000,          2012),
  ('Scenic',        1997,          2010),
  ('Trafic',        1990,          NULL::integer),
  ('Alaskan',       2017,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Renault'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- PEUGEOT
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('205'::text,     1990::integer, 1997::integer),
  ('206',           1998,          2015),
  ('207',           2006,          2014),
  ('208',           2012,          NULL::integer),
  ('306',           1993,          2002),
  ('307',           2001,          2012),
  ('308',           2008,          NULL::integer),
  ('405',           1990,          1999),
  ('406',           1996,          2005),
  ('407',           2004,          2010),
  ('504',           1990,          1999),
  ('505',           1990,          1997),
  ('2008',          2014,          NULL::integer),
  ('3008',          2009,          NULL::integer),
  ('5008',          2010,          NULL::integer),
  ('Partner',       1997,          NULL::integer),
  ('Expert',        1995,          NULL::integer),
  ('Boxer',         1994,          NULL::integer),
  ('Rifter',        2019,          NULL::integer),
  ('Traveller',     2017,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Peugeot'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- FIAT
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Uno'::text,     1990::integer, 2013::integer),
  ('Uno Fire',      2004,          NULL::integer),
  ('Palio',         1997,          2014),
  ('Siena',         1997,          2014),
  ('Punto',         2001,          2015),
  ('Bravo',         2007,          2015),
  ('Brava',         1998,          2003),
  ('Strada',        1998,          NULL::integer),
  ('Doblò',         2001,          2020),
  ('Idea',          2004,          2014),
  ('Linea',         2008,          2015),
  ('500',           2009,          2019),
  ('Argo',          2017,          NULL::integer),
  ('Cronos',        2018,          NULL::integer),
  ('Toro',          2016,          NULL::integer),
  ('Pulse',         2022,          NULL::integer),
  ('Fastback',      2022,          NULL::integer),
  ('Fiorino',       1990,          NULL::integer),
  ('Duna',          1990,          1998),
  ('Tipo',          1990,          1996)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Fiat'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- TOYOTA
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Corolla'::text,       1993::integer, NULL::integer),
  ('Etios',               2012,          2023),
  ('Yaris',               1999,          NULL::integer),
  ('Hilux',               1990,          NULL::integer),
  ('SW4',                 1990,          NULL::integer),
  ('RAV4',                1994,          NULL::integer),
  ('Land Cruiser',        1990,          NULL::integer),
  ('Land Cruiser 200',    2008,          2021),
  ('Land Cruiser 300',    2022,          NULL::integer),
  ('Fortuner',            2006,          NULL::integer),
  ('Camry',               1992,          2012),
  ('Camry',               2019,          NULL::integer),
  ('Prius',               2009,          NULL::integer),
  ('Supra',               2020,          NULL::integer),
  ('GR Corolla',          2023,          NULL::integer),
  ('Corolla Cross',       2021,          NULL::integer),
  ('Vios',                2003,          2012)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Toyota'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- HONDA
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Civic'::text,   1991::integer, NULL::integer),
  ('City',          1996,          NULL::integer),
  ('Fit',           2001,          NULL::integer),
  ('Jazz',          2001,          2014),
  ('HR-V',          2015,          NULL::integer),
  ('CR-V',          1996,          NULL::integer),
  ('WR-V',          2018,          NULL::integer),
  ('Accord',        1990,          2014),
  ('Pilot',         2003,          NULL::integer),
  ('ZR-V',          2023,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Honda'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- NISSAN
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Sentra'::text,  1990::integer, 2006::integer),
  ('Sentra',        2013,          NULL::integer),
  ('Tiida',         2005,          2015),
  ('Versa',         2011,          NULL::integer),
  ('March',         2011,          2021),
  ('Kicks',         2017,          NULL::integer),
  ('X-Trail',       2001,          NULL::integer),
  ('Frontier',      2001,          NULL::integer),
  ('Pathfinder',    1990,          2013),
  ('Murano',        2003,          NULL::integer),
  ('Navara',        1990,          2000),
  ('Terrano',       1990,          2006)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Nissan'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- CITROËN
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('AX'::text,          1990::integer, 1998::integer),
  ('BX',                1990,          1994),
  ('ZX',                1992,          1999),
  ('Xsara',             1997,          2006),
  ('Xsara Picasso',     2000,          2012),
  ('C2',                2003,          2008),
  ('C3',                2002,          NULL::integer),
  ('C4',                2004,          NULL::integer),
  ('C5',                2001,          2017),
  ('Berlingo',          1997,          NULL::integer),
  ('Jumpy',             1995,          NULL::integer),
  ('Jumper',            1994,          NULL::integer),
  ('C-Elysée',          2012,          NULL::integer),
  ('C3 Aircross',       2018,          NULL::integer),
  ('C4 Cactus',         2014,          2023),
  ('C5 Aircross',       2019,          NULL::integer),
  ('Spacetourer',       2017,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Citroën'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- HYUNDAI
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Accent'::text,  1994::integer, NULL::integer),
  ('Elantra',       1991,          NULL::integer),
  ('Tucson',        2004,          NULL::integer),
  ('Santa Fe',      2001,          NULL::integer),
  ('i30',           2007,          NULL::integer),
  ('HB20',          2012,          NULL::integer),
  ('HB20S',         2014,          NULL::integer),
  ('Creta',         2016,          NULL::integer),
  ('ix35',          2010,          2017),
  ('Sonata',        1990,          2012),
  ('Veloster',      2012,          2022),
  ('Kona',          2018,          NULL::integer),
  ('Venue',         2020,          NULL::integer),
  ('IONIQ 5',       2022,          NULL::integer),
  ('IONIQ 6',       2023,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Hyundai'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- KIA
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Sportage'::text,  1993::integer, 2021::integer),
  ('Sportage',        2022,          NULL::integer),
  ('Sorento',         2003,          NULL::integer),
  ('Rio',             2000,          NULL::integer),
  ('Cerato',          2004,          NULL::integer),
  ('Picanto',         2004,          NULL::integer),
  ('Stonic',          2017,          NULL::integer),
  ('Seltos',          2019,          NULL::integer),
  ('Carnival',        2021,          NULL::integer),
  ('EV6',             2022,          NULL::integer),
  ('Soul',            2009,          2022)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Kia'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- JEEP
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Cherokee'::text,      1990::integer, NULL::integer),
  ('Grand Cherokee',      1993,          NULL::integer),
  ('Renegade',            2015,          NULL::integer),
  ('Compass',             2007,          NULL::integer),
  ('Wrangler',            1990,          NULL::integer),
  ('Gladiator',           2020,          NULL::integer),
  ('Commander',           2022,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Jeep'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- MERCEDES-BENZ
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Clase A'::text,     1997::integer, NULL::integer),
  ('Clase B',           2005,          NULL::integer),
  ('Clase C',           1993,          NULL::integer),
  ('Clase E',           1993,          NULL::integer),
  ('Clase S',           1993,          NULL::integer),
  ('GLE',               1997,          NULL::integer),
  ('Sprinter',          1995,          NULL::integer),
  ('Vito',              1996,          NULL::integer),
  ('Viano',             2004,          2014),
  ('GLA',               2014,          NULL::integer),
  ('GLC',               2016,          NULL::integer),
  ('CLA',               2014,          NULL::integer),
  ('EQC',               2020,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Mercedes-Benz'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- BMW
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Serie 1'::text,   2004::integer, NULL::integer),
  ('Serie 2',         2014,          NULL::integer),
  ('Serie 3',         1990,          NULL::integer),
  ('Serie 4',         2013,          NULL::integer),
  ('Serie 5',         1990,          NULL::integer),
  ('Serie 7',         1994,          NULL::integer),
  ('X1',              2009,          NULL::integer),
  ('X2',              2018,          NULL::integer),
  ('X3',              2003,          NULL::integer),
  ('X4',              2014,          NULL::integer),
  ('X5',              1999,          NULL::integer),
  ('X6',              2008,          NULL::integer),
  ('i3',              2014,          2022),
  ('i4',              2022,          NULL::integer),
  ('iX',              2022,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'BMW'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- AUDI
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('A1'::text,  2010::integer, NULL::integer),
  ('A3',        1996,          NULL::integer),
  ('A4',        1994,          NULL::integer),
  ('A5',        2007,          NULL::integer),
  ('A6',        1994,          NULL::integer),
  ('A7',        2010,          NULL::integer),
  ('A8',        1994,          NULL::integer),
  ('Q2',        2016,          NULL::integer),
  ('Q3',        2011,          NULL::integer),
  ('Q5',        2008,          NULL::integer),
  ('Q7',        2006,          NULL::integer),
  ('Q8',        2019,          NULL::integer),
  ('TT',        1999,          NULL::integer),
  ('e-tron',    2020,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Audi'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- MITSUBISHI
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Lancer'::text,      1990::integer, 2019::integer),
  ('Outlander',         2003,          NULL::integer),
  ('ASX',               2010,          NULL::integer),
  ('L200',              1990,          NULL::integer),
  ('Montero',           1990,          2008),
  ('Eclipse Cross',     2018,          NULL::integer),
  ('Galant',            1990,          2006)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Mitsubishi'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- SUZUKI
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Swift'::text,       1990::integer, NULL::integer),
  ('Vitara',            1990,          NULL::integer),
  ('Jimny',             1998,          NULL::integer),
  ('S-Cross',           2013,          NULL::integer),
  ('Baleno',            2016,          NULL::integer),
  ('Celerio',           2015,          2022),
  ('Grand Vitara',      2005,          2015)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Suzuki'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- SUBARU
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Impreza'::text,   1992::integer, NULL::integer),
  ('Legacy',          1990,          2014),
  ('Forester',        1997,          NULL::integer),
  ('XV',              2012,          NULL::integer),
  ('Outback',         1994,          NULL::integer),
  ('WRX',             1992,          NULL::integer),
  ('BRZ',             2012,          NULL::integer),
  ('Solterra',        2023,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Subaru'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- CHERY
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Tiggo 2'::text,   2016::integer, NULL::integer),
  ('Tiggo 4',         2018,          NULL::integer),
  ('Tiggo 7',         2019,          NULL::integer),
  ('Tiggo 8',         2020,          NULL::integer),
  ('Arrizo 5',        2016,          NULL::integer),
  ('Arrizo 6',        2019,          NULL::integer),
  ('QQ',              2005,          2012)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Chery'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- BAIC
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('X25'::text,   2016::integer, 2022::integer),
  ('X35',         2018,          2022),
  ('X55',         2018,          2022),
  ('BJ20',        2016,          2021),
  ('D20',         2018,          2022)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'BAIC'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- GEELY
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Emgrand'::text,   2013::integer, 2021::integer),
  ('Coolray',         2020,          NULL::integer),
  ('Tugella',         2021,          NULL::integer),
  ('Okavango',        2023,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Geely'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- BYD
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Atto 3'::text,    2022::integer, NULL::integer),
  ('Dolphin',         2022,          NULL::integer),
  ('Seal',            2023,          NULL::integer),
  ('Tang',            2022,          NULL::integer),
  ('Han',             2023,          NULL::integer),
  ('Yuan Plus',       2023,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'BYD'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- RAM
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('700'::text,       2013::integer, 2021::integer),
  ('1000',            2016,          NULL::integer),
  ('2000',            2022,          NULL::integer),
  ('ProMaster',       2014,          NULL::integer)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'RAM'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- CHRYSLER
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('300'::text,         2004::integer, 2015::integer),
  ('300C',              2004,          2015),
  ('Voyager',           1995,          2010),
  ('Grand Voyager',     1995,          2010),
  ('PT Cruiser',        2001,          2010),
  ('Stratus',           1995,          2005),
  ('Cirrus',            1995,          2000),
  ('Neon',              1995,          2000),
  ('Crossfire',         2004,          2008)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Chrysler'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ──────────────────────────────────────────────────────────────────────
-- DODGE
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO modelos_auto (marca_id, nombre, anio_desde, anio_hasta)
SELECT m.id, v.nombre, v.desde, v.hasta
FROM marcas_auto m
CROSS JOIN (VALUES
  ('Ram 1500'::text,    1990::integer, 2018::integer),
  ('Journey',           2009,          2020),
  ('Caliber',           2006,          2012),
  ('Neon',              1994,          2005),
  ('Viper',             1992,          2017),
  ('Charger',           2006,          2020),
  ('Challenger',        2008,          2020),
  ('Durango',           1998,          2015),
  ('Stratus',           1995,          2005),
  ('Dakota',            1990,          2011)
) AS v(nombre, desde, hasta)
WHERE m.nombre = 'Dodge'
  AND NOT EXISTS (
    SELECT 1 FROM modelos_auto x
    WHERE x.marca_id = m.id AND x.nombre = v.nombre AND x.anio_desde = v.desde
  );


-- ══════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (opcional)
-- ══════════════════════════════════════════════════════════════════════
-- SELECT m.nombre AS marca, COUNT(ma.id) AS modelos
-- FROM marcas_auto m
-- LEFT JOIN modelos_auto ma ON ma.marca_id = m.id
-- GROUP BY m.nombre
-- ORDER BY m.nombre;
