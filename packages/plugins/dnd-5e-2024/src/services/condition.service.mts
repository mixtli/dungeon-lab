/**
 * D&D 5e Condition Service
 * 
 * Handles condition document lookups, caching, and effect calculations
 * for the document-based condition system.
 */

import type { DndConditionDocument, ConditionInstance } from '../types/dnd/condition.mjs';

/**
 * Condition document cache for performance
 */
class ConditionCache {
  private cache = new Map<string, DndConditionDocument>();
  private slugToId = new Map<string, string>();
  private lastClear = Date.now();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  get(conditionId: string): DndConditionDocument | null {
    this.clearExpired();
    return this.cache.get(conditionId) || null;
  }

  getBySlug(slug: string): DndConditionDocument | null {
    this.clearExpired();
    const conditionId = this.slugToId.get(slug.toLowerCase());
    return conditionId ? this.cache.get(conditionId) || null : null;
  }

  set(condition: DndConditionDocument): void {
    this.cache.set(condition.id, condition);
    this.slugToId.set(condition.slug.toLowerCase(), condition.id);
  }

  clear(): void {
    this.cache.clear();
    this.slugToId.clear();
    this.lastClear = Date.now();
  }

  private clearExpired(): void {
    const now = Date.now();
    if (now - this.lastClear > this.CACHE_TTL) {
      this.clear();
    }
  }
}

/**
 * Global condition cache instance
 */
const conditionCache = new ConditionCache();

/**
 * Condition service for document-based condition management
 */
export class ConditionService {
  
  /**
   * Get condition document by ID with caching
   */
  static async getCondition(conditionId: string): Promise<DndConditionDocument | null> {
    // Check cache first
    const cached = conditionCache.get(conditionId);
    if (cached) {
      console.log('[ConditionService] Cache hit for condition:', conditionId);
      return cached;
    }

    try {
      // TODO: Replace with actual database query when integrated
      // For now, return null - will be implemented when integrated with game state
      console.log('[ConditionService] Cache miss for condition:', conditionId, '- database lookup needed');
      return null;
    } catch (error) {
      console.error('[ConditionService] Failed to fetch condition:', conditionId, error);
      return null;
    }
  }

  /**
   * Get condition document by slug (e.g., "invisible", "prone")
   * Useful for migration from string-based conditions
   */
  static async getConditionBySlug(slug: string): Promise<DndConditionDocument | null> {
    // Check cache first
    const cached = conditionCache.getBySlug(slug);
    if (cached) {
      console.log('[ConditionService] Cache hit for condition slug:', slug);
      return cached;
    }

    try {
      // TODO: Replace with actual database query when integrated
      console.log('[ConditionService] Cache miss for condition slug:', slug, '- database lookup needed');
      return null;
    } catch (error) {
      console.error('[ConditionService] Failed to fetch condition by slug:', slug, error);
      return null;
    }
  }

  /**
   * Preload common conditions into cache
   * Should be called during plugin initialization
   */
  static async preloadConditions(conditions: DndConditionDocument[]): Promise<void> {
    console.log('[ConditionService] Preloading', conditions.length, 'conditions into cache');
    
    for (const condition of conditions) {
      conditionCache.set(condition);
    }
    
    console.log('[ConditionService] Preload complete');
  }

  /**
   * Calculate total condition effects for a character
   * Processes all active conditions and returns combined effects
   */
  static async calculateConditionEffects(conditionInstances: ConditionInstance[]): Promise<ConditionEffects> {
    const effects: ConditionEffects = {
      movement: { prevented: false, speedReduction: 0 },
      actions: { prevented: false, disadvantage: false },
      attackRolls: { advantage: false, disadvantage: false, prevented: false },
      savingThrows: { advantage: false, disadvantage: false, autoFail: [], autoSucceed: [] },
      abilityChecks: { advantage: false, disadvantage: false, autoFail: [] },
      againstAffected: { attackAdvantage: false, attackDisadvantage: false, criticalHitWithin: null },
      initiative: { advantage: false, disadvantage: false },
      visibility: { invisible: false, concealed: false },
      recovery: { removedOnLongRest: false, removedOnShortRest: false }
    };

    for (const instance of conditionInstances) {
      const condition = await this.getCondition(instance.conditionId);
      if (!condition) {
        console.warn('[ConditionService] Unknown condition ID:', instance.conditionId);
        continue;
      }

      // Merge condition effects into total effects
      this.mergeConditionEffects(effects, condition.pluginData.effects, instance);
    }

    return effects;
  }

  /**
   * Check if a character has a specific condition
   */
  static hasCondition(conditionInstances: ConditionInstance[], conditionSlug: string): boolean {
    // For now, we'll need to do async lookups, but this gives the API we want
    // In practice, we might need to make this async or preload condition data
    console.warn('[ConditionService] hasCondition needs async implementation for:', conditionSlug);
    return false;
  }

