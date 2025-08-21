/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Type-safe item converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Fluff data support for enhanced descriptions and images
 * - Multi-file processing (items.json + items-base.json)
 */

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type ItemDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsItem } from '../../5etools-types/items.mjs';
import { etoolsItemSchema } from '../../5etools-types/items.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { 
  dndItemDataSchema, 
  type DndItemData,
  type DndWeaponData,
  type DndArmorData,
  type DndGearData,
  type DndToolData
} from '../../types/dnd/item.mjs';
import { expandWeaponProperty, damageTypeSchema, type DamageType } from '../../types/dnd/common.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { createReferenceObject } from '../../../../../shared/src/types/reference.mjs';


/**
 * Item fluff data interface
 */
interface EtoolsItemFluff {
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
 * Item fluff data file structure
 */
interface EtoolsItemFluffData {
  itemFluff?: EtoolsItemFluff[];
}

/**
 * Typed item converter using the new pipeline
 */
export class TypedItemConverter extends TypedConverter<
  typeof etoolsItemSchema,
  typeof dndItemDataSchema,
  ItemDocument
> {
  private fluffMap = new Map<string, EtoolsItemFluff>();
  private currentPluginData: DndItemData | null = null;
  private isProcessingItemGroup = false;

  protected getInputSchema() {
    return etoolsItemSchema;
  }

  protected getOutputSchema() {
    return dndItemDataSchema;
  }

  protected getDocumentType(): DocumentType {
    // Check if processing item group
    if (this.isProcessingItemGroup) {
      return 'vtt-document';
    }
    return 'item';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    // Check if processing item group
    if (this.isProcessingItemGroup) {
      return 'item-group';
    }
    
    // Dynamic determination based on current item being processed
    if (this.currentPluginData) {
      return this.mapItemTypeToPluginDocumentType(this.currentPluginData);
    }
    return 'weapon'; // Default fallback
  }

  protected extractDescription(input: z.infer<typeof etoolsItemSchema>): string {
    // Check for fluff description first, then fall back to item entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    if (input.entries) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    return `${input.name} - ${this.getItemTypeDescription(input.type || 'unknown')}`;
  }

  protected extractAssetPath(input: z.infer<typeof etoolsItemSchema>): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsItemSchema>): DndItemData {
    const itemType = this.determineItemType(input);
    
    switch (itemType) {
      case 'weapon':
        return this.transformToWeapon(input);
      case 'armor':
        return this.transformToArmor(input);
      case 'tool':
        return this.transformToTool(input);
      case 'gear':
      default:
        return this.transformToGear(input);
    }
  }

  /**
   * Override document creation to set proper pluginDocumentType
   */
  protected createDocument(
    input: z.infer<typeof etoolsItemSchema>,
    pluginData: DndItemData
  ) {
    // Store current plugin data so getPluginDocumentType() can access it
    this.currentPluginData = pluginData;
    
    const result = super.createDocument(input, pluginData);
    
    // Clear current plugin data after document creation
    this.currentPluginData = null;
    
    return result;
  }

  /**
   * Load item fluff data for enhanced descriptions and image assets
   */
  private async loadFluffData(): Promise<void> {
    try {
      const rawFluffData = await this.readEtoolsData('fluff-items.json');
      const fluffData = safeEtoolsCast<EtoolsItemFluffData>(rawFluffData, [], 'item fluff file');
      
      if (fluffData.itemFluff) {
        for (const fluff of fluffData.itemFluff) {
          this.fluffMap.set(fluff.name, fluff);
        }
        this.log(`Loaded fluff data for ${fluffData.itemFluff.length} items`);
      }
    } catch (error) {
      this.log('Failed to load item fluff data:', error);
    }
  }

