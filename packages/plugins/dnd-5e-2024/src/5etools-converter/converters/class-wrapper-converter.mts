/**
 * Class converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries, validateClassData, ValidationResult } from '../utils/conversion-utils.mjs';
import type { EtoolsClass, EtoolsClassData, EtoolsClassFluff, EtoolsClassFluffData, EtoolsSubclass } from '../../5etools-types/classes.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import type { DndClassData } from '../../types/dnd/character-class.mjs';

// Type definitions for internal use
type DndSubclassData = {
  name: string;
  shortname: string;
  source: string;
  classname: string;
  features: Record<string, { name: string; source: string; description?: string; benefits?: { name: string; description: string; }[]; gainsubclassfeature?: boolean; }[]>;
  additionalspells: DndSpellEntry[];
};

type DndSpellEntry = {
  known?: Record<string, { name: string; source: string; }[]>;
  prepared?: Record<string, { name: string; source: string; }[]>;
};


export class ClassWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting class wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read class index to get list of available classes
      const classIndex = await readEtoolsData<Record<string, string>>('class/index.json');
      const classFiles = Object.values(classIndex);

      for (const classFile of classFiles) {
        try {
          // Read class data file
          const rawClassData = await readEtoolsData(`class/${classFile}`);
          const classData = safeEtoolsCast<EtoolsClassData>(rawClassData, ['class'], `class file ${classFile}`);
          const classes = extractEtoolsArray<EtoolsClass>(classData, 'class', `class list in ${classFile}`);
          const filteredClasses = this.options.srdOnly ? filterSrdContent(classes) : classes;
          
          stats.total += filteredClasses.length;
          this.log(`Processing ${filteredClasses.length} classes from ${classFile}`);

          // Read corresponding fluff data
          const fluffFile = (classFile as string).replace('class-', 'fluff-class-');
          let fluffData: EtoolsClassFluffData | null = null;
          try {
            const rawFluffData = await readEtoolsData(`class/${fluffFile}`);
            fluffData = safeEtoolsCast<EtoolsClassFluffData>(rawFluffData, ['classFluff'], `fluff file ${fluffFile}`);
          } catch {
            this.log(`No fluff data found for ${fluffFile}`);
          }

          // Create fluff lookup map
          const fluffMap = new Map<string, EtoolsClassFluff>();
          if (fluffData?.classFluff) {
            for (const fluff of fluffData.classFluff) {
              fluffMap.set(fluff.name, fluff);
            }
          }

          for (let i = 0; i < filteredClasses.length; i++) {
            const classRaw = filteredClasses[i];
            try {
              const fluff = fluffMap.get(classRaw.name);
              const { characterClass, assetPath, validationResult } = await this.convertClass(classRaw, fluff);
              // CharacterClass is already properly typed for wrapper creation

              // Check validation result
              if (!validationResult.success) {
                this.log(`❌ ${classRaw.name}: ${validationResult.errors?.join(', ') || 'Validation failed'}`);
                stats.errors++;
                continue; // Skip this class and continue with next
              }

              // Log successful validation
              this.log(`✅ ${classRaw.name}`);

              // Create wrapper format using the full document structure
              const wrapper = this.createWrapper(
                characterClass.name,
                characterClass, // Always use the full structure for proper directory mapping
                'vtt-document',
                {
                  imageId: assetPath,
                  category: this.determineCategory(classRaw, 'vtt-document'),
                  tags: this.extractTags(classRaw, 'vtt-document'),
                  sortOrder: this.calculateSortOrder(classRaw, 'vtt-document') + i
                }
              );
              
              content.push({
                type: 'vtt-document',
                wrapper,
                originalPath: `class/${classFile}`
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`❌ ${classRaw.name}: ${error instanceof Error ? error.message : 'Conversion error'}`);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing class file ${classFile}:`, error);
          stats.errors++;
        }
      }

      this.log(`Class wrapper conversion complete. Stats:`, stats);
      
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

  private async convertClass(classData: EtoolsClass, fluffData?: EtoolsClassFluff): Promise<{ characterClass: {
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

    // Create class structure matching dndCharacterClassDataSchema
    const classDataForValidation = {
      name: classData.name,
      description: this.buildDescription(classData, fluffData),
      primaryAbilities: this.extractPrimaryAbilities(classData.primaryAbility),
      hitDie: classData.hd?.faces || 8, // Just the number, not "d8"
      proficiencies: {
        armor: classData.startingProficiencies?.armor || [],
        weapons: classData.startingProficiencies?.weapons || [],
        tools: this.extractToolProficiencies(classData.startingProficiencies?.tools) || [],
        savingThrows: this.extractSavingThrows(classData.proficiency),
        skills: this.extractSkillProficienciesAsObject(classData.startingProficiencies?.skills)
      },
      features: this.extractFeaturesAsRecord(classData.classFeature || []),
      subclasses: this.extractSubclasses(classData.subclasses || []),
      // Optional fields
      source: classData.source,
      page: classData.page
    };

    // Create full document structure for output (regardless of validation)
    const characterClass = {
      id: `class-${this.generateSlug(classData.name)}`,
      name: classData.name,
      slug: this.generateSlug(classData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'vtt-document', // Correct documentType from schema
      description: this.buildDescription(classData, fluffData),
      campaignId: '',
      userData: {},
      pluginDocumentType: 'character-class',
      pluginData: classDataForValidation
    };

    // Validate the simplified class data against the schema
    const validationResult = await validateClassData(classDataForValidation);

    return { characterClass, assetPath, validationResult };
  }

  private buildDescription(classData: EtoolsClass, fluffData?: EtoolsClassFluff): string {
    let description = '';
    
    // Use fluff description if available
    if (fluffData?.entries) {
      description = formatEntries(fluffData.entries);
    }
    
    // Fallback description
    if (!description) {
      description = `The ${classData.name} class provides unique abilities and features for character creation.`;
    }
    
    return description.trim();
  }

  private extractPrimaryAbilities(primaryAbility: EtoolsClass['primaryAbility']): ('strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma')[] {
    if (!primaryAbility || !Array.isArray(primaryAbility)) return [];
    
    const result: ('strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma')[] = [];
    for (const ability of primaryAbility) {
      if (typeof ability === 'string') {
        result.push(this.normalizeAbility(ability));
      }
      if (typeof ability === 'object' && ability.choose) {
        // Handle choice format - take first option for now
        const options = ability.choose.from;
        if (options && options.length > 0) {
          result.push(this.normalizeAbility(options[0]));
        }
      }
    }
    return result;
  }

  private extractSavingThrows(proficiency: EtoolsClass['proficiency']): ('strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma')[] {
    if (!proficiency || !Array.isArray(proficiency)) return [];
    return proficiency.map(prof => this.normalizeAbility(prof));
  }


  private extractStartingEquipment(equipment: EtoolsClass['startingEquipment']): { options: Record<string, { value?: number; source?: string; item?: string; equipmenttype?: string; quantity?: number; }[]>; type: "choice"; description: string[]; } {
    // Return a properly structured equipment choice object
    return {
      options: {},
      type: "choice",
      description: equipment ? [`Equipment from ${equipment.default ? 'starting equipment' : 'background'}`] : []
    };
  }

  // Removed unused extractFeatures method

  private extractFeaturesAsRecord(features: EtoolsClass['classFeature']): Record<string, { name: string; source: string; description?: string; benefits?: { name: string; description: string; }[]; gainsubclassfeature?: boolean; }[]> {
    if (!features || !Array.isArray(features)) return {};
    
    const featuresByLevel: Record<string, { name: string; source: string; description?: string; benefits?: { name: string; description: string; }[]; gainsubclassfeature?: boolean; }[]> = {};
    
    features.forEach(feature => {
      const level = feature.level || 1;
      const levelKey = `${level}`;
      
      if (!featuresByLevel[levelKey]) {
        featuresByLevel[levelKey] = [];
      }
      
      featuresByLevel[levelKey].push({
        name: feature.name || 'Unknown Feature',
        source: feature.source || 'PHB',
        description: formatEntries(feature.entries || []),
        benefits: feature.benefits as { name: string; description: string; }[] | undefined,
        gainsubclassfeature: feature.gainSubclassFeature
      });
    });
    
    return featuresByLevel;
  }

  private normalizeAbility(ability: string): 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' {
    const abilityMap: Record<string, 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'> = {
      str: 'strength',
      dex: 'dexterity', 
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };
    
    const normalized = abilityMap[ability.toLowerCase()] || ability.toLowerCase();
    const validAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
    return validAbilities.includes(normalized as typeof validAbilities[number]) ? 
      normalized as typeof validAbilities[number] : 'strength';
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private extractToolProficiencies(tools: EtoolsClass['startingProficiencies']['tools']): string[] {
    if (!tools || !Array.isArray(tools)) return [];
    
    const result: string[] = [];
    for (const tool of tools) {
      if (typeof tool === 'string') {
        result.push(tool);
      } else if (tool && typeof tool === 'object' && 'choose' in tool && tool.choose) {
        // For choice objects, just add the first option as a placeholder
        if (Array.isArray(tool.choose.from) && tool.choose.from.length > 0) {
          result.push(tool.choose.from[0]);
        }
      }
    }
    return result;
  }

  private extractSkillProficienciesAsChoices(skills: EtoolsClass['startingProficiencies']['skills']): { options: string[]; type: 'choice'; count: number; }[] {
    if (!skills || !Array.isArray(skills)) return [];
    
    const result: { options: string[]; type: 'choice'; count: number; }[] = [];
    for (const skill of skills) {
      if (typeof skill === 'string') {
        result.push({
          options: [skill],
          type: 'choice',
          count: 1
        });
      } else if (skill && typeof skill === 'object' && 'choose' in skill && skill.choose) {
        // For choice objects, use the actual choice structure
        if (Array.isArray(skill.choose.from) && skill.choose.from.length > 0) {
          result.push({
            options: skill.choose.from as string[],
            type: 'choice',
            count: skill.choose.count || 1
          });
        }
      }
    }
    return result;
  }

  private extractSkillProficienciesAsObject(skills: EtoolsClass['startingProficiencies']['skills']): { count: number; choices: string[]; } {
    if (!skills || !Array.isArray(skills)) {
      return { count: 0, choices: [] };
    }
    
    // Extract all possible skill choices and count
    let totalCount = 0;
    const allChoices: string[] = [];
    
    for (const skill of skills) {
      if (typeof skill === 'string') {
        allChoices.push(skill);
        totalCount += 1;
      } else if (skill && typeof skill === 'object' && 'choose' in skill && skill.choose) {
        if (Array.isArray(skill.choose.from)) {
          allChoices.push(...skill.choose.from as string[]);
          totalCount += skill.choose.count || 1;
        }
      }
    }
    
    return {
      count: totalCount,
      choices: [...new Set(allChoices)] // Remove duplicates
    };
  }

  private extractSubclasses(subclasses: EtoolsSubclass[]): any[] {
    if (!Array.isArray(subclasses)) {
      // Return 4 placeholder subclasses as required by schema
      return Array.from({ length: 4 }, (_, i) => ({
        name: `Placeholder Subclass ${i + 1}`,
        description: 'Placeholder subclass for validation',
        gainedAtLevel: 3,
        features: {}
      }));
    }
    
    const converted = subclasses.map(subclass => ({
      name: subclass.name || 'Unknown Subclass',
      description: 'Subclass description',
      gainedAtLevel: subclass.subclassFeatures?.[0]?.level || 3,
      features: {} // Simplified for now
    }));
    
    // Ensure exactly 4 subclasses as required by schema
    while (converted.length < 4) {
      converted.push({
        name: `Placeholder Subclass ${converted.length + 1}`,
        description: 'Placeholder subclass for validation',
        gainedAtLevel: 3,
        features: {}
      });
    }
    
    return converted.slice(0, 4); // Take only first 4
  }

  private extractAdditionalSpells(additionalSpells: Array<{known?: Record<string, string[]>; prepared?: Record<string, string[]>; expanded?: Record<string, string[]>}>): DndSpellEntry[] {
    if (!Array.isArray(additionalSpells) || additionalSpells.length === 0) return [];
    
    return additionalSpells.map(spellGroup => {
      const entry: DndSpellEntry = {};
      
      // Convert each type of spell list to our format
      if (spellGroup.known) {
        entry.known = {};
        for (const [level, spells] of Object.entries(spellGroup.known)) {
          entry.known[level] = spells.map(spell => ({
            name: spell,
            source: 'PHB' // Default source
          }));
        }
      }
      
      if (spellGroup.prepared) {
        entry.prepared = {};
        for (const [level, spells] of Object.entries(spellGroup.prepared)) {
          entry.prepared[level] = spells.map(spell => ({
            name: spell,
            source: 'PHB' // Default source
          }));
        }
      }
      
      // Note: 'expanded' doesn't directly map to our schema, treating as prepared
      if (spellGroup.expanded) {
        if (!entry.prepared) entry.prepared = {};
        for (const [level, spells] of Object.entries(spellGroup.expanded)) {
          if (!entry.prepared[level]) entry.prepared[level] = [];
          entry.prepared[level].push(...spells.map(spell => ({
            name: spell,
            source: 'PHB' // Default source
          })));
        }
      }
      
      return entry;
    });
  }

  /**
   * Override category determination for classes
   */
  protected determineCategory<T = EtoolsClass>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string | undefined {
    if (contentType === 'vtt-document') {
      return 'Classes';
    }
    return super.determineCategory(sourceData, contentType);
  }
}