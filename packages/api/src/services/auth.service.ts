import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { AppUser, MagicToken, AppSession } from '../models/index.js';
import { BaseModel } from '../models/BaseModel.js';
import { emailService } from './email.service.js';

function normalizeEmail(input: string): string {
  let email = input.toLowerCase().trim();
  if (/^[a-z]\d{8}$/.test(email)) {
    email = `${email}@tec.mx`;
  }
  return email;
}

class AuthService {
  async requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
    const genericResponse = {
      success: true,
      message: 'Si el correo está registrado, recibirás un enlace de acceso.',
    };

    try {
      const query = BaseModel.queryActive<AppUser>('AppUser');
      query.equalTo('email', normalizeEmail(email));
      const user = await query.first({ useMasterKey: true });

      if (!user) {
        return genericResponse;
      }

      const magicToken = new MagicToken().initDefaults();
      const token = magicToken.generateToken();
      magicToken.setUser(user);
      magicToken.setEmail(user.getEmail());

      const expiryMinutes = config.auth.magicLinkExpiryMinutes;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
      magicToken.setExpiresAt(expiresAt);

      await magicToken.save(null, { useMasterKey: true });

      const magicLinkUrl = `${config.auth.frontendUrl}/auth/verify?token=${token}`;

      await emailService.sendMagicLinkEmail({
        email: user.getEmail(),
        name: user.getName(),
        magicLinkUrl,
        expirationTime: `${expiryMinutes} minutos`,
      });

      return genericResponse;
    } catch (error) {
      console.error('[AuthService] requestMagicLink error:', error);
      return genericResponse;
    }
  }

  async verifyMagicLink(
    token: string,
    meta: { userAgent: string; ipAddress: string },
  ): Promise<{ session: AppSession; user: AppUser }> {
    const query = BaseModel.queryActive<MagicToken>('MagicToken');
    query.equalTo('token', token);
    query.include('user');
    const magicToken = await query.first({ useMasterKey: true });

    if (!magicToken || !magicToken.isValid()) {
      throw new Error('Token inválido o expirado');
    }

    const user = magicToken.getUser();
    if (!user || !user.isActive()) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    magicToken.markUsed();
    await magicToken.save(null, { useMasterKey: true });

    user.setLastLogin(new Date());
    await user.save(null, { useMasterKey: true });

    const session = new AppSession().initDefaults();
    session.generateToken();
    session.setUser(user);

    const expiryDays = config.auth.sessionExpiryDays;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    session.setExpiresAt(expiresAt);
    session.setLastActivity(new Date());
    session.setUserAgent(meta.userAgent);
    session.setIpAddress(meta.ipAddress);

    await session.save(null, { useMasterKey: true });

    return { session, user };
  }

  async validateSession(
    sessionToken: string,
  ): Promise<{ session: AppSession; user: AppUser } | null> {
    const query = BaseModel.queryActive<AppSession>('AppSession');
    query.equalTo('token', sessionToken);
    query.include('user');
    const session = await query.first({ useMasterKey: true });

    if (!session) {
      return null;
    }

    if (session.isExpired()) {
      session.softDelete();
      await session.save(null, { useMasterKey: true });
      return null;
    }

    const user = session.getUser();
    if (!user || !user.isActive()) {
      return null;
    }

    session.refreshActivity(config.auth.sessionExpiryDays);
    await session.save(null, { useMasterKey: true });

    return { session, user };
  }

  async loginWithMicrosoft(
    email: string,
    meta: { userAgent: string; ipAddress: string },
  ): Promise<{ session: AppSession; user: AppUser }> {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('email', normalizeEmail(email));
    const user = await query.first({ useMasterKey: true });

    if (!user || !user.isActive()) {
      throw new Error('No existe una cuenta registrada con este correo');
    }

    user.setLastLogin(new Date());
    await user.save(null, { useMasterKey: true });

    const session = new AppSession().initDefaults();
    session.generateToken();
    session.setUser(user);

    const expiryDays = config.auth.sessionExpiryDays;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    session.setExpiresAt(expiresAt);
    session.setLastActivity(new Date());
    session.setUserAgent(meta.userAgent);
    session.setIpAddress(meta.ipAddress);

    await session.save(null, { useMasterKey: true });

    return { session, user };
  }

  async loginWithPassword(
    email: string,
    password: string,
    meta: { userAgent: string; ipAddress: string },
  ): Promise<{ session: AppSession; user: AppUser }> {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('email', normalizeEmail(email));
    const user = await query.first({ useMasterKey: true });

    if (!user || !user.isActive()) {
      throw new Error('Credenciales inválidas');
    }

    const hash = user.getPasswordHash();
    if (!hash) {
      throw new Error('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      throw new Error('Credenciales inválidas');
    }

    user.setLastLogin(new Date());
    await user.save(null, { useMasterKey: true });

    const session = new AppSession().initDefaults();
    session.generateToken();
    session.setUser(user);

    const expiryDays = config.auth.sessionExpiryDays;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    session.setExpiresAt(expiresAt);
    session.setLastActivity(new Date());
    session.setUserAgent(meta.userAgent);
    session.setIpAddress(meta.ipAddress);

    await session.save(null, { useMasterKey: true });

    return { session, user };
  }

  async logout(sessionToken: string): Promise<void> {
    const query = BaseModel.queryActive<AppSession>('AppSession');
    query.equalTo('token', sessionToken);
    const session = await query.first({ useMasterKey: true });

    if (session) {
      session.softDelete();
      await session.save(null, { useMasterKey: true });
    }
  }
}

export const authService = new AuthService();
