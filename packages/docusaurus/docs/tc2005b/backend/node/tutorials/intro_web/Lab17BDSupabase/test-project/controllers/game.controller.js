const model = require('../models/game.model.js');

// GET /games?page=N  -> renderiza la vista con paginación
module.exports.index = async (req, res) => {
    try {
        const page     = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const [juegos, total] = await Promise.all([
            model.fetchAll(page, pageSize),
            model.count()
        ]);
        const totalPages = Math.ceil(total / pageSize);

        res.render('games', { juegos, page, totalPages, total });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al obtener los juegos');
    }
};

// GET /buscar?titulo=...   -> ruta SEGURA con query parametrizada
module.exports.buscarSeguro = async (req, res) => {
    const titulo = req.query.titulo || '';
    try {
        const resultados = await model.findByTitle(titulo);
        res.render('buscar', { titulo, resultados, modo: 'seguro' });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error en la búsqueda');
    }
};

// GET /buscar-inseguro?titulo=...  -> DEMO de SQL injection (no usar en producción)
module.exports.buscarInseguro = async (req, res) => {
    const titulo = req.query.titulo || '';
    try {
        const resultados = await model.findByTitleInsegura(titulo);
        res.render('buscar', { titulo, resultados, modo: 'inseguro' });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error en la búsqueda (posible SQL injection detectada)');
    }
};
