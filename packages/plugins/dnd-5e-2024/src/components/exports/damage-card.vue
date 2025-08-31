<template>
  <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 border border-amber-200 dark:border-gray-600 rounded-lg p-4 my-2">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div class="text-lg">💥</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">
          {{ rollData?.metadata?.title || `${rollType} damage` }}
        </h3>
        <span v-if="rollData?.metadata?.characterName" class="text-sm text-gray-600 dark:text-gray-300">
          ({{ rollData.metadata.characterName }})
        </span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatTime(rollData?.timestamp || new Date()) }}
      </div>
    </div>

    <!-- Source Information (weapon/spell) -->
    <div v-if="damageSource" class="bg-amber-100 dark:bg-amber-900 rounded p-2 mb-3">
      <div class="text-sm font-medium text-amber-800 dark:text-amber-200">
        {{ damageSource }}
      </div>
      <div class="text-xs text-amber-600 dark:text-amber-300 flex items-center space-x-4">
        <span v-if="damageType">{{ damageType }} damage</span>
        <span v-if="isCritical" class="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">
          ⚡ Critical Damage
        </span>
      </div>
    </div>

    <!-- Damage Roll Results (if available) -->
    <div v-if="rollData?.results && rollData.results.length > 0" class="space-y-2 mb-3">
      <div v-for="(diceGroup, index) in rollData.results" :key="index" class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ diceGroup.quantity }}d{{ diceGroup.sides }}:
        </span>
        <div class="flex space-x-1">
          <span 
            v-for="(result, resultIndex) in diceGroup.results" 
            :key="resultIndex"
            :class="getDamageDieResultClass(result, diceGroup.sides)"
            class="inline-flex items-center justify-center w-8 h-8 rounded text-sm font-bold"
          >
            {{ result }}
          </span>
        </div>
      </div>
      <div v-if="isCritical" class="text-xs text-orange-600 dark:text-orange-400 italic">
        Dice doubled for critical hit
      </div>
    </div>

    <!-- Damage Total -->
    <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Total {{ damageType || 'Damage' }}:
        </span>
        <div class="flex items-center space-x-2">
          <span class="text-lg font-bold text-amber-600 dark:text-amber-400">
            {{ damageTotal }}
          </span>
          <span v-if="damageType" class="text-xs text-gray-500 uppercase">
            {{ damageType }}
          </span>
        </div>
      </div>
    </div>

    <!-- Damage Application Helper -->
    <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
      Apply to target's hit points (consider resistance/immunity)
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';

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
 * Get CSS class for damage die result
 */
function getDamageDieResultClass(result: number, sides: number): string {
  if (result === 1) {
    // Minimum damage
    return 'bg-red-300 text-red-800';
  } else if (result === sides) {
    // Maximum damage
    return 'bg-green-500 text-white';
  } else if (result >= sides * 0.75) {
    // High damage
    return 'bg-yellow-400 text-gray-900';
  } else {
    // Normal damage
    return 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white';
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