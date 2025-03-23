// convert-5e-tools-class.mts
import type {
  ICharacterClass,
  ISkillChoice,
  IEquipmentData,
  IEquipmentChoice,
  IFeatureData,
  IBenefit,
  ISpellData,
  ISpellEntry,
  ISpellChoice,
  ISubclassData
} from '../shared/types/character-class.mjs';
import {
  toLowercase,
  cleanRuleText,
  extractTextFromEntries,
  normalizeSkillProficiencies
} from './converter-utils.mjs';

// Map of spell school abbreviations to full names
const SCHOOL_MAP: Record<string, string> = {
    "a": "abjuration",
    "c": "conjuration",
    "d": "divination",
    "e": "enchantment",
    "v": "evocation",
    "i": "illusion",
    "n": "necromancy",
    "t": "transmutation"
};

// Add this near the top with other constants
const ABILITY_MAP: Record<string, string> = {
    "str": "strength",
    "dex": "dexterity",
    "con": "constitution",
    "int": "intelligence",
    "wis": "wisdom",
    "cha": "charisma"
};

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
export interface NormalizedData extends ICharacterClass {}

function toKey(value: any): string {
    return toLowercase(value);
}

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

function normalizeAbilityName(ability: string): string {
    const normalized = toLowercase(ability);
    return ABILITY_MAP[normalized] || normalized;
}

function normalizePrimaryAbility(primaryAbility: any[]): string[] {
    const result: string[] = [];
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
    for (const skillItem of skillsData) {
        if ('choose' in skillItem) {
            const chooseData = skillItem.choose;
            result.push({
                type: "choice",
                count: chooseData.count || 0,
                options: (chooseData.from || []).map((skill: string) => toLowercase(skill))
            });
        }
    }
    return result;
}

function normalizeStartingEquipment(equipmentData: any): IEquipmentData {
    const choices: IEquipmentChoice[] = [];
    
    for (const choiceSet of equipmentData.defaultData || []) {
        const choiceObj: Record<string, any> = {};
        for (const [optionKey, optionValue] of Object.entries(choiceSet)) {
            if (optionKey !== '_') {
                choiceObj[toKey(optionKey)] = normalizeEquipmentOption(optionValue);
            }
        }
        if (Object.keys(choiceObj).length > 0) {
            choices.push(choiceObj as IEquipmentChoice);
        }
    }
    
    return {
        choices,
        description: (equipmentData.entries || []).map((entry: any) => 
            typeof entry === 'string' ? toLowercase(entry) : entry
        )
    };
}

function normalizeEquipmentOption(option: any): any {
    if (Array.isArray(option)) {
        return option.map(item => normalizeEquipmentItem(item));
    }
    return option;
}

function normalizeEquipmentItem(item: any): IEquipmentChoice {
    if (typeof item === 'object' && item !== null) {
        if ('item' in item) {
            const itemChoice: IEquipmentChoice = {
                type: "choice",
                item: '',
                source: 'xphb'
            };

            // Handle item strings with source (e.g., "chain shirt|xphb")
            if (typeof item.item === 'string' && item.item.includes('|')) {
                const [itemName, source] = item.item.split('|');
                itemChoice.item = toLowercase(itemName);
                itemChoice.source = toLowercase(source);
            } else {
                itemChoice.item = toLowercase(item.item || '');
            }

            if (item.quantity) {
                itemChoice.quantity = item.quantity;
            }
            
            return itemChoice;
        } else if ('equipmentType' in item) {
            return {
                type: "choice",
                equipmenttype: toLowercase(item.equipmentType || '')
            };
        } else if ('value' in item) {
            return {
                type: "choice",
                value: item.value
            };
        }
    }

    // Handle string items directly (e.g., "chain shirt|xphb")
    if (typeof item === 'string') {
        if (item.includes('|')) {
            const [itemName, source] = item.split('|');
            return {
                type: "choice",
                item: toLowercase(itemName),
                source: toLowercase(source)
            };
        } else {
            return {
                type: "choice",
                item: toLowercase(item),
                source: 'xphb'
            };
        }
    }

    return {
        type: "choice"
    };
}

function extractFeatures(classData: RawClassData, allFeatures: any[]): Record<string, IFeatureData[]> {
    const className = toLowercase(classData.name || '');
    const featuresByLevel: Record<string, IFeatureData[]> = {};
    
    for (const featureRef of classData.classFeatures || []) {
        if (typeof featureRef === 'string') {
            const parts = featureRef.split('|');
            const featureName = toLowercase(parts[0] || '');
            const levelStr = parts[parts.length - 1];
            
            try {
                const level = parseInt(levelStr, 10);
                
                const feature = allFeatures.find(f => 
                    toLowercase(f.name || '') === featureName &&
                    toLowercase(f.className || '') === className &&
                    f.classSource === 'PHB' &&
                    f.level === level
                );
                
                if (feature) {
                    if (!featuresByLevel[level]) {
                        featuresByLevel[level] = [];
                    }
                    
                    const normalizedFeature = normalizeSubclassFeatureEntries(feature.entries || []);
                    featuresByLevel[level].push({
                        name: featureName,
                        source: "xphb",
                        ...normalizedFeature
                    });
                }
            } catch (e) {
                continue;
            }
        } else if (typeof featureRef === 'object' && featureRef?.gainSubclassFeature) {
            const subclassFeatureRef = featureRef.classFeature || '';
            const parts = subclassFeatureRef.split('|');
            if (parts.length >= 3) {
                const level = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(level)) {
                    if (!featuresByLevel[level]) {
                        featuresByLevel[level] = [];
                    }
                    featuresByLevel[level].push({
                        name: toLowercase(parts[0] || ''),
                        source: "xphb",
                        gainsubclassfeature: true
                    });
                }
            }
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
    
    if (subclass.source !== 'PHB' || subclass.classSource !== 'PHB') {
        return featuresByLevel;
    }
    
    for (const feature of allFeatures) {
        if (toLowercase(feature.className || '') !== className ||
            toLowercase(feature.subclassShortName || '') !== subclassName ||
            feature.subclassSource !== 'PHB') {
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

export function convert5eToolsClass(data: any): NormalizedData {
    // Check if we're dealing with a direct class object or a container with class arrays
    let classData: RawClassData;
    let subclasses: any[] = [];
    let classFeatures: any[] = [];
    let subclassFeatures: any[] = [];
    
    // Handle case where data is a container with arrays
    if (data.class && Array.isArray(data.class)) {
        // Extract only PHB classes
        const phbClasses = data.class.filter((cls: RawClassData) => cls.source === 'PHB');
        if (phbClasses.length === 0) {
            console.log(`No PHB classes found in data`);
            return {} as NormalizedData;
        }
        
        classData = phbClasses[0];
        subclasses = (data.subclass || []).filter(
            (sc: RawSubclassData) => sc.source === 'PHB' && sc.classSource === 'PHB'
        );
        classFeatures = data.classFeature || [];
        subclassFeatures = data.subclassFeature || [];
    } 
    // Handle case where data is a direct class object
    else if (data.source === 'PHB') {
        classData = data;
        // In this case, we need to return an empty object for subclasses and features
        // as they'll be processed separately
    } else {
        console.log(`No PHB class found in data: ${data.name} (${data.source})`);
        return {} as NormalizedData;
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

    return {
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
}