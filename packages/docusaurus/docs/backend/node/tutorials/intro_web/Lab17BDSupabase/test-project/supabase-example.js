// Ejemplo BONUS — usar el cliente oficial @supabase/supabase-js
// Este archivo NO forma parte del servidor principal. Se ejecuta con:
//   node supabase-example.js
//
// Muestra cómo acceder a la misma tabla "games" pero con el query builder
// de Supabase en vez del driver pg. Requiere: SUPABASE_URL y SUPABASE_ANON_KEY
// en el .env, además de haber habilitado RLS con una política SELECT pública.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function main() {
    const { data, error } = await supabase
        .from('games')
        .select('id, title, release_year, price, rating')
        .order('rating', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error.message);
        console.error('Tip: si devuelve vacío, revisa que la tabla tenga RLS habilitado y una política SELECT que permita el rol "anon".');
        return;
    }

    console.log('Top 10 juegos por rating:');
    console.table(data);
}

main();
