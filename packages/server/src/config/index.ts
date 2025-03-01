import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the server's .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug environment variables
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('Current working directory:', process.cwd());

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  environment: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
  },
}; 