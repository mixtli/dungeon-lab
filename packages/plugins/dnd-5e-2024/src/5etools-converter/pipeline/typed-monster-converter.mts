/**
 * Type-safe monster converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Fluff data support for enhanced descriptions and images
 * - Multi-file processing (bestiary files + fluff files)
 */

import { z } from 'zod';
import { TypedConverter } from './typed-converter.mjs';
import { 
  type CreatureDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsMonsterData } from '../../5etools-types/monsters.mjs';
import { etoolsMonsterSchema } from '../../5etools-types/monsters.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { 
  dndCreatureDataSchema, 
  type DndCreatureData
} from '../../types/dnd/creature.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { damageTypeSchema, type DamageType, type SpellReferenceObject } from '../../types/dnd/common.mjs';

/**
 * Monster fluff data interface
 */
interface EtoolsMonsterFluff {
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
  _copy?: {
    _mod?: {
      images?: {
        items?: Array<{
          href: {
            path: string;
          };
        }>;
      };
    };
  };
}

/**
 * Monster fluff data file structure
 */
interface EtoolsMonsterFluffData {
  monsterFluff?: EtoolsMonsterFluff[];
}

/**
 * Typed monster converter using the new pipeline
 */
export class TypedMonsterConverter extends TypedConverter<
  typeof etoolsMonsterSchema,
  typeof dndCreatureDataSchema,
  CreatureDocument
