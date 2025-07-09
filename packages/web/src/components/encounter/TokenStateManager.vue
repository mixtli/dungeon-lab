<template>
  <div v-if="visible && token" class="token-state-manager">
    <div class="header">
      <h3>{{ token.name }} - {{ managerTitle }}</h3>
      <button @click="$emit('close')" class="close-button">×</button>
    </div>
    
    <div class="content">
      <!-- Health Management -->
      <div v-if="mode === 'health'" class="health-section">
        <div class="current-health">
          <div class="health-display">
            <div class="health-bar">
              <div 
                class="health-fill"
                :style="{ width: healthPercentage + '%' }"
                :class="healthBarClass"
              ></div>
              <span class="health-text">
                {{ currentHP }} / {{ maxHP }}
              </span>
            </div>
          </div>
          
          <div class="health-controls">
            <div class="form-group">
              <label for="health-change">{{ action === 'damage' ? 'Damage' : 'Healing' }} Amount:</label>
              <input 
                id="health-change"
                type="number" 
                v-model="healthChange"
                :min="1"
                :max="action === 'damage' ? currentHP : (maxHP - currentHP)"
                class="number-input"
              />
            </div>
            
            <div class="form-group" v-if="action === 'heal'">
              <label class="checkbox-label">
                <input type="checkbox" v-model="isOverheal" />
                Allow overheal (temporary HP)
              </label>
            </div>
            
            <div class="preview" v-if="healthChange > 0">
              <div class="preview-text">
                New HP: {{ previewHP }} / {{ maxHP }}
                <span v-if="tempHP > 0" class="temp-hp">+{{ tempHP }} temp</span>
              </div>
            </div>
          </div>
          
          <div class="quick-actions">
            <h4>Quick Actions</h4>
            <div class="button-group">
              <button @click="setHealthChange(1)" class="quick-btn">1</button>
              <button @click="setHealthChange(5)" class="quick-btn">5</button>
              <button @click="setHealthChange(10)" class="quick-btn">10</button>
              <button @click="setHealthChange(Math.floor(maxHP / 4))" class="quick-btn">25%</button>
              <button @click="setHealthChange(Math.floor(maxHP / 2))" class="quick-btn">50%</button>
              <button v-if="action === 'damage'" @click="setHealthChange(currentHP)" class="quick-btn danger">
                Kill
              </button>
              <button v-if="action === 'heal'" @click="setHealthChange(maxHP - currentHP)" class="quick-btn">
                Full Heal
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Condition Management -->
      <div v-if="mode === 'conditions'" class="conditions-section">
        <div class="current-conditions">
          <h4>Current Conditions</h4>
          <div v-if="!token.conditions?.length" class="no-conditions">
            No conditions applied
          </div>
          <div v-else class="condition-list">
            <div 
              v-for="(condition, index) in token.conditions" 
              :key="index"
              class="condition-item"
            >
              <div class="condition-info">
                <span class="condition-name">{{ condition.name }}</span>
                <span v-if="condition.duration" class="condition-duration">
                  {{ condition.duration }} rounds
                </span>
                <!-- TODO: Update to use new data structure -->
                <!-- <p v-if="condition.description" class="condition-description">
                  {{ condition.description }}
                </p> -->
              </div>
              <button @click="removeCondition(condition.name)" class="remove-condition">×</button>
            </div>
          </div>
        </div>
        
        <div class="add-condition">
          <h4>Add Condition</h4>
          <div class="form-group">
            <label for="condition-select">Select Condition:</label>
            <select 
              id="condition-select" 
              v-model="selectedCondition"
              class="select-input"
            >
              <option disabled value="">Choose a condition...</option>
              <option v-for="condition in availableConditions" :key="condition.name" :value="condition">
                {{ condition.name }}
              </option>
            </select>
          </div>
          
          <div v-if="selectedCondition" class="condition-details">
            <div class="form-group">
              <label for="condition-duration">Duration (rounds, 0 = permanent):</label>
              <input 
                id="condition-duration"
                type="number" 
                v-model="conditionDuration"
                min="0"
                max="100"
                class="number-input"
              />
            </div>
            
            <div class="condition-preview">
              <h5>{{ selectedCondition.name }}</h5>
              <p>{{ selectedCondition.description }}</p>
            </div>
            
            <button @click="addCondition" class="add-btn">
              Add Condition
            </button>
          </div>
        </div>
      </div>
      
      <!-- Token Properties -->
      <div v-if="mode === 'properties'" class="properties-section">
        <div class="form-group">
          <label for="token-name">Token Name:</label>
          <input 
            id="token-name"
            type="text" 
            v-model="tokenProperties.name"
            class="text-input"
          />
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="tokenProperties.isVisible" />
            Visible to players
          </label>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="tokenProperties.isPlayerControlled" />
            Player controlled
          </label>
        </div>
        
        <div class="form-group">
          <label for="token-notes">Notes:</label>
          <textarea 
            id="token-notes"
            v-model="tokenProperties.notes"
            rows="3"
            class="textarea-input"
            placeholder="Add notes about this token..."
          ></textarea>
        </div>
      </div>
    </div>
    
    <div class="actions">
      <button @click="$emit('close')" class="cancel-button">Cancel</button>
      <button 
        @click="applyChanges" 
        :disabled="!hasChanges"
        class="apply-button"
      >
        Apply Changes
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';

