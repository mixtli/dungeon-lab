import mongoose, { CallbackWithoutResultAndOptionalError } from 'mongoose';
import bcrypt from 'bcrypt';
import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { User, userSchema } from '@dungeon-lab/shared';

/**
 * User document interface extending the base User interface
 */
export interface UserDocument extends Omit<User, 'id'>, mongoose.Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * Convert Zod schema to raw Mongoose schema definition
 */
const schemaDefinition = zodSchemaRaw(userSchema);

/**
 * Create Mongoose schema with the raw definition
 */
const mongooseSchema = new mongoose.Schema(schemaDefinition, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret.password; // Don't include password in JSON
      ret.id = (ret._id as mongoose.Types.ObjectId).toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

/**
 * Hash password before saving
 */
mongooseSchema.pre('save', async function(next: CallbackWithoutResultAndOptionalError) {
  const user = this as UserDocument;
  
  // Only hash the password if it has been modified or is new
  if (!user.isModified('password') || !user.password) {
    return next();
  }
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Compare password method
 */
mongooseSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * User model
 */
export const UserModel = mongoose.model<UserDocument>('User', mongooseSchema); 