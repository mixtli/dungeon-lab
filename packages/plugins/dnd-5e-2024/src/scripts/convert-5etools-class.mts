/* eslint-disable @typescript-eslint/no-explicit-any */
// convert-5e-tools-class.mts
import type {
  ICharacterClassData,
  ISkillChoice,
  IFeatureData,
  IBenefit,
  ISpellData,
  ISpellEntry,
  ISpellChoice,
} from '../shared/types/character-class.mjs';
import {
  toLowercase,
  cleanRuleText,
} from './converter-utils.mjs';
import type { Ability } from '../shared/types/common.mjs';
import { read5eToolsData } from './import-utils.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Add this near the top with other constants
const ABILITY_MAP: Record<string, string> = {
    "str": "strength",
    "dex": "dexterity",
    "con": "constitution",
    "int": "intelligence",
    "wis": "wisdom",
    "cha": "charisma"
} as const;

// Input data interfaces
export interface RawClassData {
    name?: string;
    source?: string;
    edition?: string;
    hd?: { faces?: number };
    primaryAbility?: any[];
    proficiency?: string[];
    startingProficiencies?: {
        armor?: string[];
        weapons?: string[];
        tools?: string[];
        skills?: any[];
    };
    startingEquipment?: any;
    classFeatures?: any[];
    classFeature?: any[];
    subclassTitle?: string;
}

export interface RawSubclassData {
    name?: string;
    shortName?: string;
    source?: string;
    classSource?: string;
    additionalSpells?: any[];
}

// Output data interface

function normalizeSubclassFeatureEntries(entries: any[]): Partial<IFeatureData> {
    const result: Partial<IFeatureData> = {
        description: '',
        benefits: []
    };

    // Combine all top-level strings into description
    const descriptionParts = entries
        .filter(entry => typeof entry === 'string')
        .map(entry => toLowercase(cleanRuleText(entry)));
    
    if (descriptionParts.length > 0) {
        result.description = descriptionParts.join(' ');
    }

    // Process entries objects for benefits
    entries.forEach(entry => {
        if (typeof entry === 'object' && entry !== null && entry.type === 'entries') {
            // Handle nested entries
            if (Array.isArray(entry.entries)) {
                entry.entries.forEach((subEntry: any) => {
                    if (subEntry.type === 'entries' && subEntry.name && Array.isArray(subEntry.entries)) {
                        const benefit: IBenefit = {
                            name: toLowercase(subEntry.name),
                            description: subEntry.entries
                                .map((e: any) => typeof e === 'string' ? toLowercase(cleanRuleText(e)) : '')
                                .filter(Boolean)
                                .join(' ')
                        };
                        result.benefits!.push(benefit);
                    }
                });
            }
        }
    });

    return result;
}

function normalizeAbilityName(ability: string): Ability{
    const normalized = toLowercase(ability);
    return (ABILITY_MAP[normalized] as Ability) || normalized;
}

function normalizePrimaryAbility(primaryAbility: any[]): Ability[] {
    const result: Ability[] = [];
    for (const abilityDict of primaryAbility) {
        for (const [ability, isPrimary] of Object.entries(abilityDict)) {
            if (isPrimary) {
                result.push(normalizeAbilityName(ability));
            }
        }
    }
    return result;
}

function normalizeSkillChoices(skillsData: any[]): ISkillChoice[] {
    const result: ISkillChoice[] = [];
    
    // List of all possible D&D 5e skills
    const ALL_SKILLS = [
        'acrobatics', 'animal handling', 'arcana', 'athletics', 
        'deception', 'history', 'insight', 'intimidation', 
        'investigation', 'medicine', 'nature', 'perception',
        'performance', 'persuasion', 'religion', 'sleight of hand', 
        'stealth', 'survival'
    ];
    
    if (!skillsData || !Array.isArray(skillsData) || skillsData.length === 0) {
        return result;
    }
    
    for (const skillItem of skillsData) {
        // Handle standard choice format
        if ('choose' in skillItem) {
            const chooseData = skillItem.choose;
            result.push({
                type: "choice",
                count: chooseData.count || 0,
                options: (chooseData.from || []).map((skill: string) => toLowercase(skill))
            });
        }
        // Handle 'any' format (e.g., { any: 3 })
        else if ('any' in skillItem && typeof skillItem.any === 'number') {
            result.push({
                type: "choice",
                count: skillItem.any,
                options: [...ALL_SKILLS] // Use all available skills
            });
            console.log(`Converted skill choice with 'any: ${skillItem.any}' to choice with all skills`);
        }
        // Handle direct array of skills (no choice)
        else if (Array.isArray(skillItem)) {
            // For direct arrays of skills, still use choice but with count = 0 (meaning all are selected)
            result.push({
                type: "choice",
                count: 0, // Fixed skills, no choices to make
                options: skillItem.map((skill: string) => toLowercase(skill))
            });
        }
    }
    
    return result;
}

