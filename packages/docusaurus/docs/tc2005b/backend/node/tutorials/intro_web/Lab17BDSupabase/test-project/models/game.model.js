const pool = require('../util/database.js');

// Trae todos los juegos, paginado. Se usa LIMIT/OFFSET porque las 90+ filas
// no caben de golpe en la pantalla y queremos que el alumno vea paginación real.
exports.fetchAll = async (page = 1, pageSize = 20) => {
    const offset = (page - 1) * pageSize;
    const sql = `
        SELECT g.id, g.title, g.release_year, g.price, g.rating,
               s.name AS studio,
               gn.name AS genre
        FROM games g
        LEFT JOIN studios s ON s.id = g.studio_id
        LEFT JOIN genres  gn ON gn.id = g.genre_id
        ORDER BY g.title
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(sql, [pageSize, offset]);
    return rows;
};

exports.count = async () => {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM games');
    return rows[0].total;
};

// BUSQUEDA PARAMETRIZADA — version segura
exports.findByTitle = async (titulo) => {
    const sql = `
        SELECT id, title, release_year, price, rating
        FROM games
        WHERE title ILIKE $1
        ORDER BY title
        LIMIT 50
    `;
    const { rows } = await pool.query(sql, [`%${titulo}%`]);
    return rows;
};

// VERSION VULNERABLE — sólo para demostrar SQL injection
// NUNCA uses esto en código real. La dejamos para comparar.
exports.findByTitleInsegura = async (titulo) => {
    const sql = `
        SELECT id, title, release_year, price, rating
        FROM games
        WHERE title ILIKE '%${titulo}%'
        ORDER BY title
        LIMIT 50
    `;
    const { rows } = await pool.query(sql);
    return rows;
};

// Promedio de precio por género (demuestra GROUP BY con JOIN)
exports.precioPromedioPorGenero = async () => {
    const sql = `
        SELECT gn.name AS genre,
               COUNT(g.id)::int AS total,
               ROUND(AVG(g.price)::numeric, 2) AS precio_promedio
        FROM games g
        JOIN genres gn ON gn.id = g.genre_id
        GROUP BY gn.name
        ORDER BY precio_promedio DESC
    `;
    const { rows } = await pool.query(sql);
    return rows;
};
