import { z } from 'zod';

/**
 * Movement speeds for creatures
 * Made nullable to handle Foundry VTT data where these can be null
 */
export const movementSchema = z.object({
  walk: z.number().min(0).nullable().default(30),
  fly: z.number().min(0).nullable().default(0),
  swim: z.number().min(0).nullable().default(0),
  climb: z.number().min(0).nullable().default(0),
  burrow: z.number().min(0).nullable().default(0),
  hover: z.boolean().default(false) // Can hover when flying
});

/**
 * Creature sizes
 */
export const creatureSizes = ['tiny', 'sm', 'med', 'lg', 'huge', 'grg'] as const;
export const creatureSizeSchema = z.enum(creatureSizes);

/**
 * Size names for display
 */
export const sizeNames = {
  tiny: 'Tiny',
  sm: 'Small', 
  med: 'Medium',
  lg: 'Large',
  huge: 'Huge',
  grg: 'Gargantuan'
} as const;

export type Movement = z.infer<typeof movementSchema>;
export type CreatureSize = z.infer<typeof creatureSizeSchema>;