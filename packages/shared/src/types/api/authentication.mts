import { userSchema } from '../../index.mjs';
import { z } from 'zod';
import { baseAPIResponseSchema } from './base.mjs';

export const loginResponseSchema = z.object({
  success: z.boolean(),
  user: userSchema.optional(),
  error: z.string().optional()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional()
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const registerResponseSchema = baseAPIResponseSchema.extend({
  data: userSchema.optional(),
  message: z.string().optional()
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const logoutResponseSchema = baseAPIResponseSchema.extend({
  message: z.string().optional()
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

export const googleCallbackResponseSchema = z.object({
  success: z.boolean(),
  error: z
    .object({
      message: z.string()
    })
    .optional()
});

export type GoogleCallbackResponse = z.infer<typeof googleCallbackResponseSchema>;

export const getCurrentUserResponseSchema = baseAPIResponseSchema.extend({
  data: userSchema.optional(),
  message: z.string().optional()
});

export type GetCurrentUserResponse = z.infer<typeof getCurrentUserResponseSchema>;

export const getApiKeyResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({ apiKey: z.string() }).optional()
});

export type GetApiKeyResponse = z.infer<typeof getApiKeyResponseSchema>;
