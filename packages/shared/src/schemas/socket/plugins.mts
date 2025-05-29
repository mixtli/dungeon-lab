import { z } from 'zod';

// ============================================================================
// PLUGIN SCHEMAS
// ============================================================================

export const pluginActionCallbackSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional()
});

export const pluginStateUpdateSchema = z.object({
  pluginId: z.string(),
  type: z.string(),
  state: z.record(z.string(), z.unknown())
}); 