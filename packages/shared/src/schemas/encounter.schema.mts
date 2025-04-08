import { z } from '../lib/zod.mjs';

// Encounter Status enum
const EncounterStatus = z.enum(['draft', 'ready', 'in_progress', 'completed']);

// Base Encounter schema
export const encounterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  campaignId: z.string(),
  mapId: z.string(),
  status: EncounterStatus.default('draft'),
  participants: z.array(z.string()).default([]),
  settings: z.record(z.string(), z.unknown()).optional(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

// Create data schema (omits auto-generated fields)
export const encounterCreateSchema = encounterSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  participants: true,
  campaignId: true,
}).extend({
  participants: z.array(z.string()).default([]),
});

// Update data schema (all fields optional, updatedBy handled by server)
export const encounterUpdateSchema = encounterSchema
  .omit({
    id: true,
    createdBy: true,
    updatedBy: true,
  })
  .partial();

// Export types generated from the schemas
export type IEncounter = z.infer<typeof encounterSchema>;
export type IEncounterCreateData = z.infer<typeof encounterCreateSchema>;
export type IEncounterUpdateData = z.infer<typeof encounterUpdateSchema>; 