import mongoose from 'mongoose';
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific actor schema with ObjectId references
const serverActorSchema = actorSchema.extend({
  campaignId: zId('Campaign'), // Required - actors must belong to campaigns
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  tokenImageId: zId('Asset').optional()
  // Note: Inventory handled via item.ownerId relationships, not embedded arrays
});

// Create the discriminator schema (omit documentType as it's handled by discriminator)
const actorMongooseSchema = createMongoSchema<IActor>(
  serverActorSchema.merge(baseMongooseZodSchema).omit({ documentType: true })
);

// Override pluginData field to use Mixed type for flexibility
actorMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
actorMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add actor-specific indexes
actorMongooseSchema.index({ tokenImageId: 1 });


// Add actor-specific virtual properties
actorMongooseSchema.virtual('tokenImage', {
  ref: 'Asset',
  localField: 'tokenImageId',
  foreignField: '_id',
  justOne: true
});


// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the actor discriminator model directly
export const ActorDocumentModel = DocumentModel.discriminator<IActor>('actor', actorMongooseSchema);

// Export with consistent naming
export { ActorDocumentModel as ActorModel };