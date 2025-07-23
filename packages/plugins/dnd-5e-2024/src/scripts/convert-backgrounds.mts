/**
 * Background converter for 5etools data to compendium format
 */
import { BaseConverter, ConversionResult, ConvertedContent } from './base-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from './conversion-utils.mjs';
import { IBackground } from '../types/vttdocument.mjs';

export class BackgroundConverter extends BaseConverter {
  async convert(): Promise<ConversionResult> {
    try {
      this.log('Starting background conversion...');
      
      const content: ConvertedContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read background and fluff data
      const backgroundData = await readEtoolsData('backgrounds.json');
      const fluffData = await readEtoolsData('fluff-backgrounds.json');
      
      // Create fluff lookup map
      const fluffMap = new Map();
      if (fluffData.backgroundFluff) {
        for (const fluff of fluffData.backgroundFluff) {
          fluffMap.set(fluff.name, fluff);
        }
      }
      
      const backgrounds = backgroundData.background || [];
      const filteredBackgrounds = this.options.srdOnly ? filterSrdContent(backgrounds) : backgrounds;
      
      stats.total = filteredBackgrounds.length;
      this.log(`Processing ${filteredBackgrounds.length} backgrounds`);

      for (const backgroundRaw of filteredBackgrounds) {
        try {
          const fluff = fluffMap.get(backgroundRaw.name);
          const { background, assetPath } = this.convertBackground(backgroundRaw, fluff);
          
          content.push({
            type: 'document',
            subtype: 'background',
            name: background.name,
            data: background,
            originalPath: 'backgrounds.json',
            assetPath
          });
          
          stats.converted++;
        } catch (error) {
          this.log(`Error converting background ${backgroundRaw.name}:`, error);
          stats.errors++;
        }
      }

      this.log(`Background conversion complete. Stats:`, stats);
      
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

  private convertBackground(backgroundData: any, fluffData?: any): { background: IBackground; assetPath?: string } {
    const background: IBackground = {
      name: backgroundData.name || '',
      description: this.cleanRuleText(formatEntries(backgroundData.entries || [])),
      skillProficiencies: this.extractSkillProficiencies(backgroundData.skillProficiencies),
      languageProficiencies: this.extractLanguages(backgroundData.languageProficiencies),
      toolProficiencies: this.extractToolProficiencies(backgroundData.toolProficiencies),
      equipment: this.extractEquipment(backgroundData.startingEquipment),
      feature: this.extractFeature(backgroundData.feature),
      source: backgroundData.source || 'XPHB',
      page: backgroundData.page
    };

    // Extract asset path from fluff data if available  
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    return { background, assetPath };
  }

  private extractSkillProficiencies(skillData: any): string[] {
    if (!skillData) return [];
    
    const skills: string[] = [];
    
    for (const entry of skillData) {
      if (typeof entry === 'string') {
        skills.push(entry.toLowerCase());
      } else if (entry.choose && entry.choose.from) {
        // Handle choose-from format
        const options = Array.isArray(entry.choose.from) ? entry.choose.from : [];
        skills.push(...options.map((skill: string) => skill.toLowerCase()));
      }
    }
    
    return skills;
  }

  private extractLanguages(langData: any): string[] {
    if (!langData) return [];
    
    const languages: string[] = [];
    
    for (const entry of langData) {
      if (typeof entry === 'string') {
        languages.push(entry.toLowerCase());
      } else if (entry.choose && entry.choose.from) {
        // Handle choose-from format - just take the first few as examples
        const options = Array.isArray(entry.choose.from) ? entry.choose.from.slice(0, 2) : [];
        languages.push(...options.map((lang: string) => lang.toLowerCase()));
      }
    }
    
    return languages;
  }

  private extractToolProficiencies(toolData: any): string[] {
    if (!toolData) return [];
    
    const tools: string[] = [];
    
    for (const entry of toolData) {
      if (typeof entry === 'string') {
        tools.push(entry.toLowerCase());
      } else if (entry.choose && entry.choose.from) {
        // Handle choose-from format
        const options = Array.isArray(entry.choose.from) ? entry.choose.from.slice(0, 2) : [];
        tools.push(...options.map((tool: string) => tool.toLowerCase()));
      }
    }
    
    return tools;
  }

  private extractEquipment(equipmentData: any): string[] {
    if (!Array.isArray(equipmentData)) return [];
    
    return equipmentData.map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (item.item) {
        return item.item;
      } else if (item._) {
        return item._;
      }
      return '';
    }).filter(Boolean);
  }

  private extractFeature(featureData: any): IBackground['feature'] {
    if (!featureData) return undefined;
    
    return {
      name: featureData.name || '',
      description: this.cleanRuleText(formatEntries(featureData.entries || []))
    };
  }
}