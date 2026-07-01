-- Schema para el Lab17BDSupabase
-- Catálogo de videojuegos con 5 tablas relacionales

-- Limpieza previa (por si corremos el script varias veces)
DROP TABLE IF EXISTS game_platforms CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS platforms CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS studios CASCADE;

-- Estudios / desarrolladores
CREATE TABLE studios (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL UNIQUE,
    country       VARCHAR(60),
    founded_year  INT
);

-- Géneros
CREATE TABLE genres (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(60) NOT NULL UNIQUE
);

-- Plataformas
CREATE TABLE platforms (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(80) NOT NULL UNIQUE,
    manufacturer  VARCHAR(80)
);

-- Juegos
CREATE TABLE games (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(160) NOT NULL,
    studio_id     INT REFERENCES studios(id) ON DELETE SET NULL,
    genre_id      INT REFERENCES genres(id)  ON DELETE SET NULL,
    release_year  INT,
    price         NUMERIC(6,2),
    rating        NUMERIC(3,1)
);

-- Índices para búsquedas comunes
CREATE INDEX idx_games_title  ON games (title);
CREATE INDEX idx_games_year   ON games (release_year);
CREATE INDEX idx_games_studio ON games (studio_id);
CREATE INDEX idx_games_genre  ON games (genre_id);

-- Tabla puente juegos <-> plataformas (many-to-many)
CREATE TABLE game_platforms (
    game_id     INT NOT NULL REFERENCES games(id)     ON DELETE CASCADE,
    platform_id INT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, platform_id)
);
