import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { config } from './config';
import { configurePassport } from './config/passport';
import authRoutes from './routes/auth.routes';
import storageRoutes from './routes/storage.routes';
import actorRoutes from './routes/actor.routes';
import itemRoutes from './routes/item.routes';
import { initializeStorage } from './services/storage.service';

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.environment === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));

// Initialize Passport
app.use(passport.initialize());
configurePassport();

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Initialize storage service
initializeStorage()
  .then(() => {
    console.log('Storage service initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to initialize storage service:', error);
    // Don't exit the process, as the app can still function without storage
  });

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/actors', actorRoutes);
app.use('/api/items', itemRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred',
    },
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 