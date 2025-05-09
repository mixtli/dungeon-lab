import { z } from 'zod';
import {
  userSchema,
  userCreateSchema,
  userUpdateSchema,
  UserTheme,
  userPreferencesSchema
} from '../schemas/user.schema.mjs';

import {
  campaignCreateSchema,
  campaignPatchSchema,
  campaignWithVirtualsSchema
} from '../schemas/campaign.schema.mjs';

import {
  actorSchema,
  actorCreateSchema,
  actorPatchSchema,
  actorSchemaWithVirtuals
} from '../schemas/actor.schema.mjs';

import { assetSchema, assetCreateSchema, assetUpdateSchema } from '../schemas/asset.schema.mjs';

import { encounterSchema, EncounterStatus } from '../schemas/encounter.schema.mjs';

import {
  gameSessionCreateSchema,
  gameSessionPatchSchema,
  GameSessionStatus,
  gameSessionWithVirtualsSchema
} from '../schemas/game-session.schema.mjs';

import { inviteSchema, inviteStatusSchema } from '../schemas/invite.schema.mjs';

import { itemSchema, itemCreateSchema } from '../schemas/item.schema.mjs';

import { 
  mapSchema, 
  mapCreateSchema, 
  mapImportUVTTSchema,
  uvttSchema
} from '../schemas/map.schema.mjs';

import {
  vttDocumentSchema,
  vttDocumentCreateSchema,
  vttDocumentUpdateSchema
} from '../schemas/vtt-document.schema.mjs';
import { tokenSchema } from '../index.mjs';

// General Types
export type QueryValue = string | number | boolean | RegExp | Date | object;

// User Types
export type IUser = z.infer<typeof userSchema>;
export type IUserCreateData = z.infer<typeof userCreateSchema>;
export type IUserUpdateData = z.infer<typeof userUpdateSchema>;
export type IUserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserThemeType = z.infer<typeof UserTheme>;

// Campaign Types
export type ICampaign = z.infer<typeof campaignWithVirtualsSchema>;
export type ICampaignCreateData = z.infer<typeof campaignCreateSchema>;
export type ICampaignPatchData = z.infer<typeof campaignPatchSchema>;

// Actor Types
export type IActor = z.infer<typeof actorSchemaWithVirtuals>;
export type IActorCreateData = z.infer<typeof actorCreateSchema>;
export type IActorBaseData = z.infer<typeof actorSchema>;
export type IActorPatchData = z.infer<typeof actorPatchSchema>;

// Asset Types
export type IAsset = z.infer<typeof assetSchema>;
export type IAssetCreateData = z.infer<typeof assetCreateSchema>;
export type IAssetUpdateData = z.infer<typeof assetUpdateSchema>;

// Encounter Types
export type IEncounter = z.infer<typeof encounterSchema>;
export type EncounterStatusType = z.infer<typeof EncounterStatus>;

// Game Session Types
export type IGameSession = z.infer<typeof gameSessionWithVirtualsSchema>;
export type ICreateGameSession = z.infer<typeof gameSessionCreateSchema>;
export type GameSessionStatusType = z.infer<typeof GameSessionStatus>;
export type IGameSessionPatchData = z.infer<typeof gameSessionPatchSchema>;

// Invite Types
export type IInvite = z.infer<typeof inviteSchema>;
export type InviteStatusType = z.infer<typeof inviteStatusSchema>;

// Item Types
export type IItem = z.infer<typeof itemSchema>;
export type IItemCreateData = z.infer<typeof itemCreateSchema>;

export const mapUpdateSchema = mapCreateSchema.deepPartial();
// Map Types
export type IMap = z.infer<typeof mapSchema>;
export type IMapCreateData = z.infer<typeof mapCreateSchema>;
export type IMapUpdateData = z.infer<typeof mapUpdateSchema>;
export type IMapImportUVTTData = z.infer<typeof mapImportUVTTSchema>;
export type IUVTT = z.infer<typeof uvttSchema>;

// VTT Document Types
export type IVTTDocument = z.infer<typeof vttDocumentSchema>;
export type IVTTDocumentCreateData = z.infer<typeof vttDocumentCreateSchema>;
export type IVTTDocumentUpdateData = z.infer<typeof vttDocumentUpdateSchema>;

export type IToken = z.infer<typeof tokenSchema>;
