/**
 * Game system configuration schemas
 * Defines the structure and validation rules for different TTRPG systems
 */

import type { Schema } from '../validation/game-data-validator.mjs';
import type { 
  CharacterData,
  Item,
  Spell
} from '../types/game-data.mjs';

/**
 * Game system configuration
 */
export interface GameSystemConfig {
  /** System identifier */
  id: string;
  
  /** System name */
  name: string;
  
  /** System version */
  version: string;
  
  /** System description */
  description: string;
  
  /** Supported entity types */
  entityTypes: string[];
  
  /** Data schemas */
  schemas: Record<string, Schema<any>>;
  
  /** Validation rules */
  validationRules: ValidationRuleConfig[];
  
  /** Default values */
  defaults: Record<string, unknown>;
  
  /** System-specific settings */
  settings: SystemSettings;
}

/**
 * System-specific settings
 */
export interface SystemSettings {
  /** Character creation rules */
  characterCreation: CharacterCreationSettings;
  
  /** Combat rules */
  combat: CombatSettings;
  
  /** Magic system */
  magic: MagicSettings;
  
  /** Equipment rules */
  equipment: EquipmentSettings;
  
  /** Progression rules */
  progression: ProgressionSettings;
  
  /** Custom rules */
  customRules: Record<string, unknown>;
}

/**
 * Character creation settings
 */
export interface CharacterCreationSettings {
  /** Starting level */
  startingLevel: number;
  
  /** Maximum level */
  maxLevel: number;
  
  /** Ability score generation */
  abilityScoreGeneration: {
    method: 'point_buy' | 'standard_array' | 'roll' | 'custom';
    pointBuyPoints?: number;
    standardArray?: number[];
    rollMethod?: string;
    customMethod?: string;
  };
  
  /** Starting equipment */
  startingEquipment: {
    method: 'class_equipment' | 'purchase' | 'custom';
    startingGold?: number;
    customEquipment?: string[];
  };
  
  /** Multiclassing rules */
  multiclassing: {
    enabled: boolean;
    requirements?: Record<string, number>;
  };
  
  /** Variant rules */
  variantRules: {
    customBackgrounds: boolean;
    variantHuman: boolean;
    optionalFeats: boolean;
  };
}

/**
 * Combat settings
 */
export interface CombatSettings {
  /** Initiative system */
  initiative: {
    type: 'standard' | 'group' | 'popcorn' | 'custom';
    modifier: string;
    tiebreaker: 'ability' | 'roll' | 'player_choice';
  };
  
  /** Action economy */
  actionEconomy: {
    actions: string[];
    bonusActions: string[];
    reactions: string[];
    freeActions: string[];
  };
  
  /** Damage and healing */
  damageRules: {
    criticalHits: 'double_dice' | 'max_plus_roll' | 'custom';
    healingRules: 'standard' | 'no_healing' | 'custom';
  };
  
  /** Conditions */
  conditions: string[];
  
  /** Optional rules */
  optionalRules: {
    flanking: boolean;
    diagonalMovement: boolean;
    cleavingThrough: boolean;
    initiative_variants: boolean;
  };
}

/**
 * Magic system settings
 */
export interface MagicSettings {
  /** Spell slot system */
  spellSlots: {
    enabled: boolean;
    maxLevel: number;
    recovery: 'long_rest' | 'short_rest' | 'custom';
  };
  
  /** Spellcasting rules */
  spellcasting: {
    concentration: boolean;
    ritualCasting: boolean;
    componentRules: boolean;
  };
  
  /** Magic item rules */
  magicItems: {
    attunement: boolean;
    maxAttunement: number;
    identification: 'automatic' | 'identify_spell' | 'experimentation';
  };
  
  /** Variant rules */
  variantRules: {
    spellPoints: boolean;
    psionics: boolean;
    customMagic: boolean;
  };
}

/**
 * Equipment settings
 */
export interface EquipmentSettings {
  /** Encumbrance rules */
  encumbrance: {
    enabled: boolean;
    variant: 'simple' | 'detailed' | 'custom';
    carryingCapacity: string;
  };
  
  /** Equipment slots */
  equipmentSlots: string[];
  
  /** Armor rules */
  armor: {
    donDoffTime: boolean;
    sleeping: boolean;
    stealth: boolean;
  };
  
  /** Weapon rules */
  weapons: {
    improvised: boolean;
    silvered: boolean;
    adamantine: boolean;
  };
  
