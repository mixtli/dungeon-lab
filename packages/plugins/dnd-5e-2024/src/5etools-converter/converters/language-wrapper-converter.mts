/**
 * Language converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsLanguage, EtoolsLanguageData, EtoolsLanguageType } from '../../5etools-types/languages.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import type { DndLanguageData } from '../../types/dnd/index.mjs';

export class LanguageWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting language wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read language data
      const languageFiles = [
        'languages.json'
      ];

      for (const fileName of languageFiles) {
        try {
          const rawData = await readEtoolsData(fileName);
          const languageData = safeEtoolsCast<EtoolsLanguageData>(rawData, ['language'], `language data file ${fileName}`);

          // Process languages
          const languages = extractEtoolsArray<EtoolsLanguage>(languageData, 'language', `language list in ${fileName}`);
          const filteredLanguages = this.options.srdOnly ? filterSrdContent(languages) : languages;
          
          stats.total += filteredLanguages.length;
          this.log(`Processing ${filteredLanguages.length} languages from ${fileName}`);

          for (let i = 0; i < filteredLanguages.length; i++) {
            const languageRaw = filteredLanguages[i];
            try {
              const language = this.convertLanguage(languageRaw);

              // Create wrapper format
              const wrapper = this.createWrapper(
                language.name,
                language,
                'vtt-document',
                {
                  category: this.determineCategory(languageRaw, 'vtt-document'),
                  tags: this.extractTags(languageRaw, 'vtt-document'),
                  sortOrder: this.calculateSortOrder(languageRaw, 'vtt-document') + i
                }
              );
              
              content.push({
                type: 'vtt-document',
                wrapper,
                originalPath: fileName
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting language ${languageRaw.name}:`, error);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file ${fileName}:`, error);
          stats.errors++;
        }
      }

      this.log(`Language wrapper conversion complete. Stats:`, stats);
      
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

  private convertLanguage(languageData: EtoolsLanguage): { 
    id: string; 
    slug: string; 
    name: string; 
    documentType: 'vtt-document';
    pluginDocumentType: 'language';
    pluginId: 'dnd-5e-2024';
    campaignId: string;
    description: string;
    userData: Record<string, unknown>;
    pluginData: DndLanguageData;
  } {
    // Transform entries to extract references
    const description = languageData.entries ? formatEntries(languageData.entries) : 
      this.generateLanguageDescription(languageData);

    // Convert language type
    const type = this.convertLanguageType(languageData.type);
    
    // Parse language details
    const characteristics = this.parseLanguageCharacteristics(languageData, description);
    const scriptInfo = this.parseScriptInfo(languageData);
    const cultural = this.parseCulturalInfo(languageData, description);

    const language = {
      id: `language-${generateSlug(languageData.name)}`,
      slug: generateSlug(languageData.name),
      name: languageData.name,
      documentType: 'vtt-document' as const, // Correct documentType from schema
      pluginDocumentType: 'language' as const,
      pluginId: 'dnd-5e-2024' as const,
      campaignId: '',
      description,
      userData: {},
      
      // Plugin-specific data nested in pluginData
      pluginData: {
        type,
        script: languageData.script,
        typicalSpeakers: this.parseTypicalSpeakers(languageData.typicalSpeakers),
        source: languageData.source,
        page: languageData.page,
        characteristics,
        scriptInfo,
        cultural,
        mechanics: this.parseLanguageMechanics(languageData, description)
      } as DndLanguageData
    };

    return language;
  }

  private convertLanguageType(type?: EtoolsLanguageType): DndLanguageData['type'] {
    if (!type) return 'standard'; // Default assumption
    
    switch (type) {
      case 'standard': return 'standard';
      case 'exotic': return 'exotic';
      case 'secret': return 'secret';
      default: return 'standard';
    }
  }

  private generateLanguageDescription(languageData: EtoolsLanguage): string {
    const speakers = languageData.typicalSpeakers?.join(', ') || 'various creatures';
    const script = languageData.script ? ` using ${languageData.script} script` : '';
    const type = languageData.type ? ` (${languageData.type} language)` : '';
    
    return `A language typically spoken by ${speakers}${script}${type}.`;
  }

  private parseLanguageCharacteristics(languageData: EtoolsLanguage, description: string): DndLanguageData['characteristics'] {
    const characteristics: NonNullable<DndLanguageData['characteristics']> = {};
    
    // Determine if it has written form
    if (languageData.script || description.toLowerCase().includes('script') || description.toLowerCase().includes('written')) {
      characteristics.hasWrittenForm = true;
    }
    
    // Determine status
    if (description.toLowerCase().includes('dead') || description.toLowerCase().includes('ancient')) {
      characteristics.status = 'ancient';
    } else if (description.toLowerCase().includes('secret')) {
      characteristics.status = 'secret';
    } else {
      characteristics.status = 'living';
    }
    
    // Difficulty based on type
    if (languageData.type === 'exotic') {
      characteristics.difficulty = 'hard';
    } else if (languageData.type === 'secret') {
      characteristics.difficulty = 'extreme';
    } else {
      characteristics.difficulty = 'moderate';
    }
    
    return Object.keys(characteristics).length > 0 ? characteristics : undefined;
  }

  private parseScriptInfo(languageData: EtoolsLanguage): DndLanguageData['scriptInfo'] {
    if (!languageData.script) return undefined;
    
    return {
      scriptName: languageData.script,
      description: `Uses the ${languageData.script} script for written communication.`
    };
  }

  private parseCulturalInfo(languageData: EtoolsLanguage, description: string): DndLanguageData['cultural'] {
    const cultural: NonNullable<DndLanguageData['cultural']> = {};
    
    // Extract cultures from typical speakers
    if (languageData.typicalSpeakers) {
      const cultures = languageData.typicalSpeakers.filter(speaker => 
        !speaker.includes('{@') && // Filter out embedded references
        speaker.length > 2 && // Filter out very short entries
        !speaker.toLowerCase().includes('creature') // Filter out generic creature references
      );
      
      if (cultures.length > 0) {
        cultural.cultures = cultures;
      }
    }
    
    // Check for ceremonial use
    if (description.toLowerCase().includes('ceremon') || description.toLowerCase().includes('ritual') || description.toLowerCase().includes('religious')) {
      cultural.ceremonialUse = true;
    }
    
    return Object.keys(cultural).length > 0 ? cultural : undefined;
  }

  private parseLanguageMechanics(languageData: EtoolsLanguage, _description: string): DndLanguageData['mechanics'] {
    const mechanics: NonNullable<DndLanguageData['mechanics']> = {};
    
    // Secret languages often provide special knowledge
    if (languageData.type === 'secret') {
      mechanics.providesSecretKnowledge = true;
      mechanics.canBelearned = false;
      mechanics.learningRequirements = 'Must be taught by someone who already knows the language or discover it through special means';
    } else {
      mechanics.canBelearned = true;
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
  }

  private parseTypicalSpeakers(speakers?: string[]): string[] | undefined {
    if (!speakers) return undefined;
    
    // Clean up speaker references by removing embedded reference syntax
    const cleanedSpeakers = speakers.map(speaker => {
      // Remove {@creature name} and similar references, keeping just the name
      return speaker.replace(/{@\w+\s+([^|}]+)(?:\|[^}]+)?}/g, '$1');
    }).filter(speaker => speaker.trim().length > 0);
    
    return cleanedSpeakers.length > 0 ? cleanedSpeakers : undefined;
  }
}