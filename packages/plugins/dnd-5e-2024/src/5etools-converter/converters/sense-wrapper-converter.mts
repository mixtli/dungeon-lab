/**
 * Sense converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsSense, EtoolsSenseData } from '../../5etools-types/senses.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import { transformMonsterEntries } from '../utils/reference-transformer.mjs';
import type { DndSenseData } from '../../types/dnd/index.mjs';

export class SenseWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting sense wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read sense data
      const senseFiles = [
        'senses.json'
      ];

      for (const fileName of senseFiles) {
        try {
          const rawData = await readEtoolsData(fileName);
          const senseData = safeEtoolsCast<EtoolsSenseData>(rawData, ['sense'], `sense data file ${fileName}`);

          // Process senses
          const senses = extractEtoolsArray<EtoolsSense>(senseData, 'sense', `sense list in ${fileName}`);
          const filteredSenses = this.options.srdOnly ? filterSrdContent(senses) : senses;
          
          stats.total += filteredSenses.length;
          this.log(`Processing ${filteredSenses.length} senses from ${fileName}`);

          for (let i = 0; i < filteredSenses.length; i++) {
            const senseRaw = filteredSenses[i];
            try {
              const sense = this.convertSense(senseRaw);

              // Create wrapper format
              const wrapper = this.createWrapper(
                sense.name,
                sense,
                'vtt-document',
                {
                  category: this.determineCategory(senseRaw, 'vtt-document'),
                  tags: this.extractTags(senseRaw, 'vtt-document'),
                  sortOrder: this.calculateSortOrder(senseRaw, 'vtt-document') + i
                }
              );
              
              content.push({
                type: 'vtt-document',
                wrapper,
                originalPath: fileName
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting sense ${senseRaw.name}:`, error);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file ${fileName}:`, error);
          stats.errors++;
        }
      }

      this.log(`Sense wrapper conversion complete. Stats:`, stats);
      
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

  private convertSense(senseData: EtoolsSense): { 
    id: string; 
    slug: string; 
    name: string; 
    documentType: 'vtt-document';
    pluginDocumentType: 'sense';
    pluginId: 'dnd-5e-2024';
    campaignId: string;
    description: string;
    userData: Record<string, unknown>;
    pluginData: DndSenseData;
  } {
    // Transform entries to extract references
    const transformResult = transformMonsterEntries(senseData.entries);
    const description = formatEntries(transformResult.entries);

    // Parse sense mechanics
    const mechanics = this.parseSenseMechanics(senseData.name, description);
    const limitations = this.parseLimitations(description);
    const acquisition = this.parseAcquisition(description);
    const gameImpact = this.parseGameImpact(description);

    const sense = {
      id: `sense-${generateSlug(senseData.name)}`,
      slug: generateSlug(senseData.name),
      name: senseData.name,
      documentType: 'vtt-document' as const, // Correct documentType from schema
      pluginDocumentType: 'sense' as const,
      pluginId: 'dnd-5e-2024' as const,
      campaignId: '',
      description,
      userData: {},
      
      // Plugin-specific data nested in pluginData
      pluginData: {
        source: senseData.source,
        page: senseData.page,
        mechanics,
        limitations,
        typicalCreatures: this.extractTypicalCreatures(description),
        acquisition,
        gameImpact
      } as DndSenseData
    };

    return sense;
  }

  private parseSenseMechanics(name: string, description: string): DndSenseData['mechanics'] {
    const mechanics: NonNullable<DndSenseData['mechanics']> = {};
    
    // Parse default range
    const rangeMatch = description.match(/(\d+)\s*feet?/i);
    if (rangeMatch) {
      mechanics.defaultRange = parseInt(rangeMatch[1], 10);
    }
    
    // Determine capabilities based on sense name and description
    const nameDesc = (name + ' ' + description).toLowerCase();
    
    if (nameDesc.includes('darkness') || name.toLowerCase().includes('darkvision')) {
      mechanics.worksInDarkness = true;
    }
    
    if (nameDesc.includes('invisible') || name.toLowerCase().includes('blindsight') || name.toLowerCase().includes('truesight')) {
      mechanics.detectsInvisible = true;
    }
    
    if (name.toLowerCase().includes('blindsight')) {
      mechanics.requiresLineOfSight = false;
      mechanics.canBeBlocked = true;
      mechanics.blockedBy = ['total cover'];
    } else if (name.toLowerCase().includes('darkvision')) {
      mechanics.requiresLineOfSight = true;
      mechanics.canBeBlocked = true;
      mechanics.blockedBy = ['total cover', 'magical darkness'];
    } else if (name.toLowerCase().includes('truesight')) {
      mechanics.requiresLineOfSight = true;
      mechanics.canBeBlocked = false;
    }
    
    // Determine what the sense detects
    const detects: NonNullable<NonNullable<DndSenseData['mechanics']>['detects']> = [];
    
    if (nameDesc.includes('creature') || nameDesc.includes('see')) {
      detects.push('creatures');
    }
    if (nameDesc.includes('object')) {
      detects.push('objects');
    }
    if (nameDesc.includes('magic') || name.toLowerCase().includes('truesight')) {
      detects.push('magic');
    }
    if (nameDesc.includes('undead')) {
      detects.push('undead');
    }
    if (nameDesc.includes('emotion')) {
      detects.push('emotions');
    }
    if (nameDesc.includes('thought')) {
      detects.push('thoughts');
    }
    if (nameDesc.includes('life') || nameDesc.includes('living')) {
      detects.push('life_force');
    }
    if (nameDesc.includes('movement') || nameDesc.includes('motion')) {
      detects.push('movement');
    }
    if (nameDesc.includes('vibration') || nameDesc.includes('tremor')) {
      detects.push('vibrations');
    }
    if (nameDesc.includes('heat') || nameDesc.includes('thermal')) {
      detects.push('heat');
    }
    
    if (detects.length > 0) {
      mechanics.detects = detects;
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
  }

  private parseLimitations(description: string): DndSenseData['limitations'] {
    const limitations: NonNullable<DndSenseData['limitations']> = {};
    const descLower = description.toLowerCase();
    
    // Parse conditions that disable the sense
    const disabledBy: string[] = [];
    if (descLower.includes('blinded') && descLower.includes('disabled')) {
      disabledBy.push('blinded condition');
    }
    if (descLower.includes('deafened') && descLower.includes('disabled')) {
      disabledBy.push('deafened condition');
    }
    
    if (disabledBy.length > 0) {
      limitations.disabledBy = disabledBy;
    }
    
    // Parse environmental factors
    const reducedBy: string[] = [];
    if (descLower.includes('fog') || descLower.includes('mist')) {
      reducedBy.push('heavy obscurement');
    }
    if (descLower.includes('loud noise') || descLower.includes('thunderous')) {
      reducedBy.push('overwhelming noise');
    }
    
    if (reducedBy.length > 0) {
      limitations.reducedBy = reducedBy;
    }
    
    return Object.keys(limitations).length > 0 ? limitations : undefined;
  }

  private extractTypicalCreatures(description: string): string[] | undefined {
    const creatures: string[] = [];
    
    // Look for creature mentions in the description
    const creatureMatches = description.match(/\b(dragons?|bats?|oozes?|elementals?|undead|fiends?|celestials?|constructs?|plants?|beasts?)\b/gi);
    if (creatureMatches) {
      creatureMatches.forEach(match => {
        const creature = match.toLowerCase();
        if (!creatures.includes(creature)) {
          creatures.push(creature);
        }
      });
    }
    
    return creatures.length > 0 ? creatures : undefined;
  }

  private parseAcquisition(_description: string): DndSenseData['acquisition'] {
    const acquisition: NonNullable<DndSenseData['acquisition']> = {};
    
    // This would require more sophisticated parsing
    // For now, make some basic assumptions based on common senses
    acquisition.magicalMeans = true;
    acquisition.magicalItems = true;
    
    return Object.keys(acquisition).length > 0 ? acquisition : undefined;
  }

  private parseGameImpact(description: string): DndSenseData['gameImpact'] {
    const gameImpact: NonNullable<DndSenseData['gameImpact']> = {};
    
    // Parse stealth interaction
    if (description.toLowerCase().includes('hidden') || description.toLowerCase().includes('invisible')) {
      gameImpact.stealthInteraction = 'Can detect hidden or invisible creatures within range';
    }
    
    // Parse combat advantages
    const combatAdvantages: string[] = [];
    if (description.toLowerCase().includes('advantage')) {
      combatAdvantages.push('Provides advantage on relevant checks');
    }
    if (description.toLowerCase().includes('attack') && description.toLowerCase().includes('disadvantage')) {
      combatAdvantages.push('Negates disadvantage from unseen attackers');
    }
    
    if (combatAdvantages.length > 0) {
      gameImpact.combatAdvantages = combatAdvantages;
    }
    
    // Parse exploration benefits
    const explorationBenefits: string[] = [];
    if (description.toLowerCase().includes('darkness')) {
      explorationBenefits.push('Allows navigation in dark environments');
    }
    if (description.toLowerCase().includes('obstacle') || description.toLowerCase().includes('terrain')) {
      explorationBenefits.push('Helps navigate difficult terrain');
    }
    
    if (explorationBenefits.length > 0) {
      gameImpact.explorationBenefits = explorationBenefits;
    }
    
    return Object.keys(gameImpact).length > 0 ? gameImpact : undefined;
  }
}