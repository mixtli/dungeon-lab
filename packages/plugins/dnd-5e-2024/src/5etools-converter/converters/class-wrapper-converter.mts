/**
 * Class converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import { characterClassDocumentSchema } from '../../types/character-class.mjs';
import { z } from 'zod';
import type { EtoolsClass, EtoolsClassData, EtoolsClassFluff, EtoolsClassFluffData } from '../../5etools-types/classes.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

type ICharacterClassDocument = z.infer<typeof characterClassDocumentSchema>;

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
              const { characterClass, assetPath } = this.convertClass(classRaw, fluff);

              // Create wrapper format
              const wrapper = this.createWrapper(
                characterClass.name,
                characterClass,
                'vttdocument',
                {
                  imageId: assetPath,
                  category: this.determineCategory(classRaw, 'vttdocument'),
                  tags: this.extractTags(classRaw, 'vttdocument'),
                  sortOrder: this.calculateSortOrder(classRaw, 'vttdocument') + i
                }
              );
              
              content.push({
                type: 'vttdocument',
                wrapper,
                originalPath: `class/${classFile}`
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting class ${classRaw.name}:`, error);
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

  private convertClass(classData: EtoolsClass, fluffData?: EtoolsClassFluff): { characterClass: ICharacterClassDocument; assetPath?: string } {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    const characterClass: ICharacterClassDocument = {
      id: `class-${this.generateSlug(classData.name)}`, // Temporary ID for wrapper format
      name: classData.name,
      slug: this.generateSlug(classData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'characterClass',
      description: this.buildDescription(classData, fluffData),
      
      // Class-specific data
      data: {
        name: classData.name,
        source: classData.source || 'PHB',
        edition: '5e-2024',
        hitdie: `d${classData.hd?.faces || 8}`,
        primaryability: this.extractPrimaryAbilities(classData.primaryAbility),
        savingthrows: this.extractSavingThrows(classData.proficiency),
        proficiencies: {
          armor: classData.startingProficiencies?.armor || [],
          weapons: classData.startingProficiencies?.weapons || [],
          tools: this.extractToolProficiencies(classData.startingProficiencies?.tools) || [],
          skills: this.extractSkillProficienciesAsChoices(classData.startingProficiencies?.skills) || []
        },
        equipment: this.extractStartingEquipment(classData.startingEquipment),
        features: this.extractFeaturesAsRecord(classData.classFeature || []),
        subclasslevel: 3, // Default subclass level
        subclassTitle: classData.subclassTitle || 'Subclass',
        subclasses: [] // TODO: Extract subclasses
      }
    };

    return { characterClass, assetPath };
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

  /**
   * Override category determination for classes
   */
  protected determineCategory<T = EtoolsClass>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    if (contentType === 'vttdocument') {
      return 'Classes';
    }
    return super.determineCategory(sourceData, contentType);
  }
}