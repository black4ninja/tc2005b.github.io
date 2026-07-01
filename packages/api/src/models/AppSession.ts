import Parse from 'parse/node';
import crypto from 'crypto';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';

export class AppSession extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('AppSession', attributes);
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

  getExpiresAt(): Date | undefined {
    return this.get('expiresAt');
  }

  setExpiresAt(date: Date): void {
    this.set('expiresAt', date);
  }

  getLastActivity(): Date | undefined {
    return this.get('lastActivity');
  }

  setLastActivity(date: Date): void {
    this.set('lastActivity', date);
  }

  getUserAgent(): string {
    return this.get('userAgent') ?? '';
  }

  setUserAgent(userAgent: string): void {
    this.set('userAgent', userAgent);
  }

  getIpAddress(): string {
    return this.get('ipAddress') ?? '';
  }

  setIpAddress(ipAddress: string): void {
    this.set('ipAddress', ipAddress);
  }

  isExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    return new Date() > expiresAt;
  }

  isValid(): boolean {
    return !this.isExpired() && this.isActive();
  }

  refreshActivity(sessionExpiryDays: number): void {
    const now = new Date();
    this.setLastActivity(now);
    const newExpiry = new Date(now.getTime() + sessionExpiryDays * 24 * 60 * 60 * 1000);
    this.setExpiresAt(newExpiry);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      expiresAt: this.getExpiresAt(),
      lastActivity: this.getLastActivity(),
      userAgent: this.getUserAgent(),
      ipAddress: this.getIpAddress(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static async cleanupExpired(): Promise<number> {
    const query = new Parse.Query<AppSession>('AppSession');
    query.equalTo('active', true);
    query.equalTo('exists', true);
    query.lessThan('expiresAt', new Date());
    const expired = await query.find({ useMasterKey: true });

    for (const session of expired) {
      session.softDelete();
    }

    if (expired.length > 0) {
      await Parse.Object.saveAll(expired, { useMasterKey: true });
    }

    return expired.length;
  }
}

Parse.Object.registerSubclass('AppSession', AppSession);
