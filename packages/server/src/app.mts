import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import { Router } from 'express';
import MongoStore from 'connect-mongo';
import { pluginRegistry } from './services/plugin-registry.service.mjs';
import { logger } from './utils/logger.mjs';
import { requestLogger } from './middleware/request-logger.middleware.mjs';

// Define type interfaces for our routes and middleware
type ErrorHandlerMiddleware = (
  err: Error, 
  req: express.Request, 
  res: express.Response, 
  next: express.NextFunction
) => void;

type StorageServiceClass = {
  new (): any;
};

// Route handlers and middleware
let actorRoutes: Router;
let itemRoutes: Router;
let authRoutes: Router;
let storageRoutes: Router;
let pluginRoutes: Router;
let campaignRoutes: Router;
let mapRoutes: Router;
let encounterRoutes: Router;
let errorHandler: ErrorHandlerMiddleware;
let StorageService: StorageServiceClass | null = null;

/**
 * Initialize all routes and middleware
 */
async function initializeRoutes() {
  try {
    // Dynamic imports for ES modules
    const actorRoutesModule = await import('./routes/actor.routes.mjs');
    const itemRoutesModule = await import('./routes/item.routes.mjs');
    const authRoutesModule = await import('./routes/auth.routes.mjs');
    const storageRoutesModule = await import('./routes/storage.routes.mjs');
    const pluginRoutesModule = await import('./routes/plugin.routes.mjs');
    const campaignRoutesModule = await import('./routes/campaign.routes.mjs');
    const mapRoutesModule = await import('./routes/map.routes.mjs');
    const encounterRoutesModule = await import('./routes/encounter.routes.mjs');
    const errorMiddlewareModule = await import('./middleware/error.middleware.mjs');
    const storageServiceModule = await import('./services/storage.service.mjs');
    
    // Assign routes and middleware
    actorRoutes = actorRoutesModule.actorRoutes || express.Router();
    itemRoutes = itemRoutesModule.itemRoutes || express.Router();
    authRoutes = authRoutesModule.default || express.Router();
    storageRoutes = storageRoutesModule.storageRoutes || express.Router();
    pluginRoutes = pluginRoutesModule.default || express.Router();
    campaignRoutes = campaignRoutesModule.default || express.Router();
    mapRoutes = mapRoutesModule.default || express.Router();
    encounterRoutes = encounterRoutesModule.default || express.Router();
    errorHandler = errorMiddlewareModule.errorHandler || defaultErrorHandler;
    StorageService = storageServiceModule.StorageService || null;
  } catch (error) {
    console.error('Error initializing routes:', error);
    
    // Provide mock routes for testing
    actorRoutes = express.Router();
    itemRoutes = express.Router();
    authRoutes = express.Router();
    storageRoutes = express.Router();
    pluginRoutes = express.Router();
    campaignRoutes = express.Router();
    mapRoutes = express.Router();
    encounterRoutes = express.Router();
    errorHandler = defaultErrorHandler;
    StorageService = class MockStorageService {
      constructor() {}
    } as any;
  }
}

/**
 * Default error handler if the real one cannot be loaded
 */
const defaultErrorHandler: ErrorHandlerMiddleware = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : (err instanceof Error ? err.message : String(err))
  });
};

/**
 * Creates and configures an Express application.
 * 
 * This function extracts the Express app creation logic from index.ts,
 * allowing it to be used in both the main application and tests.
 */
export async function createApp() {
  // Import configuration
  const { config } = await import('./config/index.mjs');
  
  // Configure Passport before initializing routes
  const { configurePassport } = await import('./config/passport.mjs');
  configurePassport();
  
  // Initialize routes
  await initializeRoutes();
  
  // Initialize plugin registry
  try {
    await pluginRegistry.initialize();
    logger.info('Plugin registry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize plugin registry:', error);
  }
  
  // Initialize Express app
  const app = express();
  
  // Add request logger middleware before other middleware
  app.use(requestLogger);
  
  // Configure middleware with proper CORS settings for credentials
  app.use(cors({
    origin: config.clientUrl, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Configure session with MongoDB store
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-secret',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: config.mongoUri,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 1 day in seconds
        autoRemove: 'native', // Use MongoDB's TTL index
        touchAfter: 24 * 3600 // time period in seconds to update the session
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Initialize storage service
  const storageService = StorageService ? new StorageService() : null;
  
  // Health check route
  app.get('/api/health', (req, res) => {
    console.log("Health check route");
    res.json({ status: 'ok' });
  });

  // Register API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/storage', storageRoutes);
  app.use('/api/actors', actorRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/plugins', pluginRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/maps', mapRoutes);
  app.use('/api', encounterRoutes); // Note: encounter routes include /campaigns/:campaignId/encounters

  // Register error handling middleware
  app.use(errorHandler);

  return app;
} 