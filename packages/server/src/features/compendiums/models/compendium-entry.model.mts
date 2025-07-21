import mongoose from 'mongoose';
import { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import { compendiumEntrySchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';

const compendiumEntrySchemaMongoose = compendiumEntrySchema.merge(baseMongooseZodSchema).extend({
  compendiumId: zId('Compendium'),
  contentId: zId() // Generic ObjectId that can reference any model
});

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<ICompendiumEntry>(compendiumEntrySchemaMongoose);

// Override complex fields to use Mixed type for flexibility
mongooseSchema.path('sourceData', mongoose.Schema.Types.Mixed);
mongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add indexes for performance
mongooseSchema.index({ compendiumId: 1, sortOrder: 1 });
mongooseSchema.index({ compendiumId: 1, contentType: 1 });
mongooseSchema.index({ compendiumId: 1, isActive: 1 });
mongooseSchema.index({ contentType: 1, contentId: 1 });
mongooseSchema.index({ tags: 1 });
mongooseSchema.index({ category: 1 });
mongooseSchema.index({ name: 'text' }); // Text search

// Unique constraint on compendium + content combination
mongooseSchema.index({ compendiumId: 1, contentId: 1 }, { unique: true });

// Add virtual for referenced content
mongooseSchema.virtual('content', {
  refPath: 'contentType',
  localField: 'contentId',
  foreignField: '_id',
  justOne: true
});

// Add virtual for compendium
mongooseSchema.virtual('compendium', {
  ref: 'Compendium',
  localField: 'compendiumId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to update compendium statistics
mongooseSchema.post('save', async function(doc) {
  const CompendiumModel = mongoose.model('Compendium');
  await CompendiumModel.findByIdAndUpdate(doc.compendiumId, {}, { new: true });
});

// Post-remove middleware to update compendium statistics
mongooseSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const CompendiumModel = mongoose.model('Compendium');
    await CompendiumModel.findByIdAndUpdate(doc.compendiumId, {}, { new: true });
  }
});

/**
 * CompendiumEntry model
 */
export const CompendiumEntryModel = mongoose.model<ICompendiumEntry>('CompendiumEntry', mongooseSchema);