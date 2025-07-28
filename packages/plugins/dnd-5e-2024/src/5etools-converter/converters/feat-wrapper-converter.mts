/**
 * Feat converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries, validateFeatData, ValidationResult } from '../utils/conversion-utils.mjs';
import type { EtoolsFeat, EtoolsFeatData, EtoolsFeatPrerequisite, EtoolsFeatAbilityScoreImprovement } from '../../5etools-types/feats.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

/**
 * Feat fluff data interface
 */
interface EtoolsFeatFluff {
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

// Category mapping from 5etools codes to readable names
const CATEGORY_MAP: Record<string, string> = {
  'G': 'General',
  'F': 'Fighting Style', 
  'O': 'Origin',
  'E': 'Epic Boon'
};

export class FeatWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting feat wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read feat data
      const rawFeatData = await readEtoolsData('feats.json');
      const featData = safeEtoolsCast<EtoolsFeatData>(rawFeatData, ['feat'], 'feat data file');
      const feats = extractEtoolsArray<EtoolsFeat>(featData, 'feat', 'feat list');
      
      const rawFluffData = await readEtoolsData('fluff-feats.json');
      
      // Create fluff lookup map
      const fluffMap = new Map<string, EtoolsFeatFluff>();
      if (rawFluffData && typeof rawFluffData === 'object' && 'featFluff' in rawFluffData) {
        const fluffArray = (rawFluffData as { featFluff: EtoolsFeatFluff[] }).featFluff;
        if (Array.isArray(fluffArray)) {
          for (const fluff of fluffArray) {
            fluffMap.set(fluff.name, fluff);
          }
        }
      }
      
      const filteredFeats = this.options.srdOnly ? filterSrdContent(feats) : feats;
      
      stats.total = filteredFeats.length;
      this.log(`Processing ${filteredFeats.length} feats`);

      for (let i = 0; i < filteredFeats.length; i++) {
        const featRaw = filteredFeats[i];
        try {
          const fluff = fluffMap.get(featRaw.name);
          const { feat, assetPath, validationResult } = await this.convertFeat(featRaw, fluff);
          // Feat is already properly typed for wrapper creation

          // Check validation result
          if (!validationResult.success) {
            this.log(`❌ Feat ${featRaw.name} failed validation:`, validationResult.errors);
            stats.errors++;
            continue; // Skip this feat and continue with next
          }

          // Log successful validation
          this.log(`✅ Feat ${featRaw.name} validated successfully`);

          // Create wrapper format using the full document structure
          const wrapper = this.createWrapper(
            feat.name,
            feat, // Always use the full structure for proper directory mapping
            'vtt-document',
            {
              imageId: assetPath,
              category: this.determineCategory(featRaw as unknown as Record<string, unknown>, 'vtt-document'),
              tags: this.extractTags(featRaw, 'vtt-document'),
              sortOrder: this.calculateSortOrder(featRaw, 'vtt-document') + i
            }
          );
          
          content.push({
            type: 'vtt-document',
            wrapper,
            originalPath: 'feats.json'
          });
          
          stats.converted++;
        } catch (error) {
          this.log(`Error converting feat ${featRaw.name}:`, error);
          stats.errors++;
        }
      }

      this.log(`Feat wrapper conversion complete. Stats:`, stats);
      
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

