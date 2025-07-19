/**
 * Comprehensive validation system for game data
 * Supports extensible validation rules for different game systems
 */

import type { 
  BaseGameEntity,
  CharacterData,
  Item,
  Spell,
  CampaignData
} from '../types/game-data.mjs';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
  
  /** Field-specific results */
  fieldResults: Record<string, FieldValidationResult>;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error code */
  code: string;
  
  /** Field path */
  field: string;
  
  /** Error message */
  message: string;
  
  /** Error severity */
  severity: 'error' | 'critical';
  
  /** Suggested fix */
  suggestion?: string;
  
  /** Related fields */
  relatedFields?: string[];
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  
  /** Field path */
  field: string;
  
  /** Warning message */
  message: string;
  
  /** Suggested improvement */
  suggestion?: string;
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  /** Field is valid */
  valid: boolean;
  
  /** Field errors */
  errors: ValidationError[];
  
  /** Field warnings */
  warnings: ValidationWarning[];
  
  /** Normalized value */
  normalizedValue?: unknown;
}

/**
 * Validation rule definition
 */
export interface ValidationRule<T = unknown> {
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Validation function */
  validate: (value: T, context: ValidationContext) => ValidationResult | Promise<ValidationResult>;
  
  /** Rule priority (higher = runs first) */
  priority?: number;
  
  /** Rule applies to these types */
  appliesToTypes?: string[];
  
  /** Rule depends on these fields */
  dependencies?: string[];
}

/**
 * Validation context
 */
export interface ValidationContext {
  /** Full entity being validated */
  entity: Record<string, unknown>;
  
  /** Current field path */
  fieldPath: string;
  
  /** Game system */
  gameSystem: string;
  
  /** Validation options */
  options: ValidationOptions;
  
  /** Additional context data */
  context: Record<string, unknown>;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Strict validation (no warnings allowed) */
  strict?: boolean;
  
  /** Skip optional fields */
  skipOptional?: boolean;
  
  /** Custom rules to apply */
  customRules?: ValidationRule[];
  
  /** Rules to skip */
  skipRules?: string[];
  
  /** Maximum error count before stopping */
  maxErrors?: number;
  
  /** Validate cross-references */
  validateReferences?: boolean;
}

/**
 * Main game data validator
 */
