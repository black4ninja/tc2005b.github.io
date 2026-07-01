const http = require('http');
const path = require('path');
const fs   = require('fs');

const server = http.createServer( (request, response) => {    
    console.log(request.url);
    
    switch(request.url){
        case "/":
            response.setHeader('Content-Type', 'text/plain');
            response.write("URL index /");
            response.end();   
            break;
        case "/test_json":
            if(request.method == "GET"){
                response.setHeader('Content-Type', 'application/json');
                response.write('{code:200, msg:"Ok GET"}');
                response.end();  
            }else if(request.method == "POST"){
                response.setHeader('Content-Type', 'application/json');
                response.write('{code:200, msg:"Ok POST"}');
                response.end();  
            }
            break;
        case "/test_html":
            response.setHeader('Content-Type', 'text/html');    
            response.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <title>Código en HTML</title>
                </head>
                <body>
                    <h1>hola mundo desde node</h1>
                </body>
                </html>
            `);
            response.end();   
            break;
        case "/form_method":
            if(request.method == "GET"){
                response.setHeader('Content-Type', 'text/html');
                const html = fs.readFileSync(path.resolve(__dirname, './form.html'), 'utf8')
                response.write(html);
                response.end();  
            }else if(request.method == "POST"){
                let body = [];
                request
                .on('data', chunk => {
                    body.push(chunk);
                })
                .on('end', () => {
                    body = Buffer.concat(body).toString();
                    console.log(body)

                    const indice = Number(body.split('&')[0].split('=')[1]);
                    console.log(indice);
                    const imprimir = body.split('&')[1].split('=')[1];
                    console.log(imprimir);

                    for(var i = 1; i <= indice; i++){
                        console.log(imprimir)
                    }

                    response.setHeader('Content-Type', 'application/json');
                    response.statusCode = 200;
                    response.write('{code:200, msg:"Ok POST"}');
                    response.end();
                });  
            }    
            break;
        default:
            response.statusCode = 404;
            response.end();
            break;
    }

});
server.listen(3000);