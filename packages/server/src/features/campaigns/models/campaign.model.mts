import mongoose, { ObjectId } from 'mongoose';
import { ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { campaignSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { z } from '../../../utils/zod.mjs';

const campaignSchemaMongoose = campaignSchema.merge(baseMongooseZodSchema).extend({
  characterIds: z.array(zId('Actor')),
  gameMasterId: zId('User')
});

const mongooseSchema = createMongoSchema<ICampaign>(campaignSchemaMongoose);

mongooseSchema.path('characterIds').get(function (value: ObjectId[]) {
  return value.map((p: ObjectId) => p.toString());
});
mongooseSchema.path('characterIds').set(function (value: string[]) {
  return value.map((p: string) => new mongoose.Types.ObjectId(p));
});
mongooseSchema.path('gameMasterId').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});
mongooseSchema.path('gameMasterId').get(function (value: string) {
  return value.toString();
});

mongooseSchema.virtual('gameMaster', {
  ref: 'User',
  localField: 'gameMasterId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('characters', {
  ref: 'Actor',
  localField: 'characterIds',
  foreignField: '_id',
  justOne: false
});

export const CampaignModel = mongoose.model<ICampaign>('Campaign', mongooseSchema);
