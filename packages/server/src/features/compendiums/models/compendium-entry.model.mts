import mongoose from 'mongoose';
import { createHash } from 'crypto';
import { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import { compendiumEntrySchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';

// Create a modified schema without the discriminated union field
const compendiumEntrySchemaForMongoose = compendiumEntrySchema
  .omit({ embeddedContent: true }) // Remove the discriminated union field
  .merge(baseMongooseZodSchema)
  .extend({
    compendiumId: zId('Compendium'),
    imageId: zId('Asset').optional() // Reference to Asset model for entry-level image
  });

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<ICompendiumEntry>(compendiumEntrySchemaForMongoose);

// Override complex fields to use Mixed type for flexibility
mongooseSchema.path('embeddedContent', mongoose.Schema.Types.Mixed);
mongooseSchema.path('sourceData', mongoose.Schema.Types.Mixed);
mongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add indexes for performance with embedded content
mongooseSchema.index({ compendiumId: 1, sortOrder: 1 });
mongooseSchema.index({ compendiumId: 1, 'embeddedContent.type': 1 });
mongooseSchema.index({ compendiumId: 1, isActive: 1 });
mongooseSchema.index({ compendiumId: 1, category: 1 });
mongooseSchema.index({ tags: 1 });
mongooseSchema.index({ category: 1 });
mongooseSchema.index({ name: 'text' }); // Text search
mongooseSchema.index({ contentHash: 1 }); // For version tracking
mongooseSchema.index({ contentVersion: 1 });

// Unique constraint on compendium + name combination (since we don't have contentId anymore)
mongooseSchema.index({ compendiumId: 1, name: 1 }, { unique: true });

// Add virtual for compendium
mongooseSchema.virtual('compendium', {
  ref: 'Compendium',
  localField: 'compendiumId',
  foreignField: '_id',
  justOne: true
});

// Add virtual for image asset
mongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

// Instance methods
mongooseSchema.methods.generateContentHash = function(): string {
  return createHash('sha256')
    .update(JSON.stringify(this.embeddedContent.data))
    .digest('hex')
    .substring(0, 16);
};

mongooseSchema.methods.updateContentVersion = function(): string {
  const [major, minor, patch] = this.contentVersion.split('.').map(Number);
  this.contentVersion = `${major}.${minor}.${patch + 1}`;
  return this.contentVersion;
};

mongooseSchema.methods.getTemplate = function(): any {
  // Return deep clone to prevent mutation
  return JSON.parse(JSON.stringify(this.embeddedContent.data));
};

// Pre-save middleware to ensure content hash is up to date
mongooseSchema.pre('save', function(next) {
  // Always generate contentHash for new documents or when embeddedContent is modified
  if (this.isNew || this.isModified('embeddedContent')) {
    this.contentHash = (this as any).generateContentHash();
    if (this.isNew) {
      this.contentVersion = '1.0.0';
    } else {
      (this as any).updateContentVersion();
    }
  }
  next();
});

// Post-save middleware to update compendium statistics
mongooseSchema.post('save', async function(doc) {
  const CompendiumModel = mongoose.model('Compendium');
  
  // Update compendium statistics based on embedded content types
  const pipeline = [
    { $match: { compendiumId: doc.compendiumId } },
    { $group: {
      _id: '$embeddedContent.type',
      count: { $sum: 1 }
    }}
  ];
  
  const stats = await mongoose.model('CompendiumEntry').aggregate(pipeline);
  const entriesByType: Record<string, number> = {};
  let totalEntries = 0;
  
  for (const stat of stats) {
    entriesByType[stat._id] = stat.count;
    totalEntries += stat.count;
  }
  
  await CompendiumModel.findByIdAndUpdate(doc.compendiumId, {
    totalEntries,
    entriesByType
  });
});

// Post-remove middleware to update compendium statistics
mongooseSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const CompendiumModel = mongoose.model('Compendium');
    
    // Recalculate statistics after deletion
    const pipeline = [
      { $match: { compendiumId: doc.compendiumId } },
      { $group: {
        _id: '$embeddedContent.type',
        count: { $sum: 1 }
      }}
    ];
    
    const stats = await mongoose.model('CompendiumEntry').aggregate(pipeline);
    const entriesByType: Record<string, number> = {};
    let totalEntries = 0;
    
    for (const stat of stats) {
      entriesByType[stat._id] = stat.count;
      totalEntries += stat.count;
    }
    
    await CompendiumModel.findByIdAndUpdate(doc.compendiumId, {
      totalEntries,
      entriesByType
    });
  }
});

/**
 * CompendiumEntry model with embedded content
 */
export const CompendiumEntryModel = mongoose.model<ICompendiumEntry>('CompendiumEntry', mongooseSchema);