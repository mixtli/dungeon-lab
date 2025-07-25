import mongoose from 'mongoose';
import { z } from 'zod';
import { baseDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific base document schema with ObjectId references
const serverBaseDocumentSchema = baseDocumentSchema.extend({
  campaignId: zId('Campaign'),
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  
  // Actor-specific fields (present only on actor documents)
  avatarId: zId('Asset').optional(),
  defaultTokenImageId: zId('Asset').optional(),
  
  // Universal inventory system (for actors only)
  inventory: z.array(z.object({
    itemId: zId('Document'),                // Reference to Item document
    quantity: z.number().min(0),
    equipped: z.boolean().default(false),
    slot: z.string().optional(),
    condition: z.number().min(0).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })).default([]).optional(),
  
  // VTT Document specific fields
  slug: z.string().optional()
});

// Create the base Mongoose schema
const baseMongooseSchema = createMongoSchema<BaseDocument>(
  serverBaseDocumentSchema.merge(baseMongooseZodSchema)
);

// Set the discriminator key on the schema
baseMongooseSchema.set('discriminatorKey', 'documentType');

// Comprehensive indexing strategy for performance
// Core document queries (most common)
baseMongooseSchema.index({ campaignId: 1, documentType: 1 });
baseMongooseSchema.index({ pluginId: 1, documentType: 1 });
baseMongooseSchema.index({ pluginId: 1, pluginDocumentType: 1 });

// Compendium queries  
baseMongooseSchema.index({ compendiumId: 1 });
baseMongooseSchema.index({ pluginId: 1, compendiumId: 1 });

// Universal inventory indexes (for actors)
baseMongooseSchema.index({ 'inventory.itemId': 1 });                    // Find actors with specific items
baseMongooseSchema.index({ campaignId: 1, 'inventory.itemId': 1 });     // Campaign-scoped inventory queries
baseMongooseSchema.index({ 'inventory.equipped': 1, 'inventory.slot': 1 }); // Find equipped items by slot

// Slug uniqueness for VTT documents (sparse index - only applies to documents with slug)
baseMongooseSchema.index({ 
  slug: 1, 
  pluginId: 1, 
  documentType: 1 
}, { unique: true, sparse: true });

// Text search index
baseMongooseSchema.index({ 
  name: 'text', 
  description: 'text',
  'pluginData.type': 'text'
});

// Asset references for population
baseMongooseSchema.index({ imageId: 1 });
baseMongooseSchema.index({ avatarId: 1 });
baseMongooseSchema.index({ defaultTokenImageId: 1 });

// User ownership and recent documents
baseMongooseSchema.index({ createdBy: 1 });
baseMongooseSchema.index({ updatedAt: -1 });

// Validation middleware for unified documents
baseMongooseSchema.pre('save', async function(next) {
  try {
    // Campaign boundary validation
    if (this.campaignId) {
      // Ensure all referenced documents belong to the same campaign
      if (this.get('documentType') === 'actor' && this.get('inventory')) {
        for (const invItem of (this.get('inventory') as any[])) { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (invItem.itemId) {
            const referencedItem = await DocumentModel.findById(invItem.itemId);
            if (referencedItem && referencedItem.campaignId?.toString() !== this.campaignId.toString()) {
              throw new Error(`Item ${invItem.itemId} does not belong to campaign ${this.campaignId}`);
            }
          }
        }
      }
    }
    
    // Document type specific validation
    if (this.get('documentType') === 'vtt-document') {
      // Auto-generate slug if not provided for VTT documents
      if (this.isModified('name') && !this.get('slug')) {
        const slug = (this.get('name') as string)
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-');
        this.set('slug', slug);
      }
      
      // Validate slug uniqueness for VTT documents
      if (this.isModified('slug') && this.get('slug')) {
        const existing = await DocumentModel.findOne({
          slug: this.get('slug'),
          pluginId: this.get('pluginId'),
          documentType: this.get('documentType'),
          _id: { $ne: this._id }
        });
        
        if (existing) {
          throw new Error(`Document with slug "${this.get('slug')}" already exists for plugin "${this.get('pluginId')}" and type "${this.get('documentType')}"`);
        }
      }
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Override pluginData field to use Mixed type for flexibility
baseMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
baseMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add virtual properties for common asset relationships
baseMongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('compendium', {
  ref: 'Compendium',
  localField: 'compendiumId',
  foreignField: '_id',
  justOne: true
});

// Create base Document model with custom discriminator key
export const DocumentModel = mongoose.model<BaseDocument>('Document', baseMongooseSchema);

// Export convenience function to get the appropriate model for a document type
export async function getDocumentModel(documentType: string) {
  switch (documentType) {
    case 'actor': {
      // Import dynamically to avoid circular dependencies
      const { ActorDocumentModel } = await import('./actor-document.model.mjs');
      return ActorDocumentModel;
    }
    case 'item': {
      // Import dynamically to avoid circular dependencies
      const { ItemDocumentModel } = await import('./item-document.model.mjs');
      return ItemDocumentModel;
    }
    case 'vtt-document': {
      // Import dynamically to avoid circular dependencies
      const { VTTDocumentModel } = await import('./vtt-document.model.mjs');
      return VTTDocumentModel;
    }
    default:
      return DocumentModel;  // Plugin-specific types use base model
  }
}