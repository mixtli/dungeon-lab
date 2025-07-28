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
import { TypedConverter, type ConversionOptions } from './typed-converter.mjs';
import { 
  spellDocumentValidator,
  type SpellDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsSpell, EtoolsSpellData } from '../../5etools-types/spells.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { dndSpellDataSchema, type DndSpellData } from '../../types/dnd/spell.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import type { Ability } from '../../types/dnd/common.mjs';

/**
 * Input schema for 5etools spell data
 */
const etoolsSpellSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  level: z.number(),
  school: z.string(),
  time: z.array(z.object({
    number: z.number(),
    unit: z.string()
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
      text: z.string()
    })]).optional()
  }),
  duration: z.array(z.object({
    type: z.string(),
    duration: z.object({
      type: z.string(),
      amount: z.number().optional()
    }).optional(),
    concentration: z.boolean().optional()
  })),
  entries: z.array(z.any()), // EtoolsEntry[] - using any for now to avoid circular imports
  entriesHigherLevel: z.array(z.any()).optional(),
  damageInflict: z.array(z.string()).optional(),
  savingThrow: z.array(z.string()).optional(),
  spellAttack: z.array(z.string()).optional(),
  classes: z.object({
    fromClassList: z.array(z.object({
      name: z.string(),
      source: z.string()
    }))
  }).optional(),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  otherSources: z.array(z.object({
    source: z.string(),
    page: z.number()
  })).optional(),
  reprintedAs: z.array(z.string()).optional()
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

  protected extractDescription(input: EtoolsSpell): string {
    // Check for fluff description first, then fall back to spell entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    return processEntries(input.entries, this.options.textProcessing).text;
  }

  protected extractAssetPath(input: EtoolsSpell): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: EtoolsSpell): DndSpellData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      level: input.level,
      school: this.parseSchool(input.school),
      classAvailability: this.parseClassAvailability(input.classes),
      castingTime: this.parseCastingTime(input.time),
      range: this.parseRange(input.range),
      components: this.parseComponents(input.components),
      duration: this.parseDuration(input.duration),
      ritual: this.parseRitual(input),
      concentration: this.parseConcentration(input.duration),
      scaling: this.parseScaling(input.entriesHigherLevel),
      damage: this.parseDamage(input),
      savingThrow: this.parseSavingThrow(input.savingThrow),
      attackRoll: this.parseAttackRoll(input.spellAttack),
      areaOfEffect: this.parseAreaOfEffect(input),
      source: input.source,
      page: input.page
    };
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
      } catch (error) {
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
      } catch (error) {
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

  private parseClassAvailability(classes: any): DndSpellData['classAvailability'] {
    if (!classes?.fromClassList) {
      return { classList: [] };
    }
    
    // Convert class names to standard format
    const classList = classes.fromClassList.map((cls: any) => {
      const name = cls.name.toLowerCase();
      // Map 5etools names to our enum values
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
    }).filter((cls: any): cls is NonNullable<typeof cls> => cls !== null);

    return { classList };
  }

  private parseCastingTime(time: any[]): string {
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

  private parseRange(range: any): string {
    if (!range) {
      return 'Self';
    }
    
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

  private parseComponents(components: any): DndSpellData['components'] {
    const materialInfo = this.parseMaterialComponent(components?.m);
    
    return {
      verbal: components?.v || false,
      somatic: components?.s || false,
      material: materialInfo.required,
      materialComponents: materialInfo.required && materialInfo.description ? {
        description: materialInfo.description,
        consumed: false,
        focusSubstitute: true
      } : undefined
    };
  }

  private parseMaterialComponent(material: any): { required: boolean; description?: string } {
    if (!material) {
      return { required: false };
    }
    
    if (typeof material === 'boolean') {
      return { required: material };
    }
    
    if (typeof material === 'string') {
      return { required: true, description: material };
    }
    
    if (typeof material === 'object' && material.text) {
      return { required: true, description: material.text };
    }
    
    return { required: false };
  }

  private parseDuration(duration: any[]): string {
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

  private formatDurationAmount(duration: any): string {
    if (!duration) {
      return '1 minute';
    }
    
    const amount = duration.amount || 1;
    const type = duration.type || 'minute';
    
    return amount === 1 ? `1 ${type}` : `${amount} ${type}s`;
  }

  private parseRitual(input: any): boolean {
    // Check if spell has ritual tag or can be cast as ritual
    return false; // Most spells are not rituals, would need specific logic
  }

  private parseConcentration(duration: any[]): boolean {
    if (!duration || duration.length === 0) {
      return false;
    }
    
    return duration[0]?.concentration || false;
  }

  private parseScaling(entriesHigherLevel: any[]): DndSpellData['scaling'] {
    if (!entriesHigherLevel || entriesHigherLevel.length === 0) {
      return undefined;
    }
    
    const description = processEntries(entriesHigherLevel, this.options.textProcessing).text;
    
    return {
      higherLevels: {
        description,
        scaling: [] // Would need more sophisticated parsing for specific scaling
      }
    };
  }

  private parseDamage(input: any): DndSpellData['damage'] {
    // This would need sophisticated parsing of the spell description
    // For now, return undefined - would need damage dice extraction logic
    return undefined;
  }

  private parseSavingThrow(savingThrow: string[]): DndSpellData['savingThrow'] {
    if (!savingThrow || savingThrow.length === 0) {
      return undefined;
    }
    
    // Convert abbreviations to full names
    const abilityMap: Record<string, Ability> = {
      'str': 'strength',
      'dex': 'dexterity', 
      'con': 'constitution',
      'int': 'intelligence',
      'wis': 'wisdom',
      'cha': 'charisma'
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

  private parseAttackRoll(spellAttack: string[]): DndSpellData['attackRoll'] {
    if (!spellAttack || spellAttack.length === 0) {
      return undefined;
    }
    
    // Most spell attacks are ranged
    return {
      type: 'ranged' as const
    };
  }

  private parseAreaOfEffect(input: any): DndSpellData['areaOfEffect'] {
    // This would need sophisticated parsing of spell description for AoE
    // For now, return undefined - would need AoE extraction logic
    return undefined;
  }
}