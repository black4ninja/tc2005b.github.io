import Parse from 'parse/node';
import crypto from 'crypto';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';

export class MagicToken extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('MagicToken', attributes);
    if (!this.has('used')) this.set('used', false);
  }

  getToken(): string {
    return this.get('token') ?? '';
  }

  setToken(token: string): void {
    this.set('token', token);
  }

  generateToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.setToken(token);
    return token;
  }

  getUser(): AppUser | undefined {
    return this.get('user');
  }

  setUser(user: AppUser): void {
    this.set('user', user);
  }

  getEmail(): string {
    return this.get('email') ?? '';
  }

  setEmail(email: string): void {
    this.set('email', email);
  }

  getExpiresAt(): Date | undefined {
    return this.get('expiresAt');
  }

  setExpiresAt(date: Date): void {
    this.set('expiresAt', date);
  }

  isUsed(): boolean {
    return this.get('used') === true;
  }

  getUsedAt(): Date | undefined {
    return this.get('usedAt');
  }

  isExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    return new Date() > expiresAt;
  }

  isValid(): boolean {
    return !this.isUsed() && !this.isExpired() && this.isActive();
  }

  markUsed(): void {
    this.set('used', true);
    this.set('usedAt', new Date());
    this.set('active', false);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      email: this.getEmail(),
      expiresAt: this.getExpiresAt(),
      used: this.isUsed(),
      usedAt: this.getUsedAt(),
      active: this.get('active'),
      createdAt: this.createdAt,
    };
  }

  static async cleanupExpired(): Promise<number> {
    const query = new Parse.Query<MagicToken>('MagicToken');
    query.equalTo('used', false);
    query.equalTo('active', true);
    query.lessThan('expiresAt', new Date());
    const expired = await query.find({ useMasterKey: true });

    for (const token of expired) {
      token.softDelete();
    }

    if (expired.length > 0) {
      await Parse.Object.saveAll(expired, { useMasterKey: true });
    }

    return expired.length;
  }
}

Parse.Object.registerSubclass('MagicToken', MagicToken);