  /** Crafting rules */
  crafting: {
    enabled: boolean;
    downtime: boolean;
    materials: boolean;
  };
}

/**
 * Progression settings
 */
export interface ProgressionSettings {
  /** Experience system */
  experience: {
    type: 'xp' | 'milestone' | 'custom';
    xpTable?: Record<number, number>;
    milestones?: string[];
  };
  
  /** Proficiency bonus */
  proficiencyBonus: {
    progression: number[];
    doubleOnCritical: boolean;
  };
  
  /** Ability score improvement */
  abilityScoreImprovement: {
    levels: number[];
    points: number;
    featOption: boolean;
  };
  
  /** Hit points */
  hitPoints: {
    calculation: 'roll' | 'average' | 'max' | 'custom';
    firstLevel: 'max' | 'roll' | 'average';
  };
}

/**
 * Validation rule configuration
 */
export interface ValidationRuleConfig {
  /** Rule name */
  name: string;
  
  /** Entity types this rule applies to */
  entityTypes: string[];
  
  /** Rule implementation */
  implementation: string;
  
  /** Rule parameters */
  parameters: Record<string, unknown>;
  
  /** Rule priority */
  priority: number;
  
  /** Rule description */
  description: string;
}

/**
 * D&D 5e 2024 system configuration
 */
