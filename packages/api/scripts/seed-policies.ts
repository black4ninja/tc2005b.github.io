import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Policy, type PolicyConditions } from '../src/models/index.js';

interface PolicySeedData {
  name: string;
  description: string;
  resource: string;
  action: string;
  effect: 'allow' | 'deny';
  conditions: PolicyConditions;
  priority: number;
}

const SEED_POLICIES: PolicySeedData[] = [
  {
    name: 'admin_panel_access',
    description: 'Permite acceso al panel de administración para admins',
    resource: 'admin_panel',
    action: 'access',
    effect: 'allow',
    conditions: { userAttributes: { userType: 'admin' } },
    priority: 10,
  },
  {
    name: 'alumnos_panel_access',
    description: 'Permite acceso al panel de alumnos para alumnos',
    resource: 'alumnos_panel',
    action: 'access',
    effect: 'allow',
    conditions: { userAttributes: { userType: 'alumno' } },
    priority: 10,
  },
  {
    name: 'admin_alumnos_access',
    description: 'Permite acceso al panel de alumnos para admins',
    resource: 'alumnos_panel',
    action: 'access',
    effect: 'allow',
    conditions: { userAttributes: { userType: 'admin' } },
    priority: 10,
  },
  {
    name: 'grades_read_own',
    description: 'Permite a alumnos leer sus propias calificaciones',
    resource: 'grades',
    action: 'read',
    effect: 'allow',
    conditions: {
      userAttributes: { userType: 'alumno' },
      resourceAttributes: { owner: 'self' },
    },
    priority: 10,
  },
  {
    name: 'grades_write_admin',
    description: 'Permite a admins escribir calificaciones',
    resource: 'grades',
    action: 'write',
    effect: 'allow',
    conditions: { userAttributes: { userType: 'admin' } },
    priority: 10,
  },
];

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function runPolicySeed(dryRun: boolean): Promise<void> {
  console.log(`\n--- Seed Policies ${dryRun ? '(DRY RUN)' : ''} ---\n`);

  for (const data of SEED_POLICIES) {
    const query = new Parse.Query(Policy);
    query.equalTo('name', data.name);
    const existing = await query.first({ useMasterKey: true });

    if (existing) {
      // Check if update needed
      const needsUpdate =
        existing.getDescription() !== data.description ||
        existing.getResource() !== data.resource ||
        existing.getAction() !== data.action ||
        existing.getEffect() !== data.effect ||
        !deepEqual(existing.getConditions(), data.conditions) ||
        existing.getPriority() !== data.priority;

      if (needsUpdate) {
        console.log(`  UPDATE: ${data.name}`);
        if (!dryRun) {
          existing.setDescription(data.description);
          existing.setResource(data.resource);
          existing.setAction(data.action);
          existing.setEffect(data.effect);
          existing.setConditions(data.conditions);
          existing.setPriority(data.priority);
          await existing.save(null, { useMasterKey: true });
        }
      } else {
        console.log(`  SKIP: ${data.name} (no changes)`);
      }
    } else {
      console.log(`  CREATE: ${data.name}`);
      if (!dryRun) {
        const policy = new Policy();
        policy.setPolicyName(data.name);
        policy.setDescription(data.description);
        policy.setResource(data.resource);
        policy.setAction(data.action);
        policy.setEffect(data.effect);
        policy.setConditions(data.conditions);
        policy.setPriority(data.priority);
        await policy.save(null, { useMasterKey: true });
      }
    }
  }

  console.log(`\nPolicies seed ${dryRun ? 'dry run' : ''} complete.`);
}
