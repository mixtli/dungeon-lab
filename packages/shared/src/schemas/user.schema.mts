import { z } from 'zod';

// Theme type
export const UserTheme = z.enum(['light', 'dark', 'system']);

// User preferences schema
export const userPreferencesSchema = z.object({
  theme: UserTheme.default('system'),
  language: z.string().default('en'),
  notifications: z.boolean().default(true)
});

// Base User schema
export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  displayName: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  preferences: userPreferencesSchema.default({}),
  isAdmin: z.boolean().default(false),
  googleId: z.string().optional(),
  apiKey: z.string().optional(),
  profile: z.object({
    biography: z.string().max(1000).optional(),
    website: z.string().url().optional(),
    twitter: z.string().url().optional(),
    github: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    discord: z.string().optional(),
    location: z.string().max(100).optional(),
    // Add more social/profile fields as needed
  }).default({})
});

// Create data schema (for manual registration)
export const userCreateSchema = userSchema
  .extend({
    password: z.string().min(8)
  })
  .omit({ id: true });

// Update data schema (makes all fields optional except id)
export const userUpdateSchema = userSchema
  .omit({
    password: true
  })
  .partial();
