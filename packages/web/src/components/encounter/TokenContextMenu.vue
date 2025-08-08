<template>
  <div 
    v-if="visible && token"
    :style="menuStyle"
    class="token-context-menu"
    @click.stop
  >
    <div class="menu-header">
      <div class="token-info">
        <div class="token-name">{{ token.name }}</div>
        <div class="token-type">{{ tokenTypeLabel }}</div>
      </div>
      <button @click="$emit('close')" class="close-button">×</button>
    </div>
    
    <div class="menu-actions">
      <!-- Movement Actions -->
      <div class="action-group">
        <h4>Movement</h4>
        <button @click="handleAction('move')" class="menu-item">
          <i class="icon-move"></i>
          Move Token
        </button>
        <button @click="handleAction('center')" class="menu-item">
          <i class="icon-center"></i>
          Center on Token
        </button>
      </div>
      
      <!-- Token Actions -->
      <div class="action-group">
        <h4>Token Actions</h4>
        <button @click="handleAction('edit')" class="menu-item">
          <i class="icon-edit"></i>
          Edit Token
        </button>
        <button @click="handleAction('duplicate')" class="menu-item">
          <i class="icon-duplicate"></i>
          Duplicate Token
        </button>
        <button @click="handleAction('toggle-visibility')" class="menu-item">
          <i :class="visibilityIcon"></i>
          {{ visibilityLabel }}
        </button>
      </div>
      
      <!-- Health & Status -->
      <!-- TODO: Update to use new data structure -->
      <!-- <div class="action-group" v-if="token.data?.stats">
        <h4>Health & Status</h4>
        <button @click="handleAction('damage')" class="menu-item">
          <i class="icon-damage"></i>
          Apply Damage
        </button>
        <button @click="handleAction('heal')" class="menu-item">
          <i class="icon-heal"></i>
          Heal Token
        </button>
        <button @click="handleAction('conditions')" class="menu-item">
          <i class="icon-conditions"></i>
          Manage Conditions
        </button>
      </div> -->
      
      <!-- GM Only Actions -->
      <div class="action-group" v-if="isGM">
        <h4>GM Actions</h4>
        <button @click="handleAction('toggle-control')" class="menu-item">
          <i class="icon-control"></i>
          {{ controlLabel }}
        </button>
        <button @click="handleAction('remove')" class="menu-item danger">
          <i class="icon-delete"></i>
          Remove Token
        </button>
      </div>
      
      <!-- Player Actions -->
      <div class="action-group" v-if="isPlayerControlled && !isGM">
        <h4>Character Actions</h4>
        <button @click="handleAction('attack')" class="menu-item">
          <i class="icon-attack"></i>
          Attack
        </button>
        <button @click="handleAction('cast-spell')" class="menu-item">
          <i class="icon-spell"></i>
          Cast Spell
        </button>
      </div>
    </div>
    
    <!-- Token Stats Display -->
    <!-- TODO: Update to use new data structure
    <div v-if="token.data?.stats" class="token-stats">
      <div class="stat-row">
        <span class="stat-label">HP:</span>
        <div class="health-bar">
          <div 
            class="health-fill"
            :style="{ width: healthPercentage + '%' }"
          ></div>
          <span class="health-text">
            {{ token.data.stats.hitPoints }} / {{ token.data.stats.maxHitPoints }}
          </span>
        </div>
      </div>
      <div class="stat-row">
        <span class="stat-label">AC:</span>
        <span class="stat-value">{{ token.data.stats.armorClass }}</span>
        <span class="stat-label">Speed:</span>
        <span class="stat-value">{{ token.data.stats.speed }}ft</span>
      </div>
      
      <div v-if="token.conditions?.length" class="conditions">
        <span class="stat-label">Conditions:</span>
        <div class="condition-list">
          <span 
            v-for="(condition, index) in token.conditions" 
            :key="index"
            class="condition-tag"
          >
            {{ condition.name }}
          </span>
        </div>
      </div>
    </div>
    -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store.mjs';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';

interface Props {
  visible: boolean;
  token: Token | null;
  position: { x: number; y: number };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  action: [action: string, token: Token];
}>();

const authStore = useAuthStore();

// Computed
const isGM = computed(() => {
  return authStore.user?.isAdmin || false;
});

const isPlayerControlled = computed(() => {
  return props.token?.isPlayerControlled || false;
});

