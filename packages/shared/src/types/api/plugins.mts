import { z } from 'zod';

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
export const getPluginsResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.array(pluginSchema),
  error: z.string().optional()
});

export type GetPluginsResponse = z.infer<typeof getPluginsResponseSchema>;

// Types for GET /plugins/:id (Get one plugin)
export const getPluginResponseSchema = z.object({
  success: z.boolean().default(true),
  data: pluginSchema.optional(),
  error: z.string().optional()
});

export type GetPluginResponse = z.infer<typeof getPluginResponseSchema>;

// Types for GET /plugins/:id/code/:file (Get plugin code)
export const getPluginCodeResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.string().optional(),
  error: z.string().optional()
});

export type GetPluginCodeResponse = z.infer<typeof getPluginCodeResponseSchema>;