export class GameDataValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private globalRules: ValidationRule[] = [];
  
  constructor() {
    this.initializeDefaultRules();
  }
  
  /**
   * Register a validation rule for specific entity types
   */
  registerRule(entityTypes: string | string[], rule: ValidationRule): void {
    const types = Array.isArray(entityTypes) ? entityTypes : [entityTypes];
    
    for (const type of types) {
      if (!this.rules.has(type)) {
        this.rules.set(type, []);
      }
      this.rules.get(type)!.push(rule);
    }
    
    // Sort by priority
    types.forEach(type => {
      this.rules.get(type)!.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });
  }
  
  /**
   * Register a global validation rule
   */
  registerGlobalRule(rule: ValidationRule): void {
    this.globalRules.push(rule);
    this.globalRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  /**
   * Validate a character
   */
  async validateCharacter(character: CharacterData, options: ValidationOptions = {}): Promise<ValidationResult> {
    return this.validateEntity(character, 'character', options);
  }
  
  /**
   * Validate an item
   */
  async validateItem(item: Item, options: ValidationOptions = {}): Promise<ValidationResult> {
    return this.validateEntity(item, 'item', options);
  }
  
  /**
   * Validate a spell
   */
  async validateSpell(spell: Spell, options: ValidationOptions = {}): Promise<ValidationResult> {
    return this.validateEntity(spell, 'spell', options);
  }
  
  /**
   * Validate a campaign
   */
  async validateCampaign(campaign: CampaignData, options: ValidationOptions = {}): Promise<ValidationResult> {
    return this.validateEntity(campaign, 'campaign', options);
  }
  
  /**
   * Validate any entity
   */
  async validateEntity(
    entity: Record<string, unknown>, 
    entityType: string, 
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const context: ValidationContext = {
      entity,
      fieldPath: '',
      gameSystem: (entity.source as string) || 'generic',
      options,
      context: {}
    };
    
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      fieldResults: {}
    };
    
    // Apply global rules
    for (const rule of this.globalRules) {
      if (options.skipRules?.includes(rule.name)) continue;
      
      try {
        const ruleResult = await rule.validate(entity, context);
        this.mergeResults(result, ruleResult);
        
        if (options.maxErrors && result.errors.length >= options.maxErrors) {
          break;
        }
      } catch (error) {
        result.errors.push({
          code: 'RULE_ERROR',
          field: 'global',
          message: `Validation rule '${rule.name}' failed: ${error}`,
          severity: 'error'
        });
      }
    }
    
    // Apply entity-specific rules
    const entityRules = this.rules.get(entityType) || [];
    for (const rule of entityRules) {
      if (options.skipRules?.includes(rule.name)) continue;
      
      try {
        const ruleResult = await rule.validate(entity, context);
        this.mergeResults(result, ruleResult);
        
        if (options.maxErrors && result.errors.length >= options.maxErrors) {
          break;
        }
      } catch (error) {
        result.errors.push({
          code: 'RULE_ERROR',
          field: entityType,
          message: `Validation rule '${rule.name}' failed: ${error}`,
          severity: 'error'
        });
      }
    }
    
    // Apply custom rules
    if (options.customRules) {
      for (const rule of options.customRules) {
        try {
          const ruleResult = await rule.validate(entity, context);
          this.mergeResults(result, ruleResult);
          
          if (options.maxErrors && result.errors.length >= options.maxErrors) {
            break;
          }
        } catch (error) {
          result.errors.push({
            code: 'CUSTOM_RULE_ERROR',
            field: 'custom',
            message: `Custom rule '${rule.name}' failed: ${error}`,
            severity: 'error'
          });
        }
      }
    }
    
    // Set final validity
    result.valid = result.errors.length === 0 && (!options.strict || result.warnings.length === 0);
    
    return result;
  }
  
  /**
   * Validate a specific field
   */
  async validateField(
    value: unknown,
    fieldPath: string,
    entity: Record<string, unknown>,
    options: ValidationOptions = {}
  ): Promise<FieldValidationResult> {
    const context: ValidationContext = {
      entity,
      fieldPath,
      gameSystem: (entity.source as string) || 'generic',
      options,
      context: {}
    };
    
    const result: FieldValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    // Apply field-specific validation
    const fieldRules = this.getFieldRules(fieldPath);
    
    for (const rule of fieldRules) {
      try {
        const ruleResult = await rule.validate(value, context);
        result.errors.push(...ruleResult.errors);
        result.warnings.push(...ruleResult.warnings);
      } catch (error) {
        result.errors.push({
          code: 'FIELD_RULE_ERROR',
          field: fieldPath,
          message: `Field rule '${rule.name}' failed: ${error}`,
          severity: 'error'
        });
      }
    }
    
    result.valid = result.errors.length === 0;
    return result;
  }
  
  /**
   * Get validation rules for a specific field
   */
  private getFieldRules(fieldPath: string): ValidationRule[] {
    // This would contain field-specific rules
    // For now, return empty array
    return [];
  }
  
  /**
   * Merge validation results
   */
  private mergeResults(target: ValidationResult, source: ValidationResult): void {
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    
    for (const [field, fieldResult] of Object.entries(source.fieldResults)) {
      target.fieldResults[field] = fieldResult;
    }
  }
  
  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Base entity validation
    this.registerGlobalRule({
      name: 'required_fields',
      description: 'Validates required fields are present',
      priority: 100,
      validate: (entity: unknown) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          fieldResults: {}
        };
        
        const requiredFields = ['id', 'name', 'type', 'source'];
        const gameEntity = entity as BaseGameEntity;
        
        for (const field of requiredFields) {
          if (!gameEntity[field as keyof BaseGameEntity]) {
            result.errors.push({
              code: 'REQUIRED_FIELD_MISSING',
              field,
              message: `Required field '${field}' is missing`,
              severity: 'error',
              suggestion: `Provide a value for '${field}'`
            });
          }
        }
        
        return result;
      }
    });
    
    // ID format validation
    this.registerGlobalRule({
      name: 'id_format',
      description: 'Validates ID format',
      priority: 90,
      validate: (entity: unknown) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          fieldResults: {}
        };
        
        const gameEntity = entity as BaseGameEntity;
        if (gameEntity.id && typeof gameEntity.id === 'string') {
          // ID should be non-empty and contain valid characters
          if (!/^[a-zA-Z0-9_-]+$/.test(gameEntity.id)) {
            result.errors.push({
              code: 'INVALID_ID_FORMAT',
              field: 'id',
              message: 'ID contains invalid characters',
              severity: 'error',
              suggestion: 'Use only letters, numbers, underscores, and hyphens'
            });
          }
          
          if (gameEntity.id.length < 3) {
            result.warnings.push({
              code: 'SHORT_ID',
              field: 'id',
              message: 'ID is very short',
              suggestion: 'Consider using a longer, more descriptive ID'
            });
          }
        }
        
        return result;
      }
    });
    
    // Character-specific validation
    this.registerRule('character', {
      name: 'character_level',
      description: 'Validates character level',
      priority: 80,
      validate: (character: unknown) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          fieldResults: {}
        };
        
        const gameCharacter = character as CharacterData;
        if (typeof gameCharacter.level !== 'number' || gameCharacter.level < 1 || gameCharacter.level > 20) {
          result.errors.push({
            code: 'INVALID_LEVEL',
            field: 'level',
            message: 'Character level must be between 1 and 20',
            severity: 'error',
            suggestion: 'Set level to a value between 1 and 20'
          });
        }
        
        return result;
      }
    });
    
    // Ability scores validation
    this.registerRule('character', {
      name: 'ability_scores',
      description: 'Validates ability scores',
      priority: 70,
      validate: (character: unknown) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          fieldResults: {}
        };
        
        const gameCharacter = character as CharacterData;
        if (gameCharacter.abilities) {
          for (const [abilityName, ability] of Object.entries(gameCharacter.abilities)) {
            if (typeof ability.base !== 'number' || ability.base < 1 || ability.base > 30) {
              result.errors.push({
                code: 'INVALID_ABILITY_SCORE',
                field: `abilities.${abilityName}.base`,
                message: `${abilityName} base score must be between 1 and 30`,
                severity: 'error'
              });
            }
            
            if (ability.base < 8 || ability.base > 18) {
              result.warnings.push({
                code: 'UNUSUAL_ABILITY_SCORE',
                field: `abilities.${abilityName}.base`,
                message: `${abilityName} score of ${ability.base} is unusual for a starting character`,
                suggestion: 'Standard scores are typically between 8 and 18'
              });
            }
          }
        }
        
        return result;
      }
    });
    
    // Item validation
    this.registerRule('item', {
      name: 'item_weight',
      description: 'Validates item weight',
      priority: 60,
      validate: (item: unknown) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          fieldResults: {}
        };
        
        const gameItem = item as Item;
        if (typeof gameItem.weight !== 'number' || gameItem.weight < 0) {
          result.errors.push({
            code: 'INVALID_WEIGHT',
            field: 'weight',
            message: 'Item weight must be a non-negative number',
            severity: 'error'
          });
        }
        
        if (gameItem.weight > 1000) {
          result.warnings.push({
            code: 'VERY_HEAVY_ITEM',
            field: 'weight',
            message: 'Item is extremely heavy',
            suggestion: 'Consider if this weight is realistic'
          });
        }
        
        return result;
      }
    });
    
    // Spell validation
    this.registerRule('spell', {
      name: 'spell_level',
      description: 'Validates spell level',
      priority: 50,
      validate: (spell: unknown) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          fieldResults: {}
        };
        
        const gameSpell = spell as Spell;
        if (typeof gameSpell.level !== 'number' || gameSpell.level < 0 || gameSpell.level > 9) {
          result.errors.push({
            code: 'INVALID_SPELL_LEVEL',
            field: 'level',
            message: 'Spell level must be between 0 and 9',
            severity: 'error'
          });
        }
        
        return result;
      }
    });
  }
}