> {
  private fluffMap = new Map<string, EtoolsMonsterFluff>();

  protected getInputSchema() {
    return etoolsMonsterSchema;
  }

  protected getOutputSchema() {
    return dndCreatureDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'actor';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'creature';
  }

  protected extractDescription(input: z.infer<typeof etoolsMonsterSchema>): string {
    // Check for fluff description first, then fall back to basic info
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    
    // Generate basic description from monster data
    const size = this.mapSize(input.size);
    const type = this.mapType(input.type);
    const alignment = this.parseAlignment(input.alignment);
    
    return `${size} ${type}, ${alignment}`;
  }

  protected extractAssetPath(input: z.infer<typeof etoolsMonsterSchema>): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    // Check for copy modification images
    if (fluff?._copy?._mod?.images?.items?.[0]?.href?.path) {
      return fluff._copy._mod.images.items[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsMonsterSchema>): DndCreatureData {
    return {
      // Basic creature identity
      name: input.name,
      description: this.extractDescription(input),
      size: this.mapSize(input.size),
      type: this.mapType(input.type),
      // subtype: typeof input.type === 'object' && input.type?.tags ? input.type.tags.join(', ') : undefined, // TODO: Add subtype to schema
      alignment: this.parseAlignment(input.alignment),
      
      // Core stats
      armorClass: this.parseArmorClass(input.ac),
      hitPoints: this.parseHitPoints(input.hp),
      speed: this.parseSpeed(input.speed),
      
      // Ability scores
      abilities: {
        strength: input.str,
        dexterity: input.dex,
        constitution: input.con,
        intelligence: input.int,
        wisdom: input.wis,
        charisma: input.cha
      },
      
      // Proficiencies and bonuses
      savingThrows: this.parseSavingThrows(input.save),
      skills: this.parseSkills(input.skill),
      damageVulnerabilities: this.parseDamageArray(input.vulnerable),
      damageResistances: this.parseDamageArray(input.resist),
      damageImmunities: this.parseDamageArray(input.immune),
      conditionImmunities: this.parseConditionImmunities(input.conditionImmune),
      
      // Senses and languages  
      senses: this.parseSenses(input.senses, input.passive),
      languages: this.parseLanguages(input.languages),
      challengeRating: this.parseChallengeRating(input.cr),
      proficiencyBonus: this.calculateProficiencyBonus(input.cr),
      
      // Features and actions
      traits: this.parseTraits(input.trait),
      actions: this.parseActions(input.action),
      bonusActions: this.parseActions(input.bonus),
      reactions: this.parseActions(input.reaction),
      legendaryActions: this.parseLegendaryActions(input.legendary),
      // mythicActions: this.parseActions(input.mythic), // TODO: Add mythicActions to schema
      
      // Spellcasting (if present)
      spellcasting: this.parseSpellcasting(input.spellcasting),
      
      // Environment and tags
      environment: input.environment,
      tags: this.generateTags(input),
      
      // Source information
      source: input.source,
      page: input.page
    };
  }

  /**
   * Load monster fluff data for enhanced descriptions and image assets
   */
  private async loadFluffData(): Promise<void> {
    const fluffFiles = [
      'bestiary/fluff-bestiary-xphb.json',
      'bestiary/fluff-bestiary-xmm.json'
    ];

    for (const fluffFile of fluffFiles) {
      try {
        const rawFluffData = await this.readEtoolsData(fluffFile);
        const fluffData = safeEtoolsCast<EtoolsMonsterFluffData>(rawFluffData, [], `monster fluff file ${fluffFile}`);
        
        if (fluffData.monsterFluff) {
          for (const fluff of fluffData.monsterFluff) {
            this.fluffMap.set(fluff.name, fluff);
          }
          this.log(`Loaded fluff data for ${fluffData.monsterFluff.length} monsters from ${fluffFile}`);
        }
      } catch (error) {
        this.log(`Failed to load monster fluff data from ${fluffFile}:`, error);
      }
    }
  }

  /**
   * Convert array of monsters from multiple bestiary files
   */
  public async convertMonsters(): Promise<{
    success: boolean;
    results: CreatureDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed monster conversion...');
      
      // Load fluff data for enhanced descriptions and images
      await this.loadFluffData();
      
      const results: CreatureDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Process both bestiary files
      const bestiaryFiles = [
        'bestiary/bestiary-xphb.json',
        'bestiary/bestiary-xmm.json'
      ];

      for (const filename of bestiaryFiles) {
        try {
          const rawData = await this.readEtoolsData(filename);
          const monsterData = safeEtoolsCast<EtoolsMonsterData>(rawData, ['monster'], `monster data file ${filename}`);
          
          if (!monsterData.monster?.length) {
            this.log(`No monsters found in ${filename}`);
            continue;
          }

          const filteredMonsters = this.filterSrdContent(monsterData.monster);
          total += filteredMonsters.length;
          
          this.log(`Processing ${filteredMonsters.length} monsters from ${filename}`);

          for (const monster of filteredMonsters) {
            const result = await this.convertItem(monster);
            
            if (result.success && result.document) {
              results.push(result.document);
              converted++;
              this.log(`✅ Monster ${monster.name} converted successfully`);
            } else {
              errors.push(`Failed to convert monster ${monster.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
              this.log(`❌ Monster ${monster.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
            }
          }
        } catch (fileError) {
          const errorMsg = `Failed to process ${filename}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.log(errorMsg);
        }
      }
      
      this.log(`Typed monster conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Monster conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  // Helper methods for parsing monster data

  private mapSize(size: string | string[]): 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan' {
    const sizeMap: Record<string, 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'> = {
      'T': 'tiny',
      'S': 'small', 
      'M': 'medium',
      'L': 'large',
      'H': 'huge',
      'G': 'gargantuan'
    };
    
    // Handle array of sizes (take the first one)
    if (Array.isArray(size) && size.length > 0) {
      return sizeMap[size[0]] || 'medium';
    }
    
    // Handle single size string
    if (typeof size === 'string') {
      return sizeMap[size] || 'medium';
    }
    
    return 'medium';
  }

  private mapType(type: string | { type: string; tags?: string[] }): string {
    if (typeof type === 'string') {
      return type;
    }
    if (typeof type === 'object' && type.type) {
      return type.type;
    }
    return 'humanoid';
  }

  private parseAlignment(alignment?: string | string[] | { alignment?: string[] }): string {
    if (!alignment) return 'neutral';
    
    if (Array.isArray(alignment)) {
      if (alignment.length === 0) return 'neutral';
      return alignment.map(a => typeof a === 'string' ? a : 'neutral').join(' or ');
    }
    
    if (typeof alignment === 'object' && alignment !== null) {
      if ('alignment' in alignment && Array.isArray(alignment.alignment)) {
        if (alignment.alignment.length === 0) return 'neutral';
        return alignment.alignment.join(' or ');
      }
      return 'neutral';
    }
    
    if (typeof alignment === 'string') {
      return alignment;
    }
    
    return 'neutral';
  }

  private parseArmorClass(ac: number | number[] | { ac: number; from?: string[] }[]): { value: number; source?: string } {
    if (typeof ac === 'number') {
      return { value: ac };
    }
    if (Array.isArray(ac) && ac.length > 0) {
      const first = ac[0];
      if (typeof first === 'number') {
        return { value: first };
      }
      if (typeof first === 'object' && first?.ac) {
        return {
          value: first.ac,
          source: first.from ? first.from.join(', ') : undefined
        };
      }
    }
    return { value: 10 };
  }

  private parseHitPoints(hp?: { average?: number; formula?: string; special?: string } | number): { average: number; formula?: string } {
    if (typeof hp === 'number') {
      return { average: hp };
    }
    if (typeof hp === 'object') {
      return {
        average: hp.average || 1,
        formula: hp.formula
      };
    }
    return { average: 1 };
  }

  private parseSpeed(speed?: number | Record<string, number | boolean | { number: number; condition?: string }>): Record<string, number> {
    const result: Record<string, number> = {};
    
    if (!speed) {
      return { walk: 30 }; // Default speed if not specified
    }
    
    if (typeof speed === 'number') {
      result.walk = speed;
      return result;
    }
    
    if (typeof speed === 'object' && speed !== null) {
      Object.entries(speed).forEach(([key, value]) => {
        if (typeof value === 'number') {
          result[key] = value;
        } else if (typeof value === 'boolean') {
          // Skip boolean values like hover: true
          return;
        } else if (typeof value === 'object' && value !== null && 'number' in value) {
          // Handle complex speed objects like { number: 40, condition: "hover" }
          const speedObj = value as { number: number };
          if (typeof speedObj.number === 'number') {
            result[key] = speedObj.number;
          }
        }
      });
    }
    
    return Object.keys(result).length > 0 ? result : { walk: 30 };
  }

  private parseSavingThrows(saves?: Record<string, string>): Record<string, number> | undefined {
    if (!saves) return undefined;
    
    const result: Record<string, number> = {};
    Object.entries(saves).forEach(([ability, modifier]) => {
      if (typeof modifier === 'string') {
        const num = parseInt(modifier.replace(/[^-\d]/g, ''));
        if (!isNaN(num)) {
          result[ability] = num;
        }
      }
    });
    
    return Object.keys(result).length > 0 ? result : undefined;
  }

  private parseSkills(skills?: Record<string, string>): Record<string, number> | undefined {
    if (!skills) return undefined;
    
    const result: Record<string, number> = {};
    Object.entries(skills).forEach(([skill, modifier]) => {
      if (typeof modifier === 'string') {
        const num = parseInt(modifier.replace(/[^-\d]/g, ''));
        if (!isNaN(num)) {
          result[skill] = num;
        }
      }
    });
    
    return Object.keys(result).length > 0 ? result : undefined;
  }

  private parseDamageArray(damages: unknown): DamageType[] | undefined {
    if (!damages) return undefined;
    
    const result: DamageType[] = [];
    
    if (Array.isArray(damages)) {
      damages.forEach(damage => {
        if (typeof damage === 'string') {
          // Validate that the damage type is valid
          const validationType = damageTypeSchema.safeParse(damage);
          if (validationType.success) {
            result.push(validationType.data);
          } else {
            this.log(`Unknown damage type: ${damage}`);
          }
        } else if (typeof damage === 'object' && damage && 'resist' in damage) {
          const resistObj = damage as { resist: string[] };
          resistObj.resist.forEach(resist => {
            const validationType = damageTypeSchema.safeParse(resist);
            if (validationType.success) {
              result.push(validationType.data);
            } else {
              this.log(`Unknown damage type: ${resist}`);
            }
          });
        }
      });
    }
    
    return result.length > 0 ? result : undefined;
  }

  private parseConditionImmunities(conditions?: string[]): string[] | undefined {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) return undefined;
    
    return conditions.map(c => typeof c === 'string' ? c : '').filter(Boolean);
  }

  private parseSenses(senses?: string[] | { darkvision?: number; blindsight?: number; tremorsense?: number; truesight?: number; passive?: number }, passive?: number): { passivePerception: number; [key: string]: number } {
    const result: { passivePerception: number; [key: string]: number } = {
      passivePerception: passive || 10 // Default passive perception
    };
    
    if (!senses) {
      return result;
    }
    
    if (Array.isArray(senses)) {
      senses.forEach(sense => {
        if (typeof sense === 'string') {
          // Parse strings like "darkvision 60 ft."
          const match = sense.match(/(\w+)\s+(\d+)/);
          if (match) {
            result[match[1]] = parseInt(match[2]);
          }
          // Also check for passive perception in the string
          const passiveMatch = sense.match(/passive\s+perception\s+(\d+)/i);
          if (passiveMatch) {
            result.passivePerception = parseInt(passiveMatch[1]);
          }
        }
      });
    } else if (typeof senses === 'object') {
      // Handle senses as object
      Object.entries(senses).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (key === 'passive') {
            result.passivePerception = value;
          } else {
            result[key] = value;
          }
        }
      });
    }
    
    return result;
  }

  private parseLanguages(languages?: string[]): string[] | undefined {
    if (!languages) return undefined;
    
    if (Array.isArray(languages)) {
      if (languages.length === 0) return undefined;
      return languages.map(lang => typeof lang === 'string' ? lang : '').filter(Boolean);
    }
    
    if (typeof languages === 'string') {
      return [languages];
    }
    
    return undefined;
  }

  private parseChallengeRating(cr: string | number | { cr?: string | number; value?: string | number }): number {
    if (typeof cr === 'number') return cr;
    
    if (typeof cr === 'string') {
      // Handle fractional CRs like "1/2", "1/4"
      if (cr.includes('/')) {
        const [num, denom] = cr.split('/').map(Number);
        if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
          return num / denom;
        }
      }
      const parsed = parseFloat(cr);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    if (typeof cr === 'object' && cr !== null) {
      // Handle complex CR objects
      if ('cr' in cr && cr.cr !== undefined) {
        return this.parseChallengeRating(cr.cr);
      }
      // Some monsters might have CR nested differently
      if ('value' in cr && cr.value !== undefined) {
        return this.parseChallengeRating(cr.value);
      }
    }
    
    return 0;
  }

  private calculateProficiencyBonus(cr: string | number | { cr?: string | number; value?: string | number }): number {
    const rating = this.parseChallengeRating(cr);
    if (rating >= 17) return 6;
    if (rating >= 13) return 5;
    if (rating >= 9) return 4;
    if (rating >= 5) return 3;
    return 2;
  }

  private parseTraits(traits?: Array<{ name: string; entries: unknown[] }>): Array<{ name: string; description: string }> | undefined {
    if (!traits || !Array.isArray(traits) || traits.length === 0) return undefined;
    
    return traits.map(trait => ({
      name: trait?.name || 'Unnamed Trait',
      description: Array.isArray(trait?.entries) ? 
        processEntries(trait.entries as EtoolsEntry[], this.options.textProcessing).text : 
        (typeof trait?.entries === 'string' ? trait.entries : '')
    }));
  }

  private parseActions(actions?: Array<{ name: string; entries: unknown[] }>): Array<{ name: string; description: string }> | undefined {
    if (!actions || !Array.isArray(actions) || actions.length === 0) return undefined;
    
    return actions.map(action => ({
      name: action?.name || 'Unnamed Action',
      description: Array.isArray(action?.entries) ? 
        processEntries(action.entries as EtoolsEntry[], this.options.textProcessing).text : 
        (typeof action?.entries === 'string' ? action.entries : '')
    }));
  }

  private parseLegendaryActions(legendary?: Array<{ name: string; entries: unknown[]; cost?: number }>): Array<{ name: string; description: string; cost?: number }> | undefined {
    if (!legendary || !Array.isArray(legendary) || legendary.length === 0) return undefined;
    
    return legendary.map(action => ({
      name: action?.name || 'Unnamed Action',
      description: Array.isArray(action?.entries) ? 
        processEntries(action.entries as EtoolsEntry[], this.options.textProcessing).text : 
        (typeof action?.entries === 'string' ? action.entries : ''),
      cost: action?.cost || 1
    }));
  }

  private parseSpellcasting(spellcasting?: Array<{ name?: string; type?: string; headerEntries?: unknown[]; will?: string[]; daily?: Record<string, string[]>; spells?: Record<string, unknown>; ability?: string; dc?: number; mod?: number; attackBonus?: number }>): {
    ability: 'intelligence' | 'wisdom' | 'charisma';
    spellSaveDC: number;
    spellAttackBonus: number;
    spells: {
      atWill?: SpellReferenceObject[];
      daily?: Array<{ spell: SpellReferenceObject; uses: number }>;
      recharge?: Array<{ recharge: string; spells: SpellReferenceObject[] }>;
    };
  } | undefined {
    if (!spellcasting || !Array.isArray(spellcasting) || spellcasting.length === 0) return undefined;
    
    const primary = spellcasting[0];
    if (!primary) return undefined;
    
    // Map ability to full names (2024 format)
    let ability: 'intelligence' | 'wisdom' | 'charisma' = 'charisma'; // default
    if (primary.ability === 'intelligence' || primary.ability === 'int') {
      ability = 'intelligence';
    } else if (primary.ability === 'wisdom' || primary.ability === 'wis') {
      ability = 'wisdom';
    } else if (primary.ability === 'charisma' || primary.ability === 'cha') {
      ability = 'charisma';
    }
    
    // Extract save DC and attack bonus from header entries if available
    let saveDC = 10; // default
    let attackBonus = 0; // default
    
    if (primary.headerEntries) {
      for (const entry of primary.headerEntries) {
        if (typeof entry === 'string') {
          // Look for spell save DC pattern: {@dc 13}
          const dcMatch = entry.match(/{@dc (\d+)}/); 
          if (dcMatch) {
            saveDC = parseInt(dcMatch[1], 10);
          }
          
          // Look for spell attack bonus: {@hit 9} or {@hit +9}
          const hitMatch = entry.match(/{@hit ([+-]?\d+)}/); 
          if (hitMatch) {
            attackBonus = parseInt(hitMatch[1], 10);
          }
        }
      }
    }
    
    // Fallback to provided values if header entries didn't contain them
    if (primary.dc) saveDC = primary.dc;
    if (primary.mod || primary.attackBonus) attackBonus = primary.mod || primary.attackBonus || attackBonus;
    
    // Parse spells into the new format
    const spells: {
      atWill?: SpellReferenceObject[];
      daily?: Array<{ spell: SpellReferenceObject; uses: number }>;
      recharge?: Array<{ recharge: string; spells: SpellReferenceObject[] }>;
    } = {};
    
    // Handle at-will spells - create spell references
    if (primary.will) {
      spells.atWill = primary.will.map(spell => this.createSpellReference(spell));
    }
    
    // Handle daily spells - convert from 5etools format to explicit uses
    if (primary.daily) {
      spells.daily = [];
      
      for (const [key, spellArray] of Object.entries(primary.daily)) {
        // Parse usage count from key: "1e" = 1 each, "2e" = 2 each, "3" = 3 total
        let uses = 1;
        if (key.endsWith('e')) {
          uses = parseInt(key.replace('e', ''), 10) || 1;
        } else {
          uses = parseInt(key, 10) || 1;
        }
        
        // Add each spell with its usage count
        for (const spell of spellArray) {
          spells.daily.push({
            spell: this.createSpellReference(spell),
            uses
          });
        }
      }
    }
    
    // Handle spell slots (convert to daily format)
    if (primary.spells) {
      if (!spells.daily) {
        spells.daily = [];
      }
      Object.entries(primary.spells).forEach(([_level, data]) => {
        if (typeof data === 'object' && data !== null && 'spells' in data) {
          const spellData = data as { spells: string[] | Record<string, unknown>; slots?: number };
          const levelSpells = Array.isArray(spellData.spells) ? spellData.spells : Object.keys(spellData.spells);
          const slots = spellData.slots || 1;
          
          for (const spell of levelSpells) {
            spells.daily!.push({
              spell: this.createSpellReference(spell),
              uses: slots
            });
          }
        }
      });
    }
    
    return {
      ability,
      spellSaveDC: saveDC,
      spellAttackBonus: attackBonus,
      spells
    };
  }
  
  /**
   * Create a spell reference object from 5etools spell format
   */
  private createSpellReference(spell: string): SpellReferenceObject {
    let spellName = spell;
    let source = 'XPHB'; // default source
    
    // Handle 5etools format: {@spell Detect Magic|XPHB}
    const match = spell.match(/^{@\w+\s+([^|}]+)(?:\|([^}]+))?}/);
    if (match) {
      spellName = match[1].trim();
      source = match[2]?.trim() || 'XPHB';
    } else {
      // Handle additional text after spell reference: "{@spell Melf's Acid Arrow|XPHB} (level 3 version)"
      const extendedMatch = spell.match(/^{@\w+\s+([^|}]+)(?:\|([^}]+))?}\s*\([^)]+\)/);
      if (extendedMatch) {
        spellName = extendedMatch[1].trim();
        source = extendedMatch[2]?.trim() || 'XPHB';
      }
    }
    
    // Generate slug from spell name
    const slug = spellName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    return {
      _ref: {
        type: 'vtt-document' as const,
        slug,
        source: source.toLowerCase(),
        pluginType: 'spell'
      }
    };
  }


  private generateTags(input: z.infer<typeof etoolsMonsterSchema>): string[] {
    const tags: string[] = [];
    
    // Add creature type
    const type = this.mapType(input.type);
    tags.push(type);
    
    // Add size
    tags.push(this.mapSize(input.size));
    
    // Add source
    if (input.source) {
      tags.push(input.source.toLowerCase());
    }
    
    // Add environment tags
    if (input.environment) {
      tags.push(...input.environment);
    }
    
    // Add special ability tags
    if (input.spellcasting?.length) {
      tags.push('spellcaster');
    }
    
    if (input.legendary?.length) {
      tags.push('legendary');
    }
    
    return tags;
  }
}