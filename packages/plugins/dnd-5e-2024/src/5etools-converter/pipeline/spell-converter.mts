/**
 * Type-safe spell converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Multi-file fluff data support (XPHB/PHB fallback)
 */

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type SpellDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { 
  processEntries, 
  extractDamageData, 
  extractScaledamageData,
  entriesToCleanText 
} from '../text/markup-processor.mjs';
import type { 
  EtoolsSpell, 
  EtoolsSpellData
} from '../../5etools-types/spells.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { dndSpellDataSchema, type DndSpellData } from '../../types/dnd/spell.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import type { Ability, DamageType } from '../../types/dnd/common.mjs';

/**
 * Simplified spell schema for type safety
 * Uses the existing EtoolsSpell interface
 */
const etoolsSpellSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  level: z.number(),
  school: z.string(),
  time: z.array(z.object({
    number: z.number(),
    unit: z.string(),
    condition: z.string().optional()
  })),
  range: z.object({
    type: z.string(),
    distance: z.object({
      type: z.string(),
      amount: z.number().optional()
    }).optional()
  }),
  components: z.object({
    v: z.boolean().optional(),
    s: z.boolean().optional(),
    m: z.union([z.boolean(), z.string(), z.object({
      text: z.string().optional(),
      cost: z.number().optional(),
      consume: z.boolean().optional()
    })]).optional(),
    r: z.boolean().optional()
  }),
  duration: z.array(z.object({
    type: z.string(),
    duration: z.object({
      type: z.string(),
      amount: z.number()
    }).optional(),
    concentration: z.boolean().optional(),
    ends: z.array(z.string()).optional()
  })),
  entries: z.array(z.unknown()), // Complex EtoolsEntry structure
  entriesHigherLevel: z.array(z.unknown()).optional(),
  classes: z.object({
    fromClassList: z.array(z.object({
      name: z.string(),
      source: z.string()
    })).optional(),
    fromClassListVariant: z.array(z.object({
      name: z.string(),
      source: z.string()
    })).optional(),
    fromSubclass: z.array(z.object({
      class: z.object({ name: z.string(), source: z.string() }),
      subclass: z.object({ name: z.string(), source: z.string() })
    })).optional()
  }).optional(),
  meta: z.object({
    ritual: z.boolean().optional(),
    concentration: z.boolean().optional()
  }).optional(),
  damageInflict: z.array(z.string()).optional(),
  conditionInflict: z.array(z.string()).optional(),
  savingThrow: z.array(z.string()).optional(),
  spellAttack: z.array(z.string()).optional(),
  scalingLevelDice: z.object({
    label: z.string().optional(),
    scaling: z.record(z.string())
  }).optional(),
  miscTags: z.array(z.string()).optional(),
  areaTags: z.array(z.string()).optional(),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  otherSources: z.array(z.object({
    source: z.string(),
    page: z.number()
  })).optional(),
  reprintedAs: z.array(z.string()).optional(),
  hasFluff: z.boolean().optional(),
  hasFluffImages: z.boolean().optional(),
  affectsCreatureType: z.array(z.string()).optional(),
  timelineTags: z.array(z.string()).optional()
}).passthrough(); // Allow additional properties

/**
 * Spell fluff data interface
 */
interface EtoolsSpellFluff {
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
 * Spell fluff data file structure
 */
interface EtoolsSpellFluffData {
  spellFluff?: EtoolsSpellFluff[];
}

// School mapping from 5etools to readable names
const SCHOOL_MAP: Record<string, string> = {
  'A': 'abjuration',
  'C': 'conjuration',
  'D': 'divination',
  'E': 'enchantment',
  'I': 'illusion',
  'N': 'necromancy',
  'T': 'transmutation',
  'V': 'evocation'
};

/**
 * Typed spell converter using the new pipeline
 */
export class TypedSpellConverter extends TypedConverter<
  typeof etoolsSpellSchema,
  typeof dndSpellDataSchema,
  SpellDocument
> {
  private fluffMap = new Map<string, EtoolsSpellFluff>();
  private spellClassLookup = new Map<string, { class?: Record<string, Record<string, boolean>> }>();

  protected getInputSchema() {
    return etoolsSpellSchema;
  }

  protected getOutputSchema() {
    return dndSpellDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'spell';
  }

  protected extractDescription(input: z.infer<typeof etoolsSpellSchema>): string {
    // Check for fluff description first, then fall back to spell entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries as EtoolsEntry[], this.options.textProcessing).text;
    }
    return processEntries(input.entries as EtoolsEntry[], this.options.textProcessing).text;
  }

