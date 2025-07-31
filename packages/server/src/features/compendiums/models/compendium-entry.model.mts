import mongoose from 'mongoose';
import { createHash } from 'crypto';
import { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import { compendiumEntrySchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';

// Create a modified schema for Mongoose  
const compendiumEntrySchemaForMongoose = compendiumEntrySchema
  .merge(baseMongooseZodSchema)
  .extend({
    compendiumId: zId('Compendium'),
    // Note: entry.imageId is handled within the entry object, no top-level imageId override needed
  });

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<ICompendiumEntry>(compendiumEntrySchemaForMongoose);

// Override complex fields to use Mixed type for flexibility
mongooseSchema.path('entry', mongoose.Schema.Types.Mixed); // Entry metadata
mongooseSchema.path('content', mongoose.Schema.Types.Mixed); // Document content  
mongooseSchema.path('sourceData', mongoose.Schema.Types.Mixed);
mongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add indexes for performance with new entry+content structure
mongooseSchema.index({ compendiumId: 1, 'entry.sortOrder': 1 });
mongooseSchema.index({ compendiumId: 1, 'entry.documentType': 1 });
mongooseSchema.index({ compendiumId: 1, isActive: 1 });
mongooseSchema.index({ compendiumId: 1, 'entry.category': 1 });
mongooseSchema.index({ 'entry.tags': 1 });
mongooseSchema.index({ 'entry.category': 1 });
mongooseSchema.index({ 'entry.name': 'text' }); // Text search
mongooseSchema.index({ contentHash: 1 }); // For version tracking
mongooseSchema.index({ contentVersion: 1 });

// Unique constraint on compendium + name + documentType + source combination
// This allows multiple items with same name if they're different types or from different sources
mongooseSchema.index({ 
  compendiumId: 1, 
  'entry.name': 1, 
  'entry.documentType': 1, 
  'content.source': 1 
}, { unique: true });

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
  localField: 'entry.imageId',
  foreignField: '_id',
  justOne: true
});

// Interface for template data
interface ITemplateData {
  [key: string]: unknown;
}

// Instance methods
mongooseSchema.methods.generateContentHash = function(): string {
  return createHash('sha256')
    .update(JSON.stringify(this.content))
    .digest('hex')
    .substring(0, 16);
};

mongooseSchema.methods.updateContentVersion = function(): string {
  const [major, minor, patch] = this.contentVersion.split('.').map(Number);
  this.contentVersion = `${major}.${minor}.${patch + 1}`;
  return this.contentVersion;
};

mongooseSchema.methods.getTemplate = function(): ITemplateData {
  // Return deep clone to prevent mutation
  return JSON.parse(JSON.stringify(this.content));
};

// Pre-save middleware to ensure content hash is up to date and handle asset ID conversions
mongooseSchema.pre('save', function(next) {
  // Always generate contentHash for new documents or when content is modified
  if (this.isNew || this.isModified('content')) {
    this.contentHash = (this as unknown as { generateContentHash(): string }).generateContentHash();
    if (this.isNew) {
      this.contentVersion = '1.0.0';
    } else {
      (this as unknown as { updateContentVersion(): string }).updateContentVersion();
    }
  }
  
  // Convert entry.imageId from string to ObjectId if needed
  const thisDoc = this as unknown as { entry?: { imageId?: string | mongoose.Types.ObjectId } };
  if (thisDoc.entry?.imageId && typeof thisDoc.entry.imageId === 'string') {
    try {
      thisDoc.entry.imageId = new mongoose.Types.ObjectId(thisDoc.entry.imageId);
    } catch (_error) {
      // If conversion fails, keep as string (might be a file path during import)
      // The import service will handle this case
    }
  }
  
  // Keep content-level asset IDs as strings - they should remain as ObjectId strings, not ObjectId objects
  // The compendium service will handle converting them for asset lookups
  const contentDoc = this as unknown as { content?: Record<string, unknown> };
  if (contentDoc.content) {
    const assetFields = ['imageId', 'avatarId', 'defaultTokenImageId'];
    for (const field of assetFields) {
      const fieldValue = contentDoc.content[field];
      if (fieldValue && typeof fieldValue === 'string') {
        try {
          // Validate it's a valid ObjectId string, but keep it as string
          new mongoose.Types.ObjectId(fieldValue);
          // If validation passes, keep as string - no conversion needed
        } catch (_error) {
          // If validation fails, keep as string (might be a file path during import)
        }
      }
    }
  }
  
  next();
});

// Post-save middleware to update compendium statistics
mongooseSchema.post('save', async function(doc) {
  const CompendiumModel = mongoose.model('Compendium');
  
  // Update compendium statistics based on entry types
  const pipeline = [
    { $match: { compendiumId: doc.compendiumId } },
    { $group: {
      _id: '$entry.documentType',
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
        _id: '$entry.documentType',
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