function normalizeStartingEquipment(equipmentData: any): any {
    // For description, keep the entries as they are
    const description = Array.isArray(equipmentData?.entries) 
        ? equipmentData.entries.map((entry: any) => 
            typeof entry === 'string' ? toLowercase(entry) : entry
        )
        : [];
    
    // Handle the defaultData array which contains equipment choices
    if (equipmentData?.defaultData && Array.isArray(equipmentData.defaultData)) {
        // Create a direct equipment choice object
        const equipmentItem = {
            type: "choice" as const,
            options: {} as Record<string, any>,
            description: description
        };
        
        for (const choiceSet of equipmentData.defaultData) {
            // Process option A
            if (choiceSet.A && Array.isArray(choiceSet.A)) {
                equipmentItem.options['A'] = choiceSet.A.map((item: any) => normalizeEquipmentItem(item));
            }
            
            // Process option B
            if (choiceSet.B && Array.isArray(choiceSet.B)) {
                // B is often just gold, check if it's a single item
                if (choiceSet.B.length === 1 && choiceSet.B[0].value) {
                    equipmentItem.options['B'] = [ { gold: choiceSet.B[0].value } ];
                } else {
                    equipmentItem.options['B'] = choiceSet.B.map((item: any) => normalizeEquipmentItem(item));
                }
            }
            
            // Add any other options (C, D, etc.) if they exist
            for (const [key, value] of Object.entries(choiceSet)) {
                if (key !== '_' && key !== 'A' && key !== 'B' && Array.isArray(value)) {
                    const mappedItems = (value as any[]).map((item: any) => normalizeEquipmentItem(item));
                    // Check if it's a single gold value
                    if (mappedItems.length === 1 && 'gold' in mappedItems[0]) {
                        equipmentItem.options[key] = [ { gold: mappedItems[0].gold } ];
                    } else {
                        equipmentItem.options[key] = mappedItems;
                    }
                }
            }
        }
        
        // Return the equipment item directly instead of wrapped in a choices array
        return equipmentItem;
    }
    
    // If there are no default data, return a minimal object with just the description
    return {
        type: "choice" as const,
        options: {},
        description: description
    };
}

function normalizeEquipmentItem(item: any): any {
    // Handle direct value items (usually gold amounts)
    if (typeof item === 'object' && item !== null && 'value' in item) {
        // Check if it's a gold value (number)
        if (typeof item.value === 'number') {
            return {
                gold: item.value
            };
        }
        return {
            item: toLowercase(String(item.value)),
            source: 'xphb'
        };
    }
    
    // Handle equipment items
    if (typeof item === 'object' && item !== null && 'item' in item) {
        const result: Record<string, any> = {};
        
        // Parse the item string which may have format "item|source"
        if (typeof item.item === 'string') {
            if (item.item.includes('|')) {
                const [itemName, source] = item.item.split('|');
                result.item = toLowercase(itemName);
                result.source = toLowercase(source);
            } else {
                result.item = toLowercase(item.item);
                result.source = 'xphb'; // Default source
            }
        }
        
        // Add quantity if specified
        if (typeof item.quantity === 'number') {
            result.quantity = item.quantity;
        }
        
        return result;
    }
    
    // Handle equipment type choices
    if (typeof item === 'object' && item !== null && 'equipmentType' in item) {
        return {
            equipmenttype: toLowercase(item.equipmentType || '')
        };
    }
    
    // Handle string items (direct item references without additional properties)
    if (typeof item === 'string') {
        if (item.includes('|')) {
            const [itemName, source] = item.split('|');
            return {
                item: toLowercase(itemName),
                source: toLowercase(source)
            };
        } else {
            return {
                item: toLowercase(item),
                source: 'xphb' // Default source
            };
        }
    }
    
    // Return a default structure for unhandled cases
    return {
        item: "unknown"
    };
}

