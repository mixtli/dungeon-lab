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
  inviteRoutes
} from './features/campaigns/index.mjs';
import { encounterRoutes } from './features/encounters/index.mjs';
import { documentRoutes } from './features/documents/index.mjs';
import assetRoutes from './features/assets/index.mjs';
import { chatbotRoutes } from './features/chatbots/index.mjs';
import { compendiumRoutes } from './features/compendiums/index.mjs';
import pluginsRoutes from './features/plugins/routes/plugins.routes.mjs';
import { oapi } from './oapi.mjs';
import userRoutes from './features/users/routes/user.routes.mjs';
import { errorHandler } from './middleware/error.middleware.mjs';
import { ZodError } from 'zod';

// Import socket handlers
import './websocket/handlers/index.mjs';
import './features/chat/socket-handler.mjs';
// Add more socket handler imports here as needed

// Route handlers and middleware
let authRoutes: Router;
let storageRoutes: Router;
let healthRoutes: Router;

type ValidationError = {
  status: number;
  message: string;
  validationErrors: unknown;
  validationSchema: unknown;
  name?: string; // Add name to detect Mongoose ValidationError
};

const validationErrorHandler = (
  err: ValidationError | Error,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle custom validation errors (from custom middleware)
  if ('status' in err) {
    console.log('Custom validationErrorHandler', err);
    return res.status(err.status).json({
      success: false,
      data: null,
      error: err.message,
      error_details: err.validationErrors
    });
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    console.log('Zod validationErrorHandler', err);
    return res.status(422).json({
      success: false,
      data: null,
      error: 'Validation error',
      error_details: err.errors
    });
  }
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    console.log('Mongoose validationErrorHandler', err);
    return res.status(422).json({
      success: false,
      data: null,
      error: 'Database validation error',
      error_details: err
    });
  }
  
  // Pass any other errors to the next error handler
  next(err);
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
    sameSite: 'lax',
    //secure: process.env.NODE_ENV === 'production',
    secure: false,
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
    const healthRoutesModule = await import('./routes/health.routes.mjs');

    // Get the router instances from each module
    authRoutes = authRoutesModule.default;
    storageRoutes = storageRoutesModule.storageRoutes;
    healthRoutes = healthRoutesModule.default;
  } catch (error) {
    logger.error('Error initializing routes:', error);
    throw error;
  }
}

// Add workflow routes import at the top with other route imports
import { workflowRoutes } from './features/workflows/index.mjs';

/**
 * Creates and configures an Express application
 */
export async function createApp(): Promise<express.Application> {
  const app = express();

  // Basic middleware
  app.use(
    cors({
      origin: function(origin, callback) {
        // Allow requests with no origin (like curl, mobile apps, etc.)
        if (!origin) return callback(null, true);
        // Allow localhost for browser testing on the same machine
        if (origin === 'http://localhost:8080') return callback(null, true);
        // Allow any 172.20.10.*:8080 (local network, iPhone, etc.)
        if (/^http:\/\/172\.20\.10\.[0-9]+:8080$/.test(origin)) return callback(null, true);
        if (/^http:\/\/10\.0\.0\.[0-9]+:8080$/.test(origin)) return callback(null, true);
        // Otherwise, block
        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '100mb' }));
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
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api', inviteRoutes);
  app.use('/api/game-sessions', gameSessionRoutes);
  app.use('/api/encounters', encounterRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/maps', mapRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/compendiums', compendiumRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/plugins', pluginsRoutes);
  app.use('/api', chatbotRoutes);

  // Validation error handler for non-fatal validation errors
  app.use(validationErrorHandler);

  // Global error handler - must be last
  app.use(errorHandler);

  // Mount Swagger UI correctly
  app.use('/swaggerui', oapi.swaggerui());

  return app;
}
