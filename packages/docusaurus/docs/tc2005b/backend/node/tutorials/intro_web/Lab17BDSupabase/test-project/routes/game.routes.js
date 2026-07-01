const express = require('express');
const router  = express.Router();
const controller = require('../controllers/game.controller.js');

router.get('/',                  controller.index);
router.get('/buscar',            controller.buscarSeguro);
router.get('/buscar-inseguro',   controller.buscarInseguro);

module.exports = router;
