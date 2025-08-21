<template>
  <div class="bg-gradient-to-r from-red-50 to-rose-50 dark:from-gray-800 dark:to-gray-700 border border-red-200 dark:border-gray-600 rounded-lg p-4 my-2">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div class="text-lg">⚔️</div>
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
    <div v-if="weaponName" class="bg-red-100 dark:bg-red-900 rounded p-2 mb-3">
      <div class="text-sm font-medium text-red-800 dark:text-red-200">
        {{ weaponName }}
      </div>
      <div v-if="weaponProperties" class="text-xs text-red-600 dark:text-red-300">
        {{ weaponProperties }}
      </div>
    </div>

    <!-- Attack Roll Results -->
    <div class="space-y-2">
      <div v-for="(diceGroup, index) in rollData.results" :key="index" class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ diceGroup.quantity }}d{{ diceGroup.sides }}:
        </span>
        <div class="flex space-x-1">
          <span 
            v-for="(result, resultIndex) in diceGroup.results" 
            :key="resultIndex"
            :class="getAttackDieResultClass(result, diceGroup.sides)"
            class="inline-flex items-center justify-center w-8 h-8 rounded text-sm font-bold"
          >
            {{ result }}
          </span>
        </div>
        <!-- Show which die was used for advantage/disadvantage -->
        <span v-if="diceGroup.quantity === 2 && diceGroup.sides === 20" class="text-xs text-gray-500">
          ({{ getAdvantageText() }})
        </span>
      </div>
    </div>

    <!-- Attack Bonus Breakdown -->
    <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">Attack Bonus:</div>
      <div class="flex flex-wrap gap-1">
        <span v-if="abilityModifier !== 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
          {{ attackAbility }} modifier: {{ formatModifier(abilityModifier) }}
        </span>
        <span v-if="proficiencyBonus !== 0" class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
          Proficiency: {{ formatModifier(proficiencyBonus) }}
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

    <!-- Attack Total -->
    <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Attack Total:</span>
        <div class="flex items-center space-x-2">
          <span class="text-lg font-bold text-red-600 dark:text-red-400">
            {{ attackTotal }}
          </span>
          <span v-if="isCriticalHit" class="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">
            🎯 CRITICAL HIT!
          </span>
        </div>
      </div>
    </div>

    <!-- Hit/Miss Helper -->
    <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
      Compare to target's AC to determine hit/miss
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

// Computed weapon information
const weaponName = weaponData?.name || 'Unknown Weapon';
const weaponProperties = weaponData?.pluginData?.properties?.join(', ') || null;

// Extract attack calculation data (if processed by GM)
const attackTotal = (props.rollData as any).total || calculateRawTotal();
const isCriticalHit = (props.rollData as any).isCriticalHit || checkCriticalHit();

// Calculate attack bonus components (for display)
const attackAbility = getWeaponAttackAbility();
const abilityModifier = getAbilityModifier(attackAbility);
const proficiencyBonus = isProficientWithWeapon() ? getProficiencyBonus() : 0;
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
 * Check if any d20 rolled a 20 (critical hit)
 */
function checkCriticalHit(): boolean {
  return props.rollData.results.some(group => 
    group.sides === 20 && group.results.includes(20)
  );
}

/**
 * Get weapon's attack ability
 */
function getWeaponAttackAbility(): string {
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
 * Check if character is proficient with weapon
 */
function isProficientWithWeapon(): boolean {
  if (!characterData) return false;
  const weaponProficiencies = characterData.pluginData?.proficiencies?.weapons || [];
  const weaponCategory = weaponData?.pluginData?.category || weaponData?.pluginData?.weaponType;
  
  return weaponProficiencies.includes(weaponData?.name) || 
         weaponProficiencies.includes(weaponCategory) ||
         weaponProficiencies.includes('simple-weapons') ||
         weaponProficiencies.includes('martial-weapons');
}

/**
 * Get proficiency bonus
 */
function getProficiencyBonus(): number {
  if (!characterData) return 0;
  const level = characterData.pluginData?.progression?.level || characterData.pluginData?.level || 1;
  return Math.ceil(level / 4) + 1;
}

/**
 * Get advantage/disadvantage text
 */
function getAdvantageText(): string {
  const advantageMode = props.rollData.arguments.pluginArgs?.advantageMode;
  if (advantageMode === 'advantage') return 'advantage, taking higher';
  if (advantageMode === 'disadvantage') return 'disadvantage, taking lower';
  return 'rolled twice';
}

/**
 * Format modifier value with + or - sign
 */
function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Get CSS class for attack die result
 */
function getAttackDieResultClass(result: number, sides: number): string {
  if (result === 1 && sides === 20) {
    // Critical failure on d20
    return 'bg-red-500 text-white';
  } else if (result === 20 && sides === 20) {
    // Critical hit on d20
    return 'bg-yellow-400 text-gray-900 ring-2 ring-yellow-300';
  } else if (result >= sides * 0.8) {
    // High roll
    return 'bg-green-400 text-white';
  } else {
    // Normal roll
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