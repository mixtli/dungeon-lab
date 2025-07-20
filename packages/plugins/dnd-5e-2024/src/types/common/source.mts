import { z } from 'zod';

/**
 * Source attribution for D&D content
 */
export const sourceSchema = z.object({
  custom: z.string().default(''),
  rules: z.string().optional(), // e.g., "2024"
  license: z.string().optional(), // e.g., "CC-BY-4.0"
  book: z.string().optional() // e.g., "Player's Handbook", "SRD 5.2"
});

/**
 * Description schema (used by most content types)
 */
export const descriptionSchema = z.object({
  value: z.string().default(''),
  chat: z.string().default('')
});

export type Source = z.infer<typeof sourceSchema>;
export type Description = z.infer<typeof descriptionSchema>;