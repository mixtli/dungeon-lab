/**
 * Spell converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries, validateSpellData, ValidationResult } from '../utils/conversion-utils.mjs';
import type { EtoolsSpell, EtoolsSpellData } from '../../5etools-types/spells.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

// School mapping from 5etools to readable names
const SCHOOL_MAP: Record<string, string> = {
  'A': 'Abjuration',
  'C': 'Conjuration',
  'D': 'Divination',
  'E': 'Enchantment',
  'I': 'Illusion',
  'N': 'Necromancy',
  'T': 'Transmutation',
  'V': 'Evocation'
};

export class SpellWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting spell wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read spell data
      const rawSpellData = await readEtoolsData('spells/spells-xphb.json');
      const spellData = safeEtoolsCast<EtoolsSpellData>(rawSpellData, ['spell'], 'spell data file');
      const spells = extractEtoolsArray<EtoolsSpell>(spellData, 'spell', 'spell list');
      const filteredSpells = this.options.srdOnly ? filterSrdContent(spells) : spells;
      
      stats.total = filteredSpells.length;
      this.log(`Processing ${filteredSpells.length} spells`);

      for (let i = 0; i < filteredSpells.length; i++) {
        const spellRaw = filteredSpells[i];
        try {
          const { spell, validationResult } = await this.convertSpell(spellRaw);

          // Check validation result
          if (!validationResult.success) {
            this.log(`❌ Spell ${spellRaw.name} failed validation:`, validationResult.errors);
            stats.errors++;
            continue; // Skip this spell and continue with next
          }

          // Log successful validation
          this.log(`✅ Spell ${spellRaw.name} validated successfully`);

          // Create wrapper format using the full document structure
          const wrapper = this.createWrapper(
            spell.name,
            spell, // Always use the full structure for proper directory mapping
            'vtt-document',
            {
              imageId: this.extractEntryImagePath(spellRaw, 'vtt-document'),
              category: this.determineCategory(spellRaw, 'vtt-document'),
              tags: this.extractTags(spellRaw, 'vtt-document'),
              sortOrder: this.calculateSortOrder(spellRaw, 'vtt-document') + i
            }
          );
          
          content.push({
            type: 'vtt-document',
            wrapper,
            originalPath: 'spells/spells-xphb.json'
          });
          
          stats.converted++;
        } catch (error) {
          this.log(`Error converting spell ${spellRaw.name}:`, error);
          stats.errors++;
        }
      }

      this.log(`Spell wrapper conversion complete. Stats:`, stats);
      
      return {
        success: true,
        content,
        stats
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private async convertSpell(spellData: EtoolsSpell): Promise<{ spell: {
    id: string;
    slug: string;
    name: string;
    pluginId: string;
    campaignId: string;
    documentType: string;
    description: string;
    userData: Record<string, unknown>;
    pluginDocumentType: string;
    pluginData: unknown;
  }; validationResult: ValidationResult }> {
    // Create simplified spell structure for validation
    const spellDataForValidation = {
      name: spellData.name,
      description: this.buildDescription(spellData),
      level: spellData.level || 0,
      school: (SCHOOL_MAP[spellData.school] || spellData.school || 'evocation').toLowerCase(),
      ritual: spellData.meta?.ritual === true,
      concentration: spellData.meta?.concentration === true,
      
      // Casting info
      castingTime: this.parseCastingTime(spellData.time),
      range: this.parseRange(spellData.range),
      components: this.parseComponents(spellData.components),
      duration: this.parseDuration(spellData.duration),
      
      // Spell text
      higherLevels: spellData.entriesHigherLevel ? formatEntries(spellData.entriesHigherLevel) : undefined,
      
      // Classes that can cast this spell
      classes: this.parseClasses(spellData.classes),
      
      // Source information
      source: spellData.source || 'PHB',
      page: spellData.page
    };

    // Create full document structure for output
    const spell = {
      id: `spell-${this.generateSlug(spellData.name)}`,
      slug: this.generateSlug(spellData.name),
      name: spellData.name,
      documentType: 'vtt-document', // Correct documentType from schema
      pluginDocumentType: 'spell',
      pluginId: 'dnd-5e-2024',
      campaignId: '',
      description: this.buildDescription(spellData),
      userData: {},
      pluginData: spellDataForValidation
    };

    // Validate the simplified spell data against the schema
    const validationResult = await validateSpellData(spellDataForValidation);

    return { spell, validationResult };
  }

  private buildDescription(spellData: EtoolsSpell): string {
    let description = '';
    
    // Build description from spell entries
    if (spellData.entries) {
      description = formatEntries(spellData.entries);
    }
    
    // Add higher level info if available
    if (spellData.entriesHigherLevel) {
      description += '\n\n**At Higher Levels:** ' + formatEntries(spellData.entriesHigherLevel);
    }
    
    // Fallback description
    if (!description) {
      const level = spellData.level === 0 ? 'cantrip' : `${spellData.level}${this.getOrdinalSuffix(spellData.level)}-level spell`;
      const school = SCHOOL_MAP[spellData.school] || spellData.school || 'evocation';
      description = `A ${level} ${school.toLowerCase()} spell.`;
    }
    
    return description.trim();
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private parseCastingTime(time: EtoolsSpell['time']): string {
    if (!time || time.length === 0) {
      return '1 action';
    }
    
    const t = time[0];
    if (typeof t === 'string') {
      return t;
    }
    
    const number = t.number || 1;
    const unit = t.unit || 'action';
    return `${number} ${unit}${number > 1 ? 's' : ''}`;
  }

  private parseRange(range: EtoolsSpell['range']): string {
    if (!range) {
      return 'Self';
    }
    
    if (typeof range === 'string') {
      return range;
    }
    
    if (range.type === 'point') {
      if (range.distance?.type === 'self') {
        return 'Self';
      }
      const distance = range.distance?.amount || 0;
      const unit = range.distance?.type || 'feet';
      return `${distance} ${unit}`;
    }
    
    return 'Special';
  }

  private parseComponents(components: EtoolsSpell['components']): { verbal: boolean; somatic: boolean; material: boolean; materialComponents?: string } {
    if (!components) {
      return { verbal: false, somatic: false, material: false };
    }
    
    return {
      verbal: components.v === true,
      somatic: components.s === true,
      material: components.m !== undefined,
      materialComponents: typeof components.m === 'string' ? components.m : 
                         (typeof components.m === 'object' && components.m && 'text' in components.m ? (components.m as { text: string }).text : undefined)
    };
  }

  private parseDuration(duration: EtoolsSpell['duration']): string {
    if (!duration || duration.length === 0) {
      return 'Instantaneous';
    }
    
    const d = duration[0];
    if (typeof d === 'string') {
      return d;
    }
    
    if (d.type === 'instant') {
      return 'Instantaneous';
    }
    
    if (d.type === 'permanent') {
      return 'Until dispelled';
    }
    
    const amount = d.duration?.amount || 1;
    const unit = d.duration?.type || 'round';
    const concentration = d.concentration ? 'Concentration, up to ' : '';
    
    return `${concentration}${amount} ${unit}${amount > 1 ? 's' : ''}`;
  }

  private parseClasses(classes: EtoolsSpell['classes']): string[] {
    if (!classes?.fromClassList) {
      return [];
    }
    
    return classes.fromClassList.map(c => 
      typeof c === 'string' ? c : c.name || ''
    ).filter(Boolean);
  }

  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  /**
   * Override category determination for spells
   */
  protected determineCategory<T = EtoolsSpell>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string | undefined {
    if (contentType === 'vtt-document') {
      const level = (sourceData && typeof sourceData === 'object' && 'level' in sourceData && typeof sourceData.level === 'number') ? sourceData.level : 0;
      if (level === 0) {
        return 'Cantrips';
      }
      return `Level ${level} Spells`;
    }
    return super.determineCategory(sourceData, contentType);
  }

  /**
   * Override tag extraction for spells
   */
  protected extractTags<T = EtoolsSpell>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string[] {
    const baseTags = super.extractTags(sourceData, contentType);
    
    if (contentType === 'vtt-document') {
      // Add spell-specific tags
      if (sourceData && typeof sourceData === 'object' && 'school' in sourceData && typeof sourceData.school === 'string') {
        baseTags.push(SCHOOL_MAP[sourceData.school as keyof typeof SCHOOL_MAP] || sourceData.school);
      }
      if (sourceData && typeof sourceData === 'object' && 'meta' in sourceData && 
          sourceData.meta && typeof sourceData.meta === 'object' && 'ritual' in sourceData.meta && sourceData.meta.ritual) {
        baseTags.push('Ritual');
      }
      if (sourceData && typeof sourceData === 'object' && 'meta' in sourceData && 
          sourceData.meta && typeof sourceData.meta === 'object' && 'concentration' in sourceData.meta && sourceData.meta.concentration) {
        baseTags.push('Concentration');
      }
      if (sourceData && typeof sourceData === 'object' && 'level' in sourceData && sourceData.level === 0) {
        baseTags.push('Cantrip');
      }
    }
    
    return baseTags;
  }
}