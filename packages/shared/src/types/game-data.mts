/**
 * Comprehensive game system data structures
 * Supports multiple TTRPG systems with extensible schemas
 */

/**
 * Base game entity with common properties
 */
export interface BaseGameEntity {
  /** Unique identifier */
  id: string;
  
  /** Entity name */
  name: string;
  
  /** Optional description */
  description?: string;
  
  /** Entity type identifier */
  type: string;
  
  /** Source plugin/system */
  source: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last modification timestamp */
  updatedAt: Date;
  
  /** Index signature for flexible properties */
  [key: string]: unknown;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Character ability scores (generic for most systems)
 */
export interface AbilityScores {
  /** Core ability scores */
  [abilityName: string]: {
    /** Base score */
    base: number;
    
    /** Applied modifiers */
    modifiers: number[];
    
    /** Final calculated value */
    value: number;
    
    /** Calculated modifier */
    modifier: number;
    
    /** Proficiency bonus applies */
    proficient?: boolean;
  };
}

/**
 * Generic skill system
 */
export interface SkillSystem {
  /** Available skills */
  skills: Record<string, Skill>;
  
  /** Custom skills */
  customSkills?: Record<string, Skill>;
}

/**
 * Individual skill definition
 */
export interface Skill {
  /** Skill name */
  name: string;
  
  /** Related ability */
  ability: string;
  
  /** Proficiency level */
  proficiency: 'none' | 'proficient' | 'expertise' | 'half';
  
  /** Additional modifiers */
  modifiers: number[];
  
  /** Calculated bonus */
  bonus: number;
  
  /** Passive value */
  passive: number;
  
  /** Custom description */
  description?: string;
}

/**
 * Equipment and inventory system
 */
export interface InventorySystem {
  /** Equipped items by slot */
  equipped: Record<string, Item | null>;
  
  /** Inventory items */
  inventory: InventoryItem[];
  
  /** Currency/resources */
  currency: Record<string, number>;
  
  /** Carrying capacity */
  capacity: {
    /** Current weight */
    current: number;
    
    /** Maximum weight */
    maximum: number;
    
    /** Encumbrance levels */
    encumbrance: EncumbranceLevel;
  };
}

/**
 * Inventory item with quantity and metadata
 */
export interface InventoryItem {
  /** Item reference */
  item: Item;
  
  /** Quantity owned */
  quantity: number;
  
  /** Item condition */
  condition?: 'perfect' | 'good' | 'fair' | 'poor' | 'broken';
  
  /** Custom notes */
  notes?: string;
  
  /** Item location (bag, pocket, etc.) */
  location?: string;
}

/**
 * Encumbrance levels
 */
export type EncumbranceLevel = 'unencumbered' | 'encumbered' | 'heavily_encumbered' | 'immobilized';

/**
 * Generic item definition
 */
export interface Item extends BaseGameEntity {
  /** Item category */
  category: string;
  
  /** Item subcategory */
  subcategory?: string;
  
  /** Item weight */
  weight: number;
  
  /** Item value */
  value: {
    amount: number;
    currency: string;
  };
  
  /** Item rarity */
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
  
  /** Equipment properties */
  properties?: ItemProperty[];
  
  /** Usage requirements */
  requirements?: ItemRequirement[];
  
  /** Item effects */
  effects?: ItemEffect[];
  
  /** Item statistics (for weapons, armor, etc.) */
  stats?: Record<string, unknown>;
}

/**
 * Item property (magical, finesse, etc.)
 */
export interface ItemProperty {
  /** Property name */
  name: string;
  
  /** Property description */
  description: string;
  
  /** Property parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Item usage requirement
 */
export interface ItemRequirement {
  /** Requirement type */
  type: 'ability' | 'skill' | 'class' | 'level' | 'proficiency';
  
  /** Required value */
  value: string | number;
  
  /** Minimum requirement */
  minimum?: number;
}

/**
 * Item effect definition
 */
export interface ItemEffect {
  /** Effect type */
  type: string;
  
