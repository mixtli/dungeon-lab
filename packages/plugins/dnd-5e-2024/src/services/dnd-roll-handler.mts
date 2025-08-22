import type { RollTypeHandler, RollHandlerContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';

/**
 * D&D 5e Roll Handler for Ability Checks
 * GM clients calculate final results and send chat messages
 * Player clients provide UI feedback only
 */
export class DndAbilityCheckHandler implements RollTypeHandler {
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    console.log('[DndAbilityCheckHandler] Processing ability check:', {
      ability: result.arguments.pluginArgs?.ability,
      advantageMode: result.arguments.pluginArgs?.advantageMode,
      total: this.calculateTotal(result),
      characterName: result.metadata.characterName,
      isGM: context.isGM
    });

    if (context.isGM) {
      // GM client: Calculate final result and send authoritative chat message
      const total = this.calculateTotal(result);
      const ability = String(result.arguments.pluginArgs?.ability || 'Unknown');
      const skill = result.arguments.pluginArgs?.skill;
      const advantageMode = result.arguments.pluginArgs?.advantageMode;
      const characterName = result.metadata.characterName;
      
      // Create descriptive roll message - use skill name if available, otherwise ability name
      let rollDescription: string;
      if (skill) {
        // Format skill name (e.g., "animal-handling" -> "Animal Handling")
        const formattedSkill = skill.split('-').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        const formattedAbility = ability.slice(0, 3).toUpperCase();
        rollDescription = `${formattedSkill} (${formattedAbility})`;
      } else {
        rollDescription = `${ability.charAt(0).toUpperCase() + ability.slice(1)} Check`;
      }
      if (advantageMode === 'advantage') {
        rollDescription += ' (Advantage)';
      } else if (advantageMode === 'disadvantage') {
        rollDescription += ' (Disadvantage)';
      }
      
      const rollMessage = `${characterName ? `${characterName} rolled ` : ''}${rollDescription}: **${total}**`;
      
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

  /**
   * Calculate the final total for an ability check
   */
  private calculateTotal(result: RollServerResult): number {
    let total = 0;
    
    // Handle advantage/disadvantage for d20 rolls
    for (const diceGroup of result.results) {
      if (diceGroup.sides === 20 && diceGroup.results.length === 2) {
        const advantageMode = result.arguments.pluginArgs?.advantageMode;
        if (advantageMode === 'advantage') {
          total += Math.max(...diceGroup.results);
        } else if (advantageMode === 'disadvantage') {
          total += Math.min(...diceGroup.results);
        } else {
          total += diceGroup.results[0];
        }
      } else {
        total += diceGroup.results.reduce((sum, res) => sum + res, 0);
      }
    }

    // Add modifiers
    for (const modifier of result.modifiers) {
      total += modifier.value;
    }

    // Add custom modifier
    total += result.arguments.customModifier;

    return total;
  }
}

/**
 * Future: Additional D&D roll handlers
 */

// Example for future attack roll handler
export class DndAttackRollHandler implements RollTypeHandler {
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
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

// Example for future saving throw handler  
export class DndSavingThrowHandler implements RollTypeHandler {
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    console.log('[DndSavingThrowHandler] Processing saving throw (placeholder):', {
      isGM: context.isGM
    });
    
    if (context.isGM) {
      // GM client: Compare against DC and send result
      console.log('[DndSavingThrowHandler] GM processing saving throw');
      // Future: Compare against DC, apply effects on success/failure
    } else {
      // Player client: UI feedback only
      console.log('[DndSavingThrowHandler] Player client - providing UI feedback');
    }
  }
}