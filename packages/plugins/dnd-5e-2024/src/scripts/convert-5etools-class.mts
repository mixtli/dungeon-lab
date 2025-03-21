// convert-5e-tools-class.mts
import type {
  IClassData,
  ISkillChoice,
  IEquipmentData,
  IEquipmentChoice,
  IFeatureData,
  IBenefit,
  ISpellData,
  ISpellEntry,
  ISpellChoice,
  ISubclassData
} from '../shared/schemas/character-class.schema.mjs';

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
export interface NormalizedData extends IClassData {}

function toLowercase(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value.toLowerCase();
    }
    return String(value).toLowerCase();
}

function toKey(value: any): string {
    return toLowercase(value);
}

function cleanRuleText(text: string): string {
    // Handle {@variantrule text|source} pattern
    text = text.replace(/{@variantrule ([^}|]+)\|[^}]+}/g, '$1');
    
    // Handle any other {@something text|source} pattern
    text = text.replace(/{@\w+ ([^}|]+)\|[^}]+}/g, '$1');
    
    // Handle simple {@something text} pattern (no source)
    text = text.replace(/{@\w+ ([^}]+)}/g, '$1');
    
    return text;
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
        type: "choice",
        item: toLowercase(String(item)),
        source: 'xphb'
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
                    f.classSource === 'XPHB' &&
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

function normalizeSpellString(spellString: string, defaultTag?: string): ISpellData {
    const spellObj: ISpellData = {
        name: "",
        source: "xphb"
    };
    
    if (spellString.includes('|')) {
        const parts = spellString.split('|');
        spellObj.name = toLowercase(parts[0] || '');
        spellObj.source = toLowercase(parts[1] || 'xphb');
    } else {
        spellObj.name = toLowercase(spellString);
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
        
        if ('prepared' in spellEntry) {
            result.prepared = {};
            Object.entries(spellEntry.prepared).forEach(([level, spells]) => {
                result.prepared![level] = (spells as string[]).map(
                    spell => normalizeSpellString(spell)
                );
            });
        }
        
        if ('known' in spellEntry) {
            result.known = {};
            Object.entries(spellEntry.known).forEach(([level, spellChoices]) => {
                result.known![level] = (spellChoices as any[]).map(choice => {
                    if (typeof choice === 'object' && choice?.choose) {
                        return {
                            type: "choice",
                            ...Object.entries(choice.choose).reduce((acc, [k, v]) => ({
                                ...acc,
                                [toKey(k)]: v
                            }), {})
                        } as ISpellChoice;
                    }
                    return normalizeSpellString(choice as string);
                });
            });
        }
        
        if ('innate' in spellEntry) {
            result.innate = {};
            Object.entries(spellEntry.innate).forEach(([level, spellsData]) => {
                if (typeof spellsData === 'object' && !Array.isArray(spellsData)) {
                    result.innate![level] = Object.entries(spellsData as Record<string, string[]>)
                        .flatMap(([tag, spellList]) => 
                            spellList.map(spell => 
                                normalizeSpellString(spell, toLowercase(tag))
                            )
                        );
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
    // Extract only XPHB classes
    const xphbClasses = (data.class || []).filter((cls: RawClassData) => cls.source === 'XPHB');
    if (xphbClasses.length === 0) {
        console.log(`No XPHB classes found in data`);
        return {} as NormalizedData;
    }
    
    const classData = xphbClasses[0];
    const className = toLowercase(classData.name || '');
    
    // Extract subclasses
    const xphbSubclasses = (data.subclass || []).filter(
        (sc: RawSubclassData) => sc.source === 'XPHB' && sc.classSource === 'XPHB'
    );
    
    const subclasses = xphbSubclasses.map((subclass: RawSubclassData) => {
        const subclassFeatures = extractSubclassFeatures(
            subclass,
            data.subclassFeature || [],
            className
        );
        
        return {
            name: toLowercase(subclass.name || ''),
            shortname: toLowercase(subclass.shortName || ''),
            source: "xphb",
            classname: className,
            features: subclassFeatures,
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
        features: extractFeatures(classData, data.classFeature || []),
        subclasslevel: findSubclassLevel(classData.classFeatures || []),
        subclassTitle: toLowercase(classData.subclassTitle || ''),
        subclasses: subclasses
    };
}