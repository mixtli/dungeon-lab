/**
 * Class converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import { characterClassDocumentSchema } from '../../types/character-class.mjs';
import { z } from 'zod';

type ICharacterClassDocument = z.infer<typeof characterClassDocumentSchema>;

export class ClassWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting class wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read class index to get list of available classes
      const classIndex = await readEtoolsData('class/index.json');
      const classFiles = Object.values(classIndex);

      for (const classFile of classFiles) {
        try {
          // Read class data file
          const classData = await readEtoolsData(`class/${classFile}`);
          const classes = classData.class || [];
          const filteredClasses = this.options.srdOnly ? filterSrdContent(classes) : classes;
          
          stats.total += filteredClasses.length;
          this.log(`Processing ${filteredClasses.length} classes from ${classFile}`);

          // Read corresponding fluff data
          const fluffFile = classFile.replace('class-', 'fluff-class-');
          let fluffData: any = null;
          try {
            fluffData = await readEtoolsData(`class/${fluffFile}`);
          } catch (error) {
            this.log(`No fluff data found for ${fluffFile}`);
          }

          // Create fluff lookup map
          const fluffMap = new Map();
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

  private convertClass(classData: any, fluffData?: any): { characterClass: ICharacterClassDocument; assetPath?: string } {
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
        description: this.buildDescription(classData, fluffData),
        hitDie: classData.hd?.faces || 8,
        primaryAbilities: this.extractPrimaryAbilities(classData.primaryAbility),
        savingThrowProficiencies: this.extractSavingThrows(classData.proficiency),
        skillProficiencies: this.extractSkillProficiencies(classData.startingProficiencies?.skills),
        armorProficiencies: classData.startingProficiencies?.armor || [],
        weaponProficiencies: classData.startingProficiencies?.weapons || [],
        toolProficiencies: classData.startingProficiencies?.tools || [],
        startingEquipment: this.extractStartingEquipment(classData.startingEquipment),
        features: this.extractFeatures(classData.classFeatures || classData.classFeature || []),
        subclassTitle: classData.subclassTitle || 'Subclass',
        
        // Source information
        source: classData.source || 'PHB',
        page: classData.page
      }
    };

    return { characterClass, assetPath };
  }

  private buildDescription(classData: any, fluffData?: any): string {
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

  private extractPrimaryAbilities(primaryAbility: any[]): string[] {
    if (!primaryAbility || !Array.isArray(primaryAbility)) return [];
    
    return primaryAbility.map(ability => {
      if (typeof ability === 'string') {
        return this.normalizeAbility(ability);
      }
      if (typeof ability === 'object' && ability.choose) {
        // Handle choice format
        return ability.choose.from?.map((a: string) => this.normalizeAbility(a)) || [];
      }
      return [];
    }).flat();
  }

  private extractSavingThrows(proficiency: string[]): string[] {
    if (!proficiency || !Array.isArray(proficiency)) return [];
    return proficiency.map(prof => this.normalizeAbility(prof)).filter(Boolean);
  }

  private extractSkillProficiencies(skills: any[]): string[] {
    if (!skills || !Array.isArray(skills)) return [];
    
    const skillList: string[] = [];
    for (const skill of skills) {
      if (typeof skill === 'string') {
        skillList.push(skill.toLowerCase());
      } else if (skill.choose && skill.choose.from) {
        skillList.push(...skill.choose.from.map((s: string) => s.toLowerCase()));
      }
    }
    
    return skillList;
  }

  private extractStartingEquipment(equipment: any): any {
    if (!equipment) return {};
    
    // Simplified equipment extraction - would need more complex logic for full implementation
    return {
      default: equipment.default || [],
      goldAlternative: equipment.goldAlternative
    };
  }

  private extractFeatures(features: any[]): any[] {
    if (!features || !Array.isArray(features)) return [];
    
    return features.map(feature => ({
      name: feature.name || 'Unknown Feature',
      level: feature.level || 1,
      description: formatEntries(feature.entries || []),
      source: feature.source
    }));
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Override category determination for classes
   */
  protected determineCategory(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    if (contentType === 'vttdocument') {
      return 'Classes';
    }
    return super.determineCategory(sourceData, contentType);
  }
}