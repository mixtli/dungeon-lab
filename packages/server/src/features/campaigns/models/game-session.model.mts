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

const gameSessionSchemaMongoose = gameSessionSchema.merge(baseMongooseZodSchema).extend({
  campaignId: zId('Campaign'),
  gameMasterId: zId('User'),
  participantIds: z.array(zId('User')),
  characterIds: z.array(zId('Document')).default([])
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

mongooseSchema.path('characterIds').get(function (value: ObjectId[] | undefined) {
  return value?.map((id) => id.toString());
});

// Add a setter for characterIds to convert string IDs to ObjectId
mongooseSchema.path('characterIds').set(function (value: (ObjectId | string)[]) {
  if (!value) return value;
  
  return value.map(id => {
    // If it's already an ObjectId, leave it as is
    if (id instanceof ObjectId) return id;
    
    // Otherwise try to convert string to ObjectId
    try {
      return new ObjectId(id);
    } catch (error) {
      console.error('Failed to convert characterId to ObjectId:', id, error);
      return id; // Return original value if conversion fails
    }
  });
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

mongooseSchema.virtual('characters', {
  ref: 'Document',
  localField: 'characterIds',
  foreignField: '_id',
  match: { documentType: 'character' },
  justOne: false
});

// Add indexes for common queries
mongooseSchema.index({ campaign: 1, isActive: 1 });

/**
 * GameSession model
 */
export const GameSessionModel = mongoose.model<IGameSession>('GameSession', mongooseSchema);

