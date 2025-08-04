/**
 * Client-Side Equipment Processor
 * 
 * Handles creating Item documents from character creation equipment selections
 * by parsing class/background choices and instantiating compendium entries.
 */

import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import type { DndCharacterClassDocument, DndBackgroundDocument } from '../types/dnd/index.mjs';

/**
 * Equipment selections from character creation
 */
export interface EquipmentSelections {
  classEquipment: string; // Label of selected equipment choice (e.g., "Option A")
  backgroundEquipment: string; // 'package' or 'gold'
}

/**
 * Created equipment organized by type for character inventory
 */
export interface CreatedEquipment {
  /** Weapons to equip */
  weapons: Array<{
    item: string; // ObjectId
    slot: 'main_hand' | 'off_hand' | 'two_handed';
    masteryActive: boolean;
  }>;
  
  /** Armor to equip */
  armor?: string; // ObjectId
  
  /** Shield to equip */
  shield?: string; // ObjectId
  
  /** Accessories to equip */
  accessories: Array<{
    item: string; // ObjectId
    slot: string;
  }>;
  
  /** Items to carry (not equipped) */
  carried: string[]; // ObjectIds
  
  /** Starting currency */
  startingMoney: {
    platinum: number;
    gold: number;
    electrum: number;
    silver: number;
    copper: number;
  };
}

/**
 * Class equipment choice structure - runtime resolved version
 * In character creation context, item references have been resolved to ObjectId strings
 */
interface ResolvedClassEquipmentChoice {
  label: string;
  description: string;
  items?: Array<{
    /** ObjectId string of the compendium entry (resolved from reference) */
    item: string;
    quantity: number;
  }>;
  gold?: number;
}

/**
 * Background equipment structure - runtime resolved version  
 * In character creation context, item references have been resolved to ObjectId strings
 */
interface ResolvedBackgroundEquipmentPackage {
  items: Array<{
    name: string;
    quantity: number;
    /** ObjectId string of the compendium entry (resolved from reference) */
    item?: string;
  }>;
  goldPieces: number;
}

/**
 * Client-side service for processing character creation equipment
 */
export class EquipmentProcessor {
  private compendiumClient: CompendiumsClient;
  private documentsClient: DocumentsClient;

  constructor() {
    this.compendiumClient = new CompendiumsClient();
    this.documentsClient = new DocumentsClient();
  }

  /**
   * Process character creation equipment selections and create Item documents
   * 
   * @param selections Equipment selections from character creation
   * @param classDocument Class document with equipment packages
   * @param backgroundDocument Background document with equipment packages
   * @param ownerId Character ObjectId who will own the items
   * @returns Organized equipment with Item ObjectIds
   */
  async processCharacterEquipment(
    selections: EquipmentSelections,
    classDocument: DndCharacterClassDocument,
    backgroundDocument: DndBackgroundDocument,
    ownerId: string
  ): Promise<CreatedEquipment> {
    const createdEquipment: CreatedEquipment = {
      weapons: [],
      accessories: [],
      carried: [],
      startingMoney: {
        platinum: 0,
        gold: 0,
        electrum: 0,
        silver: 0,
        copper: 0
      }
    };

    // Collect all compendium entry IDs to instantiate
    const itemsToCreate: { entryId: string; quantity: number }[] = [];

    // Process class equipment
    await this.collectClassEquipment(
      selections.classEquipment,
      classDocument,
      itemsToCreate,
      createdEquipment
    );

    // Process background equipment  
    await this.collectBackgroundEquipment(
      selections.backgroundEquipment,
      backgroundDocument,
      itemsToCreate,
      createdEquipment
    );

    // Create all Item documents from compendium entries
    const createdItemIds = await this.createItemsFromCompendiumEntries(
      itemsToCreate,
      ownerId
    );

    // Organize created items by type for character inventory
    await this.organizeItemsForInventory(createdItemIds, createdEquipment);

    return createdEquipment;
  }

  /**
   * Collect class equipment items to create
   */
  private async collectClassEquipment(
    selectionLabel: string,
    classDocument: DndCharacterClassDocument,
    itemsToCreate: { entryId: string; quantity: number }[],
    equipment: CreatedEquipment
  ): Promise<void> {
    const classData = classDocument.pluginData;
    
    if (!classData.startingEquipment) {
      console.warn('No starting equipment found in class document');
      return;
    }

    // Find the equipment option by label
    const selectedChoice = classData.startingEquipment.find(option => option.label === selectionLabel);
    
    if (!selectedChoice) {
      console.warn(`Invalid class equipment selection label: ${selectionLabel}`);
      return;
    }
    
    // Add any gold from the choice
    if (selectedChoice.gold) {
      equipment.startingMoney.gold += selectedChoice.gold;
    }

    // Process items in the choice
    if (selectedChoice.items) {
      // Cast to resolved type since references are resolved in character creation context
      const resolvedItems = selectedChoice.items as unknown as ResolvedClassEquipmentChoice['items'];
      await this.collectClassEquipmentItems(resolvedItems, itemsToCreate);
    }
  }

