// Core types from schemas
export type { IActor } from './schemas/actor.schema.mjs';

// Export schemas for server-side validation
export { actorSchema } from './schemas/actor.schema.mjs';

export type { IItem } from './schemas/item.schema.mjs';

// Export schemas for server-side validation
export { itemSchema } from './schemas/item.schema.mjs';

export type { IUser } from './schemas/user.schema.mjs';

// Export schemas for server-side validation
export {
  userSchema,
  userCreateSchema,
  userUpdateSchema,
  userPreferencesSchema,
} from './schemas/user.schema.mjs';

// Invite types and schemas
export type {
  IInvite,
} from './schemas/invite.schema.mjs';

// Export invite schemas for server-side validation
export {
  inviteSchema,
  InviteStatus,
} from './schemas/invite.schema.mjs';

export type { ICampaign } from './schemas/campaign.schema.mjs';

// Export schemas for server-side validation
export { campaignSchema } from './schemas/campaign.schema.mjs';

export type { IMap } from './schemas/map.schema.mjs';

// Export schemas for server-side validation
export { mapSchema } from './schemas/map.schema.mjs';

export type { IGameSession } from './schemas/game-session.schema.mjs';

// Export schemas for server-side validation
export { gameSessionSchema } from './schemas/game-session.schema.mjs';


// WebSocket message types
export type {
  IBaseMessage,
  IChatMessage,
  IDiceRollMessage,
  IMoveMessage,
  IPluginActionMessage,
  IGameStateUpdateMessage,
  IPluginStateUpdateMessage,
  IMessage,
  // Dice roll types
  IDieRollResult,
  IRollResult,
  IRollCommandMessage,
  IRollResultMessage,
} from './schemas/websocket-messages.schema.mjs';

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

// API interfaces
export type {
  IApiResponse,
  IApiError,
  IPagination,
  IPaginatedApiResponse,
} from './types/api.mjs';

// Enums and constants
export { CampaignStatus } from './schemas/campaign.schema.mjs';
export { GameSessionStatus } from './schemas/game-session.schema.mjs';
export { UserTheme } from './schemas/user.schema.mjs';

// Token types
export type {
  IToken,
  TokenSize
} from './schemas/token.schema.mjs';

// Token schema and enums
export { 
  TokenSizeEnum,
  tokenSchema,
} from './schemas/token.schema.mjs';
