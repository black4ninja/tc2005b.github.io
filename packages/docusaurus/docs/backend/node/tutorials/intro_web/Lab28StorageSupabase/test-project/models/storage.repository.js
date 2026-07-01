const crypto = require('crypto');
const path   = require('path');
const supabase = require('../util/storage.js');

// Repositorio para Supabase Storage. Vive en models/ porque es acceso a datos
// (Storage es "otra base"); util/ guarda solo la creación del cliente.

// Construye un path único dentro del bucket a partir del nombre original del
// archivo. Formato: "documents/{uuid}-{slug}.{ext}".
//
// - El UUID evita que dos uploads del mismo nombre choquen.
// - El slug conserva un trozo legible del nombre original (útil al ver el path
//   en el dashboard de Supabase para identificar el archivo a ojo).
// - Forzamos lowercase y reemplazamos cualquier cosa que no sea [a-z0-9-] por
//   un guion para evitar problemas con espacios, acentos y caracteres raros.
exports.buildObjectPath = (originalName) => {
    const ext = path.extname(originalName).toLowerCase();          // ".png"
    const base = path.basename(originalName, ext);                 // "Mi Foto"
    const slug = base
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita acentos
        .replace(/[^a-z0-9]+/g, '-')                                // espacios/símbolos -> "-"
        .replace(/^-+|-+$/g, '')                                    // recorta guiones extremos
        .slice(0, 40) || 'file';                                    // máx 40 chars
    const uuid = crypto.randomUUID();
    return `documents/${uuid}-${slug}${ext}`;
};

// Sube un buffer al bucket. upsert:false hace que falle si el path ya existe
// (no debería pasar porque generamos un UUID, pero es una red de seguridad).
exports.uploadObject = async (bucket, filePath, buffer, contentType) => {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, buffer, { contentType, upsert: false });

    if (error) throw new Error(`Storage upload falló: ${error.message}`);
    return data;  // { path: '...', id: '...', fullPath: '...' }
};

// Borra uno o varios objetos del bucket. Aceptamos un solo path por simplicidad;
// la API de Supabase recibe un arreglo.
exports.removeObject = async (bucket, filePath) => {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .remove([filePath]);

    if (error) throw new Error(`Storage remove falló: ${error.message}`);
    return data;
};

// Construye la URL pública del objeto. ¡Ojo! es SÍNCRONO y no toca la red:
// solo concatena dominio + bucket + path. Si el bucket no es público, la URL
// existirá pero al pegarla en el browser dará 400. Si el objeto no existe, la
// URL existirá igual (no valida nada). Esa validación la haces tú.
exports.getPublicUrl = (bucket, filePath) => {
    const { data } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(filePath);
    return data.publicUrl;
};

// Crea una URL FIRMADA y TEMPORAL para un objeto en un bucket privado.
// expiresIn está en SEGUNDOS (no milisegundos). Para imágenes inline conviene
// 60-300; para descargas iniciadas por el usuario, 3600.
exports.createSignedUrl = async (bucket, filePath, expiresIn = 60) => {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

    if (error) throw new Error(`createSignedUrl falló: ${error.message}`);
    return data.signedUrl;
};
