<template>
  <div 
    v-if="visible && token"
    :style="menuStyle"
    class="token-context-menu"
    @click.stop
    @mousedown.stop
    @mousemove.stop
    @mouseup.stop
    @wheel.stop
    @dragstart.prevent
    @contextmenu.prevent
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
      
      <!-- Plugin Actions -->
      <div v-if="simplePluginActions && simplePluginActions.length > 0" class="action-group">
        <h4>Combat Actions</h4>
        <button 
          v-for="action in simplePluginActions" 
          :key="action.id"
          @click="handlePluginAction(action)" 
          class="menu-item"
        >
          <i v-if="action.icon" :class="action.icon"></i>
          <i v-else class="icon-plugin"></i>
          {{ action.label }}
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
import { computed, toRaw } from 'vue';
import { useGameSessionStore } from '@/stores/game-session.store.mjs';
import { useGameStateStore } from '@/stores/game-state.store.mjs';
import { tokenActionRegistry } from '@/services/token-action-registry.mjs';
import { PlayerActionService } from '@/services/player-action.service.mjs';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { 
  TokenActionContext, // Execution context passed TO plugin handlers when action runs
  PluginContext
} from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

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

const gameSessionStore = useGameSessionStore();
const gameStateStore = useGameStateStore();

// Computed
const isGM = computed(() => {
  return gameSessionStore.isGameMaster;
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
    top: `${props.position.y}px`,
    left: `${props.position.x}px`
  };
});

// Plugin Actions
const availablePluginActions = computed(() => {
  try {
    if (!props.token) return [];
    
    const allActions = tokenActionRegistry?.getAllActions?.() || [];
    const gameState = gameStateStore?.gameState;
    
    if (!Array.isArray(allActions)) return [];
    
    // Filter actions based on their condition function
    return allActions.filter(action => {
      if (!action || typeof action !== 'object') return false;
      
      if (!action.condition) return true;
      
      try {
        // The gameState from store is deeply readonly, but condition functions are read-only operations
        // so this type assertion is safe for runtime behavior
        return action.condition(props.token!, gameState! as Readonly<ServerGameStateWithVirtuals>);
      } catch (error) {
        console.warn(`[TokenContextMenu] Error evaluating condition for action ${action.id}:`, error);
        return false;
      }
    });
  } catch (error) {
    console.warn('[TokenContextMenu] Error in availablePluginActions:', error);
    return [];
  }
});

// Simple flat array of plugin actions for template rendering
const simplePluginActions = computed(() => {
  try {
    const actions = availablePluginActions.value;
    console.log('[TokenContextMenu] Available plugin actions:', actions);
    
    if (!Array.isArray(actions) || actions.length === 0) {
      console.log('[TokenContextMenu] No plugin actions available');
      return [];
    }
    
    // Create simple flat array with all needed properties
    const simpleActions = actions.map(action => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      groupLabel: action.groupLabel || 'Plugin Actions',
      handler: action.handler
    }));
    
    console.log('[TokenContextMenu] Simple plugin actions for template:', simpleActions);
    return simpleActions;
  } catch (error) {
    console.warn('[TokenContextMenu] Error in simplePluginActions:', error);
    return [];
  }
});

// Methods
const handleAction = (action: string) => {
  if (!props.token) return;
  
  emit('action', action, props.token);
  emit('close');
};

const handlePluginAction = async (action: { id: string; label: string; icon?: string; groupLabel: string }) => {
  if (!props.token) return;
  
  try {
    // We need to get the original action from the registry to access the full handler
    const allActions = tokenActionRegistry?.getAllActions?.() || [];
    const originalAction = allActions.find(a => a.id === action.id);
    
    if (!originalAction || !originalAction.handler) {
      console.error(`[TokenContextMenu] No handler found for action: ${action.id}`);
      return;
    }
    
    // Create a simplified context that delegates action requests to PlayerActionService
    const playerActionService = new PlayerActionService();
    const context: TokenActionContext = {
      selectedToken: props.token,
      // The gameState from store is deeply readonly, but for the handler execution context
      // we need to provide the mutable interface expected by the TokenActionContext
      gameState: toRaw(gameStateStore.gameState!) as ServerGameStateWithVirtuals,
      pluginContext: ({
        requestAction: async (
          actionType: string, 
          actorId: string | undefined, 
          parameters: Record<string, unknown>,
          actorTokenId?: string,
          targetTokenIds?: string[],
          options?: { description?: string }
        ) => {
          // For token context menu actions, we have the token so pass both actorId and actorTokenId
          if (!props.token) {
            throw new Error('No token selected for action');
          }
          return await playerActionService.requestAction(
            actionType, // Plugin actions are now supported as strings
            actorId || props.token.documentId,  // Use provided actorId or fall back to token's document
            parameters, 
            actorTokenId || props.token.id,     // Use provided token or fall back to current token
            targetTokenIds,                     // Pass through target tokens
            options
          );
        }
      }) as PluginContext // Simplified plugin context for token actions
    };
    
    await originalAction.handler(context);
    
    console.log(`[TokenContextMenu] Executed plugin action: ${action.id}`);
  } catch (error) {
    console.error(`[TokenContextMenu] Error executing plugin action ${action.id}:`, error);
  }
  
  emit('close');
};
</script>

<style scoped>
.token-context-menu {
  @apply bg-neutral-900 text-white border border-gray-700 rounded-lg shadow-xl min-w-64 max-w-80 max-h-96 overflow-y-auto;
  user-select: none;
  pointer-events: auto;
  z-index: 9999;
  position: fixed;
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
.icon-plugin::before { content: '🔧'; }

/* D&D Combat Action Icons */
.icon-dodge::before { content: '🛡️'; }
.icon-hide::before { content: '🫥'; }
.icon-disengage::before { content: '🏃'; }
.icon-search::before { content: '🔍'; }
.icon-help::before { content: '🤝'; }
.icon-ready::before { content: '⏰'; }

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