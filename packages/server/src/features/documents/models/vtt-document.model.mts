import { vttDocumentSchema, type IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import mongoose from 'mongoose';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

// Create mongoose schema using the base schema creator to handle _id to id transformation
const mongooseSchema = createMongoSchema<IVTTDocument>(vttDocumentSchema.merge(baseMongooseZodSchema));

// Add compound unique index for slug within plugin and document type context
mongooseSchema.index(
  { slug: 1, pluginId: 1, documentType: 1 },
  { unique: true }
);

// Add pre-validation middleware to set default slug if not provided
mongooseSchema.pre('validate', function(this: mongoose.Document & IVTTDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
  // Only set default slug if name is modified and slug is not explicitly set
  if (this.isModified('name') && !this.get('slug')) {
    // Convert name to lowercase, replace spaces with dashes, and remove any non-alphanumeric characters
    const slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')     // Replace spaces with dashes
      .replace(/[^a-z0-9-]/g, '') // Remove any characters that aren't lowercase letters, numbers, or dashes
      .replace(/-+/g, '-');     // Replace multiple consecutive dashes with a single dash
    
    this.set('slug', slug);
  }
  next();
});

// Add validation middleware
mongooseSchema.pre('save', async function(this: mongoose.Document & IVTTDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
  try {
    console.log("saving document", this.name, this.documentType)
    // Only validate data field if it's modified
    if (this.isModified('data')) {
      console.log("validating document data", this.documentType)
      const plugin = pluginRegistry.getPlugin(this.pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${this.pluginId} not found`);
      }
      const isValid = plugin.validateVTTDocumentData(this.documentType, this.data);
      if (!isValid.success) {
        console.log(isValid.error.message)
        throw new Error(`Invalid document data for plugin ${this.pluginId} and type ${this.documentType}`, isValid.error);
      }
    }

    // Check for duplicate slug if slug is modified
    if (this.isModified('slug')) {
      const existingDoc = await VTTDocument.findOne({
        slug: this.slug,
        pluginId: this.pluginId,
        documentType: this.documentType,
        _id: { $ne: this._id } // Exclude current document when updating
      });

      if (existingDoc) {
        throw new Error(`A document with slug "${this.slug}" already exists for plugin "${this.pluginId}" and type "${this.documentType}"`);
      }
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * VTT Document interface extending the base IVTTDocument
 */
//export interface VTTDocument extends Omit<IVTTDocument, 'id'>, BaseDocument {}

// Create and export model
export const VTTDocument = mongoose.model<IVTTDocument>('VTTDocument', mongooseSchema); 