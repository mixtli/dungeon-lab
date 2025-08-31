<template>
  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg p-4 my-2">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div class="text-lg">🎲</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">{{ rollData.metadata.title }}</h3>
        <span v-if="rollData.metadata.characterName" class="text-sm text-gray-600 dark:text-gray-300">
          ({{ rollData.metadata.characterName }})
        </span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatTime(rollData.timestamp) }}
      </div>
    </div>

    <!-- Dice Results -->
    <div class="space-y-2">
      <div v-for="(diceGroup, index) in rollData.results" :key="index" class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ diceGroup.quantity }}d{{ diceGroup.sides }}:
        </span>
        <div class="flex space-x-1">
          <span 
            v-for="(result, resultIndex) in diceGroup.results" 
            :key="resultIndex"
            :class="getDieResultClass(result, diceGroup.sides)"
            class="inline-flex items-center justify-center w-8 h-8 rounded text-sm font-bold"
          >
            {{ result }}
          </span>
        </div>
      </div>
    </div>

    <!-- Modifiers -->
    <div v-if="rollData.modifiers.length > 0" class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">Modifiers:</div>
      <div class="flex flex-wrap gap-1">
        <span 
          v-for="modifier in rollData.modifiers" 
          :key="modifier.source"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          {{ modifier.source }}: {{ formatModifier(modifier.value) }}
        </span>
      </div>
    </div>

    <!-- Custom Modifier -->
    <div v-if="rollData.arguments.customModifier !== 0" class="mt-2">
      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
        Custom: {{ formatModifier(rollData.arguments.customModifier) }}
      </span>
    </div>

    <!-- Total (calculated) -->
    <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total:</span>
        <span class="text-lg font-bold text-blue-600 dark:text-blue-400">
          {{ calculateTotal() }}
        </span>
      </div>
    </div>

    <!-- Description (if any) -->
    <div v-if="rollData.metadata.description" class="mt-2 text-sm text-gray-600 dark:text-gray-300 italic">
      {{ rollData.metadata.description }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';

interface Props {
  rollData: RollServerResult;
}

const props = defineProps<Props>();

/**
 * Calculate total from dice results and modifiers
 */
function calculateTotal(): number {
  // Use plugin-calculated total if available (from D&D handler, etc.)
  if (typeof (props.rollData as any).calculatedTotal === 'number') {
    return (props.rollData as any).calculatedTotal;
  }
  
  // Fallback to generic calculation for non-plugin rolls
  let total = 0;
  for (const diceGroup of props.rollData.results) {
    total += diceGroup.results.reduce((sum, result) => sum + result, 0);
  }

  // Add modifiers
  for (const modifier of props.rollData.modifiers) {
    total += modifier.value;
  }

  // Add custom modifier
  total += props.rollData.arguments.customModifier;

  return total;
}

/**
 * Format modifier value with + or - sign
 */
function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Get CSS class for die result based on value and die type
 */
function getDieResultClass(result: number, sides: number): string {
  if (result === 1) {
    // Critical failure
    return 'bg-red-500 text-white';
  } else if (result === sides) {
    // Critical success
    return 'bg-green-500 text-white';
  } else if (result >= sides * 0.8) {
    // High roll
    return 'bg-yellow-400 text-gray-900';
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
/* Add any component-specific styles here */
</style>