interface Condition {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  duration?: number;
  source?: string;
}

interface Props {
  visible: boolean;
  token: Token | null;
  mode: 'health' | 'conditions' | 'properties';
  action?: 'damage' | 'heal';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  updateToken: [token: Token];
}>();

// Common D&D 5e conditions
const commonConditions = [
  { id: 'blinded', name: 'Blinded', description: 'A blinded creature cannot see and automatically fails any ability check that requires sight.' },
  { id: 'charmed', name: 'Charmed', description: 'A charmed creature cannot attack the charmer or target the charmer with harmful abilities or magical effects.' },
  { id: 'deafened', name: 'Deafened', description: 'A deafened creature cannot hear and automatically fails any ability check that requires hearing.' },
  { id: 'frightened', name: 'Frightened', description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.' },
  { id: 'grappled', name: 'Grappled', description: 'A grappled creature\'s speed becomes 0, and it cannot benefit from any bonus to its speed.' },
  { id: 'incapacitated', name: 'Incapacitated', description: 'An incapacitated creature cannot take actions or reactions.' },
  { id: 'invisible', name: 'Invisible', description: 'An invisible creature is impossible to see without the aid of magic or a special sense.' },
  { id: 'paralyzed', name: 'Paralyzed', description: 'A paralyzed creature is incapacitated and cannot move or speak.' },
  { id: 'petrified', name: 'Petrified', description: 'A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance.' },
  { id: 'poisoned', name: 'Poisoned', description: 'A poisoned creature has disadvantage on attack rolls and ability checks.' },
  { id: 'prone', name: 'Prone', description: 'A prone creature\'s only movement option is to crawl, unless it stands up and thereby ends the condition.' },
  { id: 'restrained', name: 'Restrained', description: 'A restrained creature\'s speed becomes 0, and it cannot benefit from any bonus to its speed.' },
  { id: 'stunned', name: 'Stunned', description: 'A stunned creature is incapacitated, cannot move, and can speak only falteringly.' },
  { id: 'unconscious', name: 'Unconscious', description: 'An unconscious creature is incapacitated, cannot move or speak, and is unaware of its surroundings.' }
];

// State
const healthChange = ref(0);
const isOverheal = ref(false);
const selectedCondition = ref<typeof commonConditions[0] | null>(null);
const conditionDuration = ref(0);
const tokenProperties = ref({
  name: '',
  isVisible: true,
  isPlayerControlled: false,
  notes: ''
});

// Computed
const managerTitle = computed(() => {
  switch (props.mode) {
    case 'health':
      return props.action === 'damage' ? 'Apply Damage' : 'Apply Healing';
    case 'conditions':
      return 'Manage Conditions';
    case 'properties':
      return 'Edit Properties';
    default:
      return 'Token Manager';
  }
});

// TODO: Update to use new data structure
// const currentHP = computed(() => props.token?.data?.stats?.hitPoints || 0);
// const maxHP = computed(() => props.token?.data?.stats?.maxHitPoints || 1);
// const tempHP = computed(() => props.token?.data?.stats?.temporaryHitPoints || 0);
const currentHP = computed(() => 0);
const maxHP = computed(() => 1);
const tempHP = computed(() => 0);

const healthPercentage = computed(() => {
  return Math.max(0, Math.round((currentHP.value / maxHP.value) * 100));
});

const healthBarClass = computed(() => {
  const percentage = healthPercentage.value;
  if (percentage <= 25) return 'critical';
  if (percentage <= 50) return 'low';
  return 'healthy';
});

const previewHP = computed(() => {
  if (!props.action || healthChange.value === 0) return currentHP.value;
  
  if (props.action === 'damage') {
    return Math.max(0, currentHP.value - healthChange.value);
  } else {
    const newHP = currentHP.value + healthChange.value;
    return isOverheal.value ? newHP : Math.min(maxHP.value, newHP);
  }
});

const availableConditions = computed(() => {
  if (!props.token) return commonConditions;
  
  const currentConditionIds = props.token.conditions?.map(c => c.name) || [];
  return commonConditions.filter(condition => !currentConditionIds.includes(condition.id));
});

const hasChanges = computed(() => {
  if (props.mode === 'health') {
    return healthChange.value > 0;
  }
  
  if (props.mode === 'properties') {
    if (!props.token) return false;
    
    return (
      tokenProperties.value.name !== props.token.name ||
      tokenProperties.value.isVisible !== props.token.isVisible ||
      tokenProperties.value.isPlayerControlled !== props.token.isPlayerControlled ||
      tokenProperties.value.notes !== (props.token.notes || '')
    );
  }
  
  return false;
});

// Methods
const setHealthChange = (amount: number) => {
  healthChange.value = amount;
};

const addCondition = () => {
  if (!selectedCondition.value || !props.token) return;
  
  const newCondition: Condition = {
    id: `${selectedCondition.value.id}-${Date.now()}`,
    name: selectedCondition.value.name,
    description: selectedCondition.value.description,
    duration: conditionDuration.value > 0 ? conditionDuration.value : undefined,
    source: 'manual'
  };
  
  const updatedToken = {
    ...props.token,
    conditions: [...(props.token.conditions || []), newCondition]
  };
  
  emit('updateToken', updatedToken);
  
  // Reset form
  selectedCondition.value = null;
  conditionDuration.value = 0;
};

const removeCondition = (conditionId: string) => {
  if (!props.token) return;
  
  const updatedToken = {
    ...props.token,
    conditions: props.token.conditions?.filter(c => c.name !== conditionId) || []
  };
  
  emit('updateToken', updatedToken);
};

const applyChanges = () => {
  if (!props.token || !hasChanges.value) return;
  
  let updatedToken = { ...props.token };
  
  if (props.mode === 'health' && healthChange.value > 0) {
    // TODO: Update to use new data structure
    // const newHP = previewHP.value;
    // const newTempHP = isOverheal.value && newHP > maxHP.value ? newHP - maxHP.value : 0;
    
    // TODO: Update to use new data structure  
    // updatedToken = {
    //   ...updatedToken,
    //   data: {
    //     ...updatedToken.data,
    //     stats: {
    //       ...updatedToken.data?.stats,
    //       hitPoints: Math.min(newHP, maxHP.value),
    //       temporaryHitPoints: newTempHP
    //     }
    //   }
    // };
  }
  
  if (props.mode === 'properties') {
    updatedToken = {
      ...updatedToken,
      name: tokenProperties.value.name,
      isVisible: tokenProperties.value.isVisible,
      isPlayerControlled: tokenProperties.value.isPlayerControlled,
      notes: tokenProperties.value.notes || undefined
    };
  }
  
  emit('updateToken', updatedToken);
  emit('close');
};

// Watch for token changes to update local state
watch(() => props.token, (newToken) => {
  if (newToken) {
    tokenProperties.value = {
      name: newToken.name,
      isVisible: newToken.isVisible,
      isPlayerControlled: newToken.isPlayerControlled,
      notes: newToken.notes || ''
    };
  }
  
  // Reset form when switching tokens
  healthChange.value = 0;
  isOverheal.value = false;
  selectedCondition.value = null;
  conditionDuration.value = 0;
}, { immediate: true });
</script>

<style scoped>
.token-state-manager {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700;
  @apply w-96 max-h-[600px] overflow-hidden flex flex-col;
}

.header {
  @apply flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700;
}

.header h3 {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.close-button {
  @apply text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold leading-none;
}

.content {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.form-group {
  @apply space-y-2;
}

.form-group label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.text-input,
.number-input,
.select-input,
.textarea-input {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.checkbox-label {
  @apply flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300;
}

.health-display {
  @apply mb-4;
}

.health-bar {
  @apply relative bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden;
}

.health-fill {
  @apply h-full transition-all duration-300;
}

.health-fill.healthy {
  @apply bg-green-500;
}

.health-fill.low {
  @apply bg-yellow-500;
}

.health-fill.critical {
  @apply bg-red-500;
}

.health-text {
  @apply absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900 dark:text-white;
}

.preview {
  @apply p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md;
}

.preview-text {
  @apply text-sm font-medium text-blue-900 dark:text-blue-200;
}

.temp-hp {
  @apply text-yellow-600 dark:text-yellow-400;
}

.quick-actions h4 {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300 mb-2;
}

.button-group {
  @apply flex flex-wrap gap-2;
}

.quick-btn {
  @apply px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
         border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600;
}

.quick-btn.danger {
  @apply bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600
         hover:bg-red-200 dark:hover:bg-red-900/40;
}

.no-conditions {
  @apply text-sm text-gray-500 dark:text-gray-400 italic p-4 text-center;
}

.condition-list {
  @apply space-y-2;
}

.condition-item {
  @apply flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md;
}

.condition-info {
  @apply flex-1;
}

.condition-name {
  @apply font-medium text-gray-900 dark:text-white;
}

.condition-duration {
  @apply ml-2 text-xs text-blue-600 dark:text-blue-400;
}

.condition-description {
  @apply text-sm text-gray-600 dark:text-gray-400 mt-1;
}

.remove-condition {
  @apply text-red-500 hover:text-red-700 font-bold ml-2;
}

.condition-preview {
  @apply p-3 bg-gray-50 dark:bg-gray-700 rounded-md;
}

.condition-preview h5 {
  @apply font-medium text-gray-900 dark:text-white;
}

.condition-preview p {
  @apply text-sm text-gray-600 dark:text-gray-400 mt-1;
}

.add-btn {
  @apply mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700
         focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2;
}

.actions {
  @apply flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700;
}

.cancel-button {
  @apply px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
         bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
         rounded-md hover:bg-gray-50 dark:hover:bg-gray-600;
}

.apply-button {
  @apply px-4 py-2 text-sm font-medium text-white bg-blue-600 
         border border-transparent rounded-md hover:bg-blue-700 
         disabled:opacity-50 disabled:cursor-not-allowed;
}
</style> 