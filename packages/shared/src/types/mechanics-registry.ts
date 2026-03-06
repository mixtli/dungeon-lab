/**
 * Character data interface for mechanics
 */
export interface CharacterData {
  id: string;
  name: string;
  type: string;
  abilities: Record<string, number>;
  skills: Record<string, number>;
  data: Record<string, unknown>;
}

/**
 * Spell data interface for mechanics
 */
export interface SpellData {
  id: string;
  name: string;
  level: number;
  school: string;
  data: Record<string, unknown>;
}

/**
 * Weapon data interface for mechanics
 */
export interface WeaponData {
  id: string;
  name: string;
  type: string;
  damage: string;
  data: Record<string, unknown>;
}

/**
 * Game mechanics registry for managing game rules and calculations
 */
export interface MechanicsRegistry {
  /**
   * Register a game mechanic
   * @param id Unique mechanic identifier
   * @param mechanic Mechanic implementation
   * @param metadata Mechanic metadata
   */
  register(
    id: string,
    mechanic: GameMechanic,
    metadata?: MechanicMetadata
  ): void;
  
  /**
   * Get a registered mechanic by ID
   * @param id Mechanic identifier
   * @returns Mechanic implementation or undefined if not found
   */
  get(id: string): GameMechanic | undefined;
  
  /**
   * Get all registered mechanics for a plugin
   * @param pluginId Plugin identifier
   * @returns Array of mechanic entries
   */
  getByPlugin(pluginId: string): MechanicEntry[];
  
  /**
   * Unregister a mechanic
   * @param id Mechanic identifier
   */
  unregister(id: string): void;
  
  /**
   * Unregister all mechanics for a plugin
   * @param pluginId Plugin identifier
   */
  unregisterByPlugin(pluginId: string): void;
}

/**
 * Base interface for game mechanics
 */
export interface GameMechanic {
  /** Mechanic identifier */
  readonly id: string;
  
  /** Display name */
  readonly name: string;
  
  /** Description of what this mechanic does */
  readonly description?: string;
}

/**
 * Initiative system mechanic
 */
export interface InitiativeSystem extends GameMechanic {
  /**
   * Roll initiative for a character
   * @param character Character data
   * @returns Initiative result
   */
  rollInitiative(character: CharacterData): InitiativeResult;
  
  /**
   * Compare two initiative results
   * @param a First initiative result
   * @param b Second initiative result
   * @returns Comparison result (-1, 0, 1)
   */
  compareInitiative(a: InitiativeResult, b: InitiativeResult): number;
}

/**
 * Dice rolling system
 */
export interface DiceSystem extends GameMechanic {
  /**
   * Roll dice with expression
   * @param expression Dice expression (e.g., "2d6+3")
   * @returns Dice roll result
   */
  roll(expression: string): DiceResult;
  
  /**
   * Parse dice expression
   * @param expression Dice expression string
   * @returns Parsed dice expression
   */
  parseDiceExpression(expression: string): DiceExpression;
}

/**
 * Spell casting system
 */
export interface SpellSystem extends GameMechanic {
  /**
   * Cast a spell
   * @param spell Spell data
   * @param caster Caster character
   * @param target Target of the spell
   * @returns Spell result
   */
  castSpell(spell: SpellData, caster: CharacterData, target?: CharacterData): SpellResult;
  
  /**
   * Calculate spell save DC
   * @param caster Caster character
   * @param spell Spell data
   * @returns Save DC
   */
  calculateSaveDC(caster: CharacterData, spell: SpellData): number;
}

/**
 * Combat mechanics system
 */
export interface CombatSystem extends GameMechanic {
  /**
   * Calculate attack roll
   * @param attacker Attacking character
   * @param weapon Weapon being used
   * @param target Target of the attack
   * @returns Attack result
   */
  rollAttack(attacker: CharacterData, weapon: WeaponData, target?: CharacterData): AttackResult;
  
  /**
   * Calculate damage
   * @param attacker Attacking character
   * @param weapon Weapon being used
   * @param target Target of the attack
   * @returns Damage result
   */
  rollDamage(attacker: CharacterData, weapon: WeaponData, target?: CharacterData): DamageResult;
}

/**
 * Initiative result
 */
export interface InitiativeResult {
  total: number;
  roll: number;
  modifier: number;
  character: CharacterData;
}

/**
 * Dice roll result
 */
export interface DiceResult {
  total: number;
  rolls: number[];
  expression: string;
  breakdown: string;
}

/**
 * Parsed dice expression
 */
export interface DiceExpression {
  dice: { count: number; sides: number }[];
  modifiers: number[];
  original: string;
}

/**
 * Spell casting result
 */
export interface SpellResult {
  success: boolean;
  damage?: DamageResult;
  effects?: string[];
  description: string;
}

/**
 * Attack roll result
 */
export interface AttackResult {
  total: number;
  roll: number;
  modifier: number;
  hit: boolean;
  critical: boolean;
}

/**
 * Damage roll result
 */
export interface DamageResult {
  total: number;
  rolls: number[];
  type: string;
  breakdown: string;
}

/**
 * Mechanic metadata
 */
export interface MechanicMetadata {
  pluginId: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
}

/**
 * Mechanic registry entry
 */
export interface MechanicEntry {
  id: string;
  mechanic: GameMechanic;
  metadata: MechanicMetadata;
}