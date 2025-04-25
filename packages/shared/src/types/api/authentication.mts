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
