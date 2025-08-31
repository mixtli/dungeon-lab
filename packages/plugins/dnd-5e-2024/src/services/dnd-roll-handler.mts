import type { RollTypeHandler, RollHandlerContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { ProcessedRollResult } from '@dungeon-lab/shared/interfaces/processed-roll-result.interface.mjs';
import { 
  calculateD20Total, 
  processD20Roll, 
  formatSkillName, 
  createRollDescription, 
  createRollMessage, 
  logRollProcessing 
} from '../utils/dnd-roll-utilities.mjs';

/**
 * D&D 5e Roll Handler for Ability Checks
 * GM clients calculate final results and send chat messages
 * Player clients provide UI feedback only
 */
export class DndAbilityCheckHandler implements RollTypeHandler {
  /**
   * Process ability check roll and return augmented data
   * Pure function without side effects
   */
  async processRoll(result: RollServerResult, _context: RollHandlerContext): Promise<ProcessedRollResult> {
    const ability = String(result.arguments.pluginArgs?.ability || 'Unknown');
    const skill = result.arguments.pluginArgs?.skill as string | undefined;
    const advantageMode = result.arguments.pluginArgs?.advantageMode;
    const characterName = result.metadata.characterName;
    
    // Create descriptive roll message - use skill name if available, otherwise ability name
    let baseDescription: string;
    if (skill) {
      const formattedSkill = formatSkillName(skill);
      const formattedAbility = ability.slice(0, 3).toUpperCase();
      baseDescription = `${formattedSkill} (${formattedAbility})`;
    } else {
      baseDescription = `${ability.charAt(0).toUpperCase() + ability.slice(1)} Check`;
    }
    
    const rollDescription = createRollDescription(baseDescription, advantageMode as string);
    const total = calculateD20Total(result);
    const rollMessage = createRollMessage(characterName, rollDescription, total);
    
    // Use common D20 processing with custom data
    return processD20Roll(result, 'DndAbilityCheckHandler', {
      supportsCriticalHits: false, // Ability checks don't have critical hits
      customProcessedData: {
        ability,
        skill,
        rollDescription,
        formattedMessage: rollMessage
      }
    });
  }

  /**
   * Handle ability check roll - send chat message if GM
   */
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    const ability = String(result.arguments.pluginArgs?.ability || 'Unknown');
    const skill = result.arguments.pluginArgs?.skill as string | undefined;
    
    // Use common logging
    logRollProcessing('DndAbilityCheckHandler', 'ability check', result, {
      ability,
      skill,
      isGM: context.isGM
    });

    if (context.isGM) {
      // GM client: Send chat message
      const advantageMode = result.arguments.pluginArgs?.advantageMode as string;
      const characterName = result.metadata.characterName;
      
      // Create descriptive roll message using utilities
      let baseDescription: string;
      if (skill) {
        const formattedSkill = formatSkillName(skill);
        const formattedAbility = ability.slice(0, 3).toUpperCase();
        baseDescription = `${formattedSkill} (${formattedAbility})`;
      } else {
        baseDescription = `${ability.charAt(0).toUpperCase() + ability.slice(1)} Check`;
      }
      
      const rollDescription = createRollDescription(baseDescription, advantageMode);
      const total = calculateD20Total(result);
      const rollMessage = createRollMessage(characterName, rollDescription, total);
      
      // Send chat message via context (only available for GM)
      if (context.sendChatMessage) {
        context.sendChatMessage(rollMessage, {
          type: 'roll',
          rollData: result,
          recipient: result.recipients
        });
        console.log('[DndAbilityCheckHandler] GM sent chat message:', rollMessage);
      } else {
        console.warn('[DndAbilityCheckHandler] GM client but no sendChatMessage function available');
      }
    } else {
      // Player client: Provide UI feedback only (animations, notifications, etc.)
      console.log('[DndAbilityCheckHandler] Player client - providing UI feedback');
      // Future: Add animations, sound effects, visual indicators
    }
  }

}

/**
 * D&D 5e Roll Handler for Weapon Attacks
 * Fixes advantage/disadvantage calculation but doesn't send chat messages
 * (weapon attack action handler already sends chat messages)
 */