  /** Effect target */
  target: 'self' | 'other' | 'area';
  
  /** Effect parameters */
  parameters: Record<string, unknown>;
  
  /** Effect duration */
  duration?: {
    type: 'instant' | 'permanent' | 'timed' | 'conditional';
    value?: number;
    unit?: string;
    condition?: string;
  };
}

/**
 * Spell system for magic-using characters
 */
export interface SpellSystem {
  /** Known spells by level */
  spells: Record<number, Spell[]>;
  
  /** Spell slots by level */
  slots: Record<number, SpellSlot>;
  
  /** Spellcasting ability */
  ability: string;
  
  /** Spell save DC */
  saveDC: number;
  
  /** Spell attack bonus */
  attackBonus: number;
  
  /** Ritual casting */
  ritualCasting: boolean;
  
  /** Custom spells */
  customSpells?: Spell[];
}

/**
 * Spell slot information
 */
export interface SpellSlot {
  /** Maximum slots */
  maximum: number;
  
  /** Used slots */
  used: number;
  
  /** Available slots */
  available: number;
}

/**
 * Spell definition
 */
export interface Spell extends BaseGameEntity {
  /** Spell level */
  level: number;
  
  /** Spell school */
  school: string;
  
  /** Casting time */
  castingTime: string;
  
  /** Spell range */
  range: string;
  
  /** Components required */
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialComponents?: string;
  };
  
  /** Spell duration */
  duration: string;
  
  /** Concentration required */
  concentration: boolean;
  
  /** Ritual casting available */
  ritual: boolean;
  
  /** Spell effects */
  effects: SpellEffect[];
  
  /** Higher level casting */
  higherLevels?: string;
}

/**
 * Spell effect definition
 */
export interface SpellEffect {
  /** Effect type */
  type: 'damage' | 'healing' | 'condition' | 'utility' | 'summoning';
  
  /** Dice expression for damage/healing */
  dice?: string;
  
  /** Damage type */
  damageType?: string;
  
  /** Saving throw */
  savingThrow?: {
    ability: string;
    dc?: number;
    effect: 'half' | 'negates' | 'ends';
  };
  
  /** Area of effect */
  area?: {
    type: 'sphere' | 'cube' | 'cone' | 'line' | 'cylinder';
    size: number;
  };
  
  /** Condition applied */
  condition?: string;
  
  /** Effect duration */
  duration?: string;
}

/**
 * Combat statistics and actions
 */
export interface CombatSystem {
  /** Health points */
  hitPoints: {
    current: number;
    maximum: number;
    temporary: number;
  };
  
  /** Armor class */
  armorClass: {
    base: number;
    modifiers: number[];
    total: number;
  };
  
  /** Initiative modifier */
  initiative: number;
  
  /** Movement speeds */
  speed: Record<string, number>;
  
  /** Saving throws */
  savingThrows: Record<string, SavingThrow>;
  
  /** Combat actions */
  actions: CombatAction[];
  
  /** Bonus actions */
  bonusActions: CombatAction[];
  
  /** Reactions */
  reactions: CombatAction[];
  
  /** Legendary actions */
  legendaryActions?: CombatAction[];
  
  /** Damage resistances */
  resistances: string[];
  
  /** Damage immunities */
  immunities: string[];
  
  /** Damage vulnerabilities */
  vulnerabilities: string[];
  
  /** Condition immunities */
  conditionImmunities: string[];
}

/**
 * Saving throw information
 */
export interface SavingThrow {
  /** Base ability modifier */
  modifier: number;
  
  /** Proficiency bonus applies */
  proficient: boolean;
  
  /** Additional modifiers */
  bonuses: number[];
  
  /** Total bonus */
  total: number;
}

/**
 * Combat action definition
 */
export interface CombatAction {
  /** Action name */
  name: string;
  
  /** Action description */
  description: string;
  
