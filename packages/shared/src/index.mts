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
} from './schemas/websocket-messages.schema.mjs';

// Plugin system interfaces and base classes
export type {
  IPlugin,
  IPluginConfiguration,
  IPluginRegistry,
  IGameSystemPlugin,
  IPluginManager,
  IWebPlugin,
  IServerPlugin,
} from './types/plugin.mjs';

export {
  BasePlugin,
  ServerPlugin,
  WebPlugin,
} from './types/plugin-base.mjs';

// API interfaces
export type {
  IApiResponse,
  IApiError,
  IPagination,
  IPaginatedApiResponse,
} from './types/api.mjs';

// Schemas (for MongoDB models)
export { actorSchema } from './schemas/actor.schema.mjs';
export { itemSchema } from './schemas/item.schema.mjs';
export { userSchema } from './schemas/user.schema.mjs';
export { campaignSchema } from './schemas/campaign.schema.mjs';
export { mapSchema } from './schemas/map.schema.mjs';
export { gameSessionSchema } from './schemas/game-session.schema.mjs';

// Enums and constants
export { CampaignStatus } from './schemas/campaign.schema.mjs';
export { GameSessionStatus } from './schemas/game-session.schema.mjs';
export { UserTheme } from './schemas/user.schema.mjs';

// Utilities
export { zId } from '@zodyac/zod-mongoose'; 