function extractFeatures(classData: RawClassData, allFeatures: any[]): Record<string, IFeatureData[]> {
    const className = toLowercase(classData.name || '');
    const featuresByLevel: Record<string, IFeatureData[]> = {};
    
    if (!classData.classFeatures || !Array.isArray(classData.classFeatures)) {
        return featuresByLevel;
    }
    
    for (const featureRef of classData.classFeatures) {
        let featureName = '';
        let level = 0;
        let gainSubclassFeature = false;
        
        // Handle string reference format: "Unarmored Defense|Barbarian|XPHB|1"
        if (typeof featureRef === 'string') {
            const parts = featureRef.split('|');
            if (parts.length < 4) continue; // Skip invalid format
            
            featureName = parts[0] || '';
            // Level is the last part
            const levelStr = parts[parts.length - 1];
            level = parseInt(levelStr, 10);
            
            if (isNaN(level)) continue; // Skip if level isn't a number
        } 
        // Handle object format: {classFeature: "Barbarian Subclass|Barbarian|XPHB|3", gainSubclassFeature: true}
        else if (typeof featureRef === 'object' && featureRef !== null) {
            const featureString = featureRef.classFeature;
            if (!featureString || typeof featureString !== 'string') continue;
            
            const parts = featureString.split('|');
            if (parts.length < 4) continue; // Skip invalid format
            
            featureName = parts[0] || '';
            // Level is the last part
            const levelStr = parts[parts.length - 1];
            level = parseInt(levelStr, 10);
            
            if (isNaN(level)) continue; // Skip if level isn't a number
            
            // Check for gainSubclassFeature flag
            gainSubclassFeature = !!featureRef.gainSubclassFeature;
        } else {
            continue; // Skip unknown format
        }
        
        // Create array for this level if it doesn't exist
        if (!featuresByLevel[level]) {
            featuresByLevel[level] = [];
        }
        
        // First, try to find the feature details in allFeatures
        const feature = allFeatures.find(f => 
            toLowercase(f.name || '') === toLowercase(featureName) &&
            toLowercase(f.className || '') === className &&
            f.classSource === 'XPHB' &&
            f.level === level
        );
        
        if (feature) {
            // Feature details found, normalize and add it
            const normalizedFeature = normalizeSubclassFeatureEntries(feature.entries || []);
            featuresByLevel[level].push({
                name: toLowercase(featureName),
                source: "xphb",
                gainsubclassfeature: gainSubclassFeature,
                ...normalizedFeature
            });
        } else {
            // Feature details not found, add basic info
            featuresByLevel[level].push({
                name: toLowercase(featureName),
                source: "xphb",
                gainsubclassfeature: gainSubclassFeature,
                description: `${featureName} feature`
            });
        }
    }
    
    return featuresByLevel;
}

function extractSubclassFeatures(
    subclass: RawSubclassData,
    allFeatures: any[],
    className: string
): Record<string, IFeatureData[]> {
    const featuresByLevel: Record<string, IFeatureData[]> = {};
    const subclassName = toLowercase(subclass.shortName || '');
    
    if (subclass.source !== 'XPHB' || subclass.classSource !== 'XPHB') {
        return featuresByLevel;
    }
    
    for (const feature of allFeatures) {
        if (toLowercase(feature.className || '') !== className ||
            toLowercase(feature.subclassShortName || '') !== subclassName ||
            feature.subclassSource !== 'XPHB') {
            continue;
        }
        
        if (feature.name === subclass.name) {
            continue;
        }
        
        const hasRefFeatures = Array.isArray(feature.entries) && 
            feature.entries.some((entry: any) => 
                typeof entry === 'object' && entry?.type === 'refSubclassFeature'
            );
        
        if (hasRefFeatures) {
            continue;
        }
        
        const level = feature.level;
        if (level) {
            if (!featuresByLevel[level]) {
                featuresByLevel[level] = [];
            }
            
            const normalizedFeature = normalizeSubclassFeatureEntries(feature.entries || []);
            featuresByLevel[level].push({
                name: toLowercase(feature.name || ''),
                source: "xphb",
                ...normalizedFeature
            });
        }
    }
    
    return featuresByLevel;
}

