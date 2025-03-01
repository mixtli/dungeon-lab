import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
// Route handlers and middleware
let actorRoutes;
let itemRoutes;
let authRoutes;
let storageRoutes;
let pluginRoutes;
let errorHandler;
let StorageService = null;
/**
 * Initialize all routes and middleware
 */
async function initializeRoutes() {
    try {
        // Dynamic imports for ES modules
        const actorRoutesModule = await import('./routes/actor.routes.js');
        const itemRoutesModule = await import('./routes/item.routes.js');
        const authRoutesModule = await import('./routes/auth.routes.js');
        const storageRoutesModule = await import('./routes/storage.routes.js');
        const pluginRoutesModule = await import('./routes/plugin.routes.js');
        const errorMiddlewareModule = await import('./middleware/error.middleware.js');
        const storageServiceModule = await import('./services/storage.service.js');
        // Assign routes and middleware
        actorRoutes = actorRoutesModule.actorRoutes || express.Router();
        itemRoutes = itemRoutesModule.itemRoutes || express.Router();
        authRoutes = authRoutesModule.authRoutes || express.Router();
        storageRoutes = storageRoutesModule.storageRoutes || express.Router();
        pluginRoutes = pluginRoutesModule.default || express.Router();
        errorHandler = errorMiddlewareModule.errorHandler || defaultErrorHandler;
        StorageService = storageServiceModule.StorageService || null;
    }
    catch (error) {
        console.error('Error initializing routes:', error);
        // Provide mock routes for testing
        actorRoutes = express.Router();
        itemRoutes = express.Router();
        authRoutes = express.Router();
        storageRoutes = express.Router();
        pluginRoutes = express.Router();
        errorHandler = defaultErrorHandler;
        StorageService = class MockStorageService {
            constructor() { }
        };
    }
}
/**
 * Default error handler if the real one cannot be loaded
 */
const defaultErrorHandler = (err, req, res, next) => {
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
    // Initialize routes before creating the app
    await initializeRoutes();
    // Initialize Express app
    const app = express();
    // Configure middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Configure session
    app.use(session({
        secret: process.env.SESSION_SECRET || 'dev-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    }));
    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());
    // Initialize storage service
    const storageService = StorageService ? new StorageService() : null;
    // Health check route
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
    });
    // Register API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/storage', storageRoutes);
    app.use('/api/actors', actorRoutes);
    app.use('/api/items', itemRoutes);
    app.use('/api/plugins', pluginRoutes);
    // Register error handling middleware
    app.use(errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map