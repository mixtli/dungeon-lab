/**
 * Type-safe background converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Fluff data support for enhanced descriptions
 */

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type BackgroundDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import { etoolsItemSchema } from '../../5etools-types/items.mjs';
import type { 
  EtoolsBackground, 
  EtoolsBackgroundData, 
  EtoolsAbilityScoreImprovement,
  EtoolsBackgroundStartingEquipment
} from '../../5etools-types/backgrounds.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { dndBackgroundDataSchema, type DndBackgroundData } from '../../types/dnd/background.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import type { Ability, ItemReferenceObject } from '../../types/dnd/common.mjs';
import { generateSlug } from '../../types/utils.mjs';
import { createReferenceObject } from '../../../../../shared/src/types/reference.mjs';

/**
 * Input schema for 5etools background data
 */
const etoolsBackgroundSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  skillProficiencies: z.array(z.record(z.boolean())),
  languageProficiencies: z.array(z.unknown()).optional(),
  toolProficiencies: z.array(z.unknown()).optional(),
  startingEquipment: z.array(z.unknown()).optional(),
  entries: z.array(z.unknown()).optional(),
  feats: z.array(z.unknown()).optional(),
  ability: z.array(z.unknown()).optional(),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  reprintedAs: z.array(z.string()).optional()
}).passthrough(); // Allow additional properties

/**
 * Background fluff data interface
 */
interface EtoolsBackgroundFluff {
  name: string;
  source?: string;
  entries?: EtoolsEntry[];
  images?: Array<{
    type: string;
    href: {
      type: string;
      path: string;
    };
  }>;
}

/**
 * Background fluff data file structure
 */
interface EtoolsBackgroundFluffData {
  backgroundFluff?: EtoolsBackgroundFluff[];
}

/**
 * Typed background converter using the new pipeline
 */
export class TypedBackgroundConverter extends TypedConverter<
  typeof etoolsBackgroundSchema,
  typeof dndBackgroundDataSchema,
  BackgroundDocument
