// Core types from schemas

// Export schemas for server-side validation
export { actorSchema } from './schemas/actor.schema.mjs';

// Export schemas for server-side validation
export { itemSchema } from './schemas/item.schema.mjs';

// Export schemas for server-side validation
export {
  userSchema,
  userCreateSchema,
  userUpdateSchema,
  userPreferencesSchema
} from './schemas/user.schema.mjs';

// Export invite schemas for server-side validation
export { inviteSchema } from './schemas/invite.schema.mjs';

// Export schemas for server-side validation
export { campaignSchema } from './schemas/campaign.schema.mjs';

// Export schemas for server-side validation
export { mapSchema } from './schemas/map.schema.mjs';

// Export schemas for server-side validation
export { gameSessionSchema } from './schemas/game-session.schema.mjs';

// Asset types and schemas
export {
  assetSchema,
  assetCreateSchema,
  assetUpdateSchema,
  assetHelpers
} from './schemas/asset.schema.mjs';

// Token schemas for server-side validation
export {
  TokenSizeEnum,
  tokenSchema,
  createTokenSchema,
  updateTokenSchema,
  tokenStatsSchema,
  tokenConditionSchema
} from './schemas/tokens.schema.mjs';

// Plugin system interfaces and base classes
export type {
  IPlugin,
  IPluginConfiguration,
  IPluginRegistry,
  IGameSystemPlugin,
  IGameSystemPluginWeb,
  IPluginManager,
  IServerPlugin,
  PluginActionResult,
  IWebPlugin
} from './types/plugin.mjs';

// Plugin component system
export type { IPluginComponent } from './types/plugin-component.mjs';
export type { IPluginAPI } from './types/plugin-api.mjs';
export { PluginComponent } from './base/plugin-component.mjs';

// Base plugin implementations
export { BasePlugin } from './base/plugin.mjs';
export { WebPlugin } from './base/web.mjs';

export { baseAPIResponseSchema } from './types/api/base.mjs';

// Enums and constants
export { GameSessionStatus } from './schemas/game-session.schema.mjs';
export { UserTheme } from './schemas/user.schema.mjs';

// Encounter system exports
export { 
  encounterSchema,
  EncounterStatusEnum
} from './schemas/encounters.schema.mjs';

// Export all types
export * from './types/index.mjs';
