const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router = express.Router();
const controller = require("../controllers/usuarios.controller.js")


router.get('/obtener_usuarios', controller.index);

module.exports = router;