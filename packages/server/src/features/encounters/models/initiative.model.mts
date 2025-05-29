import mongoose from 'mongoose';
import { InitiativeEntry } from '@dungeon-lab/shared/types/encounters.mjs';
import { initiativeEntrySchema } from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Initiative Entry document interface extending the base InitiativeEntry interface
 * 
 * Initiative entries track turn order in combat encounters. Each token that
 * participates in combat gets an initiative entry that determines when they
 * can act during each round.
 */
export interface InitiativeEntryDocument extends Omit<InitiativeEntry, 'id'>, mongoose.Document {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<InitiativeEntry>(initiativeEntrySchema.merge(baseMongooseZodSchema));

// Add indexes for common queries
mongooseSchema.index({ encounterId: 1, initiative: -1 }); // Sort by initiative within encounter (highest first)
mongooseSchema.index({ tokenId: 1 }); // Find initiative entry for a specific token
mongooseSchema.index({ actorId: 1 }); // Find initiative entries for a specific character/NPC
mongooseSchema.index({ hasActed: 1 }); // Filter by whether the participant has acted this round

/**
 * Initiative Entry model
 * 
 * Key fields explained:
 * - encounterId: Foreign key linking to the parent encounter
 * - tokenId: Foreign key linking to the token this initiative entry represents
 * - actorId: Optional link to Actor collection (inherited from token)
 * - name: Display name for the initiative tracker (usually character/NPC name)
 * - initiative: Numeric initiative value (higher goes first, typically 1-30 range)
 * - hasActed: Whether this participant has taken their action this round
 * - isDelayed: Whether the participant chose to delay their turn (acts later)
 * - isHolding: Whether the participant is holding their action (waiting for trigger)
 * - modifiers: Key-value pairs for initiative bonuses/penalties (e.g., {"dexterity": 3, "alert_feat": 5})
 * 
 * Turn order logic:
 * 1. Sort by initiative value (descending)
 * 2. Ties broken by dexterity modifier or GM discretion
 * 3. Delayed actions insert at chosen initiative count
 * 4. Held actions trigger when conditions are met
 */
export const InitiativeEntryModel = mongoose.model<InitiativeEntryDocument>('InitiativeEntry', mongooseSchema); 