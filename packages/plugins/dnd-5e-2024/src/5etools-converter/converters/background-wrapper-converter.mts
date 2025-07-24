/**
 * Background converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsBackground, EtoolsBackgroundData, EtoolsBackgroundSkills, EtoolsBackgroundLanguages, EtoolsBackgroundToolProficiencies, EtoolsBackgroundStartingEquipment, EtoolsBackgroundFeature } from '../../5etools-types/backgrounds.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { IBackgroundDocument } from '../../types/vttdocument.mjs';

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

export class BackgroundWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting background wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read background and fluff data
      const backgroundData = safeEtoolsCast<EtoolsBackgroundData>(
        await readEtoolsData('backgrounds.json'), 
        ['background'], 
        'background data'
      );
      const fluffData = safeEtoolsCast<EtoolsBackgroundFluffData>(
        await readEtoolsData('fluff-backgrounds.json'), 
        [], 
        'background fluff data'
      );
      
      // Create fluff lookup map
      const fluffMap = new Map<string, EtoolsBackgroundFluff>();
      if (fluffData.backgroundFluff) {
        for (const fluff of fluffData.backgroundFluff) {
          fluffMap.set(fluff.name, fluff);
        }
      }
      
      const backgrounds = extractEtoolsArray<EtoolsBackground>(backgroundData, 'background', 'background data');
      const filteredBackgrounds = this.options.srdOnly ? filterSrdContent(backgrounds) : backgrounds;
      
      stats.total = filteredBackgrounds.length;
      this.log(`Processing ${filteredBackgrounds.length} backgrounds`);

      for (let i = 0; i < filteredBackgrounds.length; i++) {
        const backgroundRaw = filteredBackgrounds[i];
        try {
          const fluff = fluffMap.get(backgroundRaw.name);
          const { background, assetPath } = this.convertBackground(backgroundRaw, fluff);

          // Create wrapper format
          const wrapper = this.createWrapper(
            background.name,
            background,
            'vttdocument',
            {
              imageId: assetPath,
              category: this.determineCategory(backgroundRaw, 'vttdocument'),
              tags: this.extractTags(backgroundRaw, 'vttdocument'),
              sortOrder: this.calculateSortOrder(backgroundRaw, 'vttdocument') + i
            }
          );
          
          content.push({
            type: 'vttdocument',
            wrapper,
            originalPath: 'backgrounds.json'
          });
          
          stats.converted++;
        } catch (error) {
          this.log(`Error converting background ${backgroundRaw.name}:`, error);
          stats.errors++;
        }
      }

      this.log(`Background wrapper conversion complete. Stats:`, stats);
      
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

  private convertBackground(backgroundData: EtoolsBackground, fluffData?: EtoolsBackgroundFluff): { background: IBackgroundDocument; assetPath?: string } {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    const background: IBackgroundDocument = {
      id: `bg-${this.generateSlug(backgroundData.name)}`, // Temporary ID for wrapper format
      name: backgroundData.name,
      slug: this.generateSlug(backgroundData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'background',
      description: this.buildDescription(backgroundData, fluffData),
      
      // Background-specific data  
      data: {
        name: backgroundData.name,
        description: this.buildDescription(backgroundData, fluffData),
        skillProficiencies: this.extractSkillProficiencies(backgroundData.skillProficiencies),
        languageProficiencies: this.extractLanguages(backgroundData.languageProficiencies),
        toolProficiencies: this.extractToolProficiencies(backgroundData.toolProficiencies),
        equipment: this.extractEquipment(backgroundData.startingEquipment),
        feature: this.extractFeature(backgroundData.feature),
        
        // Source information
        source: backgroundData.source || 'PHB',
        page: backgroundData.page
      }
    };

    return { background, assetPath };
  }

  private buildDescription(backgroundData: EtoolsBackground, fluffData?: EtoolsBackgroundFluff): string {
    let description = '';
    
    // Use fluff description if available
    if (fluffData?.entries) {
      description = formatEntries(fluffData.entries);
    } else if (backgroundData.entries) {
      description = formatEntries(backgroundData.entries);
    }
    
    // Fallback description
    if (!description) {
      description = `The ${backgroundData.name} background provides specific skills, proficiencies, and a unique feature for character creation.`;
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

  private extractSkillProficiencies(skillData?: EtoolsBackgroundSkills[]): string[] {
    if (!skillData) return [];
    
    const skills: string[] = [];
    
    for (const entry of skillData) {
      // Handle object with skill names as keys
      for (const [skill, value] of Object.entries(entry)) {
        if (skill === 'choose') continue; // Skip choose property
        
        if (value === true) {
          skills.push(skill.toLowerCase());
        }
      }
      
      // Handle choose-from format
      if (entry.choose && entry.choose.choose.from) {
        const options = Array.isArray(entry.choose.choose.from) ? entry.choose.choose.from : [];
        skills.push(...options.map((skill: string) => skill.toLowerCase()));
      }
    }
    
    return skills;
  }

  private extractLanguages(langData?: EtoolsBackgroundLanguages[]): string[] {
    if (!langData) return [];
    
    const languages: string[] = [];
    
    for (const entry of langData) {
      // Handle object with language names as keys
      for (const [language, value] of Object.entries(entry)) {
        if (language === 'choose') continue; // Skip choose property
        
        if (value === true) {
          languages.push(language.toLowerCase());
        }
      }
      
      // Handle choose-from format - just take the first few as examples
      if (entry.choose && entry.choose.choose.from) {
        const options = Array.isArray(entry.choose.choose.from) ? entry.choose.choose.from.slice(0, 2) : [];
        languages.push(...options.map((lang: string) => lang.toLowerCase()));
      }
    }
    
    return languages;
  }

  private extractToolProficiencies(toolData?: EtoolsBackgroundToolProficiencies[]): string[] {
    if (!toolData) return [];
    
    const tools: string[] = [];
    
    for (const entry of toolData) {
      // Handle object with tool names as keys
      for (const [tool, value] of Object.entries(entry)) {
        if (tool === 'choose') continue; // Skip choose property
        
        if (value === true) {
          tools.push(tool.toLowerCase());
        }
      }
      
      // Handle choose-from format
      if (entry.choose && entry.choose.choose.from) {
        const options = Array.isArray(entry.choose.choose.from) ? entry.choose.choose.from.slice(0, 2) : [];
        tools.push(...options.map((tool: string) => tool.toLowerCase()));
      }
    }
    
    return tools;
  }

  private extractEquipment(equipmentData?: EtoolsBackgroundStartingEquipment[]): string[] {
    if (!equipmentData) return [];
    
    const equipment: string[] = [];
    
    for (const equipmentSet of equipmentData) {
      // Handle the various equipment list properties
      if (equipmentSet._) {
        equipment.push(...equipmentSet._);
      }
      if (equipmentSet.a) {
        equipment.push(...equipmentSet.a);
      }
      if (equipmentSet.b) {
        equipment.push(...equipmentSet.b);
      }
      if (equipmentSet.c) {
        equipment.push(...equipmentSet.c);
      }
      if (equipmentSet.d) {
        equipment.push(...equipmentSet.d);
      }
      if (equipmentSet.e) {
        equipment.push(...equipmentSet.e);
      }
    }
    
    return equipment.filter(Boolean);
  }

  private extractFeature(featureData?: EtoolsBackgroundFeature): { name: string; description: string } | undefined {
    if (!featureData) return undefined;
    
    return {
      name: featureData.name || '',
      description: this.cleanRuleText(formatEntries(featureData.entries || []))
    };
  }

  /**
   * Override category determination for backgrounds
   */
  protected determineCategory<T = EtoolsBackground>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    if (contentType === 'vttdocument') {
      return 'Backgrounds';
    }
    return super.determineCategory(sourceData, contentType);
  }

  /**
   * Override tag extraction for backgrounds
   */
  protected extractTags<T = EtoolsBackground>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): string[] {
    const baseTags = super.extractTags(sourceData, contentType);
    
    if (contentType === 'vttdocument') {
      // Add background-specific tags
      baseTags.push('Background');
      
      // Add skill tags
      if (sourceData && typeof sourceData === 'object' && 'skillProficiencies' in sourceData && 
          sourceData.skillProficiencies) {
        const skills = this.extractSkillProficiencies(sourceData.skillProficiencies as EtoolsBackground['skillProficiencies']);
        skills.forEach(skill => {
          baseTags.push(skill.charAt(0).toUpperCase() + skill.slice(1));
        });
      }
    }
    
    return baseTags;
  }

  /**
   * Override sort order calculation for backgrounds - alphabetical
   */
  protected calculateSortOrder<T = EtoolsBackground>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): number {
    if (contentType === 'vttdocument') {
      // Alphabetical sorting for backgrounds
      return 0; // Let the base index handle ordering
    }
    return super.calculateSortOrder(sourceData, contentType);
  }
}