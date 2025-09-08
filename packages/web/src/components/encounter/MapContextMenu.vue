<template>
  <div
    v-if="visible"
    class="fixed z-[9999] pointer-events-auto border border-gray-700 bg-neutral-900 text-white rounded-lg shadow-xl p-2 min-w-[180px] max-w-[240px]"
    :style="{
      top: `${position.y}px`,
      left: `${position.x}px`
    }"
  >
    <div class="text-sm font-heading font-semibold border-b border-gray-700 pb-2 mb-2">Map Options</div>
    <div class="space-y-1">
      <button 
        @click="emitAction('add-token')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        Add Token
      </button>
      <button 
        @click="emitAction('center-view')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        Center View
      </button>
      <button 
        @click="emitAction('toggle-walls')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        {{ showWalls ? 'Hide Walls' : 'Show Walls' }}
      </button>
      <button 
        @click="emitAction('toggle-objects')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        {{ showObjects ? 'Hide Objects' : 'Show Objects' }}
      </button>
      <button 
        @click="emitAction('toggle-doors')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        {{ showDoors ? 'Hide Doors' : 'Show Doors' }}
      </button>
      <button 
        @click="emitAction('toggle-lights')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        {{ showLights ? 'Hide Lights' : 'Show Lights' }}
      </button>
      <button 
        @click="emitAction('toggle-grid')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        {{ showGrid ? 'Hide Grid' : 'Show Grid' }}
      </button>
      <button 
        @click="emitAction('toggle-debug')" 
        class="block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
      >
        {{ showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

interface Position {
  x: number;
  y: number;
}

defineProps<{
  visible: boolean;
  position: Position;
  showWalls: boolean;
  showObjects: boolean;
  showDoors: boolean;
  showLights: boolean;
  showGrid: boolean;
  showDebugInfo: boolean;
}>();

const emit = defineEmits<{
  (e: 'action', action: string): void;
}>();

function emitAction(action: string) {
  emit('action', action);
}
</script> 