  /**
   * Collect background equipment items to create
   */
  private async collectBackgroundEquipment(
    selection: string,
    backgroundDocument: DndBackgroundDocument,
    itemsToCreate: { entryId: string; quantity: number }[],
    equipment: CreatedEquipment
  ): Promise<void> {
    const backgroundData = backgroundDocument.pluginData;
    
    if (selection === 'package') {
      // Use equipment package
      const equipmentPackage = backgroundData.equipment.equipmentPackage;
      
      // Add gold from package
      if (equipmentPackage.goldPieces) {
        equipment.startingMoney.gold += equipmentPackage.goldPieces;
      }

      // Process items in package  
      // Cast to resolved type since references are resolved in character creation context
      const resolvedItems = equipmentPackage.items as unknown as ResolvedBackgroundEquipmentPackage['items'];
      await this.collectBackgroundEquipmentItems(resolvedItems, itemsToCreate);
      
    } else if (selection === 'gold') {
      // Use gold alternative (always 50 GP for backgrounds)
      equipment.startingMoney.gold += backgroundData.equipment.goldAlternative;
    }
  }

  /**
   * Collect items from class equipment choice
   */
  private async collectClassEquipmentItems(
    items: ResolvedClassEquipmentChoice['items'],
    itemsToCreate: { entryId: string; quantity: number }[]
  ): Promise<void> {
    if (!items) return;

    for (const entry of items) {
      // entry.item is already the ObjectId string of the compendium entry
      itemsToCreate.push({
        entryId: entry.item,
        quantity: entry.quantity
      });
    }
  }

  /**
   * Collect items from background equipment package
   */
  private async collectBackgroundEquipmentItems(
    items: ResolvedBackgroundEquipmentPackage['items'],
    itemsToCreate: { entryId: string; quantity: number }[]
  ): Promise<void> {
    for (const entry of items) {
      // Check if item reference exists
      if (!entry.item) {
        console.error(`Background item "${entry.name}" is missing item reference - skipping`);
        continue;
      }

      // entry.item is already the ObjectId string of the compendium entry
      itemsToCreate.push({
        entryId: entry.item,
        quantity: entry.quantity
      });
    }
  }

  /**
   * Create Item documents from compendium entries
   */
  private async createItemsFromCompendiumEntries(
    itemsToCreate: { entryId: string; quantity: number }[],
    ownerId: string
  ): Promise<string[]> {
    const createdItemIds: string[] = [];

    for (const { entryId, quantity } of itemsToCreate) {
      try {
        // Get compendium entry
        const compendiumEntry = await this.compendiumClient.getCompendiumEntry(entryId);
        
        if (!compendiumEntry || !compendiumEntry.content) {
          console.warn(`Could not find compendium entry: ${entryId}`);
          continue;
        }

        // Create Item document using compendium entry content
        // Extract imageId from asset object if present
        const contentData = { ...compendiumEntry.content };
        if (contentData.imageId && typeof contentData.imageId === 'object' && '_id' in contentData.imageId) {
          contentData.imageId = contentData.imageId._id;
        }
        
        const itemDocument = await this.documentsClient.createDocument({
          ...contentData,
          // Override/add runtime properties
          ownerId, // Custom field for item ownership
          // Set initial item state
          itemState: {
            equipped: false, // Default to not equipped
            quantity: quantity || 1
          }
        });

        if (itemDocument && itemDocument.id) {
          createdItemIds.push(itemDocument.id);
        }
      } catch (error) {
        console.error(`Failed to create item from compendium entry ${entryId}:`, error);
      }
    }

    return createdItemIds;
  }

  /**
   * Organize created items for character inventory based on item type
   */
  private async organizeItemsForInventory(
    itemIds: string[],
    equipment: CreatedEquipment
  ): Promise<void> {
    for (const itemId of itemIds) {
      try {
        // Get the created item to determine its type
        const itemDocument = await this.documentsClient.getDocument(itemId);
        
        if (!itemDocument || !itemDocument.pluginData) {
          continue;
        }

        const itemType = (itemDocument.pluginData as unknown as { itemType?: string }).itemType;
        const itemName = itemDocument.name?.toLowerCase() || '';

        switch (itemType) {
          case 'weapon':
            // Add to weapons (default to main hand)
            equipment.weapons.push({
              item: itemId,
              slot: 'main_hand',
              masteryActive: false
            });
            break;

          case 'armor':
            // Add as equipped armor
            equipment.armor = itemId;
            break;

          case 'gear':
            // Check if it's a shield
            if (itemName.includes('shield')) {
              equipment.shield = itemId;
            } else {
              // Add to carried items
              equipment.carried.push(itemId);
            }
            break;

          case 'tool':
            // Add to carried items
            equipment.carried.push(itemId);
            break;

          default:
            // Default to carried
            equipment.carried.push(itemId);
            break;
        }
      } catch (error) {
        console.error(`Failed to organize item ${itemId}:`, error);
        // Default to carried if we can't determine type
        equipment.carried.push(itemId);
      }
    }
  }
}

/**
 * Factory function to create and process character equipment
 */
export async function processCharacterEquipment(
  selections: EquipmentSelections,
  classDocument: DndCharacterClassDocument,
  backgroundDocument: DndBackgroundDocument,
  ownerId: string
): Promise<CreatedEquipment> {
  const processor = new EquipmentProcessor();
  return processor.processCharacterEquipment(
    selections,
    classDocument,
    backgroundDocument,
    ownerId
  );
}