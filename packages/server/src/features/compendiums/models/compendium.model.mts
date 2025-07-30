import mongoose from 'mongoose';
import { ICompendium } from '@dungeon-lab/shared/types/index.mjs';
import { compendiumSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

const compendiumSchemaMongoose = compendiumSchema.merge(baseMongooseZodSchema);

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<ICompendium>(compendiumSchemaMongoose);

// Override complex fields to use Mixed type for flexibility
mongooseSchema.path('importData', mongoose.Schema.Types.Mixed);
mongooseSchema.path('entriesByType', mongoose.Schema.Types.Mixed);
mongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add indexes for performance
mongooseSchema.index({ pluginId: 1 });
mongooseSchema.index({ status: 1 });
mongooseSchema.index({ isPublic: 1 });
mongooseSchema.index({ tags: 1 });
mongooseSchema.index({ name: 'text', description: 'text' }); // Text search

// Add unique constraint for compendium slug (global uniqueness)
mongooseSchema.index({ slug: 1 }, { unique: true });
// Add unique constraint for compendium name within a plugin
mongooseSchema.index({ name: 1, pluginId: 1 }, { unique: true });

// Add virtual for entry count calculation
mongooseSchema.virtual('entryCount', {
  ref: 'CompendiumEntry',
  localField: '_id',
  foreignField: 'compendiumId',
  count: true
});

// Pre-save middleware to update entry statistics
mongooseSchema.pre('save', async function(next) {
  if (this.isModified('totalEntries') || this.isModified('entriesByType')) {
    // Skip automatic updates if these fields are being explicitly set
    return next();
  }
  
  // Calculate entry statistics
  const CompendiumEntry = mongoose.model('CompendiumEntry');
  const totalEntries = await CompendiumEntry.countDocuments({ compendiumId: this._id });
  this.totalEntries = totalEntries;
  
  // Calculate entries by type (using embedded content type)
  const entriesByType = await CompendiumEntry.aggregate([
    { $match: { compendiumId: this._id } },
    { $group: { _id: '$embeddedContent.documentType', count: { $sum: 1 } } }
  ]);
  
  this.entriesByType = entriesByType.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
  
  next();
});

/**
 * Compendium model
 */
export const CompendiumModel = mongoose.model<ICompendium>('Compendium', mongooseSchema);