function normalizeSpellString(spellString: string | any, defaultTag?: string): ISpellData | ISpellChoice {
    // Handle choice objects
    if (typeof spellString === 'object' && spellString !== null) {
        if (spellString.choose) {
            const choice: ISpellChoice = {
                type: 'choice',
                count: spellString.choose.count || 1
            };
            
            // Handle various choice parameters
            if (spellString.choose.from) {
                choice.options = Array.isArray(spellString.choose.from) 
                    ? spellString.choose.from.map((s: string) => toLowercase(s))
                    : [toLowercase(spellString.choose.from)];
            }
            
            if (spellString.choose.level) {
                choice.levels = Array.isArray(spellString.choose.level)
                    ? spellString.choose.level
                    : [spellString.choose.level];
            }
            
            if (spellString.choose.fromClassList) {
                choice.classes = spellString.choose.fromClassList
                    .map((cls: any) => toLowercase(cls.name));
            }
            
            if (spellString.choose.fromSchool) {
                choice.schools = Array.isArray(spellString.choose.fromSchool)
                    ? spellString.choose.fromSchool.map((s: string) => toLowercase(s))
                    : [toLowercase(spellString.choose.fromSchool)];
            }
            
            return choice;
        }
        
        // It's not a choice object but some other object (possibly null)
        return {
            name: "unknown",
            source: "xphb"
        };
    }
    
    // Handle null or undefined 
    if (!spellString) {
        return {
            name: "unknown",
            source: "xphb"
        };
    }

    const spellObj: ISpellData = {
        name: "",
        source: "xphb"
    };
    
    if (typeof spellString === 'string' && spellString.includes('|')) {
        const parts = spellString.split('|');
        spellObj.name = toLowercase(parts[0] || '');
        spellObj.source = toLowercase(parts[1] || 'xphb');
    } else {
        spellObj.name = toLowercase(String(spellString));
    }
    
    if (defaultTag) {
        spellObj.tag = toLowercase(defaultTag);
    }
    
    if (spellObj.name.includes('#')) {
        const [name, tag] = spellObj.name.split('#');
        spellObj.name = name || '';
        spellObj.tag = tag === 'c' ? "cantrip" : tag;
    }
    
    return spellObj;
}

function normalizeAdditionalSpells(additionalSpells: any[]): ISpellEntry[] {
    if (!additionalSpells?.length) {
        return [];
    }
    
    return additionalSpells.map(spellEntry => {
        const result: ISpellEntry = {};
        
        // Handle resource name if present
        if (spellEntry.resourceName) {
            result.resourceName = spellEntry.resourceName;
        }
        
        // Process prepared spells
        if ('prepared' in spellEntry) {
            result.prepared = {};
            Object.entries(spellEntry.prepared).forEach(([level, spells]) => {
                if (!Array.isArray(spells)) {
                    // Skip non-array entries
                    return;
                }
                result.prepared![level] = spells.map(
                    spell => normalizeSpellString(spell)
                );
            });
        }
        
        // Process known spells
        if ('known' in spellEntry) {
            result.known = {};
            Object.entries(spellEntry.known).forEach(([level, spellChoices]) => {
                if (!Array.isArray(spellChoices)) {
                    // Skip non-array entries
                    return;
                }
                result.known![level] = spellChoices.map(choice => {
                    return normalizeSpellString(choice);
                });
            });
        }
        
        // Process innate spells with resource handling
        if ('innate' in spellEntry) {
            result.innate = {};
            Object.entries(spellEntry.innate).forEach(([level, spellsData]) => {
                if (Array.isArray(spellsData)) {
                    // Simple array of spells
                    result.innate![level] = spellsData.map(spell => 
                        normalizeSpellString(spell)
                    );
                } else if (typeof spellsData === 'object' && spellsData !== null) {
                    const spells: (ISpellData | ISpellChoice)[] = [];
                    
                    // Handle nested structure with resources
                    if ('resource' in spellsData) {
                        const resourceObj = spellsData.resource as Record<string, unknown>;
                        Object.entries(resourceObj).forEach(([resourceAmount, resourceSpells]) => {
                            if (Array.isArray(resourceSpells)) {
                                resourceSpells.forEach(spell => {
                                    const normalizedSpell = normalizeSpellString(spell);
                                    if ('name' in normalizedSpell) {
                                        normalizedSpell.resourceAmount = parseInt(resourceAmount, 10);
                                        if (spellEntry.resourceName) {
                                            normalizedSpell.resourceName = spellEntry.resourceName;
                                        }
                                    }
                                    spells.push(normalizedSpell);
                                });
                            }
                        });
                    } else {
                        // Handle other object formats (tag-based spells)
                        Object.entries(spellsData as Record<string, any>).forEach(([tag, tagSpells]) => {
                            if (Array.isArray(tagSpells)) {
                                tagSpells.forEach(spell => {
                                    const normalizedSpell = normalizeSpellString(spell, toLowercase(tag));
                                    spells.push(normalizedSpell);
                                });
                            } else if (typeof tagSpells === 'object' && tagSpells !== null && 'resource' in tagSpells) {
                                // For deeply nested resource objects
                                Object.entries(tagSpells.resource).forEach(([resourceAmount, resourceSpells]) => {
                                    if (Array.isArray(resourceSpells)) {
                                        resourceSpells.forEach(spell => {
                                            const normalizedSpell = normalizeSpellString(spell, toLowercase(tag));
                                            if ('name' in normalizedSpell) {
                                                normalizedSpell.resourceAmount = parseInt(resourceAmount, 10);
                                                if (spellEntry.resourceName) {
                                                    normalizedSpell.resourceName = spellEntry.resourceName;
                                                }
                                            }
                                            spells.push(normalizedSpell);
                                        });
                                    }
                                });
                            }
                        });
                    }
                    
                    result.innate![level] = spells;
                }
            });
        }
        
        return result;
    });
}

