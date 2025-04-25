import mongoose from 'mongoose';
import { IGameSession, gameSessionSchema } from '@dungeon-lab/shared/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { z } from 'zod';
/**
 * GameSession document interface extending the base GameSession interface
 */
//export interface GameSessionDocument extends Omit<IGameSession, 'id'>, BaseDocument {}

const gameSessionSchemaMongoose = gameSessionSchema.merge(baseMongooseZodSchema).extend({
  campaignId: zId('Campaign'),
  gameMasterId: zId('User'),
  participantIds: z.array(zId('User'))
});

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IGameSession>(gameSessionSchemaMongoose);

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

// Add indexes for common queries
mongooseSchema.index({ campaign: 1, isActive: 1 });

/**
 * GameSession model
 */
export const GameSessionModel = mongoose.model<IGameSession>('GameSession', mongooseSchema);
