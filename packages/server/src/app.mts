import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Router } from 'express';
import MongoStore from 'connect-mongo';
import { logger } from './utils/logger.mjs';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware.mjs';
import { mapRoutes } from './features/maps/index.mjs';
import { itemRoutes } from './features/items/index.mjs';
import { actorRoutes } from './features/actors/index.mjs';
import {
  campaignRoutes,
  gameSessionRoutes,
  inviteRoutes,
  encounterRoutes
} from './features/campaigns/index.mjs';
import { documentRoutes } from './features/documents/index.mjs';
import assetRoutes from './features/assets/index.mjs';
import { oapi } from './oapi.mjs';
import userRoutes from './features/users/routes/user.routes.mjs';
import { errorHandler } from './middleware/error.middleware.mjs';

// Import socket handlers
import './websocket/handlers/index.mjs';
import './features/chat/socket-handler.mjs';
// Add more socket handler imports here as needed

// Route handlers and middleware
let authRoutes: Router;
let storageRoutes: Router;
let pluginRoutes: Router;
let healthRoutes: Router;

type ValidationError = {
  status: number;
  message: string;
  validationErrors: unknown;
  validationSchema: unknown;
};

const validationErrorHandler = (
  err: ValidationError,
  _req: Request,
  res: Response,
  _: NextFunction
) => {
  console.log('errorHandler', err);
  res.status(err.status).json({
    error: err.message,
    validation: err.validationErrors,
    schema: err.validationSchema
  });
};

// Create and export the session middleware for reuse
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
});

/**
 * Initialize all routes and middleware
 */
async function initializeRoutes() {
  try {
    // Dynamic imports for ES modules
    const authRoutesModule = await import('./routes/auth.routes.mjs');
    const storageRoutesModule = await import('./routes/storage.routes.mjs');
    const pluginRoutesModule = await import('./routes/plugin.routes.mjs');
    const healthRoutesModule = await import('./routes/health.routes.mjs');

    // Get the router instances from each module
    authRoutes = authRoutesModule.default;
    storageRoutes = storageRoutesModule.storageRoutes;
    pluginRoutes = pluginRoutesModule.pluginRoutes;
    healthRoutes = healthRoutesModule.default;
  } catch (error) {
    logger.error('Error initializing routes:', error);
    throw error;
  }
}

/**
 * Creates and configures an Express application
 */
export async function createApp(): Promise<express.Application> {
  const app = express();

  // Basic middleware
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    })
  );
  app.use(express.json());
  app.use(requestLoggerMiddleware());

  // Session configuration
  app.use(sessionMiddleware);

  // Mount OpenAPI as middleware
  app.use(oapi);

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  // Initialize routes
  await initializeRoutes();

  app.get('/favicon.ico', function (_, res) {
    res.sendStatus(204);
  });

  // Mount routes
  app.use('/api/actors', actorRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/storage', storageRoutes);
  app.use('/api/plugins', pluginRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api', inviteRoutes);
  app.use('/api/game-sessions', gameSessionRoutes);
  app.use('/api/encounters', encounterRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/maps', mapRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/users', userRoutes);

  app.use(validationErrorHandler);
  // Error handling
  app.use(errorHandler);

  // Mount Swagger UI correctly
  app.use('/swaggerui', oapi.swaggerui());

  return app;
}
