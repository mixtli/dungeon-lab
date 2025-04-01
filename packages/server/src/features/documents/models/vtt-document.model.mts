import { vttDocumentSchema, type IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import mongoose from 'mongoose';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import { BaseDocument, createBaseSchema } from '../../../models/base-schema.mjs';

// Create mongoose schema using the base schema creator to handle _id to id transformation
const mongooseSchema = createBaseSchema(vttDocumentSchema);

// Add validation middleware
mongooseSchema.pre('save', async function(this: mongoose.Document & IVTTDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
  try {
    // Only validate data field if it's modified
    if (this.isModified('data')) {
      const plugin = pluginRegistry.getPlugin(this.pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${this.pluginId} not found`);
      }

      const isValid = plugin.validateVTTDocumentData(this.documentType, this.data);
      if (!isValid) {
        throw new Error(`Invalid document data for plugin ${this.pluginId} and type ${this.documentType}`);
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
export interface VTTDocument extends Omit<IVTTDocument, 'id'>, BaseDocument {}

// Create and export model
export const VTTDocument = mongoose.model<VTTDocument>('VTTDocument', mongooseSchema); 