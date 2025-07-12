<template>
  <div
    v-if="visible"
    class="fixed bg-white rounded-lg shadow-lg p-2 pointer-events-auto z-[9999]"
    :style="{
      top: `${position.y}px`,
      left: `${position.x}px`
    }"
  >
    <div class="text-sm font-semibold border-b pb-1 mb-1">Map Options</div>
    <div class="space-y-1">
      <button 
        @click="emitAction('add-token')" 
        class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
      >
        Add Token
      </button>
      <button 
        @click="emitAction('center-view')" 
        class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
      >
        Center View
      </button>
      <button 
        @click="emitAction('toggle-walls')" 
        class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
      >
        {{ showWalls ? 'Hide Walls' : 'Show Walls' }}
      </button>
      <button 
        @click="emitAction('toggle-objects')" 
        class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
      >
        {{ showObjects ? 'Hide Objects' : 'Show Objects' }}
      </button>
      <button 
        @click="emitAction('toggle-portals')" 
        class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
      >
        {{ showPortals ? 'Hide Portals' : 'Show Portals' }}
      </button>
      <button 
        @click="emitAction('toggle-lights')" 
        class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
      >
        {{ showLights ? 'Hide Lights' : 'Show Lights' }}
      </button>
      <button 
        @click="emitAction('toggle-debug')" 
        class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
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
  showPortals: boolean;
  showLights: boolean;
  showDebugInfo: boolean;
}>();

const emit = defineEmits<{
  (e: 'action', action: string): void;
}>();

function emitAction(action: string) {
  emit('action', action);
}
</script> 