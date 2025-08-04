import mongoose from 'mongoose';
import { z } from 'zod';
import { characterSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ICharacter } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific character schema with ObjectId references
const serverCharacterSchema = characterSchema.extend({
  campaignId: zId('Campaign').optional(), // Optional - characters can exist without campaigns
  compendiumId: zId('Compendium').optional(), // Will be excluded via omit in schema creation
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  avatarId: zId('Asset').optional(),
  defaultTokenImageId: zId('Asset').optional(),
  
  // Enhanced inventory system (for characters only)
  inventory: z.array(z.object({
    itemId: zId('Document'),                // Reference to Item document
    quantity: z.number().min(0),
    equipped: z.boolean().default(false),
    slot: z.string().optional(),
    condition: z.number().min(0).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })).default([])
});

// Create the discriminator schema (omit documentType and compendiumId)
const characterMongooseSchema = createMongoSchema<ICharacter>(
  serverCharacterSchema.merge(baseMongooseZodSchema).omit({ documentType: true, compendiumId: true })
);

// Override pluginData field to use Mixed type for flexibility
characterMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
characterMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add character-specific indexes
characterMongooseSchema.index({ avatarId: 1 });
characterMongooseSchema.index({ defaultTokenImageId: 1 });

// Enhanced inventory indexes (for characters)
characterMongooseSchema.index({ 'inventory.itemId': 1 });                    // Find characters with specific items
characterMongooseSchema.index({ campaignId: 1, 'inventory.itemId': 1 });     // Campaign-scoped inventory queries
characterMongooseSchema.index({ 'inventory.equipped': 1, 'inventory.slot': 1 }); // Find equipped items by slot

// Add inventory validation middleware
characterMongooseSchema.pre('save', async function(next) {
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

// Add character-specific virtual properties
characterMongooseSchema.virtual('avatar', {
  ref: 'Asset',
  localField: 'avatarId',
  foreignField: '_id',
  justOne: true
});

characterMongooseSchema.virtual('defaultTokenImage', {
  ref: 'Asset',
  localField: 'defaultTokenImageId',
  foreignField: '_id',
  justOne: true
});

// Virtual for populating inventory items
characterMongooseSchema.virtual('inventoryItems', {
  ref: 'Document',
  localField: 'inventory.itemId',
  foreignField: '_id'
});

// Virtual for campaign relationship
characterMongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the character discriminator model directly
export const CharacterDocumentModel = DocumentModel.discriminator<ICharacter>('character', characterMongooseSchema);

// Export with consistent naming
export { CharacterDocumentModel as CharacterModel };