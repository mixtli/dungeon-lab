import mongoose from 'mongoose';
import { z } from 'zod';
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific actor schema with ObjectId references and universal inventory
const serverActorSchema = actorSchema.extend({
  campaignId: zId('Campaign'), // Required - actors must belong to campaigns
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

// Create the discriminator schema (omit documentType as it's handled by discriminator)
const actorMongooseSchema = createMongoSchema<IActor>(
  serverActorSchema.merge(baseMongooseZodSchema).omit({ documentType: true })
);

// Override pluginData field to use Mixed type for flexibility
actorMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
actorMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add actor-specific indexes
actorMongooseSchema.index({ avatarId: 1 });
actorMongooseSchema.index({ defaultTokenImageId: 1 });

// Universal inventory indexes (for actors)
actorMongooseSchema.index({ 'inventory.itemId': 1 });                    // Find actors with specific items
actorMongooseSchema.index({ campaignId: 1, 'inventory.itemId': 1 });     // Campaign-scoped inventory queries
actorMongooseSchema.index({ 'inventory.equipped': 1, 'inventory.slot': 1 }); // Find equipped items by slot

// Add inventory validation middleware
actorMongooseSchema.pre('save', async function(next) {
  try {
    // Campaign boundary validation for inventory
    if (this.campaignId && this.inventory && Array.isArray(this.inventory)) {
      for (const invItem of this.inventory) {
        if (invItem.itemId) {
          // Import DocumentModel here to avoid circular dependency
          const { DocumentModel } = await import('./document.model.mjs');
          const referencedItem = await DocumentModel.findById(invItem.itemId);
          if (referencedItem && referencedItem.campaignId?.toString() !== this.campaignId.toString()) {
            throw new Error(`Item ${invItem.itemId} does not belong to campaign ${this.campaignId}`);
          }
        }
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

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
export const ActorDocumentModel = DocumentModel.discriminator<IActor>('actor', actorMongooseSchema);

// Export with consistent naming
export { ActorDocumentModel as ActorModel };