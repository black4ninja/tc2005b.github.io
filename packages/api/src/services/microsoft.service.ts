import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/index.js';

interface MicrosoftTokenPayload {
  email: string;
  name: string;
  oid: string;
}

class MicrosoftService {
  private client: jwksClient.JwksClient;

  constructor() {
    const tenantId = config.azure.tenantId;
    this.client = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      cache: true,
      rateLimit: true,
    });
  }

  private getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        if (!key) {
          reject(new Error('No se encontró la clave de firma'));
          return;
        }
        resolve(key.getPublicKey());
      });
    });
  }

  async validateIdToken(idToken: string): Promise<MicrosoftTokenPayload> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new Error('Token de Microsoft inválido');
    }

    const signingKey = await this.getSigningKey(decoded.header.kid);
    const tenantId = config.azure.tenantId;
    const clientId = config.azure.clientId;

    const payload = jwt.verify(idToken, signingKey, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    }) as jwt.JwtPayload;

    const email = (payload.preferred_username || payload.email || '').toLowerCase().trim();
    if (!email) {
      throw new Error('No se pudo obtener el email del token de Microsoft');
    }

    return {
      email,
      name: payload.name || '',
      oid: payload.oid || '',
    };
  }
}

export const microsoftService = new MicrosoftService();