function findSubclassLevel(features: any[]): number {
    for (const feature of features) {
        if (feature?.gainSubclassFeature) {
            const parts = (feature.classFeature || '').split('|');
            if (parts.length >= 3) {
                const level = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(level)) {
                    return level;
                }
            }
        }
    }
    return 3;
}

/**
 * Fetch subclasses for a specific class from the source JSON files
 * @param className The name of the class to find subclasses for
 * @param source The source of the class (e.g., 'XPHB')
 * @returns Array of matching subclasses
 */
export async function getSubclassesForClass(className: string, source: string): Promise<any[]> {
  try {
    // Path to the 5etools data files
    const dataPath = join(__dirname, '../../submodules/5etools-src/data');
    
    // Load all class files to find subclasses
    const data = await read5eToolsData(dataPath, 'class/class-*.json');
    
    // Debug log the data structure
    //console.log(`Data keys: ${Object.keys(data).join(', ')}`);
    
    // Filter subclasses that match the specified class
    if (data.subclass && Array.isArray(data.subclass)) {
      console.log(`Total subclasses found: ${data.subclass.length}`);
      
      // Log the first few subclasses to see their structure
      if (data.subclass.length > 0) {
        //console.log(`Sample subclass structure: ${JSON.stringify(data.subclass[0], null, 2).substring(0, 200)}...`);
      }
      
      // Try different field names for matching
      const matchingByClassField = data.subclass.filter((sc: any) => 
        sc.class === className && sc.classSource === source && sc.source === source
      );
      
      const matchingByClassName = data.subclass.filter((sc: any) => 
        sc.className === className && sc.classSource === source && sc.source === source
      );
      
      //console.log(`Subclasses matching class field '${className}': ${matchingByClassField.length}`);
      //console.log(`Subclasses matching className field '${className}': ${matchingByClassName.length}`);
      
      // If no matches, log all subclass class/className fields to see what we should be matching
    //   if (matchingByClassField.length === 0 && matchingByClassName.length === 0) {
    //     //console.log("Examining all subclasses to find the right field to match:");
    //     for (let i = 0; i < Math.min(5, data.subclass.length); i++) {
    //       const sc = data.subclass[i];
    //       //console.log(`Subclass ${i + 1}: class=${sc.class}, className=${sc.className}, name=${sc.name}, classSource=${sc.classSource}, source=${sc.source}`);
    //     }
    //   }
      
      // Use whichever matching method worked
      const matchingSubclasses = matchingByClassField.length > 0 ? matchingByClassField : matchingByClassName;
      
      if (matchingSubclasses.length > 0) {
        //console.log(`Found ${matchingSubclasses.length} subclasses for ${className} (${source})`);
        return matchingSubclasses;
      } else {
        //console.log(`No matching subclasses found for ${className} (${source})`);
      }
    } else {
      console.log("No subclasses array found in data");
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching subclasses for class ${className}:`, error);
    return [];
  }
}

export function convert5eToolsClass(data: any): ICharacterClassData {
    // Check if we're dealing with a direct class object or a container with class arrays
    let classData: RawClassData;
    let subclasses: any[] = [];
    let classFeatures: any[] = [];
    let subclassFeatures: any[] = [];
    
    // Handle case where data is a container with arrays
    if (data.class && Array.isArray(data.class)) {
        console.log("data is a container with arrays")
        // Extract only XPHB classes
        const xphbClasses = data.class.filter((cls: RawClassData) => cls.source === 'XPHB');
        if (xphbClasses.length === 0) {
            console.log(`No XPHB classes found in data`);
            return {} as ICharacterClassData;
        }
        
        classData = xphbClasses[0];
        subclasses = (data.subclass || []).filter(
            (sc: RawSubclassData) => sc.source === 'XPHB' && sc.classSource === 'XPHB'
        );
        classFeatures = data.classFeature || [];
        subclassFeatures = data.subclassFeature || [];
    } 
    // Handle case where data is a direct class object
    else if (data.source === 'XPHB') {
        console.log("data is a direct class object")
        classData = data;
        
        // For direct class objects, we need to fetch subclasses asynchronously
        // But since this function is synchronous, we'll create a placeholder for subclasses
        // that will be filled in by the converter wrapper function
        subclasses = [];
        // We'll also set a flag that this needs subclass lookup
        (classData as any)._needsSubclassLookup = true;
    } else {
        console.log(`No XPHB class found in data: ${data.name} (${data.source})`);
        return {} as ICharacterClassData;
    }
    
    const className = toLowercase(classData.name || '');
    
    const processedSubclasses = subclasses.map((subclass: RawSubclassData) => {
        const subclassFeaturesByLevel = extractSubclassFeatures(
            subclass,
            subclassFeatures,
            className
        );
        
        return {
            name: toLowercase(subclass.name || ''),
            shortname: toLowercase(subclass.shortName || ''),
            source: "xphb",
            classname: className,
            features: subclassFeaturesByLevel,
            additionalspells: normalizeAdditionalSpells(subclass.additionalSpells || [])
        };
    });

    const result = {
        name: className,
        source: "xphb",
        edition: toLowercase(classData.edition || ''),
        hitdie: `d${classData.hd?.faces || 0}`,
        primaryability: normalizePrimaryAbility(classData.primaryAbility || []),
        savingthrows: (classData.proficiency || []).map((save: string) => normalizeAbilityName(save)),
        proficiencies: {
            armor: (classData.startingProficiencies?.armor || []).map((armor: string) => toLowercase(armor)),
            weapons: (classData.startingProficiencies?.weapons || []).map((weapon: string) => toLowercase(weapon)),
            tools: (classData.startingProficiencies?.tools || []).map((tool: string) => toLowercase(tool)),
            skills: normalizeSkillChoices(classData.startingProficiencies?.skills || [])
        },
        equipment: normalizeStartingEquipment(classData.startingEquipment || {}),
        features: extractFeatures(classData, classFeatures),
        subclasslevel: findSubclassLevel(classData.classFeatures || []),
        subclassTitle: toLowercase(classData.subclassTitle || ''),
        subclasses: processedSubclasses
    };
    
    // Add a flag to indicate if we need to look up subclasses
    if ((classData as any)._needsSubclassLookup) {
        (result as any)._needsSubclassLookup = true;
        (result as any)._originalName = classData.name;
        (result as any)._originalSource = classData.source;
    }
    
    return result;
}

/**
 * Extract a class description from the class fluff data
 * @param className The name of the class to find the description for
 * @param source The source of the class (e.g., 'XPHB')
 * @param classFluffData The class fluff data containing descriptions
 * @returns The concatenated description strings or empty string if not found
 */
export function getClassDescription(className: string, source: string, classFluffData: any): string {
  if (!classFluffData || !classFluffData.classFluff || !Array.isArray(classFluffData.classFluff)) {
    return '';
  }
  
  // Find the matching class fluff entry - source must match exactly
  const classFluff = classFluffData.classFluff.find((fluff: any) => 
    fluff.name === className && 
    fluff.source === source
  );
  
  if (!classFluff || !classFluff.entries || !Array.isArray(classFluff.entries)) {
    return '';
  }
  
  // Extract entries object that contains the description
  const entriesContainer = classFluff.entries.find((entry: any) => 
    typeof entry === 'object' && entry.type === 'section' && Array.isArray(entry.entries)
  );
  
  if (!entriesContainer || !Array.isArray(entriesContainer.entries)) {
    return '';
  }
  
  // Extract string entries and concatenate them
  const descriptionParts = entriesContainer.entries
    .filter((entry: any) => typeof entry === 'string')
    .map((entry: string) => toLowercase(cleanRuleText(entry)));
  
  return descriptionParts.join(' ');
}