const tokenTypeLabel = computed(() => {
  if (!props.token) return '';
  
  if (props.token.isPlayerControlled) {
    return 'Player Character';
  }
  
  if (props.token.documentId && props.token.documentType) {
    return `${props.token.documentType.charAt(0).toUpperCase() + props.token.documentType.slice(1)} Token`;
  }
  
  return 'Game Token';
});

const visibilityIcon = computed(() => {
  return props.token?.isVisible ? 'icon-visible' : 'icon-hidden';
});

const visibilityLabel = computed(() => {
  return props.token?.isVisible ? 'Hide Token' : 'Show Token';
});

const controlLabel = computed(() => {
  return props.token?.isPlayerControlled 
    ? 'Remove Player Control' 
    : 'Give Player Control';
});

// TODO: Update to use new data structure
// const healthPercentage = computed(() => {
//   if (!props.token?.data?.stats) return 100;
//   const current = props.token.data.stats.hitPoints;
//   const max = props.token.data.stats.maxHitPoints;
//   return Math.max(0, Math.round((current / max) * 100));
// });

const menuStyle = computed(() => {
  return {
    position: 'absolute' as const,
    top: `${props.position.y}px`,
    left: `${props.position.x}px`,
    zIndex: 1000
  };
});

// Methods
const handleAction = (action: string) => {
  if (!props.token) return;
  
  emit('action', action, props.token);
  emit('close');
};
</script>

<style scoped>
.token-context-menu {
  @apply bg-neutral-900 text-white border border-gray-700 rounded-lg shadow-xl min-w-64 max-w-80 max-h-96 overflow-y-auto z-50;
  user-select: none;
}

.menu-header {
  @apply flex items-center justify-between p-3 border-b border-gray-700 font-heading font-semibold text-base;
}

.token-info {
  @apply flex-1;
}

.token-name {
  @apply font-heading font-semibold text-white;
}

.token-type {
  @apply text-xs text-gray-400;
}

.close-button {
  @apply text-gray-400 hover:text-gray-200 text-xl font-bold leading-none ml-2 focus:outline-none;
}

.menu-actions {
  @apply p-2;
}

.action-group {
  @apply mb-3 last:mb-0;
}

.action-group h4 {
  @apply text-xs font-semibold text-gray-300 uppercase tracking-wide mb-1 px-2 font-heading;
}

.menu-item {
  @apply block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-800 focus:bg-gray-800 focus:outline-none;
}

.menu-item.danger {
  @apply text-red-400 hover:bg-red-900;
}

.menu-item i {
  @apply w-4 h-4 flex-shrink-0;
}

/* Icon placeholders - replace with actual icon classes */
.icon-move::before { content: '↔️'; }
.icon-center::before { content: '🎯'; }
.icon-edit::before { content: '✏️'; }
.icon-duplicate::before { content: '📋'; }
.icon-visible::before { content: '👁️'; }
.icon-hidden::before { content: '🙈'; }
.icon-damage::before { content: '⚔️'; }
.icon-heal::before { content: '❤️'; }
.icon-conditions::before { content: '🎭'; }
.icon-control::before { content: '🎮'; }
.icon-delete::before { content: '🗑️'; }
.icon-attack::before { content: '⚡'; }
.icon-spell::before { content: '✨'; }

.token-stats {
  @apply p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800;
}

.stat-row {
  @apply flex items-center space-x-2 mb-2 last:mb-0;
}

.stat-label {
  @apply text-xs font-medium text-gray-600 dark:text-gray-400;
}

.stat-value {
  @apply text-sm font-semibold text-gray-900 dark:text-white;
}

.health-bar {
  @apply flex-1 relative bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden;
}

.health-fill {
  @apply h-full bg-green-500 transition-all duration-300;
}

.health-text {
  @apply absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white;
}

.conditions {
  @apply flex items-start space-x-2;
}

.condition-list {
  @apply flex flex-wrap gap-1;
}

.condition-tag {
  @apply inline-block px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 
         text-yellow-800 dark:text-yellow-300 rounded-full;
}

/* Health bar color variants */
.health-fill {
  background-color: #10b981; /* Default green */
}

.health-bar[data-health="low"] .health-fill {
  background-color: #f59e0b; /* Yellow for low health */
}

.health-bar[data-health="critical"] .health-fill {
  background-color: #ef4444; /* Red for critical health */
}
</style> 