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

    const tools: Array<{ tool: ItemReferenceObject, displayName: string }> = [];

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
        const displayName = this.formatToolName(toolKey);
        const slug = generateSlug(toolKey);

        tools.push({
          tool: createReferenceObject(slug, 'item', {
            pluginDocumentType: 'tool',
            source: 'xphb'
          }),
          displayName
        });
      }
    }

    return tools.length > 0 ? tools : undefined;
  }

  /**
   * Format tool name to proper display format
   */
  private formatToolName(toolName: string): string {
    return toolName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

    // Generate the slug from the mapped item name
    const slug = generateSlug(itemName);

    // Create document reference
    return {
      _ref: {
        documentType: 'item' as const,
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