import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0',
  databaseURI: process.env.DATABASE_URI || '',
  appId: process.env.APP_ID || 'tc2005b-api',
  masterKey: process.env.MASTER_KEY || '',
  parseMount: process.env.PARSE_MOUNT || '/parse',
  serverURL: process.env.SERVER_URL || 'http://localhost:3002/parse',
  email: {
    apiKey: process.env.MAILERSEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'no_reply@meeplab.com',
    fromName: process.env.EMAIL_FROM_NAME || 'TC2005B',
  },
  azure: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    tenantId: process.env.AZURE_TENANT_ID || '',
  },
  auth: {
    magicLinkExpiryMinutes: parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES || '15', 10),
    sessionExpiryDays: parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  cookies: {
    // Cookie de sesión para navegaciones top-level (p. ej. gate de /docs/*).
    name: process.env.SESSION_COOKIE_NAME || 'session_token',
    secure: (process.env.NODE_ENV || 'development') === 'production',
    sameSite: 'lax' as const,
  },
};
