// Core types from schemas
export type {
  IActor,
  IActorCreateData,
  IActorUpdateData,
} from './schemas/actor.schema.mjs';

export type {
  IItem,
  IItemCreateData,
  IItemUpdateData,
} from './schemas/item.schema.mjs';

export type {
  IUser,
  IUserCreateData,
  IUserUpdateData,
} from './schemas/user.schema.mjs';

export type {
  ICampaign,
  ICampaignCreateData,
  ICampaignUpdateData,
} from './schemas/campaign.schema.mjs';

export type {
  IMap,
  IMapCreateData,
  IMapUpdateData,
} from './schemas/map.schema.mjs';

export type {
  IGameSession,
  IGameSessionCreateData,
  IGameSessionUpdateData,
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
} from './types/plugin.mjs';

// Export only browser-compatible plugin classes
export { BasePlugin } from './types/plugin-base.mjs';
export { WebPlugin } from './types/plugin-web.mjs';
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
export { TokenSizeEnum } from './schemas/token.schema.mjs';
