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
};
