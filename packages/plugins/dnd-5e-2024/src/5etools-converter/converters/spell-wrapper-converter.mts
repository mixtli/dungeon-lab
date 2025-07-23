/**
 * Spell converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';

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
      const spellData = await readEtoolsData('spells/spells-xphb.json');
      const spells = spellData.spell || [];
      const filteredSpells = this.options.srdOnly ? filterSrdContent(spells) : spells;
      
      stats.total = filteredSpells.length;
      this.log(`Processing ${filteredSpells.length} spells`);

      for (let i = 0; i < filteredSpells.length; i++) {
        const spellRaw = filteredSpells[i];
        try {
          const spell = this.convertSpell(spellRaw);

          // Create wrapper format
          const wrapper = this.createWrapper(
            spell.name,
            spell,
            'vttdocument',
            {
              imageId: this.extractEntryImagePath(spellRaw, 'vttdocument'),
              category: this.determineCategory(spellRaw, 'vttdocument'),
              tags: this.extractTags(spellRaw, 'vttdocument'),
              sortOrder: this.calculateSortOrder(spellRaw, 'vttdocument') + i
            }
          );
          
          content.push({
            type: 'vttdocument',
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

  private convertSpell(spellData: any): any {
    const spell = {
      name: spellData.name,
      slug: this.generateSlug(spellData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'spell',
      description: this.buildDescription(spellData),
      
      // Spell-specific data
      data: {
        level: spellData.level || 0,
        school: SCHOOL_MAP[spellData.school] || spellData.school || 'Evocation',
        ritual: spellData.meta?.ritual === true,
        concentration: spellData.meta?.concentration === true,
        
        // Casting info
        time: this.parseCastingTime(spellData.time),
        range: this.parseRange(spellData.range),
        components: this.parseComponents(spellData.components),
        duration: this.parseDuration(spellData.duration),
        
        // Spell text
        entries: spellData.entries ? formatEntries(spellData.entries) : '',
        higherLevel: spellData.entriesHigherLevel ? formatEntries(spellData.entriesHigherLevel) : undefined,
        
        // Classes that can cast this spell
        classes: this.parseClasses(spellData.classes),
        
        // Source information
        source: spellData.source || 'PHB',
        page: spellData.page
      }
    };

    return spell;
  }

  private buildDescription(spellData: any): string {
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

  private parseCastingTime(time: any[]): string {
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

  private parseRange(range: any): string {
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

  private parseComponents(components: any): { verbal: boolean; somatic: boolean; material: boolean; materialComponents?: string } {
    if (!components) {
      return { verbal: false, somatic: false, material: false };
    }
    
    return {
      verbal: components.v === true,
      somatic: components.s === true,
      material: components.m !== undefined,
      materialComponents: typeof components.m === 'string' ? components.m : 
                         components.m?.text || undefined
    };
  }

  private parseDuration(duration: any[]): string {
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

  private parseClasses(classes: any): string[] {
    if (!classes?.fromClassList) {
      return [];
    }
    
    return classes.fromClassList.map((c: any) => 
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
  protected determineCategory(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    if (contentType === 'vttdocument') {
      const level = sourceData.level || 0;
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
  protected extractTags(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): string[] {
    const baseTags = super.extractTags(sourceData, contentType);
    
    if (contentType === 'vttdocument') {
      // Add spell-specific tags
      if (sourceData.school) {
        baseTags.push(SCHOOL_MAP[sourceData.school] || sourceData.school);
      }
      if (sourceData.meta?.ritual) {
        baseTags.push('Ritual');
      }
      if (sourceData.meta?.concentration) {
        baseTags.push('Concentration');
      }
      if (sourceData.level === 0) {
        baseTags.push('Cantrip');
      }
    }
    
    return baseTags;
  }
}