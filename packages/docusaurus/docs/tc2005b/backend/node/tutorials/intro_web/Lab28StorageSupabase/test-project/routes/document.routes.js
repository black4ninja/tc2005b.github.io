const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const controller = require('../controllers/document.controller.js');

// Multer con memoryStorage: el archivo NO se escribe en disco, queda en
// req.file.buffer listo para pasarse al SDK de Supabase.
//
// Contraste con el Lab22Archivos:
//   - Lab22 usa multer.diskStorage() -> el archivo termina en ./public/ o
//     ./private/ del servidor.
//   - Lab28 usa multer.memoryStorage() -> el archivo NUNCA toca el disco del
//     servidor: pasa del buffer directo a Supabase Storage por la red.
//
// limits.fileSize evita que un cliente malicioso (o despistado) tumbe el
// servidor subiendo un archivo gigante.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB
});

router.get('/',                  controller.index);
router.get('/new',               controller.showCreate);
router.post('/',                 upload.single('file'), controller.create);
router.get('/:id',               controller.show);
router.get('/:id/edit',          controller.showEdit);
router.get('/:id/signed-url',    controller.getSignedUrl);
router.post('/:id',              upload.single('file'), controller.update);
router.post('/:id/delete',       controller.destroy);

module.exports = router;
