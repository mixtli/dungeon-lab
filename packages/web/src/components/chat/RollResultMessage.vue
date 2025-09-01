<template>
  <!-- Plugin component if available -->
  <component 
    v-if="pluginComponent" 
    :is="pluginComponent" 
    v-bind="pluginComponentProps"
  />
  
  <!-- Default generic component if no plugin component -->
  <div v-else class="roll-result-message" :class="resultClass">
    <div class="result-header">
      <span class="result-icon">🎲</span>
      <div class="result-content">
        <span class="result-text">{{ message }}</span>
        <div class="result-details">
          <span class="roll-value">{{ result }}</span>
          <span v-if="target" class="vs-text">vs</span>
          <span v-if="target" class="target-value">{{ target }}</span>
          <span class="result-status" :class="statusClass">{{ success ? 'SUCCESS' : 'FAILURE' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watchEffect } from 'vue';
import type { Component } from 'vue';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';

interface Props {
  message: string;
  result: number;
  target?: number;
  success: boolean;
  critical?: boolean;
  rollType: string;
  chatComponentType?: string;
  // Full roll data for plugin components (if available)
  rollData?: RollServerResult;
}

const props = defineProps<Props>();

// Plugin component loading
const pluginComponent = shallowRef<Component | null>(null);

// Load plugin component if chatComponentType is specified
watchEffect(async () => {
  if (!props.chatComponentType) {
    pluginComponent.value = null;
    return;
  }
  
  try {
    // Extract game system ID from metadata (for now default to dnd-5e-2024)
    const gameSystemId = 'dnd-5e-2024'; // Could be extracted from rollType or other metadata
    const componentType = props.chatComponentType;
    
    console.log(`[RollResultMessage] Loading plugin component: ${componentType} from ${gameSystemId}`);
    
    // Use the plugin registry to load the component
    const component = await pluginRegistry.getComponent(gameSystemId, componentType);
    if (component) {
      console.log(`[RollResultMessage] Plugin component loaded successfully: ${componentType}`);
      pluginComponent.value = component;
    } else {
      console.warn(`[RollResultMessage] Plugin component not found: ${componentType} from ${gameSystemId}`);
      pluginComponent.value = null;
    }
  } catch (error) {
    console.error('[RollResultMessage] Failed to load plugin component:', error);
    pluginComponent.value = null;
  }
});

// Props to pass to plugin component 
const pluginComponentProps = computed(() => {
  // If we have full roll data, use it directly
  if (props.rollData) {
    return {
      rollData: {
        ...props.rollData,
        metadata: {
          ...props.rollData.metadata,
          title: props.message, // Use the message as title
          result: props.result,
          success: props.success,
          critical: props.critical
        }
      }
    };
  }
  
  // Fallback: create minimal rollData structure for plugins that need it
  return {
    rollData: {
      metadata: {
        title: props.message,
        result: props.result,
        success: props.success
      },
      rollType: props.rollType,
      // Plugin components may need these fields - will be enhanced when we have full roll data
      results: [],
      arguments: { customModifier: 0 },
      modifiers: [],
      timestamp: new Date()
    }
  };
});

// Dynamic styling based on success/failure (for generic fallback only)
const resultClass = computed(() => ({
  'success': props.success,
  'failure': !props.success
}));

const statusClass = computed(() => ({
  'status-success': props.success,
  'status-failure': !props.success
}));
</script>

<style scoped>
.roll-result-message {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #6c757d;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
  transition: all 0.3s ease;
}

.roll-result-message.success {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-color: #28a745;
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.2);
}

.roll-result-message.failure {
  background: linear-gradient(135deg, #f8d7da 0%, #f1b0b7 100%);
  border-color: #dc3545;
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.2);
}

.result-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.result-icon {
  font-size: 24px;
  background: #6c757d;
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success .result-icon {
  background: #28a745;
}

.failure .result-icon {
  background: #dc3545;
}

.result-content {
  flex: 1;
}

.result-text {
  font-weight: 600;
  color: #212529;
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
}

.result-details {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.roll-value {
  background: rgba(108, 117, 125, 0.1);
  color: #495057;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  border: 1px solid rgba(108, 117, 125, 0.3);
  font-size: 18px;
}

.vs-text {
  color: #6c757d;
  font-weight: 500;
}

.target-value {
  background: rgba(108, 117, 125, 0.1);
  color: #495057;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  border: 1px solid rgba(108, 117, 125, 0.3);
}

.result-status {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-success {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
}

.status-failure {
  background: linear-gradient(135deg, #dc3545, #e74c3c);
  color: white;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
}

/* Damage-related styles moved to plugin components (DamageCard.vue) */

/* Mobile responsiveness */
@media (max-width: 640px) {
  .result-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .result-details > * {
    margin-bottom: 2px;
  }
}
</style>