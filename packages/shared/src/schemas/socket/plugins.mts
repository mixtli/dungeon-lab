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

// ============================================================================
// CLIENT-TO-SERVER EVENT SCHEMAS
// ============================================================================

export const pluginActionArgsSchema = z.tuple([
  z.string(/*pluginId*/),
  z.record(z.string(), z.unknown()),
  z.function().args(pluginActionCallbackSchema)
]); 