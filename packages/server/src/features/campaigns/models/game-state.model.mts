import mongoose from 'mongoose';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';

/**
 * GameState document interface with metadata + state structure
 */
export interface IGameStateDocument {
  _id: ObjectId;
  id: string;
  campaignId: string;
  version: string;
  hash: string | null;
  lastUpdate: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  
  // Pure game state with populated assets - what clients need
  state: ServerGameStateWithVirtuals;
}

/**
 * Server-side GameState schema with metadata + state structure
 */
const gameStateSchemaMongoose = z.object({
  // Metadata fields
  campaignId: zId('Campaign'), // Reference to parent campaign
  version: z.string().default('1'), // Version for optimistic concurrency
  hash: z.string().nullable().default(null), // Hash for integrity checking
  lastUpdate: z.number().default(() => Date.now()), // Last update timestamp
  
  // Pure game state with populated assets - using Mixed type for flexibility
  state: z.any()
}).merge(baseMongooseZodSchema);

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IGameStateDocument>(gameStateSchemaMongoose);

// Override the entire state field to use Mixed type for maximum flexibility
// This allows us to store the fully populated client-ready data
mongooseSchema.path('state', mongoose.Schema.Types.Mixed);

// Convert ObjectId fields to strings for JSON serialization
mongooseSchema.path('campaignId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});

// Note: Campaign reference is now stored directly in state.campaign field
// No need for virtual population since the state contains client-ready data

// Add indexes for common queries
mongooseSchema.index({ campaignId: 1 }, { unique: true }); // One GameState per campaign
mongooseSchema.index({ version: 1 });
mongooseSchema.index({ lastUpdate: 1 });
mongooseSchema.index({ hash: 1 });

// Middleware to update lastUpdate on save
mongooseSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdate = Date.now();
  }
  next();
});

// Middleware to update version on save (for optimistic concurrency)
mongooseSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    const currentVersion = parseInt(String(this.version || '1'));
    this.version = String(currentVersion + 1);
  }
  next();
});

/**
 * GameState model
 */
export const GameStateModel = mongoose.model<IGameStateDocument>('GameState', mongooseSchema);