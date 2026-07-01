-- Tabla 'documents' — guarda únicamente la metadata de cada archivo.
-- El binario vive en Supabase Storage; aquí solo persistimos el path con el
-- que lo podemos recuperar después.
--
-- file_path : la "key" del objeto dentro del bucket (ej. "documents/abc-foto.png").
-- bucket    : a qué bucket pertenece. Lo guardamos aunque solo tengamos dos buckets
--             porque hace que el código pueda evolucionar sin migrar datos viejos.
-- is_public : redunda con 'bucket' pero permite filtros rápidos sin JOIN.
-- mime_type : necesario para que el browser previsualice el archivo correctamente.

DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(160) NOT NULL,
    file_path    TEXT NOT NULL,
    bucket       VARCHAR(80) NOT NULL,
    mime_type    VARCHAR(120),
    size_bytes   BIGINT,
    is_public    BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_uploaded_at ON documents (uploaded_at DESC);
