import mongoose from 'mongoose';
import { ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { campaignSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';

const campaignSchemaMongoose = campaignSchema.merge(baseMongooseZodSchema).extend({
  gameMasterId: zId('User'),
  gameStateId: zId('GameState').optional(), // Reference to campaign's game state
  ownerId: zId('User').optional() // Reference to campaign owner
});

const mongooseSchema = createMongoSchema<ICampaign>(campaignSchemaMongoose);

// Override pluginData to use Mixed type for flexible plugin data
mongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);

mongooseSchema.path('gameMasterId').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});
mongooseSchema.path('gameMasterId').get(function (value: string) {
  return value.toString();
});

mongooseSchema.path('gameStateId').set(function (value: string | undefined) {
  return value ? new mongoose.Types.ObjectId(value) : undefined;
});
mongooseSchema.path('gameStateId').get(function (value: string | undefined) {
  return value ? value.toString() : undefined;
});

mongooseSchema.path('ownerId').set(function (value: string | undefined) {
  return value ? new mongoose.Types.ObjectId(value) : undefined;
});
mongooseSchema.path('ownerId').get(function (value: string | undefined) {
  return value ? value.toString() : undefined;
});

mongooseSchema.virtual('gameMaster', {
  ref: 'User',
  localField: 'gameMasterId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('gameState', {
  ref: 'GameState',
  localField: 'gameStateId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('characters', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'campaignId',
  match: { documentType: 'character' },
  justOne: false
});

export const CampaignModel = mongoose.model<ICampaign>('Campaign', mongooseSchema);