  protected extractAssetPath(input: z.infer<typeof etoolsSpellSchema>): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected async transformData(input: z.infer<typeof etoolsSpellSchema>): Promise<DndSpellData> {
    const description = this.extractDescription(input);
    
    // Ensure lookup data is loaded for individual conversions
    if (this.spellClassLookup.size === 0) {
      await this.loadSpellClassLookup();
    }
    
    return {
      name: input.name,
      description,
      level: input.level,
      school: this.parseSchool(input.school),
      classAvailability: this.parseClassAvailability(input.classes, input.name),
      castingTime: this.parseCastingTime(input.time as { number: number; unit: string; condition?: string }[]),
      range: this.parseRange(input.range as { type: string; distance?: { type: string; amount?: number } }),
      components: this.parseComponents(input.components as { v?: boolean; s?: boolean; m?: boolean | string | object; r?: boolean }),
      duration: this.parseDuration(input.duration as { type: string; duration?: { type: string; amount: number }; concentration?: boolean }[]),
      ritual: this.parseRitual(input),
      concentration: this.parseConcentration(input.duration as { type: string; duration?: { type: string; amount: number }; concentration?: boolean }[]),
      scaling: this.parseScaling(input.entriesHigherLevel as unknown[]),
      damage: this.parseDamage(input),
      savingThrow: this.parseSavingThrow(input.savingThrow),
      attackRoll: this.parseAttackRoll(input.spellAttack),
      areaOfEffect: this.parseAreaOfEffect(input),
      source: input.source,
      page: input.page
    };
  }

  /**
   * Load spell-class lookup data from 5etools gendata file
   * This provides the actual spell-to-class mappings that are missing from spell files
   */
  private async loadSpellClassLookup(): Promise<void> {
    try {
      this.log('Loading spell-class lookup data...');
      
      const rawLookupData = await this.readEtoolsData('generated/gendata-spell-source-lookup.json');
      
      if (rawLookupData && typeof rawLookupData === 'object' && 'xphb' in rawLookupData) {
        const xphbData = rawLookupData.xphb as Record<string, unknown>;
        
        for (const [spellName, spellData] of Object.entries(xphbData)) {
          if (spellData && typeof spellData === 'object') {
            this.spellClassLookup.set(spellName.toLowerCase(), spellData);
          }
        }
        
        this.log(`Loaded spell-class mappings for ${this.spellClassLookup.size} spells`);
      } else {
        this.log('No XPHB spell-class lookup data found');
      }
    } catch (error) {
      this.log('Failed to load spell-class lookup data:', error);
    }
  }

  /**
   * Load spell fluff data for image assets and enhanced descriptions
   * Implements XPHB/PHB fallback mechanism
   */
  private async loadFluffData(): Promise<void> {
    try {
      // First read PHB fluff as fallback
      try {
        const rawPhbFluffData = await this.readEtoolsData('spells/fluff-spells-phb.json');
        const phbFluffData = safeEtoolsCast<EtoolsSpellFluffData>(rawPhbFluffData, [], 'PHB spell fluff file');
        if (phbFluffData.spellFluff) {
          for (const fluff of phbFluffData.spellFluff) {
            this.fluffMap.set(fluff.name, fluff);
          }
          this.log(`Loaded PHB fluff data for ${phbFluffData.spellFluff.length} spells`);
        }
      } catch {
        this.log('No PHB spell fluff data found');
      }
      
      // Then read XPHB fluff (overwrites PHB for duplicates)
      try {
        const rawXphbFluffData = await this.readEtoolsData('spells/fluff-spells-xphb.json');
        const xphbFluffData = safeEtoolsCast<EtoolsSpellFluffData>(rawXphbFluffData, [], 'XPHB spell fluff file');
        if (xphbFluffData.spellFluff) {
          for (const fluff of xphbFluffData.spellFluff) {
            this.fluffMap.set(fluff.name, fluff);
          }
          this.log(`Loaded XPHB fluff data for ${xphbFluffData.spellFluff.length} spells (overrides PHB where applicable)`);
        }
      } catch {
        this.log('No XPHB spell fluff data found');
      }
      
      this.log(`Total fluff data loaded for ${this.fluffMap.size} spells`);
    } catch (error) {
      this.log('Failed to load spell fluff data:', error);
    }
  }

