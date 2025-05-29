import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { userSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from './base.model.schema.mjs';
import { createMongoSchema } from './zod-to-mongo.mjs';
import { IUser } from '@dungeon-lab/shared/types/index.mjs';

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema(userSchema.merge(baseMongooseZodSchema));

// Add password comparison method
mongooseSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Hash password before saving

mongooseSchema.pre(
  'validate',
  async function (
    this: mongoose.Document & IUser,
    next: mongoose.CallbackWithoutResultAndOptionalError
  ) {
    // Generate API key if not present
    if (!this.apiKey) {
      this.apiKey = generateApiKey();
    }

    if (!this.isModified('password') || !this.password) {
      return next();
    }

    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error as Error);
    }
  }
);

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = mongoose.Model<IUser, object, IUserMethods>;
/**
 * User model
 */
export const UserModel = mongoose.model<IUser, UserModel>('User', mongooseSchema);
