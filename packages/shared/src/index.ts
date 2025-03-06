// Core types from schemas
export type {
  IActor,
  IActorCreateData,
  IActorUpdateData,
} from './schemas/actor.schema.js';

export type {
  IItem,
  IItemCreateData,
  IItemUpdateData,
} from './schemas/item.schema.js';

export type {
  IGameSystem,
  IGameSystemCreateData,
  IGameSystemUpdateData,
  IGameSystemRegistration,
} from './schemas/game-system.schema.js';

export type {
  IUser,
  IUserCreateData,
  IUserUpdateData,
} from './schemas/user.schema.js';

export type {
  ICampaign,
  ICampaignCreateData,
  ICampaignUpdateData,
} from './schemas/campaign.schema.js';

export type {
  IMap,
  IMapCreateData,
  IMapUpdateData,
} from './schemas/map.schema.js';

export type {
  IGameSession,
  IGameSessionCreateData,
  IGameSessionUpdateData,
} from './schemas/game-session.schema.js';

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
} from './schemas/websocket-messages.schema.js';

// Plugin system interfaces
export type {
  IPlugin,
  IPluginConfig,
  IPluginRegistry,
  IGameSystemPlugin,
  IPluginManager,
} from './interfaces/plugin.js';

// API interfaces
export type {
  IApiResponse,
  IApiError,
  IPagination,
  IPaginatedApiResponse,
} from './interfaces/api.js';

// Schemas (for MongoDB models)
export { actorSchema } from './schemas/actor.schema.js';
export { itemSchema } from './schemas/item.schema.js';
export { gameSystemSchema } from './schemas/game-system.schema.js';
export { userSchema } from './schemas/user.schema.js';
export { campaignSchema } from './schemas/campaign.schema.js';
export { mapSchema } from './schemas/map.schema.js';
export { gameSessionSchema } from './schemas/game-session.schema.js';

// Enums and constants
export { CampaignStatus } from './schemas/campaign.schema.js';
export { GameSessionStatus } from './schemas/game-session.schema.js';
export { UserTheme } from './schemas/user.schema.js';

// Utilities
export { zId } from '@zodyac/zod-mongoose'; 