/**
 * Default validator instance
 */
export const gameDataValidator = new GameDataValidator();

/**
 * Utility functions for common validations
 */
export class ValidationUtils {
  /**
   * Validate dice expression format
   */
  static validateDiceExpression(expression: string): boolean {
    // Basic dice expression validation (e.g., "1d20", "2d6+3", "1d8+2d4")
    const diceRegex = /^(\d+d\d+(\+\d+)?(\+\d+d\d+)*(\+\d+)?)$/i;
    return diceRegex.test(expression.replace(/\s/g, ''));
  }
  
  /**
   * Validate ability score modifier
   */
  static getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
  
  /**
   * Validate proficiency bonus for level
   */
  static getProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
  }
  
  /**
   * Validate spell save DC
   */
  static calculateSpellSaveDC(proficiencyBonus: number, abilityModifier: number): number {
    return 8 + proficiencyBonus + abilityModifier;
  }
  
  /**
   * Validate character total level
   */
  static getTotalLevel(classes: { level: number }[]): number {
    return classes.reduce((total, cls) => total + cls.level, 0);
  }
  
  /**
   * Validate currency conversion
   */
  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    // Basic D&D currency conversion (cp, sp, gp, pp)
    const rates: Record<string, number> = {
      cp: 1,
      sp: 10,
      gp: 100,
      pp: 1000
    };
    
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    return (amount * fromRate) / toRate;
  }
}

/**
 * Schema validation helpers
 */
export class SchemaValidator {
  /**
   * Validate object against schema
   */
  static validateSchema<T>(object: unknown, schema: Schema<T>): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      fieldResults: {}
    };
    
    // Basic schema validation implementation
    // This would be expanded with more sophisticated schema checking
    
    return result;
  }
}

/**
 * Basic schema definition interface
 */
export interface Schema<T> {
  type: string;
  required?: (keyof T)[];
  properties?: Record<keyof T, PropertySchema>;
  additionalProperties?: boolean;
}

/**
 * Property schema definition
 */
export interface PropertySchema {
  type: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}