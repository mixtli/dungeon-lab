import mongoose from 'mongoose';
import { z } from 'zod';
import { baseSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific base document schema with ObjectId references
// Since baseDocumentSchema is now a discriminated union, we need to create a flexible schema
const serverBaseDocumentSchema = baseSchema.extend({
  // Document metadata
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  slug: z.string().optional(),
  
  // Discriminator field for document type
  documentType: z.enum(['actor', 'character', 'item', 'vtt-document']),
  
  // Plugin-specific document subtype
  pluginDocumentType: z.string().min(1),
  pluginId: z.string().min(1),
  source: z.string().min(1).optional(),
  
  // Campaign and compendium associations with ObjectId references
  campaignId: zId('Campaign').optional(),
  compendiumId: zId('Compendium').optional(),
  
  // Plugin-specific data
  pluginData: z.record(z.string(), z.unknown()).default({}),
  itemState: z.record(z.string(), z.unknown()).default({}),
  userData: z.record(z.string(), z.any()).default({}),
  
  // Asset references with ObjectId references
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  
  // Character/Actor specific image fields (optional for all documents)
  avatarId: zId('Asset').optional(),
  tokenImageId: zId('Asset').optional(),
  
  // Item specific fields
  ownerId: zId('Document').optional()
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

// Note: Inventory indexes are now in actor/character-specific models

// Slug index for VTT documents (non-unique since items can have duplicate slugs)
baseMongooseSchema.index({ 
  slug: 1, 
  pluginId: 1, 
  documentType: 1 
}, { sparse: true });

// Text search index
baseMongooseSchema.index({ 
  name: 'text', 
  description: 'text',
  'pluginData.type': 'text'
});

// Asset references for population
baseMongooseSchema.index({ imageId: 1 });
baseMongooseSchema.index({ avatarId: 1 });
baseMongooseSchema.index({ tokenImageId: 1 });

// User ownership and recent documents
baseMongooseSchema.index({ createdBy: 1 });
baseMongooseSchema.index({ updatedAt: -1 });

// Validation middleware for unified documents
baseMongooseSchema.pre('save', async function(next) {
  try {
    // Note: Campaign boundary validation for inventory is now in actor/character-specific models
    
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

baseMongooseSchema.virtual('avatar', {
  ref: 'Asset',
  localField: 'avatarId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('defaultTokenImage', {
  ref: 'Asset',
  localField: 'tokenImageId',
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
    case 'character': {
      // Import dynamically to avoid circular dependencies
      const { CharacterDocumentModel } = await import('./character-document.model.mjs');
      return CharacterDocumentModel;
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