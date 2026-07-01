import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { AppUser } from '../src/models/index.js';

interface UserSeedData {
  email: string;
  name: string;
  userType: 'admin' | 'alumno';
  password: string;
}

const SEED_USERS: UserSeedData[] = [
  // Admins
  { email: 'afdez@tec.mx', name: 'Alfer Fernández', userType: 'admin', password: 'Master4ninja!' },
  { email: 'denisse.mf@tec.mx', name: 'Denisse Maldonado', userType: 'admin', password: 'zwSdoAsM' },
  { email: 'enrique.calderon@tec.mx', name: 'Enrique Calderón', userType: 'admin', password: 'Ct61CRWm' },
  // Alumnos
  { email: 'a01278654@tec.mx', name: 'Arenas Vergara, Axel Orlando', userType: 'alumno', password: 'vBn_LnT5' },
  { email: 'a01612863@tec.mx', name: 'De la Cruz Ambrosio, Luis Enrique', userType: 'alumno', password: '4RJX-LzE' },
  { email: 'a01708389@tec.mx', name: 'Elizalde Herrera, Juan Andrés', userType: 'alumno', password: 'VW8kTpcv' },
  { email: 'a01614731@tec.mx', name: 'Fuentes Bear, Leonardo', userType: 'alumno', password: 'loiSYwMl' },
  { email: 'a01713062@tec.mx', name: 'García Galván, Víctor Adrián', userType: 'alumno', password: 'DDeY6Xm-' },
  { email: 'a01711027@tec.mx', name: 'Gómez Ayala, Carlos Arturo', userType: 'alumno', password: '9VYtzG6P' },
  { email: 'a01707310@tec.mx', name: 'Gutiérrez Chavarría, Luis Eduardo', userType: 'alumno', password: 'daYMHWHP' },
  { email: 'a01713355@tec.mx', name: 'López Cardoso, Oscar', userType: 'alumno', password: '3Dp7N4QW' },
  { email: 'a01708827@tec.mx', name: 'Mancera Llano, Iñaki', userType: 'alumno', password: 'T0Zyz8rU' },
  { email: 'a01713396@tec.mx', name: 'Martín del Campo Soler, Santiago', userType: 'alumno', password: 'no4Gm_cM' },
  { email: 'a01613426@tec.mx', name: 'Martínez Barragán, Luis Fernando', userType: 'alumno', password: 'MuBIpGyr' },
  { email: 'a01278286@tec.mx', name: 'Montiel Reyes, Isabella', userType: 'alumno', password: 'Wz0fyGwX' },
  { email: 'a01711060@tec.mx', name: 'Nieto Vega, Jorge Rubén', userType: 'alumno', password: 'B2v2DPJq' },
  { email: 'a01666626@tec.mx', name: 'Piñeiro González, Facundo Gael', userType: 'alumno', password: '3KhZxk41' },
  { email: 'a01277315@tec.mx', name: 'Robles Camacho, David Alejandro', userType: 'alumno', password: 'GC3E-Pf_' },
  { email: 'a01712814@tec.mx', name: 'Rodríguez Amaro, Iker', userType: 'alumno', password: '5n8bbOd3' },
  { email: 'a01713876@tec.mx', name: 'Trujillo, Grezia', userType: 'alumno', password: 'pGaWT2ej' },
  { email: 'a01614712@tec.mx', name: 'Xochihua Moncada, Germán Uriel', userType: 'alumno', password: 'ZBRO5w2p' },
];

export async function runUserSeed(dryRun: boolean): Promise<void> {
  console.log(`\n--- Seed Users ${dryRun ? '(DRY RUN)' : ''} ---\n`);

  for (const data of SEED_USERS) {
    const query = new Parse.Query(AppUser);
    query.equalTo('email', data.email);
    const existing = await query.first({ useMasterKey: true });

    const passwordHash = await bcrypt.hash(data.password, 10);

    if (existing) {
      console.log(`  UPDATE: ${data.email}`);
      if (!dryRun) {
        if (!existing.has('active')) existing.set('active', true);
        if (!existing.has('exists')) existing.set('exists', true);
        existing.setName(data.name);
        existing.setUserType(data.userType);
        existing.setPasswordHash(passwordHash);
        await existing.save(null, { useMasterKey: true });
      }
    } else {
      console.log(`  CREATE: ${data.email}`);
      if (!dryRun) {
        const user = new AppUser().initDefaults();
        user.setEmail(data.email);
        user.setName(data.name);
        user.setUserType(data.userType);
        user.set('attributes', {});
        user.setPasswordHash(passwordHash);
        await user.save(null, { useMasterKey: true });
      }
    }
  }

  console.log(`\nUsers seed ${dryRun ? 'dry run' : ''} complete: ${SEED_USERS.length} users.\n`);
}
