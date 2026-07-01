// Ejemplo BONUS — usar el cliente oficial @supabase/supabase-js
// Este archivo NO forma parte del servidor principal. Se ejecuta con:
//   node supabase-example.js
//
// Muestra cómo acceder a la misma tabla "games" pero por la API REST
// autogenerada de Supabase, usando el query builder del cliente JS.
// Requiere en el .env: SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY
// (de Project Settings > API Keys > Publishable key — NO uses las
// legacy anon/service_role keys).
//
// Además necesitas habilitar RLS en la tabla "games" con una política
// SELECT pública, si no la respuesta va a ser un arreglo vacío.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

async function main() {
    const { data, error } = await supabase
        .from('games')
        .select('id, title, release_year, price, rating')
        .order('rating', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.warn('Respuesta vacía. Revisa que la tabla "games" tenga RLS habilitado y una política SELECT que permita al rol "anon" leer las filas.');
        return;
    }

    console.log('Top 10 juegos por rating:');
    console.table(data);
}

main();
