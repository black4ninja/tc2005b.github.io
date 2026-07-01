const pool = require('../util/database.js');

// CRUD contra la tabla 'documents'. Esta capa NO sabe nada de Supabase Storage:
// solo opera sobre Postgres. El controller es quien coordina las dos capas.

// INSERT — recibe la metadata ya armada (el path ya fue calculado y el archivo
// ya fue subido al bucket por el controller). Usamos RETURNING * para devolver
// la fila completa con el id generado, así evitamos un SELECT extra.
exports.create = async ({ title, file_path, bucket, mime_type, size_bytes, is_public }) => {
    const sql = `
        INSERT INTO documents (title, file_path, bucket, mime_type, size_bytes, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [title, file_path, bucket, mime_type, size_bytes, is_public]);
    return rows[0];
};

// SELECT — lista todos los documentos, los más recientes primero.
exports.findAll = async () => {
    const { rows } = await pool.query(
        'SELECT * FROM documents ORDER BY uploaded_at DESC'
    );
    return rows;
};

// SELECT por id — devuelve undefined si no existe.
exports.findById = async (id) => {
    const { rows } = await pool.query(
        'SELECT * FROM documents WHERE id = $1',
        [id]
    );
    return rows[0];
};

// UPDATE — solo metadata editable (título). El path del archivo no se toca.
exports.updateMetadata = async (id, { title }) => {
    const sql = `
        UPDATE documents
        SET title = $1
        WHERE id = $2
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [title, id]);
    return rows[0];
};

// UPDATE — reemplaza el archivo apuntando la fila a un path nuevo. El controller
// es responsable de subir el archivo nuevo ANTES de llamar esta función y de
// borrar el path viejo DESPUÉS (ver el patrón en document.controller.js).
exports.replaceFile = async (id, { file_path, mime_type, size_bytes }) => {
    const sql = `
        UPDATE documents
        SET file_path  = $1,
            mime_type  = $2,
            size_bytes = $3,
            uploaded_at = NOW()
        WHERE id = $4
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [file_path, mime_type, size_bytes, id]);
    return rows[0];
};

// DELETE — usamos RETURNING para que el controller sepa qué objeto borrar del
// bucket sin tener que hacer un SELECT previo.
exports.remove = async (id) => {
    const { rows } = await pool.query(
        'DELETE FROM documents WHERE id = $1 RETURNING file_path, bucket',
        [id]
    );
    return rows[0];
};
