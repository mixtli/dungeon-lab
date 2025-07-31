import mongoose from 'mongoose';
import { itemSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { IItem } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific item schema with ObjectId references
const serverItemSchema = itemSchema.extend({
  campaignId: zId('Campaign'), // Required - items must belong to campaigns
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional()
});

// Create the discriminator schema (omit documentType as it's handled by discriminator)
const itemMongooseSchema = createMongoSchema<IItem>(
  serverItemSchema.merge(baseMongooseZodSchema).omit({ documentType: true })
);

// Override pluginData field to use Mixed type for flexibility
itemMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
itemMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the item discriminator model directly
export const ItemDocumentModel = DocumentModel.discriminator<IItem>('Item', itemMongooseSchema);

// Export with consistent naming
export { ItemDocumentModel as ItemModel };