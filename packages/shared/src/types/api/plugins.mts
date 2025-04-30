import { z } from 'zod';
import { baseAPIResponseSchema } from './base.mjs';

// Base plugin schema for the client-safe plugin representation
export const pluginSchema = z.object({
  config: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    homepage: z.string().optional(),
    main: z.string().optional(),
    type: z.string()
  }),
  type: z.string()
});

export type IPlugin = z.infer<typeof pluginSchema>;

// Types for GET /plugins (Get all plugins)
export const getPluginsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(pluginSchema)
});

export type GetPluginsResponse = z.infer<typeof getPluginsResponseSchema>;

// Types for GET /plugins/:id (Get one plugin)
export const getPluginResponseSchema = baseAPIResponseSchema.extend({
  data: pluginSchema.optional()
});

export type GetPluginResponse = z.infer<typeof getPluginResponseSchema>;

// Types for GET /plugins/:id/code/:file (Get plugin code)
export const getPluginCodeResponseSchema = baseAPIResponseSchema.extend({
  data: z.string().optional()
});

export type GetPluginCodeResponse = z.infer<typeof getPluginCodeResponseSchema>;
