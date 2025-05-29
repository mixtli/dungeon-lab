import { z } from 'zod';

// ============================================================================
// BASIC ENCOUNTER EVENT SCHEMAS
// ============================================================================

export const encounterEventSchema = z.object({
  encounterId: z.string(),
  campaignId: z.string(),
  timestamp: z.date()
});

export const encounterStartRequestSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  campaignId: z.string()
});

export const encounterStopRequestSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  campaignId: z.string()
}); 