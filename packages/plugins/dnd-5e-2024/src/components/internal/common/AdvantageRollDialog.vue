<template>
  <div 
    v-if="modelValue" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="closeDialog"
  >
    <div class="bg-gray-800 rounded-lg shadow-xl p-4 max-w-md w-full mx-4">
      <!-- Dialog Header -->
      <div class="relative mb-6">
        <h2 class="text-xl font-bold text-green-600 text-center">
          {{ rollTitle }}
        </h2>
        <button 
          @click="closeDialog"
          class="absolute top-0 right-0 text-gray-400 hover:text-gray-200 text-xl font-bold"
        >
          ×
        </button>
      </div>

      <!-- Roll Formula -->
      <div class="text-center mb-4">
        <div class="text-lg font-mono text-gray-200">
          {{ rollPreview }}
        </div>
      </div>

      <!-- Roll Options -->
      <div class="space-y-4 mb-4">
        <!-- Roll Mode Buttons -->
        <div class="flex space-x-2">
          <button
            @click="advantageMode = 'disadvantage'"
            :class="['flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                     advantageMode === 'disadvantage' 
                       ? 'bg-red-600 text-white' 
                       : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
          >
            Disadvantage
          </button>
          <button
            @click="advantageMode = 'normal'"
            :class="['flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                     advantageMode === 'normal' 
                       ? 'bg-blue-600 text-white' 
                       : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
          >
            Normal
          </button>
          <button
            @click="advantageMode = 'advantage'"
            :class="['flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                     advantageMode === 'advantage' 
                       ? 'bg-green-600 text-white' 
                       : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
          >
            Advantage
          </button>
        </div>

        <!-- Inputs above action buttons -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="customModifier" class="block text-sm font-medium text-gray-200 mb-1">
              Custom Modifier
            </label>
            <input
              id="customModifier"
              v-model.number="customModifier"
              type="number"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label for="recipients" class="block text-sm font-medium text-gray-200 mb-1">
              Roll Visibility
            </label>
            <select
              id="recipients"
              v-model="recipients"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="public">Public (everyone can see)</option>
              <option value="private">Private (only you can see)</option>
              <option value="gm">GM Only (only GM can see)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          @click="handleRoll"
          class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
        >
          🎲 Roll
        </button>
        <button
          @click="closeDialog"
          class="flex-1 bg-gray-600 text-gray-100 py-2 px-4 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium"
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
  skill?: string;
  savingThrow?: string;
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
  skill?: string;
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
  if (props.savingThrow) {
    return `${props.savingThrow.charAt(0).toUpperCase()}${props.savingThrow.slice(1)} Saving Throw`;
  }
  if (props.skill) {
    const skillDisplay = props.skill.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    const abilityDisplay = props.ability.slice(0, 3).toUpperCase();
    return `${skillDisplay} (${abilityDisplay})`;
  }
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
    skill: props.skill,
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