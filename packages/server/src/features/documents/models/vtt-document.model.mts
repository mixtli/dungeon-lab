import mongoose from 'mongoose';
import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific VTT document schema with ObjectId references
const serverVTTDocumentSchema = vttDocumentSchema.extend({
  campaignId: zId('Campaign').optional(), // Optional - VTTDocuments are global and campaign-independent
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  slug: z.string().min(1)
});

// Create the discriminator schema (omit documentType as it's handled by discriminator)
const vttDocumentMongooseSchema = createMongoSchema<IVTTDocument>(
  serverVTTDocumentSchema.merge(baseMongooseZodSchema).omit({ documentType: true })
);

// Override pluginData field to use Mixed type for flexibility
vttDocumentMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
vttDocumentMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add pre-validation middleware to set default slug if not provided
vttDocumentMongooseSchema.pre('validate', function(next) {
  // Only set default slug if name is modified and slug is not explicitly set
  if (this.isModified('name') && !this.get('slug')) {
    // Convert name to lowercase, replace spaces with dashes, and remove any non-alphanumeric characters
    const slug = (this.get('name') as string)
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/[^a-z0-9-]/g, '') // Remove any characters that aren't lowercase letters, numbers, or dashes
      .replace(/-+/g, '-'); // Replace multiple consecutive dashes with a single dash

    this.set('slug', slug);
  }
  next();
});

// Add validation middleware for plugin data and slug uniqueness
vttDocumentMongooseSchema.pre('save', async function(next) {
  try {
    // Note: Plugin validation now happens client-side only
    // Server-side validation removed to support manifest-based plugin system

    // Check for duplicate slug if slug is modified
    if (this.isModified('slug')) {
      const VTTDocumentModel = this.constructor as mongoose.Model<IVTTDocument>;
      const existingDoc = await VTTDocumentModel.findOne({
        slug: this.slug,
        pluginId: this.pluginId,
        documentType: this.documentType,
        _id: { $ne: this._id } // Exclude current document when updating
      });

      if (existingDoc) {
        throw new Error(
          `A document with slug "${this.slug}" already exists for plugin "${this.pluginId}" and type "${this.documentType}"`
        );
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the VTT document discriminator model directly
export const VTTDocumentModel = DocumentModel.discriminator<IVTTDocument>('VTTDocument', vttDocumentMongooseSchema);