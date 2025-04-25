import { userSchema } from '../../index.mjs';
import { z } from 'zod';

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

export const registerResponseSchema = z.object({
  success: z.boolean().optional(),
  data: userSchema.optional(),
  message: z.string().optional(),
  error: z.string().optional()
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const logoutResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean().optional(),
  error: z.string().optional()
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

export const getCurrentUserResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      user: userSchema.optional()
    })
    .optional(),
  error: z
    .object({
      message: z.string().optional()
    })
    .optional()
});

export type GetCurrentUserResponse = z.infer<typeof getCurrentUserResponseSchema>;

export const getApiKeyResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      apiKey: z.string()
    })
    .optional(),
  error: z
    .object({
      message: z.string().optional()
    })
    .optional()
});

export type GetApiKeyResponse = z.infer<typeof getApiKeyResponseSchema>;