  /**
   * Convert array of spells using the new pipeline
   */
  public async convertSpells(): Promise<{
    success: boolean;
    results: SpellDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed spell conversion...');
      
      // Load spell-class lookup data
      await this.loadSpellClassLookup();
      
      // Load fluff data for images and enhanced descriptions
      await this.loadFluffData();
      
      const results: SpellDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read spell data using typed approach
      const rawData = await this.readEtoolsData('spells/spells-xphb.json');
      const spellData = safeEtoolsCast<EtoolsSpellData>(
        rawData, 
        ['spell'], 
        'spell data file spells-xphb.json'
      );

      // Extract and filter spells
      const spells = extractEtoolsArray<EtoolsSpell>(
        spellData, 
        'spell', 
        'spell list in spells-xphb.json'
      );
      const filteredSpells = this.filterSrdContent(spells);
      
      total = filteredSpells.length;
      this.log(`Processing ${filteredSpells.length} spells`);

      for (const spell of filteredSpells) {
        const result = await this.convertItem(spell);
        
        if (result.success && result.document) {
          results.push(result.document);
          converted++;
          this.log(`✅ Spell ${spell.name} converted successfully`);
        } else {
          errors.push(`Failed to convert spell ${spell.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
          this.log(`❌ Spell ${spell.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
        }
      }
      
      this.log(`Typed spell conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Spell conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
   * Private helper methods for spell-specific parsing
   */

  private parseSchool(school: string): DndSpellData['school'] {
    return SCHOOL_MAP[school] as DndSpellData['school'] || 'abjuration';
  }

  private parseClassAvailability(classes?: z.infer<typeof etoolsSpellSchema>['classes'], spellName?: string): DndSpellData['classAvailability'] {
    // First try to use the lookup data (preferred method)
    if (spellName) {
      const lookupData = this.spellClassLookup.get(spellName.toLowerCase());
      
      if (lookupData && lookupData.class && lookupData.class.XPHB) {
        const classList = Object.keys(lookupData.class.XPHB)
          .map((className) => this.mapClassNameToEnum(className))
          .filter((cls): cls is NonNullable<typeof cls> => cls !== null);
        
        return { classList };
      }
    }
    
    // Fallback to original method if no lookup data found
    if (!classes?.fromClassList) {
      return { classList: [] };
    }
    
    // Convert class names to standard format
    const classList = classes.fromClassList.map((cls) => {
      return this.mapClassNameToEnum(cls.name);
    }).filter((cls): cls is NonNullable<typeof cls> => cls !== null);

    return { classList };
  }

  /**
   * Map 5etools class names to our D&D 5e 2024 enum values
   */
  private mapClassNameToEnum(className: string): 'artificer' | 'bard' | 'cleric' | 'druid' | 'paladin' | 'ranger' | 'sorcerer' | 'warlock' | 'wizard' | null {
    const name = className.toLowerCase();
    switch (name) {
      case 'artificer': return 'artificer';
      case 'bard': return 'bard';
      case 'cleric': return 'cleric';
      case 'druid': return 'druid';
      case 'paladin': return 'paladin';
      case 'ranger': return 'ranger';
      case 'sorcerer': return 'sorcerer';
      case 'warlock': return 'warlock';
      case 'wizard': return 'wizard';
      default: 
        this.log(`Unknown class name: ${name}, skipping`);
        return null;
    }
  }

  private parseCastingTime(time: { number: number; unit: string; condition?: string }[]): string {
    if (!time || time.length === 0) {
      return 'Action';
    }
    
    const castingTime = time[0];
    const number = castingTime.number || 1;
    const unit = castingTime.unit || 'action';
    
    if (number === 1) {
      return unit.charAt(0).toUpperCase() + unit.slice(1);
    }
    
    return `${number} ${unit}s`;
  }

  private parseRange(range: { type: string; distance?: { type: string; amount?: number } }): string {
    if (range.type === 'point') {
      if (range.distance?.type === 'self') {
        return 'Self';
      } else if (range.distance?.type === 'touch') {
        return 'Touch';
      } else if (range.distance?.amount) {
        return `${range.distance.amount} feet`;
      }
    }
    
    return 'Self';
  }

  private parseComponents(components: { v?: boolean; s?: boolean; m?: boolean | string | object; r?: boolean }): DndSpellData['components'] {
    const materialInfo = this.parseMaterialComponent(components.m);
    
    return {
      verbal: components.v || false,
      somatic: components.s || false,
      material: materialInfo.required,
      materialComponents: materialInfo.required && materialInfo.description ? {
        description: materialInfo.description,
        consumed: false,
        focusSubstitute: true
      } : undefined
    };
  }

  private parseMaterialComponent(material: unknown): { required: boolean; description?: string } {
    if (!material) {
      return { required: false };
    }
    
    if (typeof material === 'boolean') {
      return { required: material };
    }
    
    if (typeof material === 'string') {
      return { required: true, description: material };
    }
    
    if (typeof material === 'object' && material && 'text' in material) {
      const materialObj = material as { text: string };
      return { required: true, description: materialObj.text };
    }
    
    return { required: false };
  }

  private parseDuration(duration: { type: string; duration?: { type: string; amount: number }; concentration?: boolean }[]): string {
    if (!duration || duration.length === 0) {
      return 'Instantaneous';
    }
    
    const dur = duration[0];
    
    if (dur.type === 'instant') {
      return 'Instantaneous';
    }
    
    if (dur.concentration) {
      const baseTime = dur.duration ? this.formatDurationAmount(dur.duration) : '1 minute';
      return `Concentration, up to ${baseTime}`;
    }
    
    if (dur.duration) {
      return this.formatDurationAmount(dur.duration);
    }
    
    return 'Instantaneous';
  }

  private formatDurationAmount(duration: { type: string; amount: number }): string {
    const amount = duration.amount || 1;
    const type = duration.type || 'minute';
    
    return amount === 1 ? `1 ${type}` : `${amount} ${type}s`;
  }

  private parseRitual(_input: z.infer<typeof etoolsSpellSchema>): boolean {
    // Check if spell has ritual tag or can be cast as ritual
    return false; // Most spells are not rituals, would need specific logic
  }

  private parseConcentration(duration: { type: string; duration?: { type: string; amount: number }; concentration?: boolean }[]): boolean {
    if (!duration || duration.length === 0) {
      return false;
    }
    
    return duration[0].concentration || false;
  }

  private parseScaling(entriesHigherLevel?: unknown[]): DndSpellData['scaling'] {
    if (!entriesHigherLevel || entriesHigherLevel.length === 0) {
      return undefined;
    }
    
    const description = processEntries(entriesHigherLevel as EtoolsEntry[], this.options.textProcessing).text;
    
    // Extract @scaledamage data from the raw entries text
    const rawEntriesText = entriesToCleanText(entriesHigherLevel as EtoolsEntry[]);
    const scaledamageData = extractScaledamageData(rawEntriesText);
    
    const scaling = [];
    
    // Process each @scaledamage tag found
    for (const scalingData of scaledamageData) {
      scaling.push({
        type: 'damage' as const,
        increment: scalingData.increment,
        interval: 1, // Default to per level
        damageScaling: {
          baseDamage: scalingData.baseDamage,
          levelRange: scalingData.levelRange,
          increment: scalingData.increment
        }
      });
    }
    
    return {
      higherLevels: {
        description,
        scaling
      }
    };
  }

  private parseDamage(input: z.infer<typeof etoolsSpellSchema>): DndSpellData['damage'] {
    if (!input.entries) {
      return undefined;
    }

    // Convert entries to text and extract damage data
    const entriesText = entriesToCleanText(input.entries as EtoolsEntry[]);
    const damageValues = extractDamageData(entriesText);

    if (damageValues.length === 0) {
      return undefined;
    }

    // Use the first damage value found
    const damageDice = damageValues[0];

    // Try to extract damage type from the surrounding text
    // Look for common damage types in the entries text
    const damageTypes = [
      'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 
      'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
    ];

    let damageType = 'force'; // Default fallback
    for (const type of damageTypes) {
      // Case-insensitive search for damage type near the damage value
      const regex = new RegExp(`${damageDice}[^.]*?${type}|${type}[^.]*?${damageDice}`, 'i');
      if (regex.test(entriesText)) {
        damageType = type;
        break;
      }
    }

    // Also check the damageInflict array if available
    if (input.damageInflict && input.damageInflict.length > 0) {
      // Use the first damage type from damageInflict
      damageType = input.damageInflict[0].toLowerCase();
    }

    return {
      dice: damageDice,
      type: damageType as DamageType
    };
  }

  private parseSavingThrow(savingThrow?: string[]): DndSpellData['savingThrow'] {
    if (!savingThrow || savingThrow.length === 0) {
      return undefined;
    }
    
    // Convert abbreviations to full names
    const abilityMap: Record<string, Ability> = {
      'str': 'strength',
      'dex': 'dexterity', 
      'dexterity': 'dexterity',
      'con': 'constitution',
      'constitution': 'constitution',
      'int': 'intelligence',
      'intelligence': 'intelligence',
      'wis': 'wisdom',
      'wisdom': 'wisdom',
      'cha': 'charisma',
      'charisma': 'charisma'
    };
    
    const ability = abilityMap[savingThrow[0].toLowerCase()];
    if (!ability) {
      return undefined;
    }
    
    return {
      ability,
      effectOnSave: 'half' as const // Default, would need more parsing
    };
  }

  private parseAttackRoll(spellAttack?: string[]): DndSpellData['attackRoll'] {
    if (!spellAttack || spellAttack.length === 0) {
      return undefined;
    }
    
    // Most spell attacks are ranged
    return {
      type: 'ranged' as const
    };
  }

  private parseAreaOfEffect(_input: z.infer<typeof etoolsSpellSchema>): DndSpellData['areaOfEffect'] {
    // This would need sophisticated parsing of spell description for AoE
    // For now, return undefined - would need AoE extraction logic
    return undefined;
  }
}