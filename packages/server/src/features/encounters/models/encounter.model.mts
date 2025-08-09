import mongoose, { ObjectId } from 'mongoose';
import { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { encounterSchema } from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';

/**
 * Create Mongoose schema with base configuration
 */
const encounterSchemaMongoose = encounterSchema.merge(baseMongooseZodSchema).extend({
  campaignId: zId('Campaign'),
  mapId: zId('Map')
});

const mongooseSchema = createMongoSchema<IEncounter>(encounterSchemaMongoose);

// Set Mixed type for the encounter data field
mongooseSchema.path('data', mongoose.Schema.Types.Mixed);

// Set Mixed type for the entire tokens array to handle complex plugin-specific data
// This prevents "Cast to embedded failed" errors during encounter sync operations
mongooseSchema.path('tokens', mongoose.Schema.Types.Mixed);

// Add getters and setters for campaignId to handle ObjectId conversion
mongooseSchema.path('campaignId').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});
mongooseSchema.path('campaignId').get(function (value: ObjectId) {
  return value.toString();
});
mongooseSchema.path('mapId').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});
mongooseSchema.path('mapId').get(function (value: ObjectId) {
  return value.toString();
});

// Add indexes for performance optimization
mongooseSchema.index({ campaignId: 1, status: 1 }); // Find active encounters by campaign
mongooseSchema.index({ status: 1 }); // Filter by status (draft, ready, in_progress, paused, completed)
mongooseSchema.index({ updatedAt: -1 }); // Recently modified encounters for activity feeds
mongooseSchema.index({ createdAt: -1 }); // Recent encounters for listing
mongooseSchema.index({ 'participants': 1 }); // Find encounters where a specific user is participating
mongooseSchema.index({ mapId: 1 }); // Find encounters using a specific map

// Add optimistic locking support to prevent concurrent modification conflicts
// When multiple users edit the same encounter, version field prevents data loss
mongooseSchema.set('versionKey', 'version');

/**
 * Encounter model
 * 
 * Encounters represent combat or interaction scenes within a campaign.
 * They contain tokens (characters, NPCs, objects), track initiative order,
 * manage temporary effects, and maintain turn-based state.
 * 
 * Key fields explained:
 * - campaignId: Links to the parent campaign this encounter belongs to (stored as ObjectId)
 * - mapId: References the map/scene where this encounter takes place
 * - status: Lifecycle state (draft -> ready -> in_progress -> paused/completed)
 * - tokens: Array of all tokens (characters, NPCs, objects) in this encounter
 * - initiative: Embedded initiative tracker with turn order and round counting
 * - effects: Array of temporary effects (buffs, debuffs, conditions) active in encounter
 * - settings: Configuration options like grid size, auto-roll initiative, turn timers
 * - participants: Array of user IDs who can view/interact with this encounter
 * - version: Optimistic locking field to prevent concurrent update conflicts
 */
export const EncounterModel = mongoose.model<IEncounter>('Encounter', mongooseSchema); 