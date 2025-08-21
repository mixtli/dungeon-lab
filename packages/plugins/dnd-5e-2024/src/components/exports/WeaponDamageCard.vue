<template>
  <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 border border-amber-200 dark:border-gray-600 rounded-lg p-4 my-2">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div class="text-lg">🗡️</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">{{ rollData.metadata.title }}</h3>
        <span v-if="rollData.metadata.characterName" class="text-sm text-gray-600 dark:text-gray-300">
          ({{ rollData.metadata.characterName }})
        </span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatTime(rollData.timestamp) }}
      </div>
    </div>

    <!-- Weapon Information -->
    <div v-if="weaponName" class="bg-amber-100 dark:bg-amber-900 rounded p-2 mb-3">
      <div class="text-sm font-medium text-amber-800 dark:text-amber-200">
        {{ weaponName }}
      </div>
      <div class="text-xs text-amber-600 dark:text-amber-300 flex items-center space-x-4">
        <span v-if="damageType">{{ damageType }} damage</span>
        <span v-if="isCritical" class="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">
          ⚡ Critical Damage
        </span>
      </div>
    </div>

    <!-- Damage Roll Results -->
    <div class="space-y-2">
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

    <!-- Damage Bonus Breakdown -->
    <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">Damage Bonus:</div>
      <div class="flex flex-wrap gap-1">
        <span v-if="abilityModifier !== 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
          {{ damageAbility }} modifier: {{ formatModifier(abilityModifier) }}
        </span>
        <span v-if="enhancementBonus !== 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
          Enhancement: {{ formatModifier(enhancementBonus) }}
        </span>
      </div>
    </div>

    <!-- Custom Modifier -->
    <div v-if="rollData.arguments.customModifier !== 0" class="mt-2">
      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
        Custom: {{ formatModifier(rollData.arguments.customModifier) }}
      </span>
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
  rollData: RollServerResult;
}

const props = defineProps<Props>();

// Extract weapon and character data from rollData metadata
const weaponData = props.rollData.metadata.weapon as any;
const characterData = props.rollData.metadata.character as any;
const isCritical = !!(props.rollData.metadata.critical);

// Computed weapon information
const weaponName = weaponData?.name || 'Unknown Weapon';
const damageType = (props.rollData as any).damageType || 
                   weaponData?.pluginData?.damageType || 
                   weaponData?.pluginData?.damage?.type || 
                   'bludgeoning';

// Extract damage calculation data (if processed by GM)
const damageTotal = (props.rollData as any).total || calculateRawTotal();

// Calculate damage bonus components (for display)
const damageAbility = getWeaponDamageAbility();
const abilityModifier = getAbilityModifier(damageAbility);
const enhancementBonus = weaponData?.pluginData?.enhancement || 0;

/**
 * Calculate raw total from dice + custom modifier (without weapon bonuses)
 */
function calculateRawTotal(): number {
  let total = 0;
  for (const diceGroup of props.rollData.results) {
    total += diceGroup.results.reduce((sum, result) => sum + result, 0);
  }
  total += props.rollData.arguments.customModifier || 0;
  return total;
}

/**
 * Get weapon's damage ability (same as attack ability)
 */
function getWeaponDamageAbility(): string {
  const properties = weaponData?.pluginData?.properties || [];
  const weaponType = weaponData?.pluginData?.weaponType || weaponData?.pluginData?.category;
  
  if (properties.includes('finesse')) {
    return 'dexterity';
  }
  
  if (weaponType === 'ranged' || weaponType === 'ranged-weapon') {
    return 'dexterity';
  }
  
  return 'strength';
}

/**
 * Get ability modifier
 */
function getAbilityModifier(ability: string): number {
  if (!characterData) return 0;
  const abilityScore = characterData.pluginData?.abilities?.[ability]?.value || 10;
  return Math.floor((abilityScore - 10) / 2);
}

/**
 * Format modifier value with + or - sign
 */
function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

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