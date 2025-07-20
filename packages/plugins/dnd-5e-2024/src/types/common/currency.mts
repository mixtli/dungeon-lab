import { z } from 'zod';

/**
 * D&D 5e currency schema (copper, silver, electrum, gold, platinum pieces)
 */
export const currencySchema = z.object({
  cp: z.number().min(0).default(0), // copper pieces
  sp: z.number().min(0).default(0), // silver pieces  
  ep: z.number().min(0).default(0), // electrum pieces
  gp: z.number().min(0).default(0), // gold pieces
  pp: z.number().min(0).default(0)  // platinum pieces
});

/**
 * Price schema for items with denomination
 */
export const priceSchema = z.object({
  value: z.number().min(0),
  denomination: z.enum(['cp', 'sp', 'ep', 'gp', 'pp']).default('gp')
});

export type Currency = z.infer<typeof currencySchema>;
export type Price = z.infer<typeof priceSchema>;