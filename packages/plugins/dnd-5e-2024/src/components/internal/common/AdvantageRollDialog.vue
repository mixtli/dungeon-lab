<template>
  <div 
    v-if="modelValue" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="closeDialog"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
      <!-- Dialog Header -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">
          {{ rollTitle }}
        </h2>
        <button 
          @click="closeDialog"
          class="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>

      <!-- Form Fields -->
      <div class="space-y-4">
        <!-- Custom Modifier -->
        <div>
          <label for="customModifier" class="block text-sm font-medium text-gray-700 mb-1">
            Custom Modifier
          </label>
          <input
            id="customModifier"
            v-model.number="customModifier"
            type="number"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        <!-- Advantage Mode -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Roll Mode
          </label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                v-model="advantageMode"
                type="radio"
                value="disadvantage"
                class="mr-2 text-blue-600"
              />
              <span class="text-red-600">Disadvantage</span>
              <span class="text-xs text-gray-500 ml-2">(roll twice, take lower)</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="advantageMode"
                type="radio"
                value="normal"
                class="mr-2 text-blue-600"
              />
              <span class="text-gray-800">Normal</span>
              <span class="text-xs text-gray-500 ml-2">(single roll)</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="advantageMode"
                type="radio"
                value="advantage"
                class="mr-2 text-blue-600"
              />
              <span class="text-green-600">Advantage</span>
              <span class="text-xs text-gray-500 ml-2">(roll twice, take higher)</span>
            </label>
          </div>
        </div>

        <!-- Recipients -->
        <div>
          <label for="recipients" class="block text-sm font-medium text-gray-700 mb-1">
            Roll Visibility
          </label>
          <select
            id="recipients"
            v-model="recipients"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="public">Public (everyone can see)</option>
            <option value="private">Private (only you can see)</option>
            <option value="gm">GM Only (only GM can see)</option>
          </select>
        </div>

        <!-- Roll Preview -->
        <div class="bg-gray-50 p-3 rounded-md">
          <div class="text-sm text-gray-600">
            <strong>Rolling:</strong> {{ rollPreview }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Base modifier: {{ formatModifier(baseModifier) }}
            <span v-if="customModifier !== 0">
              | Custom: {{ formatModifier(customModifier) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3 mt-6">
        <button
          @click="handleRoll"
          class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          🎲 Roll
        </button>
        <button
          @click="closeDialog"
          class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Props
interface Props {
  modelValue: boolean;
  ability: string;
  baseModifier: number;
  characterName?: string;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  'update:modelValue': [value: boolean];
  'roll': [rollData: RollDialogData];
}

const emit = defineEmits<Emits>();

// Types
export interface RollDialogData {
  ability: string;
  customModifier: number;
  advantageMode: 'advantage' | 'normal' | 'disadvantage';
  recipients: 'public' | 'private' | 'gm';
  baseModifier: number;
}

// Reactive state
const customModifier = ref(0);
const advantageMode = ref<'advantage' | 'normal' | 'disadvantage'>('normal');
const recipients = ref<'public' | 'private' | 'gm'>('public');

// Computed properties
const rollTitle = computed(() => {
  return `${props.ability.charAt(0).toUpperCase()}${props.ability.slice(1)} Check`;
});

const totalModifier = computed(() => {
  return props.baseModifier + customModifier.value;
});

const rollPreview = computed(() => {
  const diceCount = advantageMode.value === 'normal' ? 1 : 2;
  const diceNotation = `${diceCount}d20`;
  const modifier = totalModifier.value;
  
  if (modifier === 0) {
    return diceNotation;
  }
  
  return `${diceNotation}${formatModifier(modifier)}`;
});

// Methods
const formatModifier = (value: number): string => {
  return value >= 0 ? `+${value}` : `${value}`;
};

const closeDialog = () => {
  emit('update:modelValue', false);
  // Reset form values when closing
  customModifier.value = 0;
  advantageMode.value = 'normal';
  recipients.value = 'public';
};

const handleRoll = () => {
  const rollData: RollDialogData = {
    ability: props.ability,
    customModifier: customModifier.value,
    advantageMode: advantageMode.value,
    recipients: recipients.value,
    baseModifier: props.baseModifier
  };
  
  emit('roll', rollData);
  closeDialog();
};
</script>

<style scoped>
/* Component-specific styles */
input[type="radio"]:checked {
  accent-color: #2563eb;
}

select:focus,
input:focus {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

/* Animation for modal appearance */
.fixed {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.bg-white {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>