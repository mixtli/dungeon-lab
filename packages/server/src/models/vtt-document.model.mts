import mongoose from 'mongoose';
import toMongooseSchema from '@zodyac/zod-mongoose';
import { vttDocumentSchema, type IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';

// Create mongoose schema from zod schema
const mongooseSchema = toMongooseSchema(vttDocumentSchema);

// Add validation middleware
mongooseSchema.pre('save', async function(this: mongoose.Document & IVTTDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
  try {
    // Only validate data field if it's modified
    if (this.isModified('data')) {
      const plugin = pluginRegistry.getPlugin(this.pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${this.pluginId} not found`);
      }

      const isValid = plugin.validateDocumentData(this.documentType, this.data);
      if (!isValid) {
        throw new Error(`Invalid document data for plugin ${this.pluginId} and type ${this.documentType}`);
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create and export model
export const VTTDocument = mongoose.model<IVTTDocument>('VTTDocument', mongooseSchema); 