export class DndWeaponAttackHandler implements RollTypeHandler {
  /**
   * Process weapon attack roll and return enhanced data with proper advantage/disadvantage calculation
   */
  async processRoll(result: RollServerResult, _context: RollHandlerContext): Promise<ProcessedRollResult> {
    // Use common D20 processing with critical hit support
    return processD20Roll(result, 'DndWeaponAttackHandler', {
      supportsCriticalHits: true // Weapon attacks can crit
    });
  }

  /**
   * Handle weapon attack roll - no chat messages needed since weapon attack action handles that
   */
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    // Use common logging
    logRollProcessing('DndWeaponAttackHandler', 'weapon attack roll', result, {
      isGM: context.isGM
    });

    // No chat messages - the weapon attack action handler already sends detailed messages
    // This handler only fixes the calculation logic for advantage/disadvantage
  }
}

/**
 * Legacy attack roll handler - keeping for compatibility
 */
export class DndAttackRollHandler implements RollTypeHandler {
  async handleRoll(_result: RollServerResult, context: RollHandlerContext): Promise<void> {
    console.log('[DndAttackRollHandler] Processing attack roll (placeholder):', {
      isGM: context.isGM
    });
    
    if (context.isGM) {
      // GM client: Calculate attack result and send chat message
      console.log('[DndAttackRollHandler] GM processing attack roll');
      // Future: Calculate hit/miss, critical hits, damage, etc.
    } else {
      // Player client: UI feedback only
      console.log('[DndAttackRollHandler] Player client - providing UI feedback');
    }
  }
}

/**
 * D&D 5e Roll Handler for Spell Attacks
 * Fixes advantage/disadvantage calculation for spell attacks
 */
export class DndSpellAttackHandler implements RollTypeHandler {
  /**
   * Process spell attack roll and return enhanced data with proper advantage/disadvantage calculation
   */
  async processRoll(result: RollServerResult, _context: RollHandlerContext): Promise<ProcessedRollResult> {
    // Use common D20 processing with critical hit support
    return processD20Roll(result, 'DndSpellAttackHandler', {
      supportsCriticalHits: true // Spell attacks can crit
    });
  }

  /**
   * Handle spell attack roll - no chat messages needed since spell casting action handles that
   */
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    // Use common logging with spell-specific context
    logRollProcessing('DndSpellAttackHandler', 'spell attack roll', result, {
      spellName: result.metadata.spellName,
      isGM: context.isGM
    });

    // No chat messages - the spell casting action handler already sends detailed messages
    // This handler only fixes the calculation logic for advantage/disadvantage
  }
}

export class DndSavingThrowHandler implements RollTypeHandler {
  /**
   * Process saving throw roll and return enhanced data
   */
  async processRoll(result: RollServerResult, _context: RollHandlerContext): Promise<ProcessedRollResult> {
    const ability = String(result.arguments.pluginArgs?.ability || 'Unknown');
    const advantageMode = result.arguments.pluginArgs?.advantageMode;
    const characterName = result.metadata.characterName;
    
    // Create descriptive roll message - reuse logic from handleRoll
    const baseDescription = `${ability.charAt(0).toUpperCase() + ability.slice(1)} Saving Throw`;
    const rollDescription = createRollDescription(baseDescription, advantageMode as string);
    const total = calculateD20Total(result);
    const rollMessage = createRollMessage(characterName, rollDescription, total);
    
    // Use common D20 processing
    return processD20Roll(result, 'DndSavingThrowHandler', {
      supportsCriticalHits: false, // Saving throws don't have critical hits
      customProcessedData: {
        ability,
        rollDescription,
        formattedMessage: rollMessage
      }
    });
  }

  /**
   * Handle saving throw roll - send chat message if GM
   */
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    const ability = String(result.arguments.pluginArgs?.ability || 'Unknown');
    
    // Use common logging
    logRollProcessing('DndSavingThrowHandler', 'saving throw', result, {
      ability,
      isGM: context.isGM
    });

