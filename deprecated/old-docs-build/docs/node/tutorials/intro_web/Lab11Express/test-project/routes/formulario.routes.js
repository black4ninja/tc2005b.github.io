const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router = express.Router();

router.get('/form_method', (request, response, next) => {
    response.setHeader('Content-Type', 'text/html');
    const html = fs.readFileSync(path.resolve(__dirname, './../form.html'), 'utf8')
    response.write(html);
    response.end();  
});

router.post('/form_method', (request, response, next) => {
    const indice = Number(request.body.indice);
    console.log(indice);
    const imprimir = request.body.imprimir
    console.log(imprimir);

    for(var i = 1; i <= indice; i++){
        console.log(imprimir)
    }

    response.setHeader('Content-Type', 'application/json');
    response.statusCode = 200;
    response.write('{code:200, msg:"Ok POST"}');
    response.end();
});

module.exports = router;