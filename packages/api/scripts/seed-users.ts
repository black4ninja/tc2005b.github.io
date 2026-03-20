import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { AppUser } from '../src/models/index.js';

interface UserSeedData {
  email: string;
  name: string;
  userType: 'admin' | 'alumno';
  grupo?: string;
}

const SEED_USERS: UserSeedData[] = [
  {
    email: 'afdez@tec.mx',
    name: 'Alfer Fernández',
    userType: 'admin',
  },
  {
    email: 'denisse.mf@tec.mx',
    name: 'Denisse Maldonado',
    userType: 'admin',
  },
  {
    email: 'enrique.calderon@tec.mx',
    name: 'Enrique Calderón',
    userType: 'admin',
  },
];

function generatePassword(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

export async function runUserSeed(dryRun: boolean): Promise<void> {
  console.log(`\n--- Seed Users ${dryRun ? '(DRY RUN)' : ''} ---\n`);

  const credentials: { email: string; password: string }[] = [];

  for (const data of SEED_USERS) {
    const query = new Parse.Query(AppUser);
    query.equalTo('email', data.email);
    const existing = await query.first({ useMasterKey: true });

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
      console.log(`  UPDATE: ${data.email}`);
      if (!dryRun) {
        existing.setName(data.name);
        existing.setUserType(data.userType);
        if (data.grupo !== undefined) existing.setGrupo(data.grupo);
        existing.setPasswordHash(passwordHash);
        await existing.save(null, { useMasterKey: true });
      }
      credentials.push({ email: data.email, password });
    } else {
      console.log(`  CREATE: ${data.email}`);
      if (!dryRun) {
        const user = new AppUser();
        user.setEmail(data.email);
        user.setName(data.name);
        user.setUserType(data.userType);
        if (data.grupo) user.setGrupo(data.grupo);
        user.set('attributes', {});
        user.setPasswordHash(passwordHash);
        await user.save(null, { useMasterKey: true });
      }
      credentials.push({ email: data.email, password });
    }
  }

  console.log(`\nUsers seed ${dryRun ? 'dry run' : ''} complete.\n`);

  if (!dryRun && credentials.length > 0) {
    console.log('=== CREDENCIALES GENERADAS ===');
    console.log('(Guarda estas contraseñas, no se pueden recuperar)\n');
    console.log('Email'.padEnd(35) + 'Contraseña');
    console.log('-'.repeat(50));
    for (const c of credentials) {
      console.log(c.email.padEnd(35) + c.password);
    }
    console.log('-'.repeat(50));
  }
}
