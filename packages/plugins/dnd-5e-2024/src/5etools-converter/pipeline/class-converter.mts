/**
 * Type-safe class converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Comprehensive class data extraction with features, subclasses, and fluff support
 */

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type ClassDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { processEntries, cleanMarkupText } from '../text/markup-processor.mjs';
import { etoolsItemSchema } from '../../5etools-types/items.mjs';
import type { EtoolsClassData, EtoolsClassFluff, EtoolsClassFluffData, EtoolsSubclass } from '../../5etools-types/classes.mjs';

// Type definitions for equipment processing
interface EquipmentItem {
  item: ItemReference;
  quantity: number;
}

interface ItemReference {
  _ref: {
    documentType: "actor" | "item" | "vtt-document" | "character";
    slug: string;
    source?: string;
    metadata?: Record<string, unknown>;
    pluginDocumentType?: string;
  };
  _error?: {
    reason: "not_found" | "ambiguous" | "invalid";
    attemptedAt: Date;
    message?: string;
    candidates?: string[];
  };
}
import { etoolsClassSchema } from '../../5etools-types/classes.mjs';
import { 
  dndCharacterClassDataSchema, 
  type DndCharacterClassData
} from '../../types/dnd/character-class.mjs';
import { ABILITY_ABBREVIATION_MAP, expandSpellcastingAbility, spellReferenceObjectSchema, type SpellReferenceObject, SKILLS_2024, type ProficiencyEntry, type ProficiencyFilterConstraint } from '../../types/dnd/common.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

// ClassDocument type is now imported from the validators file

/**
 * Typed class converter using the new pipeline
 */
export class TypedClassConverter extends TypedConverter<
  typeof etoolsClassSchema,
  typeof dndCharacterClassDataSchema,
  ClassDocument
