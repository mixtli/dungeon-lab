import { z } from '../lib/zod.js';

// Theme type
export const UserTheme = z.enum(['light', 'dark', 'system']);

// User preferences schema
export const userPreferencesSchema = z.object({
  theme: UserTheme.default('system'),
  language: z.string().default('en'),
  notifications: z.boolean().default(true),
});

// Base User schema
export const userSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).optional(),
  displayName: z.string().optional(),
  avatar: z.string().url().optional(),
  isAdmin: z.boolean().default(false),
  googleId: z.string().optional(),
  roles: z.array(z.string()).default(['user']),
  preferences: userPreferencesSchema.default({}),
  lastLogin: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create data schema (omits auto-generated fields)
export const userCreateSchema = userSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    roles: true,
    isAdmin: true,
    lastLogin: true,
  })
  .refine(
    (data) => data.password || data.googleId,
    'Either password or googleId must be provided'
  );

// Update data schema (makes all fields optional)
export const userUpdateSchema = userSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    roles: true,
    isAdmin: true,
  })
  .partial();

// Export types generated from the schemas
export type User = z.infer<typeof userSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserCreateData = z.infer<typeof userCreateSchema>;
export type UserUpdateData = z.infer<typeof userUpdateSchema>; 