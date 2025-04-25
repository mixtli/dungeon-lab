import mongoose, { ObjectId } from 'mongoose';
import { ICampaign, campaignSchema } from '@dungeon-lab/shared/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { z } from '../../../utils/zod.mjs';

const campaignSchemaMongoose = campaignSchema.merge(baseMongooseZodSchema).extend({
  members: z.array(zId('Actor')),
  gameMasterId: zId('User')
});

const mongooseSchema = createMongoSchema<ICampaign>(campaignSchemaMongoose);

mongooseSchema.path('members').get(function (value: ObjectId[]) {
  return value.map((p: ObjectId) => p.toString());
});
mongooseSchema.path('members').set(function (value: string[]) {
  return value.map((p: string) => new mongoose.Types.ObjectId(p));
});
mongooseSchema.path('gameMasterId').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});

mongooseSchema.virtual('gameMaster', {
  ref: 'User',
  localField: 'gameMasterId',
  foreignField: '_id',
  justOne: true
});

export const CampaignModel = mongoose.model<ICampaign>('Campaign', mongooseSchema);
