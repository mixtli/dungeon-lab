import { z } from 'zod';
import { socketCallbackWithDataSchema } from './base-callback.schema.mjs';

// ============================================================================
// PLUGIN SCHEMAS
// ============================================================================

export const pluginActionCallbackSchema = socketCallbackWithDataSchema(z.any());

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