  /** Attack bonus (if applicable) */
  attackBonus?: number;
  
  /** Damage dice */
  damage?: string;
  
  /** Damage type */
  damageType?: string;
  
  /** Action range */
  range?: string;
  
  /** Number of uses */
  uses?: {
    current: number;
    maximum: number;
    resetOn: 'short_rest' | 'long_rest' | 'dawn' | 'custom';
  };
  
  /** Action recharge */
  recharge?: {
    dice: string;
    description: string;
  };
}

/**
 * Character features and traits
 */
export interface FeatureSystem {
  /** Class features */
  classFeatures: Feature[];
  
  /** Racial traits */
  racialTraits: Feature[];
  
  /** Background features */
  backgroundFeatures: Feature[];
  
  /** Feats */
  feats: Feature[];
  
  /** Custom features */
  customFeatures: Feature[];
}

/**
 * Feature/trait definition
 */
export interface Feature extends BaseGameEntity {
  /** Feature category */
  category: 'class' | 'race' | 'background' | 'feat' | 'custom';
  
  /** Class/race source */
  source: string;
  
  /** Level/tier gained */
  level?: number;
  
  /** Feature effects */
  effects: FeatureEffect[];
  
  /** Usage limitations */
  usage?: {
    type: 'at_will' | 'per_rest' | 'per_day' | 'recharge' | 'permanent';
    amount?: number;
    restType?: 'short' | 'long';
    current?: number;
  };
  
  /** Prerequisites */
  prerequisites?: string[];
}

/**
 * Feature effect definition
 */
export interface FeatureEffect {
  /** Effect type */
  type: 'ability_modifier' | 'skill_bonus' | 'new_action' | 'resistance' | 'immunity' | 'special';
  
  /** Target of effect */
  target?: string;
  
  /** Effect value */
  value?: number | string;
  
  /** Effect conditions */
  conditions?: string[];
  
  /** Effect description */
  description: string;
}

/**
 * Complete character data structure
 */
export interface CharacterData extends BaseGameEntity {
  /** Character level */
  level: number;
  
  /** Character class(es) */
  classes: CharacterClass[];
  
  /** Character race */
  race: CharacterRace;
  
  /** Character background */
  background: CharacterBackground;
  
  /** Ability scores */
  abilities: AbilityScores;
  
  /** Skills */
  skills: SkillSystem;
  
  /** Inventory and equipment */
  inventory: InventorySystem;
  
  /** Spells (if applicable) */
  spells?: SpellSystem;
  
  /** Combat statistics */
  combat: CombatSystem;
  
  /** Features and traits */
  features: FeatureSystem;
  
  /** Character biography */
  biography: CharacterBiography;
  
  /** Character appearance */
  appearance: CharacterAppearance;
  
  /** Experience points */
  experience: {
    current: number;
    required: number;
  };
  
  /** Proficiency bonus */
  proficiencyBonus: number;
  
  /** Character notes */
  notes: string;
  
  /** Character portrait */
  portrait?: string;
  
  /** Custom character data */
  customData?: Record<string, unknown>;
}

/**
 * Character class information
 */
export interface CharacterClass {
  /** Class name */
  name: string;
  
  /** Class level */
  level: number;
  
  /** Hit die type */
  hitDie: number;
  
  /** Subclass */
  subclass?: string;
  
  /** Class-specific resources */
  resources?: Record<string, ClassResource>;
}

/**
 * Class resource (ki points, rage uses, etc.)
 */
export interface ClassResource {
  /** Resource name */
  name: string;
  
  /** Current amount */
  current: number;
  
  /** Maximum amount */
  maximum: number;
  
  /** Reset condition */
  resetOn: 'short_rest' | 'long_rest' | 'dawn' | 'level_up';
}

/**
 * Character race information
 */
export interface CharacterRace {
  /** Race name */
  name: string;
  
  /** Subrace */
  subrace?: string;
  
  /** Size category */
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  
  /** Movement speed */
  speed: number;
  
