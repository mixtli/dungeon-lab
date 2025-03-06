import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser, userSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from './utils/base-schema.mjs';

/**
 * User document interface extending the base User interface
 */
export interface UserDocument extends Omit<IUser, 'id'>, BaseDocument {
  comparePassword(candidatePassword: string): Promise<boolean>;
  password?: string;
}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(userSchema, {
  transform: (_doc, ret) => {
    delete ret.password; // Don't include password in JSON
    return ret;
  },
});

// Add password comparison method
mongooseSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Hash password before saving
mongooseSchema.pre('save', async function(this: UserDocument, next) {
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
});

/**
 * User model
 */
export const UserModel = mongoose.model<UserDocument>('User', mongooseSchema); 