  private async convertFeat(featData: EtoolsFeat, fluffData?: EtoolsFeatFluff): Promise<{ feat: {
    id: string;
    name: string;
    slug: string;
    pluginId: string;
    documentType: string;
    description: string;
    campaignId: string;
    userData: Record<string, unknown>;
    pluginDocumentType: string;
    pluginData: unknown;
  }; assetPath?: string; validationResult: ValidationResult }> {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    // Create simplified feat structure for validation
    const featDataForValidation = {
      name: featData.name,
      description: this.buildDescription(featData, fluffData),
      source: featData.source,
      page: featData.page,
      prerequisites: this.extractPrerequisitesForSchema(featData.prerequisite),
      benefits: this.extractBenefitsForCanonicalSchema(featData.entries || []),
      repeatable: featData.repeatable || false,
      category: this.extractCategoryForSchema(featData.category)
    };

    // Create full document structure for output
    const feat = {
      id: `feat-${this.generateSlug(featData.name)}`,
      name: featData.name,
      slug: this.generateSlug(featData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'vtt-document', // Correct documentType from schema
      description: this.buildDescription(featData, fluffData),
      campaignId: '',
      userData: {},
      pluginDocumentType: 'feat',
      pluginData: featDataForValidation
    };

    // Validate the simplified feat data against the schema
    const validationResult = await validateFeatData(featDataForValidation);

    return { feat, assetPath, validationResult };
  }

  private buildDescription(featData: EtoolsFeat, fluffData?: EtoolsFeatFluff): string {
    let description = '';
    
    // Use fluff description if available
    if (fluffData?.entries) {
      description = formatEntries(fluffData.entries);
    } else if (featData.entries) {
      description = formatEntries(featData.entries);
    }
    
    // Fallback description
    if (!description) {
      description = `The ${featData.name} feat provides unique benefits and abilities for character development.`;
    }
    
    return description.trim();
  }

  // @ts-expect-error - Future functionality for feat categorization
  private extractCategory(categoryData: string | undefined): string | undefined {
    if (!categoryData) return undefined;
    
    if (typeof categoryData === 'string') {
      return CATEGORY_MAP[categoryData] || categoryData;
    }
    
    return undefined;
  }

  // @ts-expect-error - Future functionality for ability score choices
  private extractAbilityChoices(abilityData: EtoolsFeatAbilityScoreImprovement[] | undefined): Array<{
    choice: {
      from: string[];
      count?: number;
    };
  }> | undefined {
    if (!abilityData) return undefined;
    
    const choices: Array<{ choice: { from: string[]; count?: number } }> = [];
    
    // Handle array format (abilityData is already typed as an array)
    for (const ability of abilityData) {
      if (ability.choose && ability.choose.from) {
        choices.push({
          choice: {
            from: ability.choose.from.map((a) => this.normalizeAbility(a)),
            count: ability.choose.count || 1
          }
        });
      }
    }
    
    return choices.length > 0 ? choices : undefined;
  }

  private extractPrerequisitesForSchema(prerequisiteData: EtoolsFeatPrerequisite | undefined): {
    level?: number;
    abilities?: Record<string, number>;
    skills?: string[];
    proficiencies?: string[];
    features?: string[];
    other?: string;
  } | undefined {
    if (!prerequisiteData) return undefined;
    
    const prerequisites: {
      level?: number;
      abilities?: Record<string, number>;
      skills?: string[];
      proficiencies?: string[];
      features?: string[];
      other?: string;
    } = {};
    
    // Extract ability requirements
    if (prerequisiteData.ability && Array.isArray(prerequisiteData.ability)) {
      prerequisites.abilities = {};
      for (const abilityReq of prerequisiteData.ability) {
        for (const [key, value] of Object.entries(abilityReq)) {
          if (typeof value === 'number') {
            prerequisites.abilities[this.normalizeAbility(key)] = value;
          }
        }
      }
    }
    
    // Extract level requirement
    if (prerequisiteData.level) {
      prerequisites.level = prerequisiteData.level;
    }
    
    // Extract other requirements
    if (prerequisiteData.other) {
      prerequisites.other = prerequisiteData.other;
    } else if (prerequisiteData.otherSummary) {
      prerequisites.other = prerequisiteData.otherSummary.entrySummary || prerequisiteData.otherSummary.entry;
    }
    
    return Object.keys(prerequisites).length > 0 ? prerequisites : undefined;
  }

  /**
   * Extract benefits for canonical schema (name + description)
   */
  private extractBenefitsForCanonicalSchema(entries: EtoolsEntry[]): Array<{
    name: string;
    description: string;
  }> {
    const benefits: Array<{
      name: string;
      description: string;
    }> = [];
    
    if (!Array.isArray(entries)) return benefits;
    
    for (const entry of entries) {
      if (typeof entry === 'string') {
        benefits.push({
          name: 'Feat Benefit',
          description: this.cleanRuleText(entry)
        });
      } else if (typeof entry === 'object' && entry && 'entries' in entry && Array.isArray(entry.entries)) {
        // Use the entry name if available, otherwise default
        const name = ('name' in entry && typeof entry.name === 'string') ? entry.name : 'Feat Benefit';
        const description = formatEntries(entry.entries as EtoolsEntry[]);
        benefits.push({
          name: String(name),
          description: this.cleanRuleText(description)
        });
      } else if (typeof entry === 'object' && entry && 'name' in entry) {
        // Handle named entries
        const name = ('name' in entry && typeof entry.name === 'string') ? entry.name : 'Feat Benefit';
        const description = ('text' in entry && typeof entry.text === 'string') ? entry.text : 
                          ('entries' in entry && Array.isArray(entry.entries)) ? formatEntries(entry.entries as EtoolsEntry[]) : 
                          'Feat benefit description';
        benefits.push({
          name,
          description: this.cleanRuleText(description)
        });
      }
    }
    
    // Ensure at least one benefit exists
    if (benefits.length === 0) {
      benefits.push({
        name: 'Feat Benefit',
        description: 'This feat provides a benefit to the character.'
      });
    }
    
    return benefits;
  }

  // @ts-expect-error - Future functionality for schema-based benefit extraction
  private extractBenefitsForSchema(entries: EtoolsEntry[]): Array<{
    type: 'ability_score' | 'skill_proficiency' | 'language' | 'tool_proficiency' | 'spell' | 'feature' | 'other';
    description: string;
    choices?: string[];
    count?: number;
  }> {
    const benefits: Array<{
      type: 'ability_score' | 'skill_proficiency' | 'language' | 'tool_proficiency' | 'spell' | 'feature' | 'other';
      description: string;
      choices?: string[];
      count?: number;
    }> = [];
    
    if (!Array.isArray(entries)) return benefits;
    
    for (const entry of entries) {
      if (typeof entry === 'string') {
        benefits.push({
          type: 'other',
          description: this.cleanRuleText(entry)
        });
      } else if (typeof entry === 'object' && entry.type === 'entries' && entry.name) {
        benefits.push({
          type: 'feature',
          description: formatEntries(entry.entries || [])
        });
      } else if (typeof entry === 'object' && entry.type === 'list' && entry.items) {
        entry.items.forEach((item: EtoolsEntry) => {
          benefits.push({
            type: 'other',
            description: typeof item === 'string' ? this.cleanRuleText(item) : formatEntries([item])
          });
        });
      }
    }
    
    // If no benefits were extracted, create a default one from all entries
    if (benefits.length === 0) {
      benefits.push({
        type: 'other',
        description: formatEntries(entries)
      });
    }
    
    return benefits;
  }

  private extractCategoryForSchema(categoryData: string | undefined): 'general' | 'fighting_style' | 'magic' | 'racial' | undefined {
    if (!categoryData) return undefined;
    
    const categoryMap: Record<string, 'general' | 'fighting_style' | 'magic' | 'racial'> = {
      'G': 'general',
      'F': 'fighting_style',
      'O': 'general', // Origin feats are general
      'E': 'magic'    // Epic boons are magical
    };
    
    return categoryMap[categoryData] || 'general';
  }

  // @ts-expect-error - Future functionality for alternative prerequisite extraction
  private extractPrerequisites(prerequisiteData: EtoolsFeatPrerequisite | undefined): {
    ability?: Record<string, number>;
    race?: string[];
    class?: string[];
    level?: number;
    spellcasting?: boolean;
    other?: string;
  } | undefined {
    if (!prerequisiteData) return undefined;
    
    const prerequisites: {
      ability?: Record<string, number>;
      race?: string[];
      class?: string[];
      level?: number;
      spellcasting?: boolean;
      other?: string;
    } = {};
    
    // Extract ability requirements
    if (prerequisiteData.ability && Array.isArray(prerequisiteData.ability)) {
      prerequisites.ability = {};
      for (const abilityReq of prerequisiteData.ability) {
        for (const [key, value] of Object.entries(abilityReq)) {
          if (typeof value === 'number') {
            prerequisites.ability[this.normalizeAbility(key)] = value;
          }
        }
      }
    }
    
    // Extract race requirements
    if (prerequisiteData.race && Array.isArray(prerequisiteData.race)) {
      prerequisites.race = prerequisiteData.race.map(race => race.name);
    }
    
    // Extract level requirement
    if (prerequisiteData.level) {
      prerequisites.level = prerequisiteData.level;
    }
    
    // Extract spellcasting requirement
    if (prerequisiteData.spellcasting || prerequisiteData.spellcastingFeature || prerequisiteData.spellcastingPrepared) {
      prerequisites.spellcasting = true;
    }
    
    // Extract other requirements
    if (prerequisiteData.other) {
      prerequisites.other = prerequisiteData.other;
    } else if (prerequisiteData.otherSummary) {
      prerequisites.other = prerequisiteData.otherSummary.entrySummary || prerequisiteData.otherSummary.entry;
    }
    
    return Object.keys(prerequisites).length > 0 ? prerequisites : undefined;
  }

  // @ts-expect-error - Future functionality for alternative benefit extraction
  private extractBenefits(entries: EtoolsEntry[]): Array<{ name: string; description: string }> {
    const benefits: Array<{ name: string; description: string }> = [];
    
    if (!Array.isArray(entries)) return benefits;
    
    for (const entry of entries) {
      if (typeof entry === 'string') {
        // Simple string entry becomes a single benefit
        benefits.push({
          name: 'Benefit',
          description: this.cleanRuleText(entry)
        });
      } else if (typeof entry === 'object' && entry.type === 'entries' && entry.name) {
        // Named entry becomes a benefit
        benefits.push({
          name: entry.name,
          description: formatEntries(entry.entries || [])
        });
      } else if (typeof entry === 'object' && entry.type === 'list' && entry.items) {
        // List items become individual benefits
        entry.items.forEach((item: EtoolsEntry, index: number) => {
          benefits.push({
            name: `Benefit ${index + 1}`,
            description: typeof item === 'string' ? this.cleanRuleText(item) : formatEntries([item])
          });
        });
      }
    }
    
    // If no benefits were extracted, create a default one from all entries
    if (benefits.length === 0) {
      benefits.push({
        name: 'Feat Benefit',
        description: formatEntries(entries)
      });
    }
    
    return benefits;
  }

  private normalizeAbility(ability: string): string {
    const abilityMap: Record<string, string> = {
      str: 'strength',
      dex: 'dexterity', 
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };
    
    return abilityMap[ability.toLowerCase()] || ability.toLowerCase();
  }

  protected cleanRuleText(text: string): string {
    return text
      .replace(/\{@[^}]+\}/g, '') // Remove 5etools tags
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Override category determination for feats
   */
  protected determineCategory<T = Record<string, unknown>>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string | undefined {
    if (contentType === 'vtt-document') {
      return 'Feats';
    }
    return super.determineCategory(sourceData, contentType);
  }
}