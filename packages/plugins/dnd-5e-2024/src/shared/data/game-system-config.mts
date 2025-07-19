/**
 * D&D 5e Game System Configuration
 * 
 * Complete configuration for D&D 5th Edition (2024) rules
 */

import { DND5E2024_CONFIG } from '@dungeon-lab/shared/schemas/game-system-schemas.mjs';
import type { GameSystemConfig } from '@dungeon-lab/shared/schemas/game-system-schemas.mjs';

/**
 * D&D 5e 2024 Game System Configuration
 * Extended with plugin-specific data
 */
export const DnD5eGameSystemConfig: GameSystemConfig = {
  ...DND5E2024_CONFIG,
  
  // Plugin-specific extensions
  customRules: {
    ...DND5E2024_CONFIG.customRules,
    
    // Plugin-specific rule overrides
    pluginVersion: '2.0.0',
    
    // Custom house rules
    customHouseRules: {
      criticalFumbles: false,
      flankingAdvantage: false,
      healingPotionBonus: false,
      deathSaveAdvantage: false,
      restVariants: 'standard'
    },
    
    // Plugin-specific features
    features: {
      advancedCharacterSheet: true,
      automatedCalculations: true,
      spellSlotTracking: true,
      initiativeTracking: true,
      conditionTracking: true,
      inventoryManagement: true,
      experienceTracking: true,
      levelingAssistance: true
    }
  },
  
  // Extended validation rules
  validationRules: [
    ...DND5E2024_CONFIG.validationRules,
    
    // Plugin-specific validation
    {
      name: 'multiclass_requirements',
      entityTypes: ['character'],
      implementation: 'validateMulticlassRequirements',
      parameters: {
        requirementsByClass: {
          barbarian: { strength: 13 },
          bard: { charisma: 13 },
          cleric: { wisdom: 13 },
          druid: { wisdom: 13 },
          fighter: { strength: 13, dexterity: 13 },
          monk: { dexterity: 13, wisdom: 13 },
          paladin: { strength: 13, charisma: 13 },
          ranger: { dexterity: 13, wisdom: 13 },
          rogue: { dexterity: 13 },
          sorcerer: { charisma: 13 },
          warlock: { charisma: 13 },
          wizard: { intelligence: 13 }
        }
      },
      priority: 85,
      description: 'Validates multiclassing ability score requirements'
    },
    
    {
      name: 'spell_slot_availability',
      entityTypes: ['character'],
      implementation: 'validateSpellSlotAvailability',
      parameters: {
        validatePreparedSpells: true,
        validateKnownSpells: true
      },
      priority: 75,
      description: 'Validates spell slot usage and availability'
    },
    
    {
      name: 'equipment_requirements',
      entityTypes: ['character'],
      implementation: 'validateEquipmentRequirements',
      parameters: {
        checkProficiencies: true,
        checkStrengthRequirements: true,
        checkSlotConflicts: true
      },
      priority: 70,
      description: 'Validates equipment proficiencies and requirements'
    }
  ],
  
  // Extended default values
  defaults: {
    ...DND5E2024_CONFIG.defaults,
    
    character: {
      ...DND5E2024_CONFIG.defaults.character,
      
      // D&D 5e specific defaults
      inspiration: false,
      deathSaves: { successes: 0, failures: 0 },
      conditions: [],
      exhaustion: 0,
      
      // Extended combat defaults
      combat: {
        hitPoints: { current: 8, maximum: 8, temporary: 0 },
        armorClass: { base: 10, modifiers: [], total: 10 },
        initiative: 0,
        speed: { walking: 30, flying: 0, swimming: 30, climbing: 15 },
        savingThrows: {
          strength: { proficient: false, modifier: 0, total: 0 },
          dexterity: { proficient: false, modifier: 0, total: 0 },
          constitution: { proficient: false, modifier: 0, total: 0 },
          intelligence: { proficient: false, modifier: 0, total: 0 },
          wisdom: { proficient: false, modifier: 0, total: 0 },
          charisma: { proficient: false, modifier: 0, total: 0 }
        },
        actions: [],
        bonusActions: [],
        reactions: [],
        resistances: [],
        immunities: [],
        vulnerabilities: [],
        conditionImmunities: []
      },
      
      // Spell system defaults
      spells: {
        spellcastingAbility: 'intelligence',
        spellAttackBonus: 0,
        spellSaveDC: 8,
        ritualCasting: false,
        slots: {
          1: { maximum: 0, used: 0, available: 0 },
          2: { maximum: 0, used: 0, available: 0 },
          3: { maximum: 0, used: 0, available: 0 },
          4: { maximum: 0, used: 0, available: 0 },
          5: { maximum: 0, used: 0, available: 0 },
          6: { maximum: 0, used: 0, available: 0 },
          7: { maximum: 0, used: 0, available: 0 },
          8: { maximum: 0, used: 0, available: 0 },
          9: { maximum: 0, used: 0, available: 0 }
        },
        spells: {},
        customSpells: []
      },
      
      // Skills system defaults
      skills: {
        skills: {
          acrobatics: { name: 'Acrobatics', ability: 'dexterity', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          animalHandling: { name: 'Animal Handling', ability: 'wisdom', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          arcana: { name: 'Arcana', ability: 'intelligence', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          athletics: { name: 'Athletics', ability: 'strength', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          deception: { name: 'Deception', ability: 'charisma', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          history: { name: 'History', ability: 'intelligence', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          insight: { name: 'Insight', ability: 'wisdom', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          intimidation: { name: 'Intimidation', ability: 'charisma', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          investigation: { name: 'Investigation', ability: 'intelligence', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          medicine: { name: 'Medicine', ability: 'wisdom', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          nature: { name: 'Nature', ability: 'intelligence', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          perception: { name: 'Perception', ability: 'wisdom', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          performance: { name: 'Performance', ability: 'charisma', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          persuasion: { name: 'Persuasion', ability: 'charisma', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          religion: { name: 'Religion', ability: 'intelligence', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          sleightOfHand: { name: 'Sleight of Hand', ability: 'dexterity', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          stealth: { name: 'Stealth', ability: 'dexterity', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 },
          survival: { name: 'Survival', ability: 'wisdom', proficiency: 'none', modifiers: [], bonus: 0, passive: 10 }
        },
        customSkills: {}
      },
      
      // Inventory defaults
      inventory: {
        equipped: {
          head: null,
          neck: null,
          chest: null,
          back: null,
          arms: null,
          hands: null,
          waist: null,
          legs: null,
          feet: null,
          ring1: null,
          ring2: null,
          main_hand: null,
          off_hand: null,
          two_hand: null
        },
        inventory: [],
        currency: {
          cp: 0,
          sp: 0,
          gp: 0,
          pp: 0
        },
        capacity: {
          current: 0,
          maximum: 150,
          encumbrance: 'unencumbered'
        }
      },
      
      // Features defaults
      features: {
        classFeatures: [],
        racialTraits: [],
        backgroundFeatures: [],
        feats: [],
        customFeatures: []
      },
      
      // Biography defaults
      biography: {
        personalityTraits: [],
        ideals: [],
        bonds: [],
        flaws: [],
        backstory: '',
        allies: [],
        enemies: []
      },
      
      // Appearance defaults
      appearance: {
        features: [],
        marks: []
      }
    }
  }
};

/**
 * D&D 5e Class Definitions
 */
export const DnD5eClasses = {
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    hitDie: 12,
    primaryAbility: 'strength',
    savingThrows: ['strength', 'constitution'],
    skillChoices: 2,
    skillList: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      languages: []
    },
    spellcasting: false
  },
  
  bard: {
    id: 'bard',
    name: 'Bard',
    hitDie: 8,
    primaryAbility: 'charisma',
    savingThrows: ['dexterity', 'charisma'],
    skillChoices: 3,
    skillList: 'any',
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'handCrossbow', 'longsword', 'rapier', 'shortsword'],
      tools: ['musicalInstrument'],
      languages: []
    },
    spellcasting: true,
    spellcastingAbility: 'charisma'
  },
  
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    hitDie: 8,
    primaryAbility: 'wisdom',
    savingThrows: ['wisdom', 'charisma'],
    skillChoices: 2,
    skillList: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple'],
      tools: [],
      languages: []
    },
    spellcasting: true,
    spellcastingAbility: 'wisdom'
  },
  
  druid: {
    id: 'druid',
    name: 'Druid',
    hitDie: 8,
    primaryAbility: 'wisdom',
    savingThrows: ['intelligence', 'wisdom'],
    skillChoices: 2,
    skillList: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple'],
      tools: ['herbalismKit'],
      languages: ['druidic']
    },
    spellcasting: true,
    spellcastingAbility: 'wisdom'
  },
  
  fighter: {
    id: 'fighter',
    name: 'Fighter',
    hitDie: 10,
    primaryAbility: 'strength',
    savingThrows: ['strength', 'constitution'],
    skillChoices: 2,
    skillList: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    proficiencies: {
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      languages: []
    },
    spellcasting: false
  },
  
  monk: {
    id: 'monk',
    name: 'Monk',
    hitDie: 8,
    primaryAbility: 'dexterity',
    savingThrows: ['strength', 'dexterity'],
    skillChoices: 2,
    skillList: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    proficiencies: {
      armor: [],
      weapons: ['simple', 'shortsword'],
      tools: ['artisanTools'],
      languages: []
    },
    spellcasting: false
  },
  
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    hitDie: 10,
    primaryAbility: 'strength',
    savingThrows: ['wisdom', 'charisma'],
    skillChoices: 2,
    skillList: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    proficiencies: {
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      languages: []
    },
    spellcasting: true,
    spellcastingAbility: 'charisma'
  },
  
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    hitDie: 10,
    primaryAbility: 'dexterity',
    savingThrows: ['strength', 'dexterity'],
    skillChoices: 3,
    skillList: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      tools: [],
      languages: []
    },
    spellcasting: true,
    spellcastingAbility: 'wisdom'
  },
  
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    hitDie: 8,
    primaryAbility: 'dexterity',
    savingThrows: ['dexterity', 'intelligence'],
    skillChoices: 4,
    skillList: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'],
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'handCrossbow', 'longsword', 'rapier', 'shortsword'],
      tools: ['thievesTools'],
      languages: []
    },
    spellcasting: false
  },
  
  sorcerer: {
    id: 'sorcerer',
    name: 'Sorcerer',
    hitDie: 6,
    primaryAbility: 'charisma',
    savingThrows: ['constitution', 'charisma'],
    skillChoices: 2,
    skillList: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    proficiencies: {
      armor: [],
      weapons: ['simple'],
      tools: [],
      languages: []
    },
    spellcasting: true,
    spellcastingAbility: 'charisma'
  },
  
  warlock: {
    id: 'warlock',
    name: 'Warlock',
    hitDie: 8,
    primaryAbility: 'charisma',
    savingThrows: ['wisdom', 'charisma'],
    skillChoices: 2,
    skillList: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    proficiencies: {
      armor: ['light'],
      weapons: ['simple'],
      tools: [],
      languages: []
    },
    spellcasting: true,
    spellcastingAbility: 'charisma'
  },
  
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    hitDie: 6,
    primaryAbility: 'intelligence',
    savingThrows: ['intelligence', 'wisdom'],
    skillChoices: 2,
    skillList: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    proficiencies: {
      armor: [],
      weapons: ['simple'],
      tools: [],
      languages: []
    },
    spellcasting: true,
    spellcastingAbility: 'intelligence'
  }
};

/**
 * D&D 5e Race Definitions
 */
export const DnD5eRaces = {
  human: {
    id: 'human',
    name: 'Human',
    size: 'medium',
    speed: 30,
    languages: ['common'],
    traits: ['versatile'],
    abilityScoreIncrease: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1
    }
  },
  
  elf: {
    id: 'elf',
    name: 'Elf',
    size: 'medium',
    speed: 30,
    languages: ['common', 'elvish'],
    traits: ['darkvision', 'keenSenses', 'feyAncestry', 'trance'],
    abilityScoreIncrease: {
      dexterity: 2
    }
  },
  
  dwarf: {
    id: 'dwarf',
    name: 'Dwarf',
    size: 'medium',
    speed: 25,
    languages: ['common', 'dwarvish'],
    traits: ['darkvision', 'dwarvenResilience', 'stonecunning'],
    abilityScoreIncrease: {
      constitution: 2
    }
  },
  
  halfling: {
    id: 'halfling',
    name: 'Halfling',
    size: 'small',
    speed: 25,
    languages: ['common', 'halfling'],
    traits: ['lucky', 'brave', 'halflingNimbleness'],
    abilityScoreIncrease: {
      dexterity: 2
    }
  }
};