// Core types from schemas
export type {
  IActor,
  IActorCreateData,
  IActorUpdateData,
} from './schemas/actor.schema.mjs';

// Export schemas for server-side validation
export {
  actorSchema,
  actorCreateSchema,
  actorUpdateSchema,
} from './schemas/actor.schema.mjs';

export type {
  IItem,
  IItemCreateData,
  IItemUpdateData,
} from './schemas/item.schema.mjs';

// Export schemas for server-side validation
export {
  itemSchema,
  itemCreateSchema,
  itemUpdateSchema,
} from './schemas/item.schema.mjs';

export type {
  IUser,
  IUserCreateData,
  IUserUpdateData,
} from './schemas/user.schema.mjs';

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
  IInviteCreateData,
  IInviteUpdateData,
} from './schemas/invite.schema.mjs';

// Export invite schemas for server-side validation
export {
  inviteSchema,
  inviteCreateSchema,
  inviteUpdateSchema,
  InviteStatus,
} from './schemas/invite.schema.mjs';

export type {
  ICampaign,
  ICampaignCreateData,
  ICampaignUpdateData,
} from './schemas/campaign.schema.mjs';

// Export schemas for server-side validation
export {
  campaignSchema,
  campaignCreateSchema,
  campaignUpdateSchema,
} from './schemas/campaign.schema.mjs';

export type {
  IMap,
  IMapCreateData,
  IMapUpdateData,
} from './schemas/map.schema.mjs';

// Export schemas for server-side validation
export {
  mapSchema,
  mapCreateSchema,
  mapUpdateSchema,
} from './schemas/map.schema.mjs';

export type {
  IGameSession,
  IGameSessionCreateData,
  IGameSessionUpdateData,
} from './schemas/game-session.schema.mjs';

// Export schemas for server-side validation
export {
  gameSessionSchema,
  gameSessionCreateSchema,
  gameSessionUpdateSchema,
} from './schemas/game-session.schema.mjs';

// Common types
export type { ApiFields } from './types/api-fields.mjs';

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
  IGameSystemRegistration,
  IActorTypeDefinition,
  IItemTypeDefinition,
  PluginActionResult,
  IWebPlugin
} from './types/plugin.mjs';

// Export only browser-compatible plugin classes
export { BasePlugin } from './base/plugin.mjs';
export { WebPlugin } from './base/web.mjs';
// Do NOT export ServerPlugin here!

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
  ITokenCreateData,
  ITokenUpdateData,
  TokenSize
} from './schemas/token.schema.mjs';

// Token schema and enums
export { 
  TokenSizeEnum,
  tokenSchema,
  tokenCreateSchema,
  tokenUpdateSchema,
} from './schemas/token.schema.mjs';
