require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Cliente de Supabase para usar EXCLUSIVAMENTE desde el servidor.
//
// Usamos la SECRET KEY (sb_secret_...) porque queremos administrar Storage como
// "sysadmin": bypaseamos Row Level Security para subir/borrar archivos sin
// depender de políticas. Esto es seguro porque la llave nunca sale de este
// proceso de Node — el navegador jamás la ve.
//
// ⚠️  NUNCA crees un cliente con esta llave en código que corra en el browser
//     o en una app móvil: cualquiera con devtools la leería y tendría control
//     total de tu proyecto Supabase.

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            // Este cliente nunca representa a un usuario; no necesita persistir sesión.
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

module.exports = supabase;
