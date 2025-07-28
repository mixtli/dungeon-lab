/**
 * Background converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries, validateBackgroundData, ValidationResult } from '../utils/conversion-utils.mjs';
import type { 
  EtoolsBackground, 
  EtoolsBackgroundData, 
  EtoolsBackgroundSkills, 
  EtoolsBackgroundLanguages, 
  EtoolsBackgroundToolProficiencies, 
  EtoolsBackgroundStartingEquipment, 
  EtoolsBackgroundFeature,
  EtoolsAbilityScoreImprovement,
  EtoolsBackgroundFeats,
  EtoolsEquipmentItem
} from '../../5etools-types/backgrounds.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { createDocumentReference, generateSlug } from '../../types/utils.mjs';

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
          const { background, assetPath, validationResult } = await this.convertBackground(backgroundRaw, fluff);

          // Check validation result
          if (!validationResult.success) {
            this.log(`❌ Background ${backgroundRaw.name} failed validation:`, validationResult.errors);
            stats.errors++;
            continue; // Skip this background and continue with next
          }

          // Log successful validation
          this.log(`✅ Background ${backgroundRaw.name} validated successfully`);

          // Create wrapper format using the full document structure
          const wrapper = this.createWrapper(
            background.name,
            background, // Always use the full structure for proper directory mapping
            'vtt-document',
            {
              imageId: assetPath,
              category: this.determineCategory(backgroundRaw, 'vtt-document'),
              tags: this.extractTags(backgroundRaw, 'vtt-document'),
              sortOrder: this.calculateSortOrder(backgroundRaw, 'vtt-document') + i
            }
          );
          
          content.push({
            type: 'vtt-document',
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

  private async convertBackground(backgroundData: EtoolsBackground, fluffData?: EtoolsBackgroundFluff): Promise<{ background: {
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

    // Create simplified background structure for validation
    const backgroundDataForValidation = {
      name: backgroundData.name,
      description: this.buildDescription(backgroundData, fluffData),
      
      // 2024 D&D features
      abilityScoreImprovements: this.extractAbilityScoreImprovements(backgroundData.ability),
      feats: this.extractFeatsWithRefs(backgroundData.feats),
      
      // Enhanced proficiencies with document references
      skillProficiencies: this.extractSkillProficienciesWithRefs(backgroundData.skillProficiencies),
      toolProficiencies: this.extractToolProficienciesWithRefs(backgroundData.toolProficiencies),
      languageProficiencies: this.extractLanguageProficienciesWithRefs(backgroundData.languageProficiencies),
      
      // Enhanced equipment with choices
      startingEquipment: this.extractStartingEquipmentEnhanced(backgroundData.startingEquipment),
      
      // Background feature
      feature: this.extractFeatureEnhanced(backgroundData.feature),
      
      // Suggested characteristics
      suggestedCharacteristics: this.extractSuggestedCharacteristics(backgroundData),
      
      // Source information
      source: backgroundData.source || 'PHB',
      page: backgroundData.page
    };

    // Create full document structure for output (regardless of validation)
    const background = {
      id: `background-${this.generateSlug(backgroundData.name)}`,
      name: backgroundData.name,
      slug: this.generateSlug(backgroundData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'vtt-document', // Correct documentType from schema
      description: this.buildDescription(backgroundData, fluffData),
      campaignId: '',
      userData: {},
      pluginDocumentType: 'background', // Specific DnD type
      pluginData: backgroundDataForValidation
    };

    // Validate the simplified background data against the schema
    const validationResult = await validateBackgroundData(backgroundDataForValidation);

    return { background, assetPath, validationResult };
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



  /**
   * Override category determination for backgrounds
   */
  protected determineCategory<T = EtoolsBackground>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string | undefined {
    if (contentType === 'vtt-document') {
      return 'Backgrounds';
    }
    return super.determineCategory(sourceData, contentType);
  }

  /**
   * Override tag extraction for backgrounds
   */
  protected extractTags<T = EtoolsBackground>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string[] {
    const baseTags = super.extractTags(sourceData, contentType);
    
    if (contentType === 'vtt-document') {
      // Add background-specific tags
      baseTags.push('Background');
      
      // Add skill tags
      if (sourceData && typeof sourceData === 'object' && 'skillProficiencies' in sourceData && 
          sourceData.skillProficiencies) {
        const skills = this.extractSkillProficienciesWithRefs(sourceData.skillProficiencies as EtoolsBackground['skillProficiencies']);
        skills?.forEach((skill) => {
          baseTags.push(skill.displayName);
        });
      }
    }
    
    return baseTags;
  }

  /**
   * Override sort order calculation for backgrounds - alphabetical
   */
  protected calculateSortOrder<T = EtoolsBackground>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): number {
    if (contentType === 'vtt-document') {
      // Alphabetical sorting for backgrounds
      return 0; // Let the base index handle ordering
    }
    return super.calculateSortOrder(sourceData, contentType);
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
   * Extract ability score improvements from 2024 D&D backgrounds
   */
  private extractAbilityScoreImprovements(abilityData?: EtoolsAbilityScoreImprovement[]) {
    if (!abilityData) return undefined;
    
    return abilityData.map(improvement => ({
      type: 'weighted' as const,
      choices: [{
        from: improvement.choose.weighted.from as ('str' | 'dex' | 'con' | 'int' | 'wis' | 'cha')[],
        weights: improvement.choose.weighted.weights,
        total: improvement.choose.weighted.weights.reduce((sum, weight) => sum + weight, 0)
      }]
    }));
  }

  /**
   * Extract background feats with _ref objects for compendium format
   */
  private extractFeatsWithRefs(featsData?: EtoolsBackgroundFeats[]) {
    if (!featsData) return undefined;
    
    const feats = [];
    for (const featSet of featsData) {
      for (const [featName, enabled] of Object.entries(featSet)) {
        if (enabled) {
          // Parse feat name like "magic initiate; cleric|xphb"
          const parts = featName.split(';');
          const name = parts[0].trim();
          const variant = parts[1] ? parts[1].trim() : undefined;
          const slug = generateSlug(name);
          
          // Extract source from variant if present (e.g., "cleric|xphb")
          let source = 'XPHB';
          let metadata: Record<string, unknown> | undefined;
          
          if (variant) {
            const variantParts = variant.split('|');
            if (variantParts.length > 1) {
              source = variantParts[1].toUpperCase();
              metadata = { variant: variantParts[0] };
            } else {
              metadata = { variant };
            }
          }
          
          feats.push({
            _ref: createDocumentReference(
              slug,
              'vtt-document',
              'feat',
              source,
              metadata
            ),
            displayName: name.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          });
        }
      }
    }
    
    return feats.length > 0 ? feats : undefined;
  }

  /**
   * Extract skill proficiencies with _ref objects for compendium format
   */
  private extractSkillProficienciesWithRefs(skillData?: EtoolsBackgroundSkills[]) {
    if (!skillData) return undefined;
    
    const skills = [];
    
    for (const entry of skillData) {
      // Handle object with skill names as keys
      for (const [skill, value] of Object.entries(entry)) {
        if (skill === 'choose') continue; // Skip choose property
        
        if (value === true) {
          const slug = generateSlug(skill);
          const displayName = skill.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          skills.push({
            _ref: createDocumentReference(
              slug,
              'vtt-document',
              'skill',
              'XPHB'
            ),
            displayName
          });
        }
      }
    }
    
    return skills.length > 0 ? skills : undefined;
  }

  /**
   * Extract tool proficiencies with _ref objects for compendium format
   */
  private extractToolProficienciesWithRefs(toolData?: EtoolsBackgroundToolProficiencies[]) {
    if (!toolData) return undefined;
    
    const tools = [];
    
    for (const entry of toolData) {
      // Handle object with tool names as keys
      for (const [tool, value] of Object.entries(entry)) {
        if (tool === 'choose') continue; // Skip choose property
        
        if (value === true) {
          const slug = generateSlug(tool);
          const displayName = tool.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          tools.push({
            _ref: createDocumentReference(
              slug,
              'vtt-document',
              'tool',
              'XPHB'
            ),
            displayName
          });
        }
      }
    }
    
    return tools.length > 0 ? tools : undefined;
  }

  /**
   * Extract language proficiencies with _ref objects for compendium format
   */
  private extractLanguageProficienciesWithRefs(langData?: EtoolsBackgroundLanguages[]) {
    if (!langData) return undefined;
    
    const languages = [];
    
    for (const entry of langData) {
      // Handle object with language names as keys
      for (const [language, value] of Object.entries(entry)) {
        if (language === 'choose') continue; // Skip choose property
        
        if (value === true) {
          const slug = generateSlug(language);
          const displayName = language.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          languages.push({
            _ref: createDocumentReference(
              slug,
              'vtt-document',
              'language',
              'XPHB'
            ),
            displayName
          });
        } else if (language === 'anyStandard' && typeof value === 'number') {
          // Handle "any 2 languages" type entries - create a special reference
          languages.push({
            _ref: createDocumentReference(
              'any-standard',
              'vtt-document',
              'language',
              'XPHB',
              { type: 'any-standard' }
            ),
            displayName: `Any ${value} Standard Languages`,
            count: value
          });
        }
      }
    }
    
    return languages.length > 0 ? languages : undefined;
  }

  /**
   * Enhanced starting equipment extraction with choice structure
   */
  private extractStartingEquipmentEnhanced(equipmentData?: EtoolsBackgroundStartingEquipment[]) {
    if (!equipmentData || equipmentData.length === 0) return undefined;
    
    const equipmentSet = equipmentData[0];
    
    // Check if this has choice options (A/B structure)
    if (equipmentSet.A || equipmentSet.B) {
      const options = [];
      
      if (equipmentSet.A) {
        options.push({
          label: 'A',
          items: this.parseEquipmentItems(equipmentSet.A)
        });
      }
      
      if (equipmentSet.B) {
        options.push({
          label: 'B',
          items: this.parseEquipmentItems(equipmentSet.B)
        });
      }
      
      return {
        type: 'choice' as const,
        options
      };
    }
    
    // Fallback to legacy format (just a list)
    const items = [];
    if (equipmentSet._) items.push(...equipmentSet._);
    if (equipmentSet.a) items.push(...equipmentSet.a);
    if (equipmentSet.b) items.push(...equipmentSet.b);
    
    return items.length > 0 ? items.map(item => {
      const itemName = typeof item === 'string' ? item : item.item || item.special || 'unknown';
      const category = this.categorizeItemByName(itemName);
      return createDocumentReference(
        generateSlug(itemName),
        'item',
        category,
        'XPHB'
      );
    }) : undefined;
  }

  /**
   * Determine item category from item name (simplified version for backgrounds)
   * This is a simplified categorization since we only have item names, not full data
   */
  private categorizeItemByName(itemName: string): string {
    const name = itemName.toLowerCase();
    
    // Weapons
    if (name.includes('sword') || name.includes('axe') || name.includes('bow') || 
        name.includes('dagger') || name.includes('spear') || name.includes('mace') ||
        name.includes('crossbow') || name.includes('javelin') || name.includes('club') ||
        name.includes('scimitar') || name.includes('rapier') || name.includes('hammer') ||
        name.includes('staff') && (name.includes('quarter') || name.includes('combat'))) {
      return 'weapon';
    }
    
    // Armor
    if (name.includes('armor') || name.includes('mail') || name.includes('plate') ||
        name.includes('leather') && name.includes('studded') || name.includes('breastplate') ||
        name.includes('scale mail') || name.includes('chain shirt') || name.includes('splint')) {
      return 'armor';
    }
    
    // Shields
    if (name.includes('shield')) {
      return 'shield';
    }
    
    // Tools
    if (name.includes('tools') || name.includes('kit') && !name.includes('first aid') ||
        name.includes('thieves') && name.includes('tools') || name.includes('artisan') ||
        name.includes('gaming set') || name.includes('musical instrument')) {
      return 'tool';
    }
    
    // Default to gear for everything else
    return 'gear';
  }

  /**
   * Parse equipment items from 5etools format
   */
  private parseEquipmentItems(items: (string | EtoolsEquipmentItem)[]) {
    return items.map(item => {
      if (typeof item === 'string') {
        const category = this.categorizeItemByName(item);
        return { 
          _ref: createDocumentReference(
            generateSlug(item),
            'item',
            category,
            'XPHB'
          )
        };
      }
      
      const parsed: Record<string, unknown> = {};
      
      // Handle item reference
      if (item.item) {
        const category = this.categorizeItemByName(item.item);
        parsed._ref = createDocumentReference(
          generateSlug(item.item),
          'item',
          category,
          'XPHB'
        );
      }
      
      // Handle special item reference
      if (item.special) {
        const category = this.categorizeItemByName(item.special);
        parsed._ref = createDocumentReference(
          generateSlug(item.special),
          'item',
          category,
          'XPHB'
        );
        parsed.special = true; // marker to indicate special item
      }
      
      // Handle gold value (not a reference)
      if (item.value) parsed.value = item.value;
      
      // Handle other properties
      if (item.quantity) parsed.quantity = item.quantity;
      if (item.displayName) parsed.displayName = item.displayName;
      
      return parsed;
    });
  }

  /**
   * Enhanced feature extraction
   */
  private extractFeatureEnhanced(featureData?: EtoolsBackgroundFeature) {
    if (!featureData) return undefined;
    
    return {
      name: featureData.name || '',
      description: this.cleanRuleText(formatEntries(featureData.entries || [])),
      type: 'feature' as const
    };
  }

  /**
   * Extract suggested characteristics from background data
   */
  private extractSuggestedCharacteristics(backgroundData: EtoolsBackground) {
    const characteristics: Record<string, unknown> = {};
    
    if (backgroundData.personalityTraits?._ || backgroundData.personalityTraits?.entries) {
      characteristics.personalityTraits = backgroundData.personalityTraits._ || 
        this.extractTableOptions(backgroundData.personalityTraits.entries);
    }
    
    if (backgroundData.ideals?._ || backgroundData.ideals?.entries) {
      characteristics.ideals = backgroundData.ideals._ || 
        this.extractTableOptions(backgroundData.ideals.entries);
    }
    
    if (backgroundData.bonds?._ || backgroundData.bonds?.entries) {
      characteristics.bonds = backgroundData.bonds._ || 
        this.extractTableOptions(backgroundData.bonds.entries);
    }
    
    if (backgroundData.flaws?._ || backgroundData.flaws?.entries) {
      characteristics.flaws = backgroundData.flaws._ || 
        this.extractTableOptions(backgroundData.flaws.entries);
    }
    
    return Object.keys(characteristics).length > 0 ? characteristics : undefined;
  }

  /**
   * Extract options from table entries
   */
  private extractTableOptions(entries?: EtoolsEntry[]): string[] | undefined {
    if (!entries) return undefined;
    
    const options: string[] = [];
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry !== null && 'type' in entry && entry.type === 'table' && 'rows' in entry && entry.rows) {
        for (const row of entry.rows) {
          if (Array.isArray(row) && row.length > 1) {
            options.push(String(row[1])); // Second column usually contains the text
          }
        }
      }
    }
    
    return options.length > 0 ? options : undefined;
  }
}