  /** Languages */
  languages: string[];
  
  /** Racial traits */
  traits: string[];
}

/**
 * Character background information
 */
export interface CharacterBackground {
  /** Background name */
  name: string;
  
  /** Skill proficiencies */
  skillProficiencies: string[];
  
  /** Tool proficiencies */
  toolProficiencies: string[];
  
  /** Languages */
  languages: string[];
  
  /** Equipment */
  equipment: string[];
  
  /** Background feature */
  feature: string;
}

/**
 * Character biography
 */
export interface CharacterBiography {
  /** Character age */
  age?: number;
  
  /** Character height */
  height?: string;
  
  /** Character weight */
  weight?: string;
  
  /** Character gender */
  gender?: string;
  
  /** Personality traits */
  personalityTraits: string[];
  
  /** Ideals */
  ideals: string[];
  
  /** Bonds */
  bonds: string[];
  
  /** Flaws */
  flaws: string[];
  
  /** Backstory */
  backstory: string;
  
  /** Allies and organizations */
  allies: string[];
  
  /** Enemies and rivals */
  enemies: string[];
}

/**
 * Character appearance
 */
export interface CharacterAppearance {
  /** Hair color */
  hairColor?: string;
  
  /** Eye color */
  eyeColor?: string;
  
  /** Skin color */
  skinColor?: string;
  
  /** Notable features */
  features?: string[];
  
  /** Clothing style */
  clothing?: string;
  
  /** Distinguishing marks */
  marks?: string[];
}

/**
 * Campaign data structure
 */
export interface CampaignData extends BaseGameEntity {
  /** Game system */
  system: string;
  
  /** Campaign setting */
  setting?: string;
  
  /** Campaign participants */
  participants: CampaignParticipant[];
  
  /** Campaign sessions */
  sessions: CampaignSession[];
  
  /** Campaign notes */
  notes: string;
  
  /** Campaign status */
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  
  /** Campaign rules */
  rules: CampaignRules;
  
  /** Campaign resources */
  resources: CampaignResource[];
}

/**
 * Campaign participant
 */
export interface CampaignParticipant {
  /** User ID */
  userId: string;
  
  /** Role in campaign */
  role: 'dm' | 'player' | 'observer';
  
  /** Character IDs */
  characterIds: string[];
  
  /** Join date */
  joinedAt: Date;
  
  /** Active status */
  active: boolean;
}

/**
 * Campaign session
 */
export interface CampaignSession {
  /** Session ID */
  id: string;
  
  /** Session date */
  date: Date;
  
  /** Session duration */
  duration?: number;
  
  /** Session summary */
  summary: string;
  
  /** Session notes */
  notes: string;
  
  /** Experience awarded */
  experienceAwarded: number;
  
  /** Participants */
  participants: string[];
}

/**
 * Campaign rules and settings
 */
export interface CampaignRules {
  /** Optional rules enabled */
  optionalRules: string[];
  
  /** House rules */
  houseRules: string[];
  
  /** Banned content */
  bannedContent: string[];
  
  /** Starting level */
  startingLevel: number;
  
  /** Experience progression */
  experienceProgression: 'standard' | 'fast' | 'slow' | 'milestone';
  
  /** Ability score generation */
  abilityScoreGeneration: 'point_buy' | 'standard_array' | 'roll' | 'custom';
  
  /** Custom settings */
  customSettings: Record<string, unknown>;
}

/**
 * Campaign resource (maps, handouts, etc.)
 */
export interface CampaignResource {
  /** Resource ID */
  id: string;
  
  /** Resource name */
  name: string;
  
  /** Resource type */
  type: 'map' | 'handout' | 'image' | 'audio' | 'document' | 'other';
  
  /** Resource URL */
  url: string;
  
  /** Resource description */
  description?: string;
  
  /** Access level */
  accessLevel: 'public' | 'players' | 'dm_only';
  
  /** Upload date */
  uploadedAt: Date;
}