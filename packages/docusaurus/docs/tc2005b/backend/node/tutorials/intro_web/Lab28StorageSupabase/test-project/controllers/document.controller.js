const model   = require('../models/document.model.js');
const storage = require('../models/storage.repository.js');

const PUBLIC_BUCKET  = process.env.PUBLIC_BUCKET  || 'lab28-public';
const PRIVATE_BUCKET = process.env.PRIVATE_BUCKET || 'lab28-private';

// ──────────────────────────────────────────────────────────────────────────────
// GET /documents — lista
// ──────────────────────────────────────────────────────────────────────────────
module.exports.index = async (req, res) => {
    try {
        const docs = await model.findAll();
        // Para los documentos públicos calculamos la URL al renderizar (no la
        // persistimos en BD). Para los privados no calculamos nada: la vista
        // pedirá la signed URL después con fetch.
        const enriched = docs.map(doc => ({
            ...doc,
            publicUrl: doc.is_public ? storage.getPublicUrl(doc.bucket, doc.file_path) : null
        }));
        res.render('documents', { docs: enriched, flash: req.query.flash });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al listar documentos');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /documents/new — formulario de subida
// ──────────────────────────────────────────────────────────────────────────────
module.exports.showCreate = (req, res) => {
    res.render('upload', { error: null });
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /documents — subir archivo nuevo
//
// PATRÓN PEDAGÓGICO CENTRAL: transaccionalidad manual entre Storage y Postgres.
// Storage y Postgres son sistemas separados; si quieres consistencia, la
// programas tú.
//
// Orden: Storage primero, BD después.
//   - Si falla Storage, no hicimos nada en BD → no hay que compensar.
//   - Si falla BD, el archivo ya está subido → compensamos borrándolo.
// ──────────────────────────────────────────────────────────────────────────────
module.exports.create = async (req, res) => {
    if (!req.file) {
        return res.status(400).render('upload', { error: 'Falta el archivo (campo "file").' });
    }
    const title    = (req.body.title || '').trim() || req.file.originalname;
    const isPublic = req.body.is_public === 'on';
    const bucket   = isPublic ? PUBLIC_BUCKET : PRIVATE_BUCKET;
    const filePath = storage.buildObjectPath(req.file.originalname);

    // 1) Subir a Storage.
    try {
        await storage.uploadObject(bucket, filePath, req.file.buffer, req.file.mimetype);
    } catch (e) {
        console.log(e);
        return res.status(500).render('upload', { error: 'Error subiendo a Storage: ' + e.message });
    }

    // 2) INSERT en BD. Si falla, COMPENSAR borrando el objeto recién subido.
    try {
        await model.create({
            title,
            file_path:  filePath,
            bucket,
            mime_type:  req.file.mimetype,
            size_bytes: req.file.size,
            is_public:  isPublic
        });
    } catch (e) {
        console.log('INSERT falló, compensando con removeObject:', e.message);
        try { await storage.removeObject(bucket, filePath); }
        catch (e2) { console.log('Compensación también falló:', e2.message); }
        return res.status(500).render('upload', { error: 'Error registrando en BD: ' + e.message });
    }

    res.redirect('/documents?flash=creado');
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /documents/:id — detalle
// ──────────────────────────────────────────────────────────────────────────────
module.exports.show = async (req, res) => {
    try {
        const doc = await model.findById(req.params.id);
        if (!doc) return res.status(404).send('Documento no encontrado');

        const publicUrl = doc.is_public
            ? storage.getPublicUrl(doc.bucket, doc.file_path)
            : null;

        res.render('document', { doc, publicUrl });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al obtener el documento');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /documents/:id/edit — formulario de edición
// ──────────────────────────────────────────────────────────────────────────────
module.exports.showEdit = async (req, res) => {
    try {
        const doc = await model.findById(req.params.id);
        if (!doc) return res.status(404).send('Documento no encontrado');
        res.render('edit', { doc, error: null });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al cargar la edición');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /documents/:id — actualiza (metadata y/o reemplaza archivo)
//
// Dos sub-flujos según si vino archivo en el form:
//   - Sin archivo  → solo UPDATE de metadata.
//   - Con archivo  → upload nuevo path → UPDATE BD → remove path viejo.
//                    (Si el UPDATE falla, compensamos borrando el path nuevo).
// ──────────────────────────────────────────────────────────────────────────────
module.exports.update = async (req, res) => {
    const id = req.params.id;
    let doc;
    try {
        doc = await model.findById(id);
        if (!doc) return res.status(404).send('Documento no encontrado');
    } catch (e) {
        console.log(e);
        return res.status(500).send('Error al cargar el documento');
    }

    const newTitle = (req.body.title || '').trim() || doc.title;

    // Caso A: no se subió archivo nuevo. Solo actualizamos el título.
    if (!req.file) {
        try {
            await model.updateMetadata(id, { title: newTitle });
        } catch (e) {
            console.log(e);
            return res.status(500).render('edit', { doc, error: 'Error al actualizar: ' + e.message });
        }
        return res.redirect('/documents/' + id + '?flash=actualizado');
    }

    // Caso B: viene archivo nuevo → reemplazo. Mantenemos siempre uno accesible.
    const newPath = storage.buildObjectPath(req.file.originalname);
    const oldPath = doc.file_path;

    // 1) Sube el nuevo (todavía ambos archivos existen en Storage).
    try {
        await storage.uploadObject(doc.bucket, newPath, req.file.buffer, req.file.mimetype);
    } catch (e) {
        console.log(e);
        return res.status(500).render('edit', { doc, error: 'Error subiendo el archivo nuevo: ' + e.message });
    }

    // 2) Apunta la fila al nuevo (más el título por si también cambió).
    try {
        await model.replaceFile(id, {
            file_path:  newPath,
            mime_type:  req.file.mimetype,
            size_bytes: req.file.size
        });
        if (newTitle !== doc.title) {
            await model.updateMetadata(id, { title: newTitle });
        }
    } catch (e) {
        console.log('UPDATE falló, compensando con removeObject del nuevo:', e.message);
        try { await storage.removeObject(doc.bucket, newPath); }
        catch (e2) { console.log('Compensación también falló:', e2.message); }
        return res.status(500).render('edit', { doc, error: 'Error en BD: ' + e.message });
    }

    // 3) Solo cuando ya todo está consistente, limpiamos el archivo viejo.
    try {
        await storage.removeObject(doc.bucket, oldPath);
    } catch (e) {
        // El reemplazo en BD ya quedó. Si falla este cleanup, el archivo viejo
        // se queda huérfano en Storage — anómalo pero NO rompe nada.
        console.log('No se pudo borrar el archivo viejo:', e.message);
    }

    res.redirect('/documents/' + id + '?flash=reemplazado');
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /documents/:id/delete — eliminar
//
// Orden INVERSO al CREATE: BD primero, Storage después.
//   - Si falla BD, no tocamos Storage.
//   - Si Storage falla después, el archivo queda huérfano (anómalo pero seguro):
//     ningún row apunta a él, no rompe la app.
//   - Si hiciéramos Storage primero y BD fallara, tendríamos un row apuntando
//     a un archivo que ya no existe — eso SÍ rompería la app.
// ──────────────────────────────────────────────────────────────────────────────
module.exports.destroy = async (req, res) => {
    try {
        const removed = await model.remove(req.params.id);
        if (!removed) return res.status(404).send('Documento no encontrado');

        try {
            await storage.removeObject(removed.bucket, removed.file_path);
        } catch (e) {
            console.log('Archivo huérfano en Storage tras DELETE:', e.message);
        }
        res.redirect('/documents?flash=eliminado');
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al eliminar');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /documents/:id/signed-url — devuelve una URL FIRMADA temporal (bonus)
//
// El cliente llama este endpoint cuando necesita ver/descargar un archivo de
// un bucket privado. El servidor genera la URL con la secret key (que jamás
// sale de aquí) y la regresa al cliente. La URL es válida solo por unos
// segundos.
// ──────────────────────────────────────────────────────────────────────────────
module.exports.getSignedUrl = async (req, res) => {
    try {
        const doc = await model.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'No encontrado' });
        if (doc.is_public) {
            // Para un público no tiene sentido firmar; devolvemos la pública.
            return res.json({ url: storage.getPublicUrl(doc.bucket, doc.file_path) });
        }
        // Sin tercer argumento: usamos el default de createSignedUrl en
        // storage.repository.js (60 s). Cambiar el default ahí afecta toda la app
        // — útil para el paso 24 del readme que pide bajarlo a 5 s y reiniciar
        // para verificar que las URLs realmente expiran.
        const url = await storage.createSignedUrl(doc.bucket, doc.file_path);
        res.json({ url });
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: e.message });
    }
};
