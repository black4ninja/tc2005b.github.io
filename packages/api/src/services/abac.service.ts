import { Policy, type PolicyConditions } from '../models/index.js';
import { BaseModel } from '../models/BaseModel.js';
import { getGruposDeAlumno } from './grupo-alumno.service.js';

export interface AccessResult {
  allowed: boolean;
  reason: string;
  matchedPolicy?: string;
}

class AbacService {
  private cache: { policies: Policy[]; timestamp: number } | null = null;
  private readonly cacheTTL = 60_000; // 60 seconds

  async evaluateAccess(
    user: { get(key: string): unknown },
    resource: string,
    action: string,
    context?: Record<string, unknown>,
  ): Promise<AccessResult> {
    const policies = await this.getActivePolicies(resource, action);

    if (policies.length === 0) {
      return { allowed: false, reason: 'No matching policies found (default deny)' };
    }

    // Sort by priority descending
    policies.sort((a, b) => b.getPriority() - a.getPriority());

    let allowResult: AccessResult | null = null;

    // Obtener grupos del usuario una vez antes del loop
    let grupoIds: string[] = [];
    if (user.get('userType') === 'alumno' && (user as any).id) {
      const grupos = await getGruposDeAlumno((user as any).id);
      grupoIds = grupos.map(g => g.id);
    }

    for (const policy of policies) {
      const conditions = policy.getConditions();
      const userAttrs: Record<string, unknown> = {
        userType: user.get('userType'),
        grupo: grupoIds,
        ...(user.get('attributes') as Record<string, unknown> ?? {}),
      };

      const matched = this.matchConditions(
        conditions,
        userAttrs,
        {}, // resourceAttributes — evaluated when needed
        context ?? {},
      );

      if (!matched) continue;

      // Deny always wins
      if (policy.getEffect() === 'deny') {
        return {
          allowed: false,
          reason: `Denied by policy: ${policy.getPolicyName()}`,
          matchedPolicy: policy.getPolicyName(),
        };
      }

      if (!allowResult) {
        allowResult = {
          allowed: true,
          reason: `Allowed by policy: ${policy.getPolicyName()}`,
          matchedPolicy: policy.getPolicyName(),
        };
      }
    }

    if (allowResult) return allowResult;

    return { allowed: false, reason: 'No matching policy conditions (default deny)' };
  }

  async canAccessRoute(
    user: { get(key: string): unknown },
    route: 'admin' | 'alumnos',
  ): Promise<AccessResult> {
    const routeMap: Record<string, { resource: string; action: string }> = {
      admin: { resource: 'admin_panel', action: 'access' },
      alumnos: { resource: 'alumnos_panel', action: 'access' },
    };
    const { resource, action } = routeMap[route];
    return this.evaluateAccess(user, resource, action);
  }

  matchConditions(
    conditions: PolicyConditions,
    userAttrs: Record<string, unknown>,
    resourceAttrs: Record<string, unknown>,
    contextAttrs: Record<string, unknown>,
  ): boolean {
    // Check user attributes
    if (conditions.userAttributes) {
      for (const [key, expected] of Object.entries(conditions.userAttributes)) {
        const actual = userAttrs[key];
        if (Array.isArray(actual)) {
          // actual is array (e.g. user grupos), expected is what the policy requires
          if (Array.isArray(expected)) {
            if (!expected.some(e => (actual as string[]).includes(e as string))) return false;
          } else {
            if (!(actual as string[]).includes(expected as string)) return false;
          }
        } else if (Array.isArray(expected)) {
          if (!expected.includes(actual as string)) return false;
        } else {
          if (actual !== expected) return false;
        }
      }
    }

    // Check resource attributes
    if (conditions.resourceAttributes) {
      for (const [key, expected] of Object.entries(conditions.resourceAttributes)) {
        if (expected === 'self') continue; // Ownership check deferred to controller
        const actual = resourceAttrs[key];
        if (actual !== expected) return false;
      }
    }

    // Check context attributes (future: time, IP, etc.)
    if (conditions.contextAttributes) {
      for (const [key, expected] of Object.entries(conditions.contextAttributes)) {
        const actual = contextAttrs[key];
        if (actual !== expected) return false;
      }
    }

    return true;
  }

  private async getActivePolicies(resource: string, action: string): Promise<Policy[]> {
    // Check cache
    if (this.cache && Date.now() - this.cache.timestamp < this.cacheTTL) {
      return this.cache.policies.filter(
        (p) => p.getResource() === resource && p.getAction() === action,
      );
    }

    // Fetch all active policies and cache them
    const query = BaseModel.queryActive<Policy>('Policy');
    const policies = await query.find({ useMasterKey: true });
    this.cache = { policies, timestamp: Date.now() };

    return policies.filter(
      (p) => p.getResource() === resource && p.getAction() === action,
    );
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const abacService = new AbacService();
