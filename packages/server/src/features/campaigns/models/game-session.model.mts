import mongoose from 'mongoose';
import { IGameSession } from '@dungeon-lab/shared/types/index.mjs';
import { gameSessionSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
/**
 * GameSession document interface extending the base GameSession interface
 */
//export interface GameSessionDocument extends Omit<IGameSession, 'id'>, BaseDocument {}

const gameSessionSchemaMongoose = gameSessionSchema
  .omit({ gameState: true }) // Exclude gameState from Zod validation
  .merge(baseMongooseZodSchema).extend({
    campaignId: zId('Campaign'),
    gameMasterId: zId('User'),
    participantIds: z.array(zId('User'))
  });

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IGameSession>(gameSessionSchemaMongoose);

mongooseSchema.path('campaignId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});

mongooseSchema.path('gameMasterId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});

// Add getter/setter for participantIds
mongooseSchema.path('participantIds').get(function (value: ObjectId[] | undefined) {
  return value?.map((id) => id.toString());
});

// Add a setter for participantIds to convert string IDs to ObjectId
mongooseSchema.path('participantIds').set(function (value: (ObjectId | string)[]) {
  if (!value) return value;
  
  return value.map(id => {
    // If it's already an ObjectId, leave it as is
    if (id instanceof ObjectId) return id;
    
    // Otherwise try to convert string to ObjectId
    try {
      return new ObjectId(id);
    } catch (error) {
      console.error('Failed to convert participantId to ObjectId:', id, error);
      return id; // Return original value if conversion fails
    }
  });
});

// Add gameState field manually to avoid Zod validation issues
mongooseSchema.add({
  gameState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
});

mongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('gameMaster', {
  ref: 'User',
  localField: 'gameMasterId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('participants', {
  ref: 'User',
  localField: 'participantIds',
  foreignField: '_id',
  justOne: false
});

// Add indexes for common queries and new fields
mongooseSchema.index({ campaignId: 1, status: 1 });
mongooseSchema.index({ gameStateVersion: 1 });
mongooseSchema.index({ lastStateUpdate: 1 });

/**
 * GameSession model
 */
export const GameSessionModel = mongoose.model<IGameSession>('GameSession', mongooseSchema);