export const DND5E2024_CONFIG: GameSystemConfig = {
  id: 'dnd5e-2024',
  name: 'Dungeons & Dragons 5th Edition (2024)',
  version: '2024.1.0',
  description: 'D&D 5th Edition with 2024 Player\'s Handbook rules',
  entityTypes: ['character', 'item', 'spell', 'campaign', 'encounter'],
  
  schemas: {
    character: {
      type: 'object',
      required: ['id', 'name', 'type'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string' },
        level: { type: 'number', minimum: 1, maximum: 20 },
        classes: { type: 'array' },
        race: { type: 'object' },
        abilities: { type: 'object' }
      }
    } as Schema<CharacterData>,
    
    item: {
      type: 'object',
      required: ['id', 'name', 'type'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string' },
        category: { type: 'string' },
        weight: { type: 'number', minimum: 0 },
        value: { type: 'object' },
        rarity: { type: 'string' }
      }
    } as Schema<Item>,
    
    spell: {
      type: 'object',
      required: ['id', 'name', 'type'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string' },
        level: { type: 'number', minimum: 0, maximum: 9 },
        school: { type: 'string' },
        castingTime: { type: 'string' },
        range: { type: 'string' },
        duration: { type: 'string' },
        components: { type: 'object' },
        concentration: { type: 'boolean' },
        ritual: { type: 'boolean' }
      }
    } as Schema<Spell>
  },
  
  validationRules: [
    {
      name: 'character_total_level',
      entityTypes: ['character'],
      implementation: 'validateCharacterTotalLevel',
      parameters: { maxLevel: 20 },
      priority: 100,
      description: 'Validates that character total level does not exceed maximum'
    },
    {
      name: 'ability_score_limits',
      entityTypes: ['character'],
      implementation: 'validateAbilityScoreLimits',
      parameters: { minScore: 1, maxScore: 30, standardMin: 8, standardMax: 18 },
      priority: 90,
      description: 'Validates ability scores are within acceptable ranges'
    },
    {
      name: 'spell_level_limits',
      entityTypes: ['spell'],
      implementation: 'validateSpellLevel',
      parameters: { minLevel: 0, maxLevel: 9 },
      priority: 80,
      description: 'Validates spell levels are within D&D 5e limits'
    }
  ],
  
  defaults: {
    character: {
      level: 1,
      proficiencyBonus: 2,
      experience: { current: 0, required: 300 },
      hitPoints: { current: 8, maximum: 8, temporary: 0 },
      armorClass: { base: 10, modifiers: [], total: 10 },
      initiative: 0,
      speed: { walking: 30 }
    },
    item: {
      weight: 0,
      value: { amount: 0, currency: 'gp' },
      rarity: 'common'
    },
    spell: {
      concentration: false,
      ritual: false,
      components: { verbal: false, somatic: false, material: false }
    }
  },
  
  settings: {
    characterCreation: {
      startingLevel: 1,
      maxLevel: 20,
      abilityScoreGeneration: {
        method: 'point_buy',
        pointBuyPoints: 27,
        standardArray: [15, 14, 13, 12, 10, 8]
      },
      startingEquipment: {
        method: 'class_equipment'
      },
      multiclassing: {
        enabled: true,
        requirements: {
          strength: 13,
          dexterity: 13,
          constitution: 13,
          intelligence: 13,
          wisdom: 13,
          charisma: 13
        }
      },
      variantRules: {
        customBackgrounds: true,
        variantHuman: true,
        optionalFeats: true
      }
    },
    
    combat: {
      initiative: {
        type: 'standard',
        modifier: 'dexterity',
        tiebreaker: 'ability'
      },
      actionEconomy: {
        actions: ['attack', 'cast_spell', 'dash', 'disengage', 'dodge', 'help', 'hide', 'ready', 'search', 'use_object'],
        bonusActions: ['second_wind', 'cunning_action', 'healing_word'],
        reactions: ['opportunity_attack', 'counterspell', 'shield'],
        freeActions: ['communicate', 'draw_weapon', 'interact_with_object']
      },
      damageRules: {
        criticalHits: 'double_dice',
        healingRules: 'standard'
      },
      conditions: [
        'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
        'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
        'stunned', 'unconscious', 'exhaustion'
      ],
      optionalRules: {
        flanking: false,
        diagonalMovement: false,
        cleavingThrough: false,
        initiative_variants: false
      }
    },
    
    magic: {
      spellSlots: {
        enabled: true,
        maxLevel: 9,
        recovery: 'long_rest'
      },
      spellcasting: {
        concentration: true,
        ritualCasting: true,
        componentRules: true
      },
      magicItems: {
        attunement: true,
        maxAttunement: 3,
        identification: 'identify_spell'
      },
      variantRules: {
        spellPoints: false,
        psionics: false,
        customMagic: false
      }
    },
    
    equipment: {
      encumbrance: {
        enabled: false,
        variant: 'simple',
        carryingCapacity: 'strength * 15'
      },
      equipmentSlots: [
        'head', 'neck', 'chest', 'back', 'arms', 'hands', 'waist', 'legs', 'feet',
        'ring1', 'ring2', 'main_hand', 'off_hand', 'two_hand'
      ],
      armor: {
        donDoffTime: true,
        sleeping: true,
        stealth: true
      },
      weapons: {
        improvised: true,
        silvered: true,
        adamantine: true
      },
      crafting: {
        enabled: true,
        downtime: true,
        materials: true
      }
    },
    
    progression: {
      experience: {
        type: 'xp',
        xpTable: {
          1: 0,
          2: 300,
          3: 900,
          4: 2700,
          5: 6500,
          6: 14000,
          7: 23000,
          8: 34000,
          9: 48000,
          10: 64000,
          11: 85000,
          12: 100000,
          13: 120000,
          14: 140000,
          15: 165000,
          16: 195000,
          17: 225000,
          18: 265000,
          19: 305000,
          20: 355000
        }
      },
      proficiencyBonus: {
        progression: [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6],
        doubleOnCritical: false
      },
      abilityScoreImprovement: {
        levels: [4, 8, 12, 16, 19],
        points: 2,
        featOption: true
      },
      hitPoints: {
        calculation: 'average',
        firstLevel: 'max'
      }
    },
    
    customRules: {
      criticalFumbles: false,
      flankingAdvantage: false,
      healingPotionBonus: false
    }
  }
};

/**
 * Generic/Universal system configuration
 */
