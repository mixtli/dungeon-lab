import { z } from 'zod';

/**
 * Plugin Manifest Schema
 * 
 * Defines the structure and validation rules for plugin manifest data.
 * Manifests contain all the metadata about a plugin's capabilities,
 * supported features, and configuration.
 */
export const pluginManifestSchema = z.object({
  /** Unique plugin identifier (kebab-case recommended) */
  id: z.string()
    .min(1, 'Plugin ID is required')
    .regex(/^[a-z0-9-]+$/, 'Plugin ID must be lowercase alphanumeric with hyphens'),
  
  /** Human-readable plugin name */
  name: z.string()
    .min(1, 'Plugin name is required'),
  
  /** Plugin version (semver format) */
  version: z.string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/, 'Version must be valid semver format'),
  
  /** Plugin description */
  description: z.string().optional(),
  
  /** Plugin author/maintainer */
  author: z.string().optional(),
  
  /** Game system identifier this plugin supports */
  gameSystem: z.string()
    .min(1, 'Game system is required'),
  
  /** Character types supported by this plugin */
  characterTypes: z.array(z.string())
    .default([]),
  
  /** Item types supported by this plugin */
  itemTypes: z.array(z.string())
    .default([]),
  
  /** 
   * Component definitions
   * Maps component types to their metadata
   */
  components: z.record(z.string(), z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
  })).optional(),
  
  /** 
   * Validation types supported by this plugin
   * Beyond the standard types (character, item, etc.)
   */
  validationTypes: z.array(z.string())
    .default(['character', 'item', 'actor', 'vttdocument']),
  
  /**
   * Plugin entry point file path
   * Relative to plugin directory
   */
  entryPoint: z.string()
    .default('./dist/index.mjs'),
  
  /**
   * Plugin dependencies
   * Maps dependency names to version requirements
   */
  dependencies: z.record(z.string(), z.string()).optional(),
  
  /**
   * Development dependencies
   * Maps dev dependency names to version requirements
   */
  devDependencies: z.record(z.string(), z.string()).optional(),
  
  /** Plugin license */
  license: z.string().optional(),
  
  /**
   * Whether this plugin is enabled
   * Disabled plugins are ignored during discovery
   */
  enabled: z.boolean()
    .default(true),
  
  /**
   * Minimum application version required
   * Semver format
   */
  minAppVersion: z.string().optional(),
  
  /**
   * Plugin keywords/tags for discovery
   */
  keywords: z.array(z.string())
    .default([]),
  
  /**
   * Homepage URL
   */
  homepage: z.string().url().optional(),
  
  /**
   * Repository information
   */
  repository: z.object({
    type: z.string(),
    url: z.string().url(),
  }).optional(),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type PluginManifest = z.infer<typeof pluginManifestSchema>;

/**
 * Validate a plugin manifest object
 * 
 * @param data Raw manifest data to validate
 * @returns Validated and typed manifest
 * @throws ZodError if validation fails
 */
export function validatePluginManifest(data: unknown): PluginManifest {
  return pluginManifestSchema.parse(data);
}

/**
 * Safely validate a plugin manifest object
 * 
 * @param data Raw manifest data to validate
 * @returns Result with success/error information
 */
export function safeValidatePluginManifest(data: unknown) {
  return pluginManifestSchema.safeParse(data);
}