import mongoose from 'mongoose';
import { z } from 'zod';
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific actor schema with ObjectId references and universal inventory
const serverActorSchema = actorSchema.extend({
  campaignId: zId('Campaign'),
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
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
  })).default([])
});

// Create the discriminator schema
const actorMongooseSchema = createMongoSchema<IActor>(
  serverActorSchema.merge(baseMongooseZodSchema)
);

// Override pluginData field to use Mixed type for flexibility
actorMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
actorMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add actor-specific virtual properties
actorMongooseSchema.virtual('avatar', {
  ref: 'Asset',
  localField: 'avatarId',
  foreignField: '_id',
  justOne: true
});

actorMongooseSchema.virtual('defaultTokenImage', {
  ref: 'Asset',
  localField: 'defaultTokenImageId',
  foreignField: '_id',
  justOne: true
});

// Virtual for populating inventory items
actorMongooseSchema.virtual('inventoryItems', {
  ref: 'Document',
  localField: 'inventory.itemId',
  foreignField: '_id'
});

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the actor discriminator model directly
export const ActorDocumentModel = DocumentModel.discriminator<IActor>('Actor', actorMongooseSchema);

// Export with consistent naming
export { ActorDocumentModel as ActorModel };