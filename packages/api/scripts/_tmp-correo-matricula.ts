/** SOLO LECTURA: ¿el correo deriva siempre de la matrícula? */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { AppUser } from '../src/models/AppUser.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

async function main() {
  const q = new Parse.Query<AppUser>('AppUser');
  q.equalTo('userType' as any, 'alumno' as any);
  q.limit(10000);
  const alumnos = (await q.find({ useMasterKey: true })).filter((a) => a.get('exists') !== false);

  let coinciden = 0;
  const raros: string[] = [];
  const dominios = new Map<string, number>();
  for (const a of alumnos) {
    const correo = (a.getEmail() ?? '').trim().toLowerCase();
    const matricula = (a.getMatricula() ?? '').trim().toLowerCase();
    const local = correo.split('@')[0];
    const dominio = correo.split('@')[1] ?? '(sin dominio)';
    dominios.set(dominio, (dominios.get(dominio) ?? 0) + 1);
    if (matricula && local === matricula) coinciden++;
    else raros.push(`${a.getName()} · matrícula=${a.getMatricula()} · correo=${a.getEmail()}`);
  }
  console.log(`alumnos: ${alumnos.length}`);
  console.log(`correo cuya parte local ES la matrícula: ${coinciden}/${alumnos.length}`);
  console.log(`dominios: ${[...dominios].map(([d, n]) => `${d}=${n}`).join(', ')}`);
  if (raros.length) { console.log('los que NO cuadran:'); raros.slice(0, 10).forEach((r) => console.log('  ' + r)); }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
