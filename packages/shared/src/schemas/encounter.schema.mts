import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { deepPartial } from '../utils/deepPartial.mjs';

// Encounter Status enum
export const EncounterStatus = z.enum(['draft', 'ready', 'in_progress', 'completed']);

// Base Encounter schema
export const encounterSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  campaignId: z.string(),
  mapId: z.string(),
  status: EncounterStatus.default('draft'),
  participants: z.array(z.string()).default([]),
  settings: z.record(z.string(), z.unknown()).optional()
});

export const encounterCreateSchema = encounterSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

export const encounterPatchSchema = deepPartial(encounterSchema);
