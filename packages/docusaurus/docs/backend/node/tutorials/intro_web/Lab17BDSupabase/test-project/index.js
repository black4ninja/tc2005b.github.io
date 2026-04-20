require('dotenv').config();

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const pool       = require('./util/database.js');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz — saludo
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send('Hola Mundo — Lab17BDSupabase');
});

// Ruta de prueba directa contra Supabase (sin MVC, similar al Lab17BD original)
app.get('/test_db', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM games LIMIT 20');
        res.writeHead(200, { 'Content-type': 'application/json' });
        res.end(JSON.stringify(rows));
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al conectar con la base de datos');
    }
});

// Módulo de juegos bajo MVC
const gameRoutes = require('./routes/game.routes.js');
app.use('/games', gameRoutes);

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});
