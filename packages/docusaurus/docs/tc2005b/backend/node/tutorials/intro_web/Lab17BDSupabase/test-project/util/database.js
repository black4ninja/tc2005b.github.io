require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase administra el certificado TLS por nosotros, así que rejectUnauthorized:false
    // es seguro aquí. NO copies esta configuración tal cual contra tu propio servidor Postgres
    // sin revisar y confiar en el certificado — desactivar la validación te expone a MITM.
    ssl: { rejectUnauthorized: false },
    max: 5
});

module.exports = pool;
