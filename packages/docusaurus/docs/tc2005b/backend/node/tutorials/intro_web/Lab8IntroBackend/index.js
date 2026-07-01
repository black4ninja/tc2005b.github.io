const http = require('http');

const server = http.createServer( (request, response) => {    
    console.log(request.url);
    response.setHeader('Content-Type', 'text/html');
    //response.write("");
    //response.write("hola mundo desde node");
    response.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <title>HTML</title>
            </head>
            <body>
            <h1>hola mundo desde node</h1>
            </body>
            </html>
        `);
    response.end();
});
server.listen(3000);