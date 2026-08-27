/**
 * Alumnos de PRUEBA para el grupo «Prueba TC2007B».
 *
 * Existe para poder probar la pantalla de Preguntas con un grupo de tamaño
 * real: repartir, buscar, ver quién lleva qué. Las matrículas continúan la del
 * profesor (A00889204) para que se distingan de un vistazo de las de verdad y
 * se puedan borrar juntas.
 *
 * ⚠️ Dev comparte la BD de PRODUCCIÓN. Corre `--dry-run` primero.
 *
 *   tsx scripts/seed-alumnos-prueba.ts --dry-run
 *   tsx scripts/seed-alumnos-prueba.ts
 *   tsx scripts/seed-alumnos-prueba.ts --borrar     (baja lógica de los 25)
 */
import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { AppUser, Grupo, GrupoAlumno } from '../src/models/index.js';
import { createGrupoAlumnoLink } from '../src/services/grupo-alumno.service.js';

const GRUPO = 'Prueba TC2007B';
const BASE = 889205; // A00889204 es la del profesor: los de prueba siguen desde ahí
const CUANTOS = 25;

const NOMBRES = [
  'Ana Sofía Beltrán Quiroz', 'Bruno Alejandro Cáceres Lira', 'Camila Renata Duarte Solís',
  'Diego Emiliano Escamilla Ponce', 'Elena Victoria Fierro Nájera', 'Fernando Gael Gaitán Ruvalcaba',
  'Gabriela Montserrat Huerta Zepeda', 'Héctor Iván Iriarte Camarena', 'Irene Paulina Jaramillo Bustos',
  'Joaquín Andrés Kuri Villagómez', 'Karla Daniela Lozoya Arriaga', 'Leonardo Matías Mejía Cantú',
  'María Fernanda Nolasco Treviño', 'Néstor Rodrigo Olvera Padilla', 'Olivia Regina Pizarro Mendoza',
  'Pablo Sebastián Quintanar Ávila', 'Regina Isabel Rentería Godoy', 'Santiago Nicolás Salgado Ibarra',
  'Tania Guadalupe Tejeda Murillo', 'Ulises Damián Ugalde Fonseca', 'Valeria Ximena Vergara Loaiza',
  'Wendy Alejandra Wong Barrios', 'Ximena Alondra Xicoténcatl Ramos', 'Yahir Emmanuel Yáñez Cordero',
  'Zoé Mariana Zermeño Alcántara',
];

const dryRun = process.argv.includes('--dry-run');
const borrar = process.argv.includes('--borrar');

function matriculaDe(i: number): string { return `A00${BASE + i}`; }
function correoDe(i: number): string { return `a00${BASE + i}@tec.mx`; }

async function main(): Promise<void> {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  const qGrupo = new Parse.Query<Grupo>('Grupo');
  qGrupo.equalTo('name' as any, GRUPO as any);
  qGrupo.equalTo('exists' as any, true as any);
  const grupo = await qGrupo.first({ useMasterKey: true });
  if (!grupo) throw new Error(`No existe el grupo «${GRUPO}»`);
  console.log(`Grupo: ${grupo.get('name')} (${grupo.id})\n`);

  let altas = 0; let reactivados = 0; let bajas = 0;

  for (let i = 0; i < CUANTOS; i += 1) {
    const matricula = matriculaDe(i);
    const email = correoDe(i);
    const name = NOMBRES[i];

    const q = new Parse.Query<AppUser>('AppUser');
    q.equalTo('email' as any, email as any);
    const existente = await q.first({ useMasterKey: true });

    if (borrar) {
      if (!existente) continue;
      console.log(`  BAJA: ${matricula} ${name}`);
      if (!dryRun) {
        const qLink = new Parse.Query<GrupoAlumno>('GrupoAlumno');
        qLink.equalTo('alumno' as any, existente as any);
        qLink.equalTo('grupo' as any, grupo as any);
        for (const link of await qLink.find({ useMasterKey: true })) {
          link.set('active', false);
          link.set('exists', false);
          await link.save(null, { useMasterKey: true });
        }
        existente.set('active', false);
        existente.set('exists', false);
        await existente.save(null, { useMasterKey: true });
      }
      bajas += 1;
      continue;
    }

    let alumno = existente;
    if (alumno) {
      console.log(`  YA ESTÁ: ${matricula} ${name}`);
    } else {
      console.log(`  ALTA: ${matricula} ${name} <${email}>`);
      altas += 1;
      if (!dryRun) {
        // Como la carga desde Canvas: la contraseña es la matrícula en mayúsculas.
        const hash = await bcrypt.hash(matricula, 10);
        alumno = new AppUser().initDefaults();
        alumno.setName(name);
        alumno.setEmail(email);
        alumno.setMatricula(matricula);
        alumno.setUserType('alumno');
        alumno.setPasswordHash(hash);
        alumno.setPasswordAsignada(true);
        alumno.setAttributes({});
        await alumno.save(null, { useMasterKey: true });
      }
    }

    if (dryRun || !alumno) continue;

    const qLink = new Parse.Query<GrupoAlumno>('GrupoAlumno');
    qLink.equalTo('alumno' as any, alumno as any);
    qLink.equalTo('grupo' as any, grupo as any);
    const link = await qLink.first({ useMasterKey: true });
    if (link) {
      if (link.get('active') !== true || link.get('exists') !== true) {
        link.set('active', true);
        link.set('exists', true);
        await link.save(null, { useMasterKey: true });
        reactivados += 1;
      }
    } else {
      await createGrupoAlumnoLink(alumno, grupo);
      reactivados += 1;
    }
  }

  console.log(
    `\n${dryRun ? '(DRY RUN) ' : ''}${borrar
      ? `${bajas} bajas`
      : `${altas} altas · ${reactivados} inscripciones en «${GRUPO}»`}`,
  );
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
