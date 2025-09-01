<template>
  <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 border border-amber-200 dark:border-gray-600 rounded-lg p-4 my-2">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div class="text-lg">💥</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">
          {{ formatDamageTitle() }}
        </h3>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatTime(rollData?.timestamp || new Date()) }}
      </div>
    </div>

    <!-- Roll Formula (compact, centered) -->
    <div class="mb-3 text-center">
      <span class="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
        {{ formatRollFormula() }}
      </span>
    </div>

    <!-- Centered Damage Total -->
    <div class="text-center">
      <div class="inline-block bg-amber-600 dark:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
        {{ damageTotal }} {{ damageType ? damageType.toUpperCase() : 'DAMAGE' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { diceArrayToExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';

interface Props {
  // For full roll data (preferred)
  rollData?: RollServerResult;
  
  // For simple props fallback (current RollResultMessage interface)
  message?: string;
  result?: number;
  success?: boolean;
  rollType?: string;
}

const props = defineProps<Props>();

// Extract damage information from available data
const damageTotal = props.rollData?.metadata?.result || props.result || 0;
const rollType = props.rollData?.rollType || props.rollType || '';
const isCritical = !!(props.rollData?.metadata?.critical);

// Determine damage source (weapon name, spell name, etc.)
const damageSource = (() => {
  const weaponData = props.rollData?.metadata?.weapon as any;
  const spellData = props.rollData?.metadata?.spell as any;
  
  if (weaponData?.name) return weaponData.name;
  if (spellData?.name) return spellData.name;
  if (rollType.includes('weapon')) return 'Weapon';
  if (rollType.includes('spell')) return 'Spell';
  return 'Unknown Source';
})();

// Determine damage type
const damageType = (() => {
  // From roll data metadata
  if (props.rollData?.metadata?.damageType) return props.rollData.metadata.damageType;
  
  // From weapon data
  const weaponData = props.rollData?.metadata?.weapon as any;
  if (weaponData?.pluginData?.damageType) return weaponData.pluginData.damageType;
  if (weaponData?.pluginData?.damage?.type) return weaponData.pluginData.damage.type;
  
  // From spell data
  const spellData = props.rollData?.metadata?.spell as any;
  if (spellData?.pluginData?.damageType) return spellData.pluginData.damageType;
  
  // Default based on source type
  if (rollType.includes('weapon')) return 'slashing';
  if (rollType.includes('spell')) return 'force';
  return 'damage';
})();

/**
 * Format the damage title - use the pre-formatted message from the handler
 */
function formatDamageTitle(): string {
  // The weapon attack handler already creates the properly formatted message
  return props.message || props.rollData?.metadata?.title || `${rollType} damage`;
}


/**
 * Format roll formula display (e.g., "1d8+3")
 */
function formatRollFormula(): string {
  if (!props.rollData?.results || props.rollData.results.length === 0) {
    return 'No dice';
  }
  
  try {
    // Calculate total modifier
    let modifier = props.rollData.arguments?.customModifier || 0;
    if (props.rollData.modifiers) {
      for (const mod of props.rollData.modifiers) {
        modifier += mod.value;
      }
    }
    
    return diceArrayToExpression(props.rollData.results, modifier);
  } catch (error) {
    console.error('[DamageCard] Failed to format roll formula:', error);
    return 'Invalid dice';
  }
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: Date): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
</script>

<style scoped>
/* Component-specific styles */
</style>