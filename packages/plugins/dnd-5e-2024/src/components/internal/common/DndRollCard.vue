<template>
  <div class="bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 my-2 dnd-roll-card">
    <!-- Header with D&D styling -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div class="text-lg">⚔️</div>
        <h3 class="font-bold text-red-800 dark:text-red-300 text-lg">{{ rollData.metadata.title }}</h3>
        <span v-if="rollData.metadata.characterName" class="text-sm text-amber-700 dark:text-amber-300 font-medium">
          {{ rollData.metadata.characterName }}
        </span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatTime(rollData.timestamp) }}
      </div>
    </div>

    <!-- Advantage/Disadvantage Display -->
    <div v-if="isAdvantageRoll" class="mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-300 dark:border-green-700">
      <div class="flex items-center space-x-2">
        <span class="text-green-700 dark:text-green-300 font-semibold">🍀 Advantage</span>
        <span class="text-sm text-green-600 dark:text-green-400">(roll twice, take higher)</span>
      </div>
    </div>
    
    <div v-else-if="isDisadvantageRoll" class="mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700">
      <div class="flex items-center space-x-2">
        <span class="text-red-700 dark:text-red-300 font-semibold">⚡ Disadvantage</span>
        <span class="text-sm text-red-600 dark:text-red-400">(roll twice, take lower)</span>
      </div>
    </div>

    <!-- D20 Dice Results with Special Styling -->
    <div class="space-y-3">
      <div v-for="(diceGroup, index) in rollData.results" :key="index">
        <div class="flex items-center space-x-2 mb-2">
          <span class="text-sm font-bold text-amber-800 dark:text-amber-300">
            {{ diceGroup.quantity }}d{{ diceGroup.sides }}:
          </span>
        </div>
        <div class="flex space-x-2 mb-2">
          <div 
            v-for="(result, resultIndex) in diceGroup.results" 
            :key="resultIndex"
            :class="getDndDieResultClass(result, diceGroup.sides)"
            class="relative inline-flex items-center justify-center w-12 h-12 rounded-lg text-lg font-bold shadow-lg border-2 transform transition-transform hover:scale-105"
          >
            {{ result }}
            <!-- Critical success/failure indicators -->
            <div v-if="result === 20 && diceGroup.sides === 20" class="absolute -top-1 -right-1 text-xs">✨</div>
            <div v-if="result === 1 && diceGroup.sides === 20" class="absolute -top-1 -right-1 text-xs">💀</div>
          </div>
        </div>
        <!-- Advantage/Disadvantage result selection -->
        <div v-if="diceGroup.results.length === 2 && diceGroup.sides === 20" class="text-xs text-gray-600 dark:text-gray-400">
          <span v-if="isAdvantageRoll">
            Using higher roll: <strong>{{ Math.max(...diceGroup.results) }}</strong>
          </span>
          <span v-else-if="isDisadvantageRoll">
            Using lower roll: <strong>{{ Math.min(...diceGroup.results) }}</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- Ability Score Modifier -->
    <div v-if="rollData.modifiers.length > 0" class="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-700">
      <div class="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-2">Modifiers:</div>
      <div class="space-y-1">
        <div 
          v-for="modifier in rollData.modifiers" 
          :key="modifier.source"
          class="flex justify-between items-center"
        >
          <span class="text-sm text-amber-800 dark:text-amber-200">{{ modifier.source }}:</span>
          <span class="font-bold text-amber-900 dark:text-amber-100">{{ formatModifier(modifier.value) }}</span>
        </div>
      </div>
    </div>

    <!-- Custom Modifier -->
    <div v-if="rollData.arguments.customModifier !== 0" class="mt-3">
      <div class="inline-flex items-center px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700">
        <span class="text-sm text-blue-800 dark:text-blue-200">Custom Modifier:</span>
        <span class="ml-2 font-bold text-blue-900 dark:text-blue-100">{{ formatModifier(rollData.arguments.customModifier) }}</span>
      </div>
    </div>

    <!-- Final Total with D&D Styling -->
    <div class="mt-4 p-4 bg-gradient-to-r from-red-100 to-amber-100 dark:from-red-900/30 dark:to-amber-900/30 rounded-lg border-2 border-red-300 dark:border-red-600">
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-red-800 dark:text-red-200">Final Result:</span>
        <span class="text-2xl font-bold text-red-900 dark:text-red-100 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md border border-red-300 dark:border-red-600">
          {{ calculateDndTotal() }}
        </span>
      </div>
    </div>

    <!-- Ability Check Success/Failure Indicator (if applicable) -->
    <div v-if="rollData.rollType === 'ability-check'" class="mt-3 text-center">
      <div class="text-xs text-gray-600 dark:text-gray-400">
        Compare against DC to determine success
      </div>
    </div>

    <!-- Description -->
    <div v-if="rollData.metadata.description" class="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300 italic border-l-4 border-amber-400">
      {{ rollData.metadata.description }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';

interface Props {
  rollData: RollServerResult;
}

const props = defineProps<Props>();

/**
 * Check if this is an advantage roll (2d20, take higher)
 */
const isAdvantageRoll = computed(() => {
  const pluginArgs = props.rollData.arguments.pluginArgs as any;
  return pluginArgs?.advantageMode === 'advantage';
});

/**
 * Check if this is a disadvantage roll (2d20, take lower)
 */
const isDisadvantageRoll = computed(() => {
  const pluginArgs = props.rollData.arguments.pluginArgs as any;
  return pluginArgs?.advantageMode === 'disadvantage';
});

/**
 * Calculate total for D&D rules (advantage/disadvantage handling)
 */
function calculateDndTotal(): number {
  let total = 0;
  
  // Handle dice results with advantage/disadvantage
  for (const diceGroup of props.rollData.results) {
    if (diceGroup.sides === 20 && diceGroup.results.length === 2) {
      // Advantage/Disadvantage: take higher/lower
      if (isAdvantageRoll.value) {
        total += Math.max(...diceGroup.results);
      } else if (isDisadvantageRoll.value) {
        total += Math.min(...diceGroup.results);
      } else {
        // Shouldn't happen, but handle gracefully
        total += diceGroup.results[0];
      }
    } else {
      // Normal dice - sum all results
      total += diceGroup.results.reduce((sum, result) => sum + result, 0);
    }
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
 * Get D&D-themed CSS class for die result
 */
function getDndDieResultClass(result: number, sides: number): string {
  if (sides === 20) {
    if (result === 20) {
      // Natural 20 - Critical Success
      return 'bg-gradient-to-br from-green-400 to-green-600 text-white border-green-300 shadow-green-400/50';
    } else if (result === 1) {
      // Natural 1 - Critical Failure
      return 'bg-gradient-to-br from-red-500 to-red-700 text-white border-red-400 shadow-red-500/50';
    } else if (result >= 18) {
      // Very high roll
      return 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-gray-900 border-yellow-200 shadow-yellow-400/50';
    } else if (result >= 15) {
      // High roll
      return 'bg-gradient-to-br from-blue-300 to-blue-500 text-white border-blue-200 shadow-blue-400/50';
    } else if (result <= 3) {
      // Very low roll
      return 'bg-gradient-to-br from-gray-400 to-gray-600 text-white border-gray-300 shadow-gray-500/50';
    } else {
      // Normal roll
      return 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500';
    }
  } else {
    // Non-d20 dice
    if (result === sides) {
      return 'bg-gradient-to-br from-green-400 to-green-600 text-white border-green-300';
    } else if (result === 1) {
      return 'bg-gradient-to-br from-red-400 to-red-600 text-white border-red-300';
    } else {
      return 'bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-700 dark:to-amber-800 text-gray-900 dark:text-white border-amber-300 dark:border-amber-600';
    }
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
.dnd-roll-card {
  font-family: 'Cinzel', 'Times New Roman', serif;
}

/* Custom D&D-themed styling */
.dnd-roll-card h3 {
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

/* Dice hover effects */
.dnd-roll-card .transform:hover {
  transform: scale(1.05) rotate(2deg);
}
</style>