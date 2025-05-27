import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the server's .env file
console.log('Loading environment variables from:', path.resolve(__dirname, '../../.env'));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab',
  environment: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
  },
  chatbots: {
    defaultTimeout: parseInt(process.env.CHATBOT_DEFAULT_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.CHATBOT_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.CHATBOT_RETRY_DELAY || '1000'),
    maxConcurrentRequests: parseInt(process.env.CHATBOT_MAX_CONCURRENT_REQUESTS || '10'),
    healthCheckInterval: parseInt(process.env.CHATBOT_HEALTH_CHECK_INTERVAL || '300000'), // 5 minutes
  },
}; 