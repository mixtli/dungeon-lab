<template>
  <div class="bg-slate-800 border border-slate-600 rounded-lg p-4 my-2 dnd-roll-card">
    <!-- Simplified Header -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-medium text-slate-200 text-base leading-tight">{{ rollData.metadata.title }}</h3>
      <div class="text-xs text-slate-400">
        {{ formatTime(rollData.timestamp) }}
      </div>
    </div>

    <!-- Roll Formula (compact) -->
    <div class="mb-3 text-center">
      <span class="text-sm font-mono text-slate-300 bg-slate-700 px-2 py-1 rounded">
        {{ formatRollFormula() }}
      </span>
    </div>

    <!-- Prominent Result Display -->
    <div class="text-center">
      <div :class="getResultStatusClass()" class="text-xl font-bold px-4 py-2 rounded-lg">
        {{ getResultStatus() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { diceArrayToExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';

interface Props {
  rollData: RollServerResult;
}

const props = defineProps<Props>();

/**
 * Get the result status text based on roll outcome
 */
function getResultStatus(): string {
  const critical = props.rollData.metadata.critical;
  const success = props.rollData.metadata.success;
  
  if (critical && success) {
    return 'Critical Hit!';
  } else if (critical && !success) {
    return 'Critical Miss!';
  } else if (success) {
    return 'Hit';
  } else {
    return 'Miss';
  }
}

/**
 * Get CSS classes for result status styling
 */
function getResultStatusClass(): string {
  const critical = props.rollData.metadata.critical;
  const success = props.rollData.metadata.success;
  
  if (critical && success) {
    // Critical Hit - bright green
    return 'text-green-100 bg-green-600 border border-green-500';
  } else if (critical && !success) {
    // Critical Miss - bright red  
    return 'text-red-100 bg-red-600 border border-red-500';
  } else if (success) {
    // Regular Hit - blue
    return 'text-blue-100 bg-blue-600 border border-blue-500';
  } else {
    // Miss - gray
    return 'text-gray-200 bg-gray-600 border border-gray-500';
  }
}

/**
 * Format roll formula display (e.g., "1d20+5")
 */
function formatRollFormula(): string {
  // Calculate total modifier
  let modifier = props.rollData.arguments.customModifier;
  for (const mod of props.rollData.modifiers) {
    modifier += mod.value;
  }
  
  return diceArrayToExpression(props.rollData.results, modifier);
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