  /**
   * Create a new condition instance
   */
  static createConditionInstance(
    conditionId: string, 
    source?: string, 
    level: number = 1,
    metadata?: Record<string, unknown>
  ): ConditionInstance {
    return {
      conditionId,
      level,
      source,
      addedAt: Date.now(),
      metadata
    };
  }

  /**
   * Merge condition effects into accumulated effects
   * Handles stacking rules and conflicts
   */
  private static mergeConditionEffects(
    totalEffects: ConditionEffects, 
    conditionEffects: any,
    instance: ConditionInstance
  ): void {
    const effects = conditionEffects;
    
    // Movement effects
    if (effects.movement?.prevented) totalEffects.movement.prevented = true;
    if (effects.movement?.speedReduction) {
      totalEffects.movement.speedReduction += effects.movement.speedReduction * instance.level;
    }
    
    // Action effects  
    if (effects.actions?.prevented) totalEffects.actions.prevented = true;
    if (effects.actions?.disadvantage) totalEffects.actions.disadvantage = true;
    
    // Attack roll effects
    if (effects.attackRolls?.prevented) totalEffects.attackRolls.prevented = true;
    if (effects.attackRolls?.advantage) totalEffects.attackRolls.advantage = true;
    if (effects.attackRolls?.disadvantage) totalEffects.attackRolls.disadvantage = true;
    
    // Saving throw effects
    if (effects.savingThrows?.advantage) totalEffects.savingThrows.advantage = true;
    if (effects.savingThrows?.disadvantage) totalEffects.savingThrows.disadvantage = true;
    if (effects.savingThrows?.autoFail) {
      totalEffects.savingThrows.autoFail.push(...effects.savingThrows.autoFail);
    }
    if (effects.savingThrows?.autoSucceed) {
      totalEffects.savingThrows.autoSucceed.push(...effects.savingThrows.autoSucceed);
    }
    
    // Ability check effects
    if (effects.abilityChecks?.advantage) totalEffects.abilityChecks.advantage = true;
    if (effects.abilityChecks?.disadvantage) totalEffects.abilityChecks.disadvantage = true;
    if (effects.abilityChecks?.autoFail) {
      totalEffects.abilityChecks.autoFail.push(...effects.abilityChecks.autoFail);
    }
    
    // Against affected effects
    if (effects.againstAffected?.attackAdvantage) totalEffects.againstAffected.attackAdvantage = true;
    if (effects.againstAffected?.attackDisadvantage) totalEffects.againstAffected.attackDisadvantage = true;
    if (effects.againstAffected?.criticalHitWithin) {
      totalEffects.againstAffected.criticalHitWithin = effects.againstAffected.criticalHitWithin;
    }
    
    // Initiative effects
    if (effects.initiative?.advantage) totalEffects.initiative.advantage = true;
    if (effects.initiative?.disadvantage) totalEffects.initiative.disadvantage = true;
    
    // Visibility effects
    if (effects.visibility?.invisible) totalEffects.visibility.invisible = true;
    if (effects.visibility?.concealed) totalEffects.visibility.concealed = true;
    
    // Recovery effects
    if (effects.recovery?.removedOnLongRest) totalEffects.recovery.removedOnLongRest = true;
    if (effects.recovery?.removedOnShortRest) totalEffects.recovery.removedOnShortRest = true;
  }

  /**
   * Clear condition cache
   */
  static clearCache(): void {
    conditionCache.clear();
    console.log('[ConditionService] Condition cache cleared');
  }
}

/**
 * Combined condition effects interface
 * Represents the total effects from all active conditions
 */
export interface ConditionEffects {
  movement: {
    prevented: boolean;
    speedReduction: number;
  };
  actions: {
    prevented: boolean;
    disadvantage: boolean;
  };
  attackRolls: {
    advantage: boolean;
    disadvantage: boolean; 
    prevented: boolean;
  };
  savingThrows: {
    advantage: boolean;
    disadvantage: boolean;
    autoFail: string[];
    autoSucceed: string[];
  };
  abilityChecks: {
    advantage: boolean;
    disadvantage: boolean;
    autoFail: string[];
  };
  againstAffected: {
    attackAdvantage: boolean;
    attackDisadvantage: boolean;
    criticalHitWithin: number | null;
  };
  initiative: {
    advantage: boolean;
    disadvantage: boolean;
  };
  visibility: {
    invisible: boolean;
    concealed: boolean;
  };
  recovery: {
    removedOnLongRest: boolean;
    removedOnShortRest: boolean;
  };
}