import mongoose from 'mongoose';
import { Effect } from '@dungeon-lab/shared/types/encounters.mjs';
import { effectSchema } from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Effect document interface extending the base Effect interface
 * 
 * Effects represent temporary conditions, buffs, debuffs, or ongoing changes
 * that affect tokens during encounters. They can modify stats, impose conditions,
 * deal damage over time, or provide other mechanical effects.
 */
export interface EffectDocument extends Omit<Effect, 'id'>, mongoose.Document {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<Effect>(effectSchema.merge(baseMongooseZodSchema));

// Add indexes for common queries
mongooseSchema.index({ targetId: 1, isActive: 1 }); // Find all active effects on a specific token
mongooseSchema.index({ source: 1 }); // Find effects created by a specific source (spell, ability, etc.)
mongooseSchema.index({ type: 1 }); // Filter effects by type (damage, healing, condition, etc.)
mongooseSchema.index({ duration: 1, isActive: 1 }); // Find effects that are about to expire
mongooseSchema.index({ createdAt: 1 }); // Sort effects by creation time for processing order

/**
 * Effect model
 * 
 * Key fields explained:
 * - type: Category of effect - determines how the effect is processed
 *   * 'damage': Deals damage over time or on trigger
 *   * 'healing': Provides healing over time or on trigger  
 *   * 'condition': Applies status conditions (poisoned, stunned, etc.)
 *   * 'stat_modifier': Temporarily modifies character stats (+2 STR, -1 AC, etc.)
 *   * 'movement_modifier': Affects movement speed or restrictions
 *   * 'custom': Game system specific effects with custom logic
 * 
 * - duration: How long the effect lasts (in rounds)
 *   * -1: Permanent until manually removed
 *   * 0: Instantaneous (applied once then removed)
 *   * 1+: Number of rounds remaining
 * 
 * - source: What created this effect (for tracking and dispelling)
 *   Examples: "Fireball spell", "Poison trap", "Bless spell", "Rage ability"
 * 
 * - targetId: The token ID this effect is applied to
 * 
 * - data: Flexible object containing effect-specific information
 *   Examples:
 *   * Damage: { amount: 5, damageType: "fire", saveType: "dexterity", saveDC: 15 }
 *   * Stat modifier: { stat: "strength", modifier: 2, type: "enhancement" }
 *   * Condition: { condition: "poisoned", saveEndOfTurn: true, saveDC: 13 }
 * 
 * - isActive: Whether the effect is currently in effect (false = suspended/ended)
 * - stackable: Whether multiple instances of this effect can exist on the same target
 * 
 * Duration processing:
 * - Effects are processed at the start/end of each round
 * - Duration decrements each round for active effects
 * - Effects with duration 0 are automatically removed
 * - Permanent effects (duration -1) persist until manually removed
 */
export const EffectModel = mongoose.model<EffectDocument>('Effect', mongooseSchema); 