> {
  /** Item lookup map for determining item types */
  private itemMap = new Map<string, z.infer<typeof etoolsItemSchema>>();

  protected getInputSchema() {
    return etoolsClassSchema;
  }

  protected getOutputSchema() {
    return dndCharacterClassDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'character-class';
  }

  /**
   * Initialize the converter by loading item data for type determination
   */
  async initialize() {
    await this.loadItemData();
  }

  /**
   * Load item data from 5etools sources for item type lookup
   */
  private async loadItemData() {
    try {
      // Load base items and regular items
      const [baseItemsData, itemsData] = await Promise.all([
        this.readEtoolsData('items-base.json'),
        this.readEtoolsData('items.json')
      ]);
      
      let _baseItemCount = 0;
      let _regularItemCount = 0;
      
      // Process base items (uses 'baseitem' array key)
      if (baseItemsData && typeof baseItemsData === 'object' && 'baseitem' in baseItemsData && Array.isArray(baseItemsData.baseitem)) {
        for (const item of baseItemsData.baseitem) {
          if (item && typeof item === 'object' && 'name' in item && 'source' in item) {
            const key = `${String(item.name).toLowerCase()}|${String(item.source).toLowerCase()}`;
            this.itemMap.set(key, item as z.infer<typeof etoolsItemSchema>);
            _baseItemCount++;
            
          }
        }
      }
      
      // Process regular items
      if (itemsData && typeof itemsData === 'object' && 'item' in itemsData && Array.isArray(itemsData.item)) {
        for (const item of itemsData.item) {
          if (item && typeof item === 'object' && 'name' in item && 'source' in item) {
            const key = `${String(item.name).toLowerCase()}|${String(item.source).toLowerCase()}`;
            this.itemMap.set(key, item as z.infer<typeof etoolsItemSchema>);
            _regularItemCount++;
          }
        }
      }
      
      
    } catch (error) {
      console.warn('Failed to load item data for type determination:', error);
    }
  }

  protected extractDescription(input: z.infer<typeof etoolsClassSchema>): string {
    // TODO: Load fluff data for enhanced descriptions
    // For now, use basic description
    return `${input.name} is a character class in D&D 5e.`;
  }

  protected extractAssetPath(_input: z.infer<typeof etoolsClassSchema>): string | undefined {
    // TODO: Load fluff data for image assets
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsClassSchema>): DndCharacterClassData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      source: input.source,
      page: input.page,
      
      // Extract primary abilities
      primaryAbilities: this.extractPrimaryAbilities(input.primaryAbility),
      
      // Extract hit die
      hitDie: input.hd?.faces || 8,
      
      // Extract proficiencies
      proficiencies: this.extractProficiencies(input),
      
      // Extract spellcasting info
      spellcasting: this.extractSpellcasting(input),
      
      // Extract weapon mastery (2024 feature)
      weaponMastery: this.extractWeaponMastery(input),
      
      // Extract class features by level
      features: this.extractFeatures(input),
      
      // Extract subclasses
      subclasses: this.extractSubclasses(input),
      
      // Extract starting equipment
      startingEquipment: this.extractStartingEquipment(input),
      
      // NOTE: multiclassing removed from schema - would need to be added back if needed
    };
  }

  /**
   * Convert array of classes with fluff support from multiple files
   */
  public async convertClasses(): Promise<{
    success: boolean;
    results: ClassDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed class conversion...');
      
      const results: ClassDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read class index to get list of available classes
      const classIndex = await this.readEtoolsData('class/index.json') as Record<string, string>;
      const classFiles = Object.values(classIndex);
      
      this.log(`Found ${classFiles.length} class files to process`);

      for (const classFile of classFiles) {
        try {
          // Read class data file  
          const rawClassData = await this.readEtoolsData(`class/${classFile}`);
          const classData = safeEtoolsCast<EtoolsClassData>(rawClassData, ['class'], `class file ${classFile}`);
          
          // Store the raw class data for subclass extraction
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this as any).currentClassFileData = classData;
          
          if (!classData.class?.length) {
            this.log(`No classes found in ${classFile}`);
            continue;
          }

          const filteredClasses = this.filterSrdContent(classData.class);
          total += filteredClasses.length;
          
          // Read corresponding fluff data
          const fluffFile = (classFile as string).replace('class-', 'fluff-class-');
          let fluffData: EtoolsClassFluffData | null = null;
          try {
            const rawFluffData = await this.readEtoolsData(`class/${fluffFile}`);
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
          
          this.log(`Processing ${filteredClasses.length} classes from ${classFile}`);

          for (const classItem of filteredClasses) {
            // TODO: Use fluff data for enhanced descriptions
            // const fluff = fluffMap.get(classItem.name);
            const result = await this.convertItem(classItem);
            
            if (result.success && result.document) {
              results.push(result.document);
              converted++;
              this.log(`✅ Class ${classItem.name} converted successfully`);
            } else {
              errors.push(`Failed to convert class ${classItem.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
              this.log(`❌ Class ${classItem.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
            }
          }
        } catch (fileError) {
          const errorMsg = `Failed to process ${classFile}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.log(errorMsg);
        }
      }
      
      this.log(`Typed class conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Class conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  // Helper methods for extracting class-specific data

  private extractPrimaryAbilities(primaryAbility?: unknown[]): DndCharacterClassData['primaryAbilities'] {
    if (!primaryAbility?.length) return ['strength']; // Default fallback
    
    const validAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const abilities: string[] = [];
    
    for (const ability of primaryAbility) {
      if (typeof ability === 'string') {
        abilities.push(ability.toLowerCase());
      } else if (ability && typeof ability === 'object' && 'choose' in ability) {
        // Handle choice format - take first option
        const choiceObj = ability as { choose: { from: string[] } };
        const options = choiceObj.choose.from;
        if (options && options.length > 0) {
          abilities.push(options[0].toLowerCase());
        }
      } else if (ability && typeof ability === 'object') {
        // Handle 5etools format: {"int": true, "wis": true} or {"str": true, "dex": true}
        const abilityObj = ability as Record<string, unknown>;
        for (const [key, value] of Object.entries(abilityObj)) {
          if (value === true) {
            const fullAbility = ABILITY_ABBREVIATION_MAP[key.toLowerCase()] || key.toLowerCase();
            if (validAbilities.includes(fullAbility)) {
              abilities.push(fullAbility);
            }
          }
        }
      }
    }
    
    return abilities.length > 0 
      ? abilities as DndCharacterClassData['primaryAbilities']
      : ['strength']; // Fallback if parsing fails
  }

  /**
   * Parse 5etools {@item} reference into ItemReference
   * Example: "{@item Thieves' Tools|XPHB}" -> ItemReference object
   */
  private parseItemReference(itemString: string): ProficiencyEntry | string {
    const itemMatch = itemString.match(/\{@item\s+([^|]+)\|([^}]+)\}/);
    if (!itemMatch) {
      return itemString; // Return as simple string if not an item reference
    }

    const itemName = itemMatch[1].trim();
    const source = itemMatch[2].trim();
    
    // Convert name to slug format (lowercase, spaces to hyphens, remove apostrophes)
    const slug = itemName.toLowerCase()
      .replace(/'/g, '')
      .replace(/\s+/g, '-');

    return {
      _ref: {
        slug,
        documentType: 'item',
        pluginDocumentType: 'tool', // Assuming tools for now, could be enhanced
        source: source.toLowerCase()
      }
    };
  }

  /**
   * Parse weapon category strings (simple, martial) into filter objects
   */
  private parseWeaponCategory(categoryString: string): ProficiencyEntry | string {
    const category = categoryString.toLowerCase().trim();
    
    switch (category) {
      case 'simple':
        return {
          type: 'filter',
          constraint: {
            displayText: 'Simple weapons',
            category: 'simple'
          }
        };
      case 'martial':
        return {
          type: 'filter', 
          constraint: {
            displayText: 'Martial weapons',
            category: 'martial'
          }
        };
      default:
        return categoryString; // Return as-is if not a recognized category
    }
  }

  /**
   * Parse 5etools {@filter} constraint into ProficiencyFilterConstraint
   * Example: "Martial weapons that have the {@filter Finesse or Light|items|type=martial weapon|property=finesse;light} property"
   */
  private parseFilterConstraint(filterString: string): ProficiencyEntry | string {
    const filterMatch = filterString.match(/\{@filter\s+([^|]+)\|items\|([^}]+)\}/);
    if (!filterMatch) {
      return filterString; // Return as simple string if not a filter
    }

    const filterParams = filterMatch[2].trim();

    // Parse filter parameters
    const params = new Map<string, string>();
    const paramPairs = filterParams.split('|');
    
    for (const pair of paramPairs) {
      const [key, value] = pair.split('=', 2);
      if (key && value) {
        params.set(key.trim(), value.trim());
      }
    }

    // Extract relevant filter constraints
    const constraint: ProficiencyFilterConstraint = {
      displayText: cleanMarkupText(filterString), // Process markup into clean text
      itemType: this.extractItemType(params.get('type')),
      category: this.extractWeaponCategory(params.get('type')),
      properties: this.extractWeaponProperties(params.get('property')),
      additionalFilters: Object.fromEntries(
        Array.from(params.entries()).filter(([key]) => !['type', 'property'].includes(key))
      )
    };

    return {
      type: 'filter',
      constraint
    };
  }

  /**
   * Extract item type from type parameter
   * Example: "martial weapon" -> "weapon", "simple weapon" -> "weapon"
   */
  private extractItemType(typeParam?: string): string | undefined {
    if (!typeParam) return undefined;
    if (typeParam.includes('weapon')) return 'weapon';
    // Could extend for other item types like "armor", "tool", etc.
    return typeParam;
  }

  /**
   * Extract weapon category from type parameter
   * Example: "martial weapon" -> "martial"
   */
  private extractWeaponCategory(typeParam?: string): string | undefined {
    if (!typeParam) return undefined;
    if (typeParam.includes('martial')) return 'martial';
    if (typeParam.includes('simple')) return 'simple';
    return undefined;
  }

  /**
   * Extract weapon properties from property parameter
   * Example: "finesse;light" -> ["finesse", "light"]
   */
  private extractWeaponProperties(propertyParam?: string): string[] | undefined {
    if (!propertyParam) return undefined;
    return propertyParam.split(';').map(prop => prop.trim().toLowerCase());
  }

  // Mapping of 5etools tool group patterns to item-group slugs
  private static readonly TOOL_GROUP_MAPPING: Record<string, { slug: string; displayName: string }> = {
    'anyMusicalInstrument': { slug: 'musical-instrument', displayName: 'Musical Instruments' },
    'anyArtisanTool': { slug: 'artisans-tools', displayName: 'Artisan\'s Tools' },
    'anyArtisansTool': { slug: 'artisans-tools', displayName: 'Artisan\'s Tools' }
  };

  private extractProficiencies(input: z.infer<typeof etoolsClassSchema>): DndCharacterClassData['proficiencies'] {
    const proficiencies: DndCharacterClassData['proficiencies'] = {
      armor: [],
      weapons: [],
      tools: [],
      savingThrows: [],
      skills: { count: 0, choices: [] }
    };

    // Extract armor proficiencies - always simple enum values for classes
    if (input.startingProficiencies?.armor) {
      proficiencies.armor = input.startingProficiencies.armor.map(armor => {
        if (typeof armor === 'string') {
          // Convert 5etools armor strings to enum values
          const armorLower = armor.toLowerCase();
          if (armorLower.includes('light')) return 'light' as const;
          if (armorLower.includes('medium')) return 'medium' as const;
          if (armorLower.includes('heavy')) return 'heavy' as const;
          if (armorLower.includes('shield')) return 'shield' as const;
          
          // Return as-is if already in correct format - cast to prevent type errors
          return armor as 'light' | 'medium' | 'heavy' | 'shield';
        }
        return 'light' as const; // Fallback to light armor
      });
    }

    // Extract weapon proficiencies
    if (input.startingProficiencies?.weapons) {
      proficiencies.weapons = input.startingProficiencies.weapons.map(weapon => {
        if (typeof weapon === 'string') {
          // Try to parse as item reference first
          const itemRef = this.parseItemReference(weapon);
          if (itemRef !== weapon) return itemRef;
          
          // Try to parse as filter constraint
          const filterRef = this.parseFilterConstraint(weapon);
          if (filterRef !== weapon) return filterRef;
          
          // Handle weapon category strings (simple, martial)
          const categoryFilter = this.parseWeaponCategory(weapon);
          if (categoryFilter !== weapon) return categoryFilter;
          
          return weapon; // Return as simple string (shouldn't happen with valid weapon proficiencies)
        }
        return 'Simple weapons'; // Fallback for non-string types
      });
    }

    // Extract tool proficiencies
    if (input.startingProficiencies?.tools) {
      proficiencies.tools = input.startingProficiencies.tools.map(tool => {
        if (typeof tool === 'string') {
          // Try to parse as item reference or filter, otherwise return as string
          const itemRef = this.parseItemReference(tool);
          if (itemRef !== tool) return itemRef;
          
          const filterRef = this.parseFilterConstraint(tool);
          if (filterRef !== tool) return filterRef;
          
          return tool; // Return as simple string
        }
        return 'Artisan\'s tools'; // Fallback for non-string types
      });
    }

    // Handle toolProficiencies array for group selections (e.g., {"anyMusicalInstrument": 3})
    if (input.startingProficiencies?.toolProficiencies && Array.isArray(input.startingProficiencies.toolProficiencies)) {
      for (const toolProf of input.startingProficiencies.toolProficiencies) {
        if (typeof toolProf === 'object' && toolProf !== null) {
          for (const [key, count] of Object.entries(toolProf)) {
            if (typeof count === 'number' && TypedClassConverter.TOOL_GROUP_MAPPING[key]) {
              const groupInfo = TypedClassConverter.TOOL_GROUP_MAPPING[key];
              const groupChoice = {
                type: 'group-choice' as const,
                group: {
                  _ref: {
                    slug: groupInfo.slug,
                    documentType: 'vtt-document' as const,
                    pluginDocumentType: 'item-group' as const,
                    source: 'xphb'
                  }
                },
                count,
                displayText: `Choose ${count === 1 ? 'one' : count} ${groupInfo.displayName}`
              };
              
              // Replace any existing simple tool references with the group choice
              proficiencies.tools = proficiencies.tools.filter(tool => 
                !(typeof tool === 'object' && '_ref' in tool && 
                  tool._ref.slug === groupInfo.slug)
              );
              proficiencies.tools.push(groupChoice);
            }
          }
        }
      }
    }

    // Extract saving throw proficiencies
    if (input.proficiency) {
      proficiencies.savingThrows = input.proficiency
        .map(prof => {
          const lowerProf = prof.toLowerCase();
          return ABILITY_ABBREVIATION_MAP[lowerProf] || lowerProf;
        })
        .filter(prof => ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(prof)) as DndCharacterClassData['proficiencies']['savingThrows'];
    }

    // Extract skill proficiencies
    if (input.startingProficiencies?.skills) {
      const skillArray = input.startingProficiencies.skills;
      if (Array.isArray(skillArray)) {
        // Extract all skill choices into a flat array
        const allChoices: string[] = [];
        let totalCount = 0;
        
        for (const skill of skillArray) {
          if (typeof skill === 'string') {
            allChoices.push(skill);
            totalCount += 1;
          } else if (skill && typeof skill === 'object' && skill.choose) {
            if (Array.isArray(skill.choose.from)) {
              allChoices.push(...skill.choose.from);
              totalCount += skill.choose.count || 1;
            }
          } else if (skill && typeof skill === 'object' && skill.any) {
            // Handle {"any": N} format - choose any N skills from all skills
            allChoices.push(...SKILLS_2024);
            totalCount += skill.any;
          }
        }
        
        proficiencies.skills = {
          count: input.startingProficiencies.skillsPoints || totalCount || 2,
          choices: [...new Set(allChoices)] // Remove duplicates
        };
      }
    }

    return proficiencies;
  }

  private extractSpellcasting(input: z.infer<typeof etoolsClassSchema>): DndCharacterClassData['spellcasting'] {
    if (!input.casterProgression) return undefined;

    return {
      type: this.mapSpellcastingType(input.casterProgression),
      ability: this.mapSpellcastingAbility(input.spellcastingAbility),
      preparation: input.preparedSpells ? 'prepared' : 'known',
      spellList: 'arcane', // Default spell list
      cantripsKnown: this.generateCantripsKnownProgression(input.cantripProgression),
      spellsKnown: this.generateSpellsKnownProgression(input.spellsKnownProgression)
    };
  }

  private extractWeaponMastery(input: z.infer<typeof etoolsClassSchema>): DndCharacterClassData['weaponMastery'] {
    // Check if this class has weapon mastery features (2024 feature)
    const features = input.classFeature || [];
    const masteryFeature = features.find(f => 
      f.name.toLowerCase().includes('weapon mastery') || 
      f.name.toLowerCase().includes('mastery')
    );

    if (!masteryFeature) return undefined;

    return {
      availableWeapons: ['simple weapons', 'martial weapons'], // Default, could be enhanced
      maxMasteries: 2, // Default for most classes
      gainedAtLevel: masteryFeature.level || 1,
      changeRules: 'on long rest' // Default
    };
  }

  private extractFeatures(input: z.infer<typeof etoolsClassSchema>): DndCharacterClassData['features'] {
    const featuresArray: DndCharacterClassData['features'] = [];
    
    // Handle classFeatures array (XPHB format - array of strings)
    if (input.classFeatures?.length) {
      for (const featureRef of input.classFeatures) {
        if (typeof featureRef === 'string') {
          // Parse feature reference: "Spellcasting|Wizard|XPHB|1"
          const parsed = this.parseFeatureReference(featureRef);
          if (parsed) {
            featuresArray.push({
              name: parsed.name,
              level: parsed.level,
              description: `${parsed.name} feature from ${parsed.source || 'D&D 5e'}.`,
              grantsSubclass: false,
              uses: undefined, // TODO: Implement feature uses extraction
              choices: undefined // TODO: Implement feature choices extraction
            });
          }
        } else if (featureRef && typeof featureRef === 'object' && 'classFeature' in featureRef) {
          // Handle subclass feature references
          const subclassRef = featureRef as { classFeature: string; gainSubclassFeature?: boolean };
          const parsed = this.parseFeatureReference(subclassRef.classFeature);
          if (parsed) {
            featuresArray.push({
              name: parsed.name,
              level: parsed.level,
              description: `${parsed.name} subclass feature from ${parsed.source || 'D&D 5e'}.`,
              grantsSubclass: subclassRef.gainSubclassFeature === true,
              uses: undefined, // TODO: Implement feature uses extraction
              choices: undefined // TODO: Implement feature choices extraction
            });
          }
        }
      }
    }
    
    // Handle classFeature array (classic format - array of objects) as fallback
    if (input.classFeature?.length) {
      for (const feature of input.classFeature) {
        featuresArray.push({
          name: feature.name,
          level: feature.level,
          description: feature.entries ? processEntries(feature.entries, this.options.textProcessing).text : `${feature.name} feature.`,
          grantsSubclass: false, // Classic format doesn't have subclass info
          uses: undefined, // TODO: Implement feature uses extraction
          choices: undefined // TODO: Implement feature choices extraction
        });
      }
    }

    return featuresArray;
  }

  /**
   * Parse feature reference string like "Spellcasting|Wizard|XPHB|1"
   */
  private parseFeatureReference(featureRef: string): { name: string; level: number; source?: string } | null {
    const parts = featureRef.split('|');
    if (parts.length < 4) {
      return null;
    }

    const name = parts[0];
    const level = parseInt(parts[3], 10);
    const source = parts[2];

    if (isNaN(level)) {
      return null;
    }

    return { name, level, source };
  }

  private extractSubclasses(input: z.infer<typeof etoolsClassSchema>): DndCharacterClassData['subclasses'] {
    // Get subclasses from the class file data, not from the individual class object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classFileData = (this as any).currentClassFileData;
    const allSubclasses = classFileData?.subclass || [];
    
    // Filter for only 2024 (XPHB) subclasses matching this class
    const xphbSubclasses = allSubclasses.filter((subclass: EtoolsSubclass) => 
      subclass.source === 'XPHB' && 
      subclass.classSource === 'XPHB' &&
      subclass.className === input.name
    );
    
    const converted = xphbSubclasses.map((subclass: EtoolsSubclass) => ({
      name: subclass.name,
      description: subclass.entries ? processEntries(subclass.entries, this.options.textProcessing).text : `${subclass.name} subclass for ${input.name}.`,
      gainedAtLevel: 3, // Standard level for most 2024 subclasses
      features: this.extractSubclassFeatures(subclass), // Extract real subclass features
      additionalSpells: this.extractSubclassSpells(subclass) // Extract subclass spells if available
    }));

    // Ensure exactly 4 subclasses as required by 2024 schema
    if (converted.length !== 4) {
      this.log(`Warning: Expected 4 XPHB subclasses for ${input.name}, found ${converted.length}`);
      
      // If we have fewer than 4, pad with placeholders (shouldn't happen for complete 2024 data)
      while (converted.length < 4) {
        converted.push({
          name: `Missing Subclass ${converted.length + 1}`,
          description: `Missing 2024 subclass data for ${input.name}`,
          gainedAtLevel: 3,
          features: [],
          additionalSpells: undefined
        });
      }
    }
    
    return converted.slice(0, 4); // Take exactly 4
  }

  /**
   * Extract subclass features from subclass feature references
   */
  private extractSubclassFeatures(subclass: EtoolsSubclass): DndCharacterClassData['subclasses'][0]['features'] {
    const features: DndCharacterClassData['subclasses'][0]['features'] = [];
    
    if (subclass.subclassFeatures?.length) {
      for (const featureRef of subclass.subclassFeatures) {
        if (typeof featureRef === 'string') {
          // Parse feature reference like "Abjuration Savant|Wizard|XPHB|Abjurer|XPHB|3"
          const parsed = this.parseSubclassFeatureReference(featureRef);
          if (parsed) {
            features.push({
              name: parsed.name,
              level: parsed.level,
              description: `${parsed.name} feature from the ${subclass.name} subclass.`,
              grantsSubclass: false, // Subclass features don't grant further subclasses
              uses: undefined,
              choices: undefined
            });
          }
        }
      }
    }
    
    return features;
  }

  /**
   * Extract additional spells granted by subclasses
   */
  private extractSubclassSpells(subclass: EtoolsSubclass): DndCharacterClassData['subclasses'][0]['additionalSpells'] {
    if (!subclass.additionalSpells?.length) return undefined;
    
    const spellsByLevel: Record<string, Array<{
      type: 'known' | 'prepared' | 'innate';
      source: 'specific' | 'choice';
      spell?: SpellReferenceObject;
      choice?: { maxLevel: number; class?: string; school?: string; count?: number };
    }>> = {};
    
    for (const spellGroup of subclass.additionalSpells) {
      // Process different spell types: known, prepared, innate
      const spellTypes: Array<'known' | 'prepared' | 'innate'> = ['known', 'prepared', 'innate'];
      
      for (const spellType of spellTypes) {
        if (spellGroup[spellType]) {
          // Process spells by level
          for (const [levelStr, spells] of Object.entries(spellGroup[spellType])) {
            const level = parseInt(levelStr, 10);
            if (!isNaN(level) && Array.isArray(spells)) {
              if (!spellsByLevel[levelStr]) {
                spellsByLevel[levelStr] = [];
              }
              
              for (const spell of spells) {
                if (typeof spell === 'string') {
                  // Convert specific spell reference to SpellReference
                  const spellRef = this.convertSpellToReference(spell);
                  if (spellRef) {
                    spellsByLevel[levelStr].push({
                      type: spellType,
                      source: 'specific',
                      spell: spellRef
                    });
                  }
                } else if (spell && typeof spell === 'object' && spell.choose) {
                  // Parse choice objects like {"choose": "level=0;1;2|class=Wizard|school=V"}
                  const choiceData = this.parseSpellChoice(spell.choose);
                  if (choiceData) {
                    spellsByLevel[levelStr].push({
                      type: spellType,
                      source: 'choice',
                      choice: choiceData
                    });
                  }
                } else {
                  this.log(`Unknown spell format: ${JSON.stringify(spell)}`);
                }
              }
            }
          }
        }
      }
    }
    
    return Object.keys(spellsByLevel).length > 0 ? spellsByLevel : undefined;
  }

  /**
   * Convert 5etools spell reference to SpellReference object
   */
  private convertSpellToReference(spellString: string): z.infer<typeof spellReferenceObjectSchema> | null {
    // Parse references like "counterspell|xphb" or "minor illusion|xphb#c"
    const parts = spellString.split('|');
    if (parts.length < 1) return null;
    
    const spellName = parts[0].replace('#c', ''); // Remove cantrip marker
    const source = parts[1] || 'xphb'; // Default to XPHB
    
    // Convert spell name to slug format (lowercase, hyphenated)
    const slug = spellName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    return {
      _ref: {
        slug,
        documentType: 'vtt-document',
        pluginDocumentType: 'spell',
        source: source.toLowerCase()
      }
    };
  }

  /**
   * Parse spell choice string like "level=0;1;2|class=Wizard|school=A"
   */
  private parseSpellChoice(choiceString: string): { maxLevel: number; class?: string; school?: string; count?: number } | null {
    const parts = choiceString.split('|');
    const result: { maxLevel: number; class?: string; school?: string; count?: number } = { maxLevel: 0 };
    
    for (const part of parts) {
      if (part.startsWith('level=')) {
        // Parse level range like "0;1;2" to get max level
        const levels = part.substring(6).split(';').map(l => parseInt(l, 10)).filter(l => !isNaN(l));
        if (levels.length > 0) {
          result.maxLevel = Math.max(...levels);
        }
      } else if (part.startsWith('class=')) {
        result.class = part.substring(6).toLowerCase();
      } else if (part.startsWith('school=')) {
        // Convert school abbreviations to full names
        const schoolCode = part.substring(7);
        const schoolMap: Record<string, string> = {
          'A': 'abjuration',
          'C': 'conjuration', 
          'D': 'divination',
          'E': 'enchantment',
          'V': 'evocation',
          'I': 'illusion',
          'N': 'necromancy',
          'T': 'transmutation'
        };
        result.school = schoolMap[schoolCode] || schoolCode.toLowerCase();
      }
    }
    
    return result.maxLevel >= 0 ? result : null;
  }

  /**
   * Parse subclass feature reference string like "Abjuration Savant|Wizard|XPHB|Abjurer|XPHB|3"
   */
  private parseSubclassFeatureReference(featureRef: string): { name: string; level: number; source?: string } | null {
    const parts = featureRef.split('|');
    if (parts.length < 6) {
      return null;
    }

    const name = parts[0];
    const level = parseInt(parts[5], 10);
    const source = parts[2];

    if (isNaN(level)) {
      return null;
    }

    return { name, level, source };
  }

  private extractStartingEquipment(input: z.infer<typeof etoolsClassSchema>): DndCharacterClassData['startingEquipment'] {
    if (!input.startingEquipment?.defaultData?.length) return undefined;

    const defaultData = input.startingEquipment.defaultData[0];
    const options: DndCharacterClassData['startingEquipment'] = [];

    // Extract all options (A, B, C, etc.)
    for (const [label, optionData] of Object.entries(defaultData)) {
      if (!Array.isArray(optionData)) continue;

      const equipmentItems: EquipmentItem[] = [];
      let goldAmount = 0;

      // Process each item in this option
      for (const item of optionData) {
        if (typeof item === 'object' && 'item' in item) {
          // Parse item reference like "greataxe|xphb"
          const itemRef = this.parseEquipmentItemReference(item.item);
          if (itemRef) {
            equipmentItems.push({
              item: itemRef,
              quantity: item.quantity || 1
            });
          }
        } else if (typeof item === 'object' && 'value' in item) {
          // Convert copper pieces to gold pieces
          goldAmount = Math.floor((item.value as number) / 100);
        }
      }

      // Create description from the entries field if available
      let description = `Option ${label}`;
      if (input.startingEquipment.entries?.length) {
        // Try to extract description for this option from entries
        const entryText = input.startingEquipment.entries[0];
        const optionMatch = entryText.match(new RegExp(`\\(${label}\\)([^;]+)(?:;|$)`));
        if (optionMatch) {
          // Clean the 5etools markup from the description
          description = cleanMarkupText(optionMatch[1].trim());
        }
      }

      options.push({
        label,
        items: equipmentItems.length > 0 ? equipmentItems : undefined,
        gold: goldAmount > 0 ? goldAmount : undefined,
        description
      });
    }

    return options.length > 0 ? options : undefined;
  }

  /**
   * Parse equipment item reference like "greataxe|xphb" into ItemReference
   */
  private parseEquipmentItemReference(itemString: string): ItemReference | null {
    const parts = itemString.split('|');
    if (parts.length < 1) return null;
    
    const itemName = parts[0];
    const source = parts[1] || 'xphb';
    
    // Convert name to slug format (lowercase, spaces to hyphens, remove apostrophes)
    const slug = itemName.toLowerCase()
      .replace(/'/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    // Determine the correct plugin document type from item data
    const pluginDocumentType = this.determineItemPluginDocumentType(itemName, source);
    
    return {
      _ref: {
        slug,
        documentType: 'item' as const,
        pluginDocumentType,
        source: source.toLowerCase()
      }
    };
  }

  /**
   * Determine the plugin document type for an equipment item
   */
  private determineItemPluginDocumentType(itemName: string, source: string): string {
    // Try to find the item in our loaded data
    const key = `${itemName.toLowerCase()}|${source.toLowerCase()}`;
    const item = this.itemMap.get(key);
    
    if (item) {
      // Use the same logic as the item converter
      const itemType = this.determineItemType(item);
      return this.mapItemTypeToPluginDocumentType(itemType, item);
    }
    
    // Fallback to generic 'item' if not found
    return 'item';
  }

  /**
   * Determine item type from 5etools item data (mirrors ItemConverter logic)
   */
  private determineItemType(item: z.infer<typeof etoolsItemSchema>): 'weapon' | 'armor' | 'tool' | 'gear' {
    // Check explicit boolean flags first
    if (item.weapon || item.firearm) return 'weapon';
    if (item.armor || item.shield) return 'armor';
    
    // Check type codes if available
    if (item.type) {
      // Extract base type (handle pipe-separated formats like "AT|XPHB")
      const baseType = item.type.split('|')[0];
      
      switch (baseType) {
        case 'M': case 'R': // Melee, Ranged
          return 'weapon';
        case 'LA': case 'MA': case 'HA': case 'S': // Light Armor, Medium Armor, Heavy Armor, Shield
          return 'armor';
        case 'AT': case 'T': case 'GS': case 'INS': // Artisan Tools, Tools, Gaming Sets, Instruments
          return 'tool';
        case 'G': case 'A': case 'P': case 'WD': case 'RD': case 'RG': // Gear, Ammunition, Potions, Wondrous, Rod, Ring
        default:
          return 'gear';
      }
    }
    
    // For items without type (magic items), check name patterns or other properties
    if (item.bonusWeapon || item.dmg1 || item.damage) return 'weapon';
    if (item.bonusAc || item.ac) return 'armor';
    if (item.wondrous || item.staff || item.wand || item.rod) return 'gear';
    
    // Default fallback
    return 'gear';
  }

  /**
   * Map item type to plugin document type (mirrors ItemConverter logic)
   */
  private mapItemTypeToPluginDocumentType(itemType: 'weapon' | 'armor' | 'tool' | 'gear', item: z.infer<typeof etoolsItemSchema>): string {
    switch (itemType) {
      case 'weapon': 
        return 'weapon';
      case 'armor':
        // Check if it's a shield - shields need their own plugin document type
        if (item.type === 'S' || item.shield) {
          return 'shield';
        }
        return 'armor';
      case 'tool': 
        return 'tool';
      case 'gear': 
      default: 
        return 'gear';
    }
  }

  // Utility methods for spellcasting

  private mapSpellcastingType(casterProgression: string): 'full' | 'half' | 'third' | 'pact' | 'none' {
    switch (casterProgression) {
      case 'full':
        return 'full';
      case 'half':
      case '1/2':
      case 'artificer': // Artificer-style progression (half caster)
        return 'half';
      case '1/3':
        return 'third';
      case 'pact':
        return 'pact';
      default:
        return 'none';
    }
  }

  private mapSpellcastingAbility(ability?: string): 'intelligence' | 'wisdom' | 'charisma' {
    if (!ability) return 'intelligence';
    
    const abilityLower = ability.toLowerCase();
    
    // Handle both full names and abbreviations
    if (abilityLower === 'intelligence' || abilityLower === 'int') {
      return 'intelligence';
    } else if (abilityLower === 'wisdom' || abilityLower === 'wis') {
      return 'wisdom';  
    } else if (abilityLower === 'charisma' || abilityLower === 'cha') {
      return 'charisma';
    } else {
      // Try using the global mapping
      try {
        return expandSpellcastingAbility(abilityLower);
      } catch {
        return 'intelligence'; // Fallback
      }
    }
  }

  // NOTE: generateSpellSlots method removed as it's unused

  private generateCantripsKnownProgression(cantripProgression?: number[]): Record<string, number> | undefined {
    if (!cantripProgression?.length) return undefined;
    
    const progression: Record<string, number> = {};
    cantripProgression.forEach((count, index) => {
      progression[(index + 1).toString()] = count;
    });
    
    return progression;
  }

  private generateSpellsKnownProgression(spellsKnownProgression?: number[]): Record<string, number> | undefined {
    if (!spellsKnownProgression?.length) return undefined;
    
    const progression: Record<string, number> = {};
    spellsKnownProgression.forEach((count, index) => {
      progression[(index + 1).toString()] = count;
    });
    
    return progression;
  }

  // NOTE: extractFeatureUses and extractFeatureChoices methods removed as they're unused

  // NOTE: extractSubclassFeatures and extractSubclassSpells methods removed as they're unused
}