import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Encounter Status enum
export const EncounterStatus = z.enum(['draft', 'ready', 'in_progress', 'completed']);

// Base Encounter schema
export const encounterSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  campaignId: zId('Campaign'),
  mapId: zId('Map'),
  status: EncounterStatus.default('draft'),
  participants: z.array(zId('Actor')).default([]),
  settings: z.record(z.string(), z.unknown()).optional(),
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create data schema (omits auto-generated fields)
export const encounterCreateSchema = encounterSchema.omit({
  createdBy: true,
  updatedBy: true,
  participants: true,
  campaignId: true,
}).extend({
  participants: z.array(z.string()).default([]),
});

// Update data schema (makes all fields optional except updatedBy)
export const encounterUpdateSchema = encounterSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: z.string(),
  });

// Export types generated from the schemas
export type IEncounter = z.infer<typeof encounterSchema> & ApiFields;
export type IEncounterCreateData = z.infer<typeof encounterCreateSchema>;
export type IEncounterUpdateData = z.infer<typeof encounterUpdateSchema>; 