export const GENERIC_CONFIG: GameSystemConfig = {
  id: 'generic',
  name: 'Generic TTRPG System',
  version: '1.0.0',
  description: 'A flexible system for various tabletop RPGs',
  entityTypes: ['character', 'item', 'spell', 'campaign', 'encounter'],
  
  schemas: {
    character: {
      type: 'object',
      required: ['id', 'name', 'type'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string' },
        level: { type: 'number', minimum: 1 },
        attributes: { type: 'object' },
        skills: { type: 'object' },
        inventory: { type: 'object' }
      }
    } as Schema<CharacterData>,
    
    item: {
      type: 'object',
      required: ['id', 'name', 'type'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string' },
        weight: { type: 'number', minimum: 0 },
        value: { type: 'number', minimum: 0 }
      }
    } as Schema<Item>,
    
    spell: {
      type: 'object',
      required: ['id', 'name', 'type'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string' },
        level: { type: 'number', minimum: 0 },
        school: { type: 'string' },
        description: { type: 'string' }
      }
    } as Schema<Spell>
  },
  
  validationRules: [
    {
      name: 'required_fields',
      entityTypes: ['character', 'item', 'spell'],
      implementation: 'validateRequiredFields',
      parameters: {},
      priority: 100,
      description: 'Validates that required fields are present'
    }
  ],
  
  defaults: {
    character: {
      level: 1,
      attributes: {},
      skills: {},
      inventory: {}
    },
    item: {
      weight: 0,
      value: 0
    },
    spell: {
      level: 0,
      school: 'unknown'
    }
  },
  
  settings: {
    characterCreation: {
      startingLevel: 1,
      maxLevel: 100,
      abilityScoreGeneration: {
        method: 'custom'
      },
      startingEquipment: {
        method: 'custom'
      },
      multiclassing: {
        enabled: true
      },
      variantRules: {
        customBackgrounds: true,
        variantHuman: false,
        optionalFeats: true
      }
    },
    
    combat: {
      initiative: {
        type: 'custom',
        modifier: 'custom',
        tiebreaker: 'player_choice'
      },
      actionEconomy: {
        actions: ['action'],
        bonusActions: ['bonus_action'],
        reactions: ['reaction'],
        freeActions: ['free_action']
      },
      damageRules: {
        criticalHits: 'custom',
        healingRules: 'custom'
      },
      conditions: [],
      optionalRules: {
        flanking: false,
        diagonalMovement: false,
        cleavingThrough: false,
        initiative_variants: false
      }
    },
    
    magic: {
      spellSlots: {
        enabled: false,
        maxLevel: 9,
        recovery: 'custom'
      },
      spellcasting: {
        concentration: false,
        ritualCasting: false,
        componentRules: false
      },
      magicItems: {
        attunement: false,
        maxAttunement: 0,
        identification: 'automatic'
      },
      variantRules: {
        spellPoints: false,
        psionics: false,
        customMagic: true
      }
    },
    
    equipment: {
      encumbrance: {
        enabled: false,
        variant: 'custom',
        carryingCapacity: 'custom'
      },
      equipmentSlots: ['equipment'],
      armor: {
        donDoffTime: false,
        sleeping: false,
        stealth: false
      },
      weapons: {
        improvised: true,
        silvered: false,
        adamantine: false
      },
      crafting: {
        enabled: false,
        downtime: false,
        materials: false
      }
    },
    
    progression: {
      experience: {
        type: 'custom'
      },
      proficiencyBonus: {
        progression: [1],
        doubleOnCritical: false
      },
      abilityScoreImprovement: {
        levels: [],
        points: 0,
        featOption: false
      },
      hitPoints: {
        calculation: 'custom' as any,
        firstLevel: 'custom' as any
      }
    },
    
    customRules: {}
  }
};

/**
 * Game system registry
 */
export class GameSystemRegistry {
  private systems: Map<string, GameSystemConfig> = new Map();
  
  constructor() {
    this.registerSystem(DND5E2024_CONFIG);
    this.registerSystem(GENERIC_CONFIG);
  }
  
  /**
   * Register a game system
   */
  registerSystem(config: GameSystemConfig): void {
    this.systems.set(config.id, config);
  }
  
  /**
   * Get a game system configuration
   */
  getSystem(id: string): GameSystemConfig | undefined {
    return this.systems.get(id);
  }
  
  /**
   * Get all registered systems
   */
  getAllSystems(): GameSystemConfig[] {
    return Array.from(this.systems.values());
  }
  
  /**
   * Get system IDs
   */
  getSystemIds(): string[] {
    return Array.from(this.systems.keys());
  }
  
  /**
   * Check if system exists
   */
  hasSystem(id: string): boolean {
    return this.systems.has(id);
  }
  
  /**
   * Get schema for entity type
   */
  getSchema(systemId: string, entityType: string): Schema<unknown> | undefined {
    const system = this.getSystem(systemId);
    return system?.schemas[entityType];
  }
  
  /**
   * Get default values for entity type
   */
  getDefaults(systemId: string, entityType: string): Record<string, unknown> {
    const system = this.getSystem(systemId);
    return (system?.defaults[entityType] as Record<string, unknown>) || {};
  }
  
  /**
   * Get validation rules for entity type
   */
  getValidationRules(systemId: string, entityType: string): ValidationRuleConfig[] {
    const system = this.getSystem(systemId);
    return system?.validationRules.filter(rule => 
      rule.entityTypes.includes(entityType)
    ) || [];
  }
}

/**
 * Default game system registry instance
 */
export const gameSystemRegistry = new GameSystemRegistry();