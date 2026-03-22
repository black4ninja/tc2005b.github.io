exports.ObtenerUsuarios = function(correo,contrasena){
    let usuarios = [];

    usuarios.push({
        nombre:"Samuel",
        id:1,
        activo:true
    });
    usuarios.push({
        nombre:"Lisa",
        id:1,
        activo:true
    });
    usuarios.push({
        nombre:"Bob",
        id:1,
        activo:true
    });
    usuarios.push({
        nombre:"Alicia",
        id:1,
        activo:true
    });

    return usuarios;
}