> {
  private fluffMap = new Map<string, EtoolsBackgroundFluff>();
  private itemMap = new Map<string, z.infer<typeof etoolsItemSchema>>();

  protected getInputSchema() {
    return etoolsBackgroundSchema;
  }

  protected getOutputSchema() {
    return dndBackgroundDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'background';
  }

  protected extractDescription(input: z.infer<typeof etoolsBackgroundSchema>): string {
    // Check for fluff description first, then fall back to background entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    if (input.entries) {
      return processEntries(input.entries as EtoolsEntry[], this.options.textProcessing).text;
    }
    return `Background: ${input.name}`;
  }

  protected extractAssetPath(input: z.infer<typeof etoolsBackgroundSchema>): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsBackgroundSchema>): DndBackgroundData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      abilityScores: this.parseAbilityScores(input.ability),
      originFeat: this.parseOriginFeat(input.feats),
      skillProficiencies: this.parseSkillProficiencies(input.skillProficiencies),
      toolProficiencies: this.parseToolProficiencies(input.toolProficiencies),
      equipment: this.parseEquipment(input.startingEquipment),
      source: input.source,
      page: input.page
    };
  }

  /**
   * Load background fluff data for enhanced descriptions and image assets
   */
  private async loadFluffData(): Promise<void> {
    try {
      const rawFluffData = await this.readEtoolsData('fluff-backgrounds.json');
      const fluffData = safeEtoolsCast<EtoolsBackgroundFluffData>(rawFluffData, [], 'background fluff file');
      
      if (fluffData.backgroundFluff) {
        for (const fluff of fluffData.backgroundFluff) {
          this.fluffMap.set(fluff.name, fluff);
        }
        this.log(`Loaded fluff data for ${fluffData.backgroundFluff.length} backgrounds`);
      }
    } catch (error) {
      this.log('Failed to load background fluff data:', error);
    }
  }

  /**
   * Load item data from 5etools sources for item type lookup
   */
  private async loadItemData(): Promise<void> {
    try {
      // Load base items and regular items
      const [baseItemsData, itemsData] = await Promise.all([
        this.readEtoolsData('items-base.json'),
        this.readEtoolsData('items.json')
      ]);
      
      let baseItemCount = 0;
      let regularItemCount = 0;
      
      // Process base items (uses 'baseitem' array key)
      if (baseItemsData && typeof baseItemsData === 'object' && 'baseitem' in baseItemsData && Array.isArray(baseItemsData.baseitem)) {
        for (const item of baseItemsData.baseitem) {
          if (item && typeof item === 'object' && 'name' in item && 'source' in item) {
            const key = `${String(item.name).toLowerCase()}|${String(item.source).toLowerCase()}`;
            this.itemMap.set(key, item as z.infer<typeof etoolsItemSchema>);
            baseItemCount++;
          }
        }
      }
      
      // Process regular items
      if (itemsData && typeof itemsData === 'object' && 'item' in itemsData && Array.isArray(itemsData.item)) {
        for (const item of itemsData.item) {
          if (item && typeof item === 'object' && 'name' in item && 'source' in item) {
            const key = `${String(item.name).toLowerCase()}|${String(item.source).toLowerCase()}`;
            this.itemMap.set(key, item as z.infer<typeof etoolsItemSchema>);
            regularItemCount++;
          }
        }
      }
      
      this.log(`Loaded ${baseItemCount + regularItemCount} items (${baseItemCount} base, ${regularItemCount} regular) for type determination`);
    } catch (error) {
      this.log('Failed to load item data for type determination:', error);
    }
  }

  /**
   * Convert array of backgrounds using the new pipeline
   */
  public async convertBackgrounds(): Promise<{
    success: boolean;
    results: BackgroundDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed background conversion...');
      
      // Load fluff data for enhanced descriptions and images
      await this.loadFluffData();
      
      // Load item data for equipment type determination
      await this.loadItemData();
      
      const results: BackgroundDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read background data using typed approach
      const rawData = await this.readEtoolsData('backgrounds.json');
      const backgroundData = safeEtoolsCast<EtoolsBackgroundData>(
        rawData, 
        ['background'], 
        'background data file backgrounds.json'
      );

      // Extract and filter backgrounds
      const backgrounds = extractEtoolsArray<EtoolsBackground>(
        backgroundData, 
        'background', 
        'background list in backgrounds.json'
      );
      const filteredBackgrounds = this.filterSrdContent(backgrounds);
      
      total = filteredBackgrounds.length;
      this.log(`Processing ${filteredBackgrounds.length} backgrounds`);

      for (const background of filteredBackgrounds) {
        const result = await this.convertItem(background);
        
        if (result.success && result.document) {
          results.push(result.document);
          converted++;
          this.log(`✅ Background ${background.name} converted successfully`);
        } else {
          errors.push(`Failed to convert background ${background.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
          this.log(`❌ Background ${background.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
        }
      }
      
      this.log(`Typed background conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Background conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  /**
   * Private helper methods for background-specific parsing
   */

  /**
   * Determine item type from 5etools item data (mirrors ItemConverter logic)
   */
  private determineItemType(item: z.infer<typeof etoolsItemSchema>): 'weapon' | 'armor' | 'tool' | 'gear' {
    // Check explicit boolean flags first
    if (item.weapon || item.firearm) return 'weapon';
    if (item.armor || item.shield) return 'armor';
    
    // Check type codes if available
    if (item.type) {
      // Extract base type (handle pipe-separated formats like "AT|XPHB")
      const baseType = item.type.split('|')[0];
      
      switch (baseType) {
        case 'M': case 'R': // Melee, Ranged
          return 'weapon';
        case 'LA': case 'MA': case 'HA': case 'S': // Light Armor, Medium Armor, Heavy Armor, Shield
          return 'armor';
        case 'AT': case 'T': case 'GS': case 'INS': // Artisan Tools, Tools, Gaming Sets, Instruments
          return 'tool';
        case 'G': case 'A': case 'P': case 'WD': case 'RD': case 'RG': // Gear, Ammunition, Potions, Wondrous, Rod, Ring
        default:
          return 'gear';
      }
    }
    
    // For items without type (magic items), check name patterns or other properties
    if (item.bonusWeapon || item.dmg1 || item.damage) return 'weapon';
    if (item.bonusAc || item.ac) return 'armor';
    if (item.wondrous || item.staff || item.wand || item.rod) return 'gear';
    
    // Default fallback
    return 'gear';
  }

  /**
   * Map item type to plugin document type
   */
  private mapItemTypeToPluginDocumentType(itemType: 'weapon' | 'armor' | 'tool' | 'gear', item: z.infer<typeof etoolsItemSchema>): string {
    switch (itemType) {
      case 'weapon': 
        return 'weapon';
      case 'armor':
        // Check if it's a shield - shields need their own plugin document type
        if (item.type === 'S' || item.shield) {
          return 'shield';
        }
        return 'armor';
      case 'tool': 
        return 'tool';
      case 'gear': 
      default: 
        return 'gear';
    }
  }

  private parseAbilityScores(ability: unknown): DndBackgroundData['abilityScores'] {
    if (!Array.isArray(ability) || ability.length === 0) {
      // Default fallback - should not happen with valid 2024 backgrounds
      return ['strength', 'dexterity', 'constitution'] as Ability[];
    }

    const abilityChoice = ability[0];
    if (!abilityChoice || typeof abilityChoice !== 'object' || !('choose' in abilityChoice)) {
      return ['strength', 'dexterity', 'constitution'] as Ability[];
    }

    const choose = (abilityChoice as EtoolsAbilityScoreImprovement).choose;
    if (!choose || typeof choose !== 'object' || !('weighted' in choose)) {
      return ['strength', 'dexterity', 'constitution'] as Ability[];
    }

    const weighted = choose.weighted;
    if (!weighted || typeof weighted !== 'object' || !('from' in weighted)) {
      return ['strength', 'dexterity', 'constitution'] as Ability[];
    }

    const fromArray = weighted.from;
    if (!Array.isArray(fromArray) || fromArray.length !== 3) {
      return ['strength', 'dexterity', 'constitution'] as Ability[];
    }

    // Map 5etools abbreviations to full ability names
    const abilityMap: Record<string, Ability> = {
      'str': 'strength',
      'dex': 'dexterity', 
      'con': 'constitution',
      'int': 'intelligence',
      'wis': 'wisdom',
      'cha': 'charisma'
    };

    const mappedAbilities: Ability[] = fromArray.map(abbrev => 
      abilityMap[abbrev] || 'strength'
    );

    return mappedAbilities;
  }

  private parseOriginFeat(feats: unknown): DndBackgroundData['originFeat'] {
    if (!Array.isArray(feats) || feats.length === 0) {
      return {
        name: 'Origin Feat',
        feat: undefined
      };
    }

    const featObject = feats[0];
    if (!featObject || typeof featObject !== 'object') {
      return {
        name: 'Origin Feat',
        feat: undefined
      };
    }

    // Get the first feat key which should be in format like "magic initiate; wizard|xphb"
    const featKeys = Object.keys(featObject);
    if (featKeys.length === 0) {
      return {
        name: 'Origin Feat',
        feat: undefined
      };
    }

    const featKey = featKeys[0];
    
    // Parse feat key: "magic initiate; wizard|xphb" or "alert|xphb"
    const [featPart, sourcePart] = featKey.split('|');
    const source = sourcePart || 'xphb';
    
    let featName: string;
    let featSlug: string;
    
    if (featPart.includes(';')) {
      // Handle "magic initiate; wizard" format
      const [baseFeat] = featPart.split(';').map(part => part.trim());
      featName = this.formatFeatName(baseFeat);
      featSlug = this.createFeatSlug(baseFeat);
    } else {
      // Handle simple feat name like "alert"
      featName = this.formatFeatName(featPart);
      featSlug = generateSlug(featPart);
    }

    return {
      name: featName,
      feat: createReferenceObject(featSlug, 'vtt-document', {
        pluginDocumentType: 'feat',
        source
      })
    };
  }

  /**
   * Format feat name to proper title case
   */
  private formatFeatName(featName: string): string {
    return featName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Create feat slug - always use base feat slug since 2024 D&D consolidated variants
   * (e.g., "Magic Initiate" replaces "Magic Initiate (Cleric)", "Magic Initiate (Wizard)", etc.)
   */
  private createFeatSlug(baseFeat: string): string {
    // Always return the base slug - feat variants are handled within the feat itself in 2024 D&D
    return generateSlug(baseFeat);
  }

  private parseSkillProficiencies(skillProficiencies: unknown[]): string[] {
    if (!skillProficiencies || skillProficiencies.length === 0) {
      return [];
    }
    
    // Extract skill names from the first proficiency object
    const firstProf = skillProficiencies[0];
    if (typeof firstProf === 'object' && firstProf !== null) {
      const profObj = firstProf as Record<string, unknown>;
      return Object.keys(profObj).filter(skill => profObj[skill] === true);
    }
    
    return [];
  }

  private parseToolProficiencies(toolProficiencies: unknown): DndBackgroundData['toolProficiencies'] {
    if (!Array.isArray(toolProficiencies) || toolProficiencies.length === 0) {
      return undefined;
    }

    const tools: Array<ItemReferenceObject> = [];

    for (const proficiencyObject of toolProficiencies) {
      if (!proficiencyObject || typeof proficiencyObject !== 'object') {
        continue;
      }

      // Extract tool names from the object keys
      const toolKeys = Object.keys(proficiencyObject).filter(key => 
        proficiencyObject[key] === true || typeof proficiencyObject[key] === 'number'
      );

      for (const toolKey of toolKeys) {
        // Skip complex choice structures for now - handle them later if needed
        if (toolKey === 'choose') {
          continue;
        }

        // Handle generic tool types (anyArtisansTool, anyGamingSet, etc.)
        if (toolKey.startsWith('any')) {
          // For generic tools, we don't create a _ref since they're not specific items
          // Instead, we'll return undefined for now to indicate this needs special handling
          continue;
        }

        // Handle specific tool names
        const slug = generateSlug(toolKey);

        tools.push(createReferenceObject(slug, 'item', {
          pluginDocumentType: 'tool',
          source: 'xphb'
        }));
      }
    }

    return tools.length > 0 ? tools : undefined;
  }


  private parseEquipment(startingEquipment: unknown): DndBackgroundData['equipment'] {
    // Handle the array structure from 5etools
    if (!Array.isArray(startingEquipment) || startingEquipment.length === 0) {
      return this.getDefaultEquipment();
    }

    const choice = startingEquipment[0]; // First choice object
    if (!choice || typeof choice !== 'object') {
      return this.getDefaultEquipment();
    }

    // Handle both "A"/"B" format and "_" (default) format
    const choiceObj = choice as EtoolsBackgroundStartingEquipment;
    const optionA = choiceObj.A || choiceObj._ || [];
    const optionB = choiceObj.B || [];

    return {
      equipmentPackage: {
        items: this.parseEquipmentItems(optionA),
        goldPieces: this.extractGoldFromItems(optionA)
      },
      goldAlternative: this.extractGoldFromItems(optionB),
      currency: 'gp'
    };
  }

  /**
   * Parse array of equipment items from 5etools format
   */
  private parseEquipmentItems(items: unknown[]): Array<{name: string; quantity: number; item?: ItemReferenceObject}> {
    if (!Array.isArray(items)) {
      return [];
    }

    const equipmentItems: Array<{name: string; quantity: number; item?: ItemReferenceObject}> = [];

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemObj = item as any;

      // Handle items with "item" field (e.g., {"item": "quarterstaff|xphb"})
      if (itemObj.item) {
        const itemName = this.extractItemName(itemObj.item);
        const quantity = itemObj.quantity || 1;
        const itemRef = this.createItemReference(itemObj.item);
        equipmentItems.push({
          name: itemName,
          quantity,
          item: itemRef
        });
      }
      // Handle items with "special" field (e.g., {"special": "quill"})
      else if (itemObj.special) {
        // Special items don't have references to actual item documents
        // They're typically custom/narrative items
        equipmentItems.push({
          name: itemObj.special,
          quantity: itemObj.quantity || 1,
          item: undefined
        });
      }
      // Handle direct string items (e.g., "common clothes|phb")
      else if (typeof item === 'string') {
        const itemName = this.extractItemName(item);
        const itemRef = this.createItemReference(item);
        equipmentItems.push({
          name: itemName,
          quantity: 1,
          item: itemRef
        });
      }
      // Skip items with "value" field as those represent gold pieces
    }

    return equipmentItems;
  }

  /**
   * Extract gold pieces from equipment items (values are in copper pieces)
   */
  private extractGoldFromItems(items: unknown[]): number {
    if (!Array.isArray(items)) {
      return 0;
    }

    let totalCopper = 0;

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemObj = item as any;
      if (itemObj.value && typeof itemObj.value === 'number') {
        totalCopper += itemObj.value;
      }
      // Handle containsValue for pouches/containers
      else if (itemObj.containsValue && typeof itemObj.containsValue === 'number') {
        totalCopper += itemObj.containsValue;
      }
    }

    // Convert copper pieces to gold pieces (100 cp = 1 gp)
    return Math.floor(totalCopper / 100);
  }

  /**
   * Extract clean item name from 5etools format (e.g., "quarterstaff|xphb" -> "Quarterstaff")
   */
  private extractItemName(itemRef: string): string {
    if (!itemRef || typeof itemRef !== 'string') {
      return 'Unknown Item';
    }

    // Remove source suffix (e.g., "quarterstaff|xphb" -> "quarterstaff")
    const baseName = itemRef.split('|')[0];
    
    // Convert to title case and handle special formatting
    return baseName
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/\bOf\b/g, 'of')
      .replace(/\bThe\b/g, 'the')
      .replace(/\bAnd\b/g, 'and');
  }

  /**
   * Create a document reference for an item from 5etools format
   */
  private createItemReference(itemRef: string): ItemReferenceObject | undefined {
    if (!itemRef || typeof itemRef !== 'string') {
      return undefined;
    }

    // Parse the item reference (e.g., "quarterstaff|xphb")
    const parts = itemRef.split('|');
    let itemName = parts[0];
    const source = parts[1] || 'phb'; // Default to PHB if no source specified

    // Handle item name mappings for 2024 D&D rule changes
    itemName = this.mapItemName(itemName);

    // Look up the actual item to determine its type
    let pluginDocumentType = 'gear'; // Default fallback
    
    // Try to find the item in our loaded item data
    const itemKey = `${itemName.toLowerCase()}|${source.toLowerCase()}`;
    const foundItem = this.itemMap.get(itemKey);
    
    if (foundItem) {
      // Use the actual item type from 5etools data
      const itemType = this.determineItemType(foundItem);
      pluginDocumentType = this.mapItemTypeToPluginDocumentType(itemType, foundItem);
    } else {
      // Try with original name if mapping didn't work
      const originalItemKey = `${parts[0].toLowerCase()}|${source.toLowerCase()}`;
      const originalFoundItem = this.itemMap.get(originalItemKey);
      
      if (originalFoundItem) {
        const itemType = this.determineItemType(originalFoundItem);
        pluginDocumentType = this.mapItemTypeToPluginDocumentType(itemType, originalFoundItem);
      }
    }

    // Generate the slug from the mapped item name
    const slug = generateSlug(itemName);

    // Create document reference
    return {
      _ref: {
        documentType: 'item' as const,
        pluginDocumentType,
        slug,
        source: source.toLowerCase()
      }
    };
  }

  /**
   * Map old item names to their 2024 D&D equivalents
   */
  private mapItemName(itemName: string): string {
    const itemMappings: Record<string, string> = {
      // Holy Symbol was replaced with specific variants in 2024 D&D
      'holy symbol': 'amulet', // Use amulet as default holy symbol
      'holy-symbol': 'amulet',
      'holysymbol': 'amulet',
      // Add other mappings as needed for different item name changes
    };

    const lowerName = itemName.toLowerCase();
    return itemMappings[lowerName] || itemName;
  }

  /**
   * Get default equipment structure when parsing fails
   */
  private getDefaultEquipment(): DndBackgroundData['equipment'] {
    return {
      equipmentPackage: {
        items: [],
        goldPieces: 0
      },
      goldAlternative: 50,
      currency: 'gp'
    };
  }
}