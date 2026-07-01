import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { AppUser } from '../src/models/index.js';
import { BaseModel } from '../src/models/BaseModel.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Uso: npx tsx scripts/reset-password.ts <email> <nuevo-password>');
    process.exit(1);
  }

  const query = BaseModel.queryActive<AppUser>('AppUser');
  query.equalTo('email', email.toLowerCase().trim());
  const user = await query.first({ useMasterKey: true });

  if (!user) {
    console.error(`Usuario no encontrado: ${email}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  user.setPasswordHash(hash);
  await user.save(null, { useMasterKey: true });

  console.log(`Password actualizado para ${email} (${user.getName()})`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
