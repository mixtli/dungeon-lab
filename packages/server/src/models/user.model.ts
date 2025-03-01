import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  displayName?: string;
  avatar?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User document interface
 */
export interface UserDocument extends Omit<User, 'id'>, Document {
  id: string;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

/**
 * User schema
 */
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function(this: any): boolean {
        // Password is required only if googleId is not provided
        return !this.googleId;
      },
      minlength: 8,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  // Cast to unknown first, then to UserDocument to avoid TypeScript error
  const user = this as unknown as UserDocument;

  // Only hash the password if it has been modified (or is new) and exists
  if (!user.isModified('password') || !user.password) {
    return next();
  }

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Hash the password along with the new salt
    const hash = await bcrypt.hash(user.password, salt);

    // Override the cleartext password with the hashed one
    user.password = hash;
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  // If no password (Google auth user), return false
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * User model
 */
export const UserModel = mongoose.model<UserDocument>('User', userSchema); 