require('dotenv').config();

const express = require('express');
const path    = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Redirigimos la raíz al listado.
app.get('/', (req, res) => res.redirect('/documents'));

// Módulo de documentos bajo MVC.
const documentRoutes = require('./routes/document.routes.js');
app.use('/documents', documentRoutes);

// Handler de error general — entre otras cosas atrapa el 413 de multer cuando
// el archivo excede limits.fileSize.
app.use((err, req, res, next) => {
    console.log(err);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).send('Archivo demasiado grande (máx 10 MB).');
    }
    res.status(500).send('Error del servidor');
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});
