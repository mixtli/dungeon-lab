import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../models/user.model.js';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// Configure Passport
export function configurePassport(): void {
  // Debug logging for Google OAuth credentials
  logger.info('Google OAuth Configuration:');
  logger.info(`Client ID: ${config.google.clientId ? 'Set (length: ' + config.google.clientId.length + ')' : 'Not set'}`);
  logger.info(`Client Secret: ${config.google.clientSecret ? 'Set (length: ' + config.google.clientSecret.length + ')' : 'Not set'}`);
  logger.info(`Callback URL: ${config.google.callbackUrl}`);

  // Validate required credentials
  if (!config.google.clientId || !config.google.clientSecret) {
    logger.error('ERROR: Google OAuth credentials are missing. Authentication with Google will not work.');
  }

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await UserModel.findById(id);
      done(null, user || undefined);
    } catch (error) {
      done(error, undefined);
    }
  });

  // Only configure Google strategy if credentials are available
  if (config.google.clientId && config.google.clientSecret) {
    // Google OAuth Strategy
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists with this Google ID
            let user = await UserModel.findOne({ googleId: profile.id });

            if (user) {
              return done(null, user);
            }

            // Check if user exists with the same email
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google profile'), undefined);
            }

            user = await UserModel.findOne({ email });

            if (user) {
              // Link Google ID to existing account
              user.googleId = profile.id;
              if (!user.avatar && profile.photos?.[0]?.value) {
                user.avatar = profile.photos[0].value;
              }
              await user.save();
              return done(null, user);
            }

            // Create new user
            const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 10000);
            const newUser = new UserModel({
              username,
              email,
              googleId: profile.id,
              displayName: profile.displayName || username,
              avatar: profile.photos?.[0]?.value,
            });

            await newUser.save();
            return done(null, newUser);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  }
} 