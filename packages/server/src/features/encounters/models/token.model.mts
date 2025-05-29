import mongoose from 'mongoose';
import { IToken } from '@dungeon-lab/shared/types/index.mjs';
import { tokenSchema } from '@dungeon-lab/shared/schemas/tokens.schema.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IToken>(tokenSchema.merge(baseMongooseZodSchema));

// Add indexes for common queries
mongooseSchema.index({ encounterId: 1 }); // Find all tokens in a specific encounter
mongooseSchema.index({ actorId: 1 }); // Find tokens representing a specific character/NPC
mongooseSchema.index({ itemId: 1 }); // Find tokens representing a specific item
mongooseSchema.index({ 'position.x': 1, 'position.y': 1 }); // Spatial queries for map interactions
mongooseSchema.index({ isVisible: 1 }); // Filter tokens by visibility (hidden vs visible to players)
mongooseSchema.index({ updatedAt: -1 }); // Recently modified tokens for real-time sync

/**
 * Token model
 * 
 * Tokens represent any object on the encounter map - player characters,
 * NPCs, monsters, environmental objects, or items. They have position,
 * visual properties, and can participate in combat.
 * 
 * Key fields explained:
 * - encounterId: Foreign key linking this token to its parent encounter
 * - actorId: Optional link to Actor collection (for character/NPC tokens)
 * - itemId: Optional link to Item collection (for item/object tokens)
 * - position: {x, y} coordinates on the map grid (in grid units, not pixels)
 * - rotation: Rotation angle in degrees (0-360) for token facing direction
 * - size: Token size multiplier (1.0 = normal, 2.0 = large, 0.5 = small)
 * - isVisible: Whether players can see this token (GMs can always see all tokens)
 * - isLocked: Whether the token can be moved (prevents accidental movement)
 * - hitPoints/maxHitPoints: Current and maximum HP for combat tracking
 * - armorClass: AC value for combat calculations
 * - tags: Flexible array for categorization (e.g., ["enemy", "undead", "boss"])
 */
export const TokenModel = mongoose.model<IToken>('Token', mongooseSchema);
