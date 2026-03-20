import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export interface PolicyConditions {
  userAttributes?: Record<string, string | string[]>;
  resourceAttributes?: Record<string, string>;
  contextAttributes?: Record<string, unknown>;
}

export class Policy extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Policy', attributes);
  }

  getPolicyName(): string {
    return this.get('name') ?? '';
  }

  setPolicyName(name: string): void {
    this.set('name', name);
  }

  getDescription(): string {
    return this.get('description') ?? '';
  }

  setDescription(description: string): void {
    this.set('description', description);
  }

  getResource(): string {
    return this.get('resource') ?? '';
  }

  setResource(resource: string): void {
    this.set('resource', resource);
  }

  getAction(): string {
    return this.get('action') ?? '';
  }

  setAction(action: string): void {
    this.set('action', action);
  }

  getEffect(): 'allow' | 'deny' {
    return this.get('effect') ?? 'deny';
  }

  setEffect(effect: 'allow' | 'deny'): void {
    this.set('effect', effect);
  }

  getConditions(): PolicyConditions {
    return this.get('conditions') ?? {};
  }

  setConditions(conditions: PolicyConditions): void {
    this.set('conditions', conditions);
  }

  getPriority(): number {
    return this.get('priority') ?? 0;
  }

  setPriority(priority: number): void {
    this.set('priority', priority);
  }
}

Parse.Object.registerSubclass('Policy', Policy);
