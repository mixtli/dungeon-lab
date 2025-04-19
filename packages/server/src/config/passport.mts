import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel} from '../models/user.model.mjs';
import { config } from './index.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * Convert a UserDocument to a User interface
 */
// function toUser(userDoc: UserDocument | null): IUser | undefined {
//   if (!userDoc) return undefined;
  
//   // Base user properties
//   const baseUser = {
//     id: (userDoc._id as Types.ObjectId).toString(),
//     username: userDoc.username,
//     email: userDoc.email,
//     preferences: userDoc.preferences || {
//       theme: 'system',
//       language: 'en',
//       notifications: true
//     },
//     isAdmin: userDoc.isAdmin,
//     createdAt: userDoc.createdAt,
//     updatedAt: userDoc.updatedAt
//   };
  
//   // Add optional properties if they exist
//   const user: IUser = {
//     ...baseUser,
//     ...(userDoc.displayName && { displayName: userDoc.displayName }),
//     ...(userDoc.avatar && { avatar: userDoc.avatar }),
//     ...(userDoc.bio && { bio: userDoc.bio }),
//     ...(userDoc.googleId && { googleId: userDoc.googleId })
//   };
  
//   return user;
// }

// Configure Passport
export function configurePassport(): void {
  // Debug logging for Google OAuth credentials
  logger.info('Google OAuth Configuration:');
  logger.info(`Client ID: ${config.google.clientId ? 'Set (length: ' + config.google.clientId.length + ')' : 'Not set'}`);
  logger.info(`Client Secret: ${config.google.clientSecret ? 'Set (length: ' + config.google.clientSecret.length + ')' : 'Not set'}`);
  logger.info(`Callback URL: ${config.google.callbackUrl}`);

    console.log(config.google.clientId, config.google.clientSecret, config.google.callbackUrl);
  // Validate required credentials
  if (!config.google.clientId || !config.google.clientSecret) {
    logger.error('ERROR: Google OAuth credentials are missing. Authentication with Google will not work.');
  }

  // Serialize user to session
  passport.serializeUser((user: Express.User, done) => {
    // Check for _id property (MongoDB document)
    if (user && typeof user === 'object' && '_id' in user && user._id) {
      done(null, user._id.toString());
    } 
    // Check for id property (IUser interface)
    else if (user && typeof user === 'object' && 'id' in user) {
      done(null, user.id);
    } 
    else {
      done(new Error('Invalid user object - missing id'), null);
    }
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await UserModel.findById(id);
      done(null, user);
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
        async (_accessToken, _refreshToken, profile, done) => {
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