    if (context.isGM) {
      // GM client: Calculate final result and send authoritative chat message
      const advantageMode = result.arguments.pluginArgs?.advantageMode as string;
      const characterName = result.metadata.characterName;
      
      // Create descriptive roll message using utilities
      const baseDescription = `${ability.charAt(0).toUpperCase() + ability.slice(1)} Saving Throw`;
      const rollDescription = createRollDescription(baseDescription, advantageMode);
      const total = calculateD20Total(result);
      const rollMessage = createRollMessage(characterName, rollDescription, total);
      
      // Send chat message via context (only available for GM)
      if (context.sendChatMessage) {
        context.sendChatMessage(rollMessage, {
          type: 'roll',
          rollData: result,
          recipient: result.recipients
        });
        console.log('[DndSavingThrowHandler] GM sent chat message:', rollMessage);
      } else {
        console.warn('[DndSavingThrowHandler] GM client but no sendChatMessage function available');
      }
    } else {
      // Player client: Provide UI feedback only
      console.log('[DndSavingThrowHandler] Player client - providing UI feedback');
    }
  }
}

/**
 * D&D 5e Roll Handler for Initiative
 * Handles initiative rolls with dexterity modifier and optional bonuses
 */
export class DndInitiativeHandler implements RollTypeHandler {
  /**
   * Process initiative roll and return enhanced data
   */
  async processRoll(result: RollServerResult, _context: RollHandlerContext): Promise<ProcessedRollResult> {
    // Use common D20 processing without critical hit support (initiative doesn't crit)
    return processD20Roll(result, 'DndInitiativeHandler', {
      supportsCriticalHits: false, // Initiative rolls don't have critical hits
      customProcessedData: {
        rollDescription: 'Initiative',
        formattedMessage: createRollMessage(
          result.metadata.characterName, 
          'Initiative', 
          calculateD20Total(result)
        )
      }
    });
  }

  /**
   * Handle initiative roll - send chat message if GM
   */
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    // Use common logging
    logRollProcessing('DndInitiativeHandler', 'initiative roll', result, {
      isGM: context.isGM
    });

    if (context.isGM) {
      // GM client: Send chat message
      const advantageMode = result.arguments.pluginArgs?.advantageMode as string;
      const characterName = result.metadata.characterName;
      
      // Create descriptive roll message using utilities
      const rollDescription = createRollDescription('Initiative', advantageMode);
      const total = calculateD20Total(result);
      const rollMessage = createRollMessage(characterName, rollDescription, total);
      
      // Send chat message via context (only available for GM)
      if (context.sendChatMessage) {
        context.sendChatMessage(rollMessage, {
          type: 'roll',
          rollData: result,
          recipient: result.recipients
        });
        console.log('[DndInitiativeHandler] GM sent chat message:', rollMessage);
      } else {
        console.warn('[DndInitiativeHandler] GM client but no sendChatMessage function available');
      }
    } else {
      // Player client: Provide UI feedback only
      console.log('[DndInitiativeHandler] Player client - providing UI feedback');
    }
  }
}

/**
 * D&D 5e Roll Handler for Monster Attacks
 * Handles monster weapon attacks, natural attacks, etc.
 */
export class DndMonsterAttackHandler implements RollTypeHandler {
  /**
   * Process monster attack roll and return enhanced data
   */
  async processRoll(result: RollServerResult, _context: RollHandlerContext): Promise<ProcessedRollResult> {
    // Use common D20 processing with critical hit support
    return processD20Roll(result, 'DndMonsterAttackHandler', {
      supportsCriticalHits: true, // Monster attacks can crit
      customProcessedData: {
        actionName: result.metadata.actionName,
        creatureName: result.metadata.creatureName,
        targetName: result.metadata.targetName,
        targetAC: result.metadata.targetAC,
        rollDescription: `${result.metadata.actionName || 'Monster'} Attack`,
        formattedMessage: createRollMessage(
          result.metadata.creatureName as string | undefined,
          `${result.metadata.actionName || 'Attack'} vs ${result.metadata.targetName || 'Target'}`,
          calculateD20Total(result)
        )
      }
    });
  }

  /**
   * Handle monster attack roll - no chat messages needed since monster action handler handles that
   */
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    // Use common logging
    logRollProcessing('DndMonsterAttackHandler', 'monster attack', result, {
      actionName: result.metadata.actionName,
      creatureName: result.metadata.creatureName,
      targetName: result.metadata.targetName,
      isGM: context.isGM
    });

    // No chat messages - the monster action handler already sends detailed roll results
    // This handler only fixes the calculation logic for advantage/disadvantage
  }
}