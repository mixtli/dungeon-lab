/**
 * Deity converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsDeity, EtoolsDeityData, EtoolsAlignment, EtoolsDomain } from '../../5etools-types/deities.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import type { DndDeityData } from '../../types/dnd/index.mjs';

export class DeityWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting deity wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read deity data
      const deityFiles = [
        'deities.json'
      ];

      for (const fileName of deityFiles) {
        try {
          const rawData = await readEtoolsData(fileName);
          const deityData = safeEtoolsCast<EtoolsDeityData>(rawData, ['deity'], `deity data file ${fileName}`);

          // Process deities
          const deities = extractEtoolsArray<EtoolsDeity>(deityData, 'deity', `deity list in ${fileName}`);
          const filteredDeities = this.options.srdOnly ? filterSrdContent(deities) : deities;
          
          stats.total += filteredDeities.length;
          this.log(`Processing ${filteredDeities.length} deities from ${fileName}`);

          for (let i = 0; i < filteredDeities.length; i++) {
            const deityRaw = filteredDeities[i];
            try {
              const deity = this.convertDeity(deityRaw);

              // Create wrapper format
              const wrapper = this.createWrapper(
                deity.name,
                deity,
                'vtt-document',
                {
                  category: this.determineCategory(deityRaw, 'vtt-document'),
                  tags: this.extractTags(deityRaw, 'vtt-document'),
                  sortOrder: this.calculateSortOrder(deityRaw, 'vtt-document') + i
                }
              );
              
              content.push({
                type: 'vtt-document',
                wrapper,
                originalPath: fileName
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting deity ${deityRaw.name}:`, error);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file ${fileName}:`, error);
          stats.errors++;
        }
      }

      this.log(`Deity wrapper conversion complete. Stats:`, stats);
      
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

  private convertDeity(deityData: EtoolsDeity): { 
    id: string; 
    slug: string; 
    name: string; 
    documentType: 'vtt-document';
    pluginDocumentType: 'deity';
    pluginId: 'dnd-5e-2024';
    campaignId: string;
    description: string;
    userData: Record<string, unknown>;
    pluginData: DndDeityData;
  } {
    // Transform entries to extract references
    const description = deityData.entries ? formatEntries(deityData.entries) : `${deityData.name}, deity of ${deityData.province || 'unknown domain'}.`;

    // Convert alignment codes to full alignment
    const alignment = this.convertAlignment(deityData.alignment);
    
    // Convert domains
    const domains = this.convertDomains(deityData.domains);

    const deity = {
      id: `deity-${generateSlug(deityData.name)}`,
      slug: generateSlug(deityData.name),
      name: deityData.name,
      documentType: 'vtt-document' as const, // Correct documentType from schema
      pluginDocumentType: 'deity' as const,
      pluginId: 'dnd-5e-2024' as const,
      campaignId: '',
      description,
      userData: {},
      
      // Plugin-specific data nested in pluginData
      pluginData: {
        pantheon: deityData.pantheon,
        alignment, // convertAlignment already returns string[] | undefined
        category: deityData.category,
        domains,
        province: deityData.province,
        symbol: deityData.symbol,
        source: deityData.source,
        page: deityData.page,
        rank: this.determineDeityRank(deityData.category),
        religiousInfo: this.parseReligiousInfo(description, deityData),
        relationships: this.parseRelationships(description)
      } as DndDeityData
    };

    return deity;
  }

  private convertAlignment(alignment?: EtoolsAlignment[]): string[] | undefined {
    if (!alignment) return undefined;
    
    const alignmentMap: Record<EtoolsAlignment, string> = {
      'LG': 'Lawful Good',
      'NG': 'Neutral Good', 
      'CG': 'Chaotic Good',
      'LN': 'Lawful Neutral',
      'N': 'Neutral',
      'CN': 'Chaotic Neutral',
      'LE': 'Lawful Evil',
      'NE': 'Neutral Evil',
      'CE': 'Chaotic Evil',
      'U': 'Unaligned',
      'L': 'Lawful',
      'C': 'Chaotic',
      'G': 'Good',
      'E': 'Evil'
    };
    
    return alignment.map(a => alignmentMap[a] || a);
  }

  private convertDomains(domains?: EtoolsDomain[]): DndDeityData['domains'] {
    if (!domains) return undefined;
    
    // Map 5etools domains to our enum - they should already match
    const validDomains = domains.filter(domain => 
      ['Arcana', 'Death', 'Forge', 'Grave', 'Knowledge', 'Life', 'Light',
       'Nature', 'Order', 'Peace', 'Tempest', 'Trickery', 'Twilight', 'War'].includes(domain)
    );
    
    return validDomains.length > 0 ? validDomains : undefined;
  }

  private determineDeityRank(category?: string): DndDeityData['rank'] {
    if (!category) return undefined;
    
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('greater')) return 'greater';
    if (categoryLower.includes('intermediate')) return 'intermediate';
    if (categoryLower.includes('lesser')) return 'lesser';
    if (categoryLower.includes('demigod')) return 'demigod';
    if (categoryLower.includes('quasi')) return 'quasi';
    
    return undefined;
  }

  private parseReligiousInfo(description: string, deityData: EtoolsDeity): DndDeityData['religiousInfo'] {
    const religiousInfo: NonNullable<DndDeityData['religiousInfo']> = {};
    
    // Extract holy symbol (already provided in data)
    if (deityData.symbol) {
      religiousInfo.holySymbol = deityData.symbol;
    }
    
    // Parse description for religious details
    
    // Look for typical worshippers
    const worshipperMatches = description.match(/worshipp?ed by ([^.]+)/i);
    if (worshipperMatches) {
      religiousInfo.worshippers = [worshipperMatches[1]];
    }
    
    // Look for favored weapon
    const weaponMatches = description.match(/favou?red weapon[:\s]+([^.]+)/i);
    if (weaponMatches) {
      religiousInfo.favoredWeapon = weaponMatches[1];
    }
    
    return Object.keys(religiousInfo).length > 0 ? religiousInfo : undefined;
  }

  private parseRelationships(_description: string): DndDeityData['relationships'] {
    // This would require more sophisticated parsing of deity lore
    // For now, return undefined - could be enhanced with NLP or manual curation
    return undefined;
  }
}