  /**
   * Convert array of items from both magic and base item files
   */
  public async convertItems(): Promise<{
    success: boolean;
    results: ItemDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed item conversion...');
      
      // Load fluff data for enhanced descriptions and images
      await this.loadFluffData();
      
      const results: ItemDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Process both item files and item groups
      const itemFiles = [
        { filename: 'items.json', arrayKey: 'item' as const },
        { filename: 'items-base.json', arrayKey: 'baseitem' as const },
        { filename: 'items.json', arrayKey: 'itemGroup' as const }
      ];

      for (const fileInfo of itemFiles) {
        try {
          const rawData = await this.readEtoolsData(fileInfo.filename);
          
          // Handle different array keys for different files
          let items: EtoolsItem[] = [];
          if (fileInfo.arrayKey === 'baseitem' && typeof rawData === 'object' && rawData !== null && 'baseitem' in rawData) {
            items = (rawData as Record<string, unknown>).baseitem as EtoolsItem[];
          } else if (fileInfo.arrayKey === 'item' && typeof rawData === 'object' && rawData !== null && 'item' in rawData) {
            items = (rawData as Record<string, unknown>).item as EtoolsItem[];
          } else if (fileInfo.arrayKey === 'itemGroup' && typeof rawData === 'object' && rawData !== null && 'itemGroup' in rawData) {
            items = (rawData as Record<string, unknown>).itemGroup as EtoolsItem[];
          }

          if (items.length === 0) {
            this.log(`No items found in ${fileInfo.filename}`);
            continue;
          }

          const filteredItems = this.filterSrdContent(items);
          total += filteredItems.length;
          
          this.log(`Processing ${filteredItems.length} items from ${fileInfo.filename}`);

          for (const item of filteredItems) {
            let result;
            
            // Handle itemGroup entries as VTT documents
            if (fileInfo.arrayKey === 'itemGroup') {
              result = await this.convertItemGroup(item as any);
            } else {
              result = await this.convertItem(item);
            }
            
            if (result.success && result.document) {
              results.push(result.document);
              converted++;
              this.log(`✅ ${fileInfo.arrayKey === 'itemGroup' ? 'Item group' : 'Item'} ${item.name} converted successfully`);
            } else {
              errors.push(`Failed to convert ${fileInfo.arrayKey === 'itemGroup' ? 'item group' : 'item'} ${item.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
              this.log(`❌ ${fileInfo.arrayKey === 'itemGroup' ? 'Item group' : 'Item'} ${item.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
            }
          }
        } catch (fileError) {
          const errorMsg = `Failed to process ${fileInfo.filename}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.log(errorMsg);
        }
      }
      
      this.log(`Typed item conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Item conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
   * Convert itemGroup entry to VTT document
   */
  private async convertItemGroup(input: z.infer<typeof etoolsItemSchema>): Promise<{
    success: boolean;
    document?: ItemDocument;
    errors?: string[];
  }> {
    try {
      // Create VTT document manually for item group (not using typed converter pipeline)
      const document: ItemDocument = {
        id: `item-group-${this.generateSlug(input.name)}`,
        name: input.name,
        slug: this.generateSlug(input.name),
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'item-group',
        description: this.extractDescription(input),
        userData: {},
        itemState: {},
        state: {},
        pluginData: {
          name: input.name,
          description: this.extractDescription(input),
          type: input.type || 'other',
          source: input.source,
          page: input.page,
          items: this.convertItemsListToReferences(input.items || [])
        } as any
      };

      // Add asset path if available
      const assetPath = this.extractAssetPath(input);
      if (assetPath) {
        document.imageId = assetPath;
      }

      return {
        success: true,
        document
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown conversion error']
      };
    }
  }

  /**
   * Convert items list to reference objects
   */
  private convertItemsListToReferences(items: string[]): Array<{ _ref: { slug: string; documentType: 'actor' | 'item' | 'vtt-document'; source?: string; pluginType?: string } }> {
    return items.map(itemRef => {
      // Parse item reference format "Item Name|SOURCE"
      const [name, source] = itemRef.split('|');
      return {
        _ref: {
          slug: this.generateSlug(name.trim()),
          documentType: 'item',
          source: source ? source.trim() : undefined
        }
      };
    });
  }

  /**
   * Private helper methods for item-specific parsing
   */

  private determineItemType(input: z.infer<typeof etoolsItemSchema>): 'weapon' | 'armor' | 'tool' | 'gear' {
    // Check explicit boolean flags first
    if (input.weapon || input.firearm) return 'weapon';
    if (input.armor || input.shield) return 'armor';
    
    // Check type codes if available
    if (input.type) {
      // Extract base type (handle pipe-separated formats like "AT|XPHB")
      const baseType = input.type.split('|')[0];
      
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
    if (input.bonusWeapon || input.dmg1 || input.damage) return 'weapon';
    if (input.bonusAc || input.ac) return 'armor';
    if (input.wondrous || input.staff || input.wand || input.rod) return 'gear';
    
    // Default fallback
    return 'gear';
  }

  private transformToWeapon(input: z.infer<typeof etoolsItemSchema>): DndWeaponData {
    return {
      itemType: 'weapon',
      name: input.name,
      description: this.extractDescription(input),
      damage: this.parseWeaponDamage(input),
      category: this.parseWeaponCategory(input.weaponCategory),
      type: this.parseWeaponType(input),
      properties: this.parseWeaponProperties(input.property),
      mastery: this.parseWeaponMastery(input.mastery),
      versatileDamage: this.parseVersatileDamage(input),
      range: this.parseWeaponRange(input.range),
      weight: this.parseWeight(input.weight),
      cost: this.parseCost(input.value),
      magical: this.isMagicalItem(input),
      enchantmentBonus: this.parseEnchantmentBonus(input.bonus),
      rarity: this.parseRarity(input.rarity),
      attunement: this.parseAttunement(input.reqAttune),
      source: input.source,
      page: input.page
    };
  }

  private transformToArmor(input: z.infer<typeof etoolsItemSchema>): DndArmorData {
    return {
      itemType: 'armor',
      name: input.name,
      description: this.extractDescription(input),
      armorClass: this.parseArmorClass(input.ac),
      type: this.parseArmorType(input),
      maxDexBonus: this.parseMaxDexBonus(input),
      strengthRequirement: this.parseStrengthRequirement(input.strength),
      stealthDisadvantage: input.stealth === true, // Note: stealth true means disadvantage
      weight: this.parseWeight(input.weight),
      cost: this.parseCost(input.value),
      magical: this.isMagicalItem(input),
      enchantmentBonus: this.parseEnchantmentBonus(input.bonusAc),
      rarity: this.parseRarity(input.rarity),
      attunement: this.parseAttunement(input.reqAttune),
      source: input.source,
      page: input.page
    };
  }

  private transformToTool(input: z.infer<typeof etoolsItemSchema>): DndToolData {
    return {
      itemType: 'tool',
      name: input.name,
      description: this.extractDescription(input),
      category: this.parseToolCategory(input.type || 'T'),
      itemGroup: this.getItemGroupReference(input.type || 'T', input.source),
      weight: this.parseWeight(input.weight),
      cost: this.parseCost(input.value),
      magical: this.isMagicalItem(input),
      rarity: this.parseRarity(input.rarity),
      attunement: this.parseAttunement(input.reqAttune),
      source: input.source,
      page: input.page
    };
  }

  private transformToGear(input: z.infer<typeof etoolsItemSchema>): DndGearData {
    return {
      itemType: 'gear',
      name: input.name,
      description: this.extractDescription(input),
      category: this.parseGearCategory(input.type || 'G'),
      weight: this.parseWeight(input.weight),
      cost: this.parseCost(input.value),
      magical: this.isMagicalItem(input),
      rarity: this.parseRarity(input.rarity),
      attunement: this.parseAttunement(input.reqAttune),
      source: input.source,
      page: input.page
    };
  }

  // Parsing helper methods (simplified implementations)
  
  private parseWeaponDamage(input: z.infer<typeof etoolsItemSchema>) {
    const dmg = input.dmg1 || input.damage?.dmg1 || '1d4';
    const type = input.dmgType || input.damage?.dmgType || 'bludgeoning';
    return { dice: dmg, type: this.mapDamageType(type) };
  }

  private parseWeaponCategory(category?: string) {
    return category === 'martial' ? 'martial' : 'simple';
  }

  private parseWeaponType(input: z.infer<typeof etoolsItemSchema>) {
    if (input.type === 'M') return 'melee';
    if (input.type === 'R') return 'ranged';
    return 'melee';
  }

  private parseWeaponProperties(properties?: string[]) {
    if (!properties) return undefined;
    
    const validProperties = ['ammunition', 'finesse', 'heavy', 'light', 'loading', 'range', 'reach', 'special', 'thrown', 'two-handed', 'versatile'];
    return properties
      .map(prop => {
        try {
          // Use the global mapping to expand abbreviations like "F" -> "finesse"
          return expandWeaponProperty(prop);
        } catch {
          // Fallback for properties that might already be full names
          return prop.toLowerCase().replace(/\|.*/, ''); // Remove source suffixes
        }
      })
      .filter(prop => validProperties.includes(prop)) as any[];
  }

  private parseWeaponMastery(mastery?: string[]) {
    if (!mastery || mastery.length === 0) return undefined;
    return mastery[0].toLowerCase().replace(/\|.*/, '') as any; // Take first mastery, remove source
  }

  private parseVersatileDamage(input: z.infer<typeof etoolsItemSchema>) {
    const versatile = input.dmg2 || input.damage?.dmg2;
    if (!versatile) return undefined;
    
    const type = input.dmgType || input.damage?.dmgType || 'bludgeoning';
    return { dice: versatile, type: this.mapDamageType(type) };
  }

  private parseWeaponRange(range?: string | any) {
    if (!range) return undefined;
    if (typeof range === 'string') {
      const parts = range.split('/');
      return {
        normal: parseInt(parts[0]) || 5,
        long: parseInt(parts[1]) || parseInt(parts[0]) || 5
      };
    }
    if (typeof range === 'object') {
      return {
        normal: range.short || 5,
        long: range.long || range.short || 5
      };
    }
    return undefined;
  }

  private parseArmorClass(ac?: number | any): number {
    if (typeof ac === 'number') return ac;
    if (typeof ac === 'object' && ac.ac) return ac.ac;
    return 10;
  }

  private parseArmorType(input: z.infer<typeof etoolsItemSchema>) {
    if (input.shield) return 'shield';
    switch (input.type) {
      case 'LA': return 'light';
      case 'MA': return 'medium';  
      case 'HA': return 'heavy';
      case 'S': return 'shield';
      default: return 'light';
    }
  }

  private parseMaxDexBonus(_input: z.infer<typeof etoolsItemSchema>): number | undefined {
    // This would need more sophisticated parsing of AC modifiers
    return undefined;
  }

  private parseStrengthRequirement(strength?: string): number | undefined {
    if (!strength) return undefined;
    const match = strength.match(/(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }

  private parseToolCategory(type: string) {
    switch (type) {
      case 'AT': return 'artisan';
      case 'GS': return 'gaming-set';
      case 'INS': return 'musical-instrument';
      default: return 'other';
    }
  }

  private getItemGroupReference(type: string, source?: string) {
    // Extract base type (handle pipe-separated formats like "AT|XPHB")
    const baseType = type.split('|')[0];
    const itemSource = type.includes('|') ? type.split('|')[1] : source;
    
    switch (baseType) {
      case 'AT':
        return createReferenceObject(this.generateSlug("Artisan's Tools"), 'vtt-document', {
          pluginDocumentType: 'item-group',
          source: itemSource
        });
      case 'INS':
        return createReferenceObject(this.generateSlug('Musical Instrument'), 'vtt-document', {
          pluginDocumentType: 'item-group',
          source: itemSource
        });
      case 'GS':
        return createReferenceObject(this.generateSlug('Gaming Set'), 'vtt-document', {
          pluginDocumentType: 'item-group',
          source: itemSource
        });
      default:
        return undefined;
    }
  }

  private parseGearCategory(type: string) {
    switch (type) {
      case 'A': return 'ammunition';
      case 'P': return 'consumable';
      case '$': return 'treasure';
      default: return 'other';
    }
  }

  private parseWeight(weight?: number | string): number | undefined {
    if (typeof weight === 'number') return weight;
    if (typeof weight === 'string') {
      const match = weight.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : undefined;
    }
    return undefined;
  }

  private parseCost(value?: number | any) {
    if (typeof value === 'number') {
      return { amount: value, currency: 'gp' as const };
    }
    if (typeof value === 'object' && value.value) {
      return {
        amount: value.value,
        currency: (value.coin || 'gp') as any
      };
    }
    return undefined;
  }

  private isMagicalItem(input: z.infer<typeof etoolsItemSchema>): boolean {
    return input.rarity !== 'none' && input.rarity !== 'common' && 
           (!!input.bonus || !!input.bonusWeapon || !!input.bonusAc || 
            !!input.bonusSpellAttack || !!input.wondrous);
  }

  private parseEnchantmentBonus(bonus?: string): number | undefined {
    if (!bonus) return undefined;
    const match = bonus.match(/\+(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }

  private parseRarity(rarity: string) {
    const rarityMap: Record<string, any> = {
      'common': 'common',
      'uncommon': 'uncommon', 
      'rare': 'rare',
      'very rare': 'very rare', // Keep original format
      'legendary': 'legendary',
      'artifact': 'artifact'
    };
    return rarityMap[rarity] || undefined;
  }

  private parseAttunement(reqAttune?: boolean | string): boolean {
    return !!reqAttune;
  }

  private mapDamageType(dmgType: string): DamageType {
    const typeMap: Record<string, DamageType> = {
      'B': 'bludgeoning',
      'P': 'piercing', 
      'S': 'slashing',
      'A': 'acid',
      'C': 'cold',
      'F': 'fire',
      'O': 'force',
      'L': 'lightning',
      'N': 'necrotic',
      'I': 'poison',
      'Y': 'psychic',
      'R': 'radiant',
      'T': 'thunder'
    };
    const mapped = typeMap[dmgType];
    if (mapped) return mapped;
    
    // Validate the damage type is actually valid
    const validationType = damageTypeSchema.safeParse(dmgType.toLowerCase());
    return validationType.success ? validationType.data : 'bludgeoning';
  }

  private mapItemTypeToPluginDocumentType(pluginData: DndItemData): PluginDocumentType {
    switch (pluginData.itemType) {
      case 'weapon': 
        return 'weapon';
      case 'armor':
        // Check if it's a shield - shields need their own plugin document type
        if (pluginData.type === 'shield') {
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

  private getItemTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'M': 'Melee Weapon',
      'R': 'Ranged Weapon',
      'A': 'Ammunition', 
      'LA': 'Light Armor',
      'MA': 'Medium Armor',
      'S': 'Shield',
      'G': 'Adventuring Gear',
      'AT': 'Artisan Tools',
      'T': 'Tools',
      'WD': 'Wondrous Item',
      'P': 'Potion'
    };
    return descriptions[type] || 'Item';
  }
}