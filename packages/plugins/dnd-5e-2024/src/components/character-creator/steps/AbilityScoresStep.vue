<template>
  <div class="ability-scores-step">
    <div class="step-header mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Assign Ability Scores</h2>
      <p class="text-gray-600 mt-2">
        Determine your character's six ability scores: Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma.
      </p>
    </div>

    <div class="ability-scores-content">
      <!-- Background Ability Score Selection -->
      <div v-if="backgroundAbilityChoices.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-3">Background Ability Score Bonuses</h3>
        <p class="text-blue-800 text-sm mb-4">
          Your {{ props.originData?.background?.name }} background lets you choose +2 and +1 bonuses from: 
          {{ backgroundAbilityChoices.map(choice => choice.charAt(0).toUpperCase() + choice.slice(1)).join(', ') }}
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-blue-900 mb-2">
              +2 Bonus
            </label>
            <MobileSelect
              :model-value="localData.backgroundChoice?.plus2 || null"
              :options="plus2Options"
              placeholder="Select ability for +2..."
              value-key="value"
              label-key="label"
              @update:model-value="handlePlus2Selection"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-blue-900 mb-2">
              +1 Bonus
            </label>
            <MobileSelect
              :model-value="localData.backgroundChoice?.plus1 || null"
              :options="plus1Options"
              placeholder="Select ability for +1..."
              value-key="value"
              label-key="label"
              @update:model-value="handlePlus1Selection"
            />
          </div>
        </div>
      </div>

      <!-- Method Selection -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-3">
          Score Generation Method
        </label>
        <div class="space-y-2">
          <label class="flex items-center">
            <input
              v-model="localData.method"
              type="radio"
              value="standard"
              class="mr-2"
              @change="updateAbilities"
            />
            <span class="text-sm">Standard Array (15, 14, 13, 12, 10, 8)</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.method"
              type="radio"
              value="pointbuy"
              class="mr-2"
              @change="updateAbilities"
            />
            <span class="text-sm">Point Buy (27 points to distribute)</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.method"
              type="radio"
              value="roll"
              class="mr-2"
              @change="updateAbilities"
            />
            <span class="text-sm">Roll 4d6 (drop lowest)</span>
          </label>
        </div>
      </div>

      <!-- Ability Score Assignment -->
      <div v-if="localData.method" class="space-y-6">
        <!-- Standard Array Instructions -->
        <div v-if="localData.method === 'standard'" class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 class="text-lg font-semibold text-green-900 mb-2">Standard Array</h3>
          <p class="text-green-800 text-sm mb-3">
            Assign these six scores to your abilities: <strong>15, 14, 13, 12, 10, 8</strong>
          </p>
          <div class="text-sm text-green-700">
            Click the dropdown next to each ability to assign a score.
          </div>
        </div>

        <!-- Dice Rolling Instructions -->
        <div v-if="localData.method === 'roll'" class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-semibold text-purple-900 mb-2">Roll 4d6 (Drop Lowest)</h3>
              <p class="text-purple-800 text-sm">
                Roll four 6-sided dice for each ability and drop the lowest die.
              </p>
            </div>
            <button
              @click="rollAllAbilities"
              :disabled="rollingInProgress"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon v-if="rollingInProgress" name="loading" class="w-4 h-4 mr-2 animate-spin" />
              {{ rollingInProgress ? 'Rolling...' : 'Roll All Abilities' }}
            </button>
          </div>
          <div v-if="lastRollDetails.length > 0" class="text-sm text-purple-700">
            <strong>Last rolls:</strong> {{ formatRollDetails() }}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Strength -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Strength
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ finalScores.strength }}
                <span class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.strength) >= 0 ? '+' : '' }}{{ getModifier(finalScores.strength) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('strength', -1)"
                  :disabled="(localData.strength || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.strength || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('strength', 1)"
                  :disabled="(localData.strength || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Standard Array Dropdown -->
              <div v-else-if="localData.method === 'standard'" class="flex-1">
                <MobileSelect
                  :model-value="localData.strength || null"
                  :options="availableStandardScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleStandardArraySelection('strength', value)"
                />
              </div>
              
              <!-- Roll Input -->
              <input
                v-else
                v-model.number="localData.strength"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
              />
              
              <div v-if="getBackgroundBonus('strength')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('strength') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.strength || '—') : (localData.strength || 10) }}{{ getBackgroundBonus('strength') ? ` + ${getBackgroundBonus('strength')} (bg)` : '' }}
            </div>
          </div>

          <!-- Dexterity -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Dexterity
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ finalScores.dexterity }}
                <span class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.dexterity) >= 0 ? '+' : '' }}{{ getModifier(finalScores.dexterity) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('dexterity', -1)"
                  :disabled="(localData.dexterity || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.dexterity || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('dexterity', 1)"
                  :disabled="(localData.dexterity || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Standard Array Dropdown -->
              <div v-else-if="localData.method === 'standard'" class="flex-1">
                <MobileSelect
                  :model-value="localData.dexterity || null"
                  :options="availableStandardScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleStandardArraySelection('dexterity', value)"
                />
              </div>
              
              <!-- Roll Input -->
              <input
                v-else
                v-model.number="localData.dexterity"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
              />
              
              <div v-if="getBackgroundBonus('dexterity')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('dexterity') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.dexterity || '—') : (localData.dexterity || 10) }}{{ getBackgroundBonus('dexterity') ? ` + ${getBackgroundBonus('dexterity')} (bg)` : '' }}
            </div>
          </div>

          <!-- Constitution -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Constitution
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ finalScores.constitution }}
                <span class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.constitution) >= 0 ? '+' : '' }}{{ getModifier(finalScores.constitution) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('constitution', -1)"
                  :disabled="(localData.constitution || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.constitution || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('constitution', 1)"
                  :disabled="(localData.constitution || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Standard Array Dropdown -->
              <div v-else-if="localData.method === 'standard'" class="flex-1">
                <MobileSelect
                  :model-value="localData.constitution || null"
                  :options="availableStandardScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleStandardArraySelection('constitution', value)"
                />
              </div>
              
              <!-- Roll Input -->
              <input
                v-else
                v-model.number="localData.constitution"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
              />
              
              <div v-if="getBackgroundBonus('constitution')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('constitution') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.constitution || '—') : (localData.constitution || 10) }}{{ getBackgroundBonus('constitution') ? ` + ${getBackgroundBonus('constitution')} (bg)` : '' }}
            </div>
          </div>

          <!-- Intelligence -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Intelligence
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ finalScores.intelligence }}
                <span class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.intelligence) >= 0 ? '+' : '' }}{{ getModifier(finalScores.intelligence) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('intelligence', -1)"
                  :disabled="(localData.intelligence || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.intelligence || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('intelligence', 1)"
                  :disabled="(localData.intelligence || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Standard Array Dropdown -->
              <div v-else-if="localData.method === 'standard'" class="flex-1">
                <MobileSelect
                  :model-value="localData.intelligence || null"
                  :options="availableStandardScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleStandardArraySelection('intelligence', value)"
                />
              </div>
              
              <!-- Roll Input -->
              <input
                v-else
                v-model.number="localData.intelligence"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
              />
              
              <div v-if="getBackgroundBonus('intelligence')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('intelligence') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.intelligence || '—') : (localData.intelligence || 10) }}{{ getBackgroundBonus('intelligence') ? ` + ${getBackgroundBonus('intelligence')} (bg)` : '' }}
            </div>
          </div>

          <!-- Wisdom -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Wisdom
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ finalScores.wisdom }}
                <span class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.wisdom) >= 0 ? '+' : '' }}{{ getModifier(finalScores.wisdom) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('wisdom', -1)"
                  :disabled="(localData.wisdom || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.wisdom || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('wisdom', 1)"
                  :disabled="(localData.wisdom || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Standard Array Dropdown -->
              <div v-else-if="localData.method === 'standard'" class="flex-1">
                <MobileSelect
                  :model-value="localData.wisdom || null"
                  :options="availableStandardScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleStandardArraySelection('wisdom', value)"
                />
              </div>
              
              <!-- Roll Input -->
              <input
                v-else
                v-model.number="localData.wisdom"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
              />
              
              <div v-if="getBackgroundBonus('wisdom')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('wisdom') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.wisdom || '—') : (localData.wisdom || 10) }}{{ getBackgroundBonus('wisdom') ? ` + ${getBackgroundBonus('wisdom')} (bg)` : '' }}
            </div>
          </div>

          <!-- Charisma -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Charisma
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ finalScores.charisma }}
                <span class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.charisma) >= 0 ? '+' : '' }}{{ getModifier(finalScores.charisma) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('charisma', -1)"
                  :disabled="(localData.charisma || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.charisma || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('charisma', 1)"
                  :disabled="(localData.charisma || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Standard Array Dropdown -->
              <div v-else-if="localData.method === 'standard'" class="flex-1">
                <MobileSelect
                  :model-value="localData.charisma || null"
                  :options="availableStandardScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleStandardArraySelection('charisma', value)"
                />
              </div>
              
              <!-- Roll Input -->
              <input
                v-else
                v-model.number="localData.charisma"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
              />
              
              <div v-if="getBackgroundBonus('charisma')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('charisma') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.charisma || '—') : (localData.charisma || 10) }}{{ getBackgroundBonus('charisma') ? ` + ${getBackgroundBonus('charisma')} (bg)` : '' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Points Remaining (Point Buy) -->
      <div v-if="localData.method === 'pointbuy'" class="mt-4 p-4 bg-blue-50 rounded-lg">
        <div class="text-sm text-blue-800">
          Points Remaining: {{ localData.pointsRemaining || 27 }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { AbilityScores, OriginSelection } from '../../../types/character-creation.mjs';
import Icon from '../../common/Icon.vue';
import MobileSelect from '../../common/MobileSelect.vue';

// Props
interface Props {
  modelValue: AbilityScores | null;
  originData?: OriginSelection | null;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'update:modelValue', value: AbilityScores): void;
  (e: 'validate'): void;
  (e: 'next'): void;
  (e: 'back'): void;
}

const emit = defineEmits<Emits>();

// Local reactive data
const localData = ref<Partial<AbilityScores>>({
  method: props.modelValue?.method || 'standard',
  pointsRemaining: props.modelValue?.pointsRemaining || 27,
  availableScores: props.modelValue?.availableScores || [15, 14, 13, 12, 10, 8],
  strength: props.modelValue?.strength || 10,
  dexterity: props.modelValue?.dexterity || 10,
  constitution: props.modelValue?.constitution || 10,
  intelligence: props.modelValue?.intelligence || 10,
  wisdom: props.modelValue?.wisdom || 10,
  charisma: props.modelValue?.charisma || 10,
  backgroundChoice: props.modelValue?.backgroundChoice || {
    plus2: null,
    plus1: null
  }
});

// Dice rolling state
const rollingInProgress = ref(false);
const lastRollDetails = ref<Array<{ability: string, rolls: number[], result: number}>>([]);

// Computed
const backgroundAbilityChoices = computed(() => {
  // For now, hardcode the common pattern from D&D 2024 backgrounds
  // In the future, this could be dynamic based on the background document
  // Most backgrounds allow choice from 3 mental or 3 physical abilities
  return props.originData?.background ? 
    ['intelligence', 'wisdom', 'charisma'] : 
    [];
});

const abilityOptions = computed(() => [
  { value: 'strength', label: 'Strength' },
  { value: 'dexterity', label: 'Dexterity' },
  { value: 'constitution', label: 'Constitution' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'charisma', label: 'Charisma' }
]);

const plus2Options = computed(() => {
  return abilityOptions.value.filter(option => 
    backgroundAbilityChoices.value.includes(option.value) &&
    option.value !== localData.value.backgroundChoice?.plus1
  );
});

const plus1Options = computed(() => {
  return abilityOptions.value.filter(option => 
    backgroundAbilityChoices.value.includes(option.value) &&
    option.value !== localData.value.backgroundChoice?.plus2
  );
});

// Standard Array options (dynamic based on what's already assigned)
const availableStandardScores = computed(() => {
  const standardArray = [15, 14, 13, 12, 10, 8];
  const assignedScores = [
    localData.value.strength,
    localData.value.dexterity,
    localData.value.constitution,
    localData.value.intelligence,
    localData.value.wisdom,
    localData.value.charisma
  ].filter(score => score !== undefined && score !== null) as number[];
  
  // Filter out already assigned scores
  const availableScores = standardArray.filter(score => !assignedScores.includes(score));
  
  return availableScores.map(score => ({
    value: score,
    label: score.toString()
  }));
});

// Calculate ability modifier from score
const getModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

// Calculate final scores with background bonuses
const finalScores = computed(() => {
  const base = localData.value;
  const bg = localData.value.backgroundChoice;
  
  // For standard array, use actual score or show placeholder
  const getBaseScore = (score: number | undefined): number => {
    if (localData.value.method === 'standard') {
      return score || 0; // Show 0 for unassigned in standard array
    }
    return score || 10; // Default 10 for other methods
  };
  
  return {
    strength: getBaseScore(base.strength) + (bg?.plus2 === 'strength' ? 2 : 0) + (bg?.plus1 === 'strength' ? 1 : 0),
    dexterity: getBaseScore(base.dexterity) + (bg?.plus2 === 'dexterity' ? 2 : 0) + (bg?.plus1 === 'dexterity' ? 1 : 0),
    constitution: getBaseScore(base.constitution) + (bg?.plus2 === 'constitution' ? 2 : 0) + (bg?.plus1 === 'constitution' ? 1 : 0),
    intelligence: getBaseScore(base.intelligence) + (bg?.plus2 === 'intelligence' ? 2 : 0) + (bg?.plus1 === 'intelligence' ? 1 : 0),
    wisdom: getBaseScore(base.wisdom) + (bg?.plus2 === 'wisdom' ? 2 : 0) + (bg?.plus1 === 'wisdom' ? 1 : 0),
    charisma: getBaseScore(base.charisma) + (bg?.plus2 === 'charisma' ? 2 : 0) + (bg?.plus1 === 'charisma' ? 1 : 0)
  };
});

const isValid = computed(() => {
  const hasMethod = !!localData.value.method;
  
  let hasScores = false;
  if (localData.value.method === 'standard') {
    // For standard array, all scores must be assigned (not undefined)
    hasScores = localData.value.strength !== undefined &&
                localData.value.dexterity !== undefined &&
                localData.value.constitution !== undefined &&
                localData.value.intelligence !== undefined &&
                localData.value.wisdom !== undefined &&
                localData.value.charisma !== undefined;
  } else {
    // For other methods, scores should be defined (even if 0)
    hasScores = localData.value.strength !== undefined &&
                localData.value.dexterity !== undefined &&
                localData.value.constitution !== undefined &&
                localData.value.intelligence !== undefined &&
                localData.value.wisdom !== undefined &&
                localData.value.charisma !== undefined;
  }
  
  // Must have background choices if background provides them
  const hasBackgroundChoices = backgroundAbilityChoices.value.length === 0 ||
                               (localData.value.backgroundChoice?.plus2 && localData.value.backgroundChoice?.plus1);
  
  return hasMethod && hasScores && hasBackgroundChoices;
});

// Methods
const getBackgroundBonus = (ability: string): number => {
  const bg = localData.value.backgroundChoice;
  if (bg?.plus2 === ability) return 2;
  if (bg?.plus1 === ability) return 1;
  return 0;
};

const handlePlus2Selection = (value: string | number | null) => {
  if (localData.value.backgroundChoice) {
    localData.value.backgroundChoice.plus2 = value as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' | null;
  }
  updateAbilities();
};

const handlePlus1Selection = (value: string | number | null) => {
  if (localData.value.backgroundChoice) {
    localData.value.backgroundChoice.plus1 = value as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' | null;
  }
  updateAbilities();
};

const adjustScore = (ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', change: number) => {
  const currentScore = localData.value[ability] || 8;
  const newScore = Math.max(8, Math.min(15, currentScore + change));
  
  // Only adjust if we have enough points (for increases) or if we're decreasing
  if (change > 0) {
    const costDifference = getPointCost(newScore) - getPointCost(currentScore);
    if (costDifference <= (localData.value.pointsRemaining || 0)) {
      localData.value[ability] = newScore;
    }
  } else {
    localData.value[ability] = newScore;
  }
  
  updateAbilities();
};

const handleStandardArraySelection = (ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', value: string | number | null) => {
  const score = value as number;
  
  // Assign the new score
  localData.value[ability] = score;
  
  // If we're reassigning a score that was previously used elsewhere, we need to clear that other assignment
  if (score !== null && score !== undefined) {
    const abilities: Array<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'> = 
      ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    
    // Find any other ability that has this same score and clear it
    abilities.forEach(otherAbility => {
      if (otherAbility !== ability && localData.value[otherAbility] === score) {
        localData.value[otherAbility] = undefined;
      }
    });
  }
  
  updateAbilities();
};

// Point buy cost calculation (D&D 2024 rules)
const getPointCost = (score: number): number => {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8; // 9=1, 10=2, 11=3, 12=4, 13=5
  if (score <= 15) return 5 + (score - 13) * 2; // 14=7, 15=9
  return 9; // Max at 15
};

const getTotalPointsSpent = (): number => {
  return getPointCost(localData.value.strength || 8) +
         getPointCost(localData.value.dexterity || 8) +
         getPointCost(localData.value.constitution || 8) +
         getPointCost(localData.value.intelligence || 8) +
         getPointCost(localData.value.wisdom || 8) +
         getPointCost(localData.value.charisma || 8);
};

const updateAbilities = () => {
  // Set default values based on method
  if (localData.value.method === 'standard') {
    localData.value.availableScores = [15, 14, 13, 12, 10, 8];
    localData.value.pointsRemaining = 0;
    
    // For standard array, clear scores when switching methods
    // Don't auto-assign, let user choose via dropdowns
  } else if (localData.value.method === 'pointbuy') {
    localData.value.availableScores = [];
    
    // For point buy, start all scores at 8 if not set
    if (localData.value.strength === undefined) localData.value.strength = 8;
    if (localData.value.dexterity === undefined) localData.value.dexterity = 8;
    if (localData.value.constitution === undefined) localData.value.constitution = 8;
    if (localData.value.intelligence === undefined) localData.value.intelligence = 8;
    if (localData.value.wisdom === undefined) localData.value.wisdom = 8;
    if (localData.value.charisma === undefined) localData.value.charisma = 8;
    
    // Calculate points remaining
    localData.value.pointsRemaining = 27 - getTotalPointsSpent();
  } else if (localData.value.method === 'roll') {
    localData.value.availableScores = [];
    localData.value.pointsRemaining = 0;
    // Don't auto-roll - let user click the button
  }

  if (isValid.value) {
    emit('update:modelValue', localData.value as AbilityScores);
  }
  
  emit('validate');
};

// Dice rolling methods
const rollD6 = (): number => {
  return Math.floor(Math.random() * 6) + 1;
};

const roll4d6DropLowest = (): {rolls: number[], result: number} => {
  const rolls = [rollD6(), rollD6(), rollD6(), rollD6()];
  rolls.sort((a, b) => b - a); // Sort descending
  const result = rolls[0] + rolls[1] + rolls[2]; // Take top 3
  return { rolls, result };
};

const rollAllAbilities = async () => {
  rollingInProgress.value = true;
  lastRollDetails.value = [];
  
  const abilities: Array<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'> = 
    ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  
  // Roll each ability with a slight delay for dramatic effect
  for (const ability of abilities) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const rollResult = roll4d6DropLowest();
    localData.value[ability] = rollResult.result;
    
    lastRollDetails.value.push({
      ability: ability.charAt(0).toUpperCase() + ability.slice(1),
      rolls: rollResult.rolls,
      result: rollResult.result
    });
  }
  
  rollingInProgress.value = false;
  updateAbilities();
};

const formatRollDetails = (): string => {
  return lastRollDetails.value.map(detail => 
    `${detail.ability}: [${detail.rolls.join(', ')}] = ${detail.result}`
  ).join(' | ');
};

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    localData.value = { ...newValue };
  }
}, { deep: true });

// Initialize with default values
if (!props.modelValue) {
  updateAbilities();
}
</script>

<style scoped>
.ability-scores-step {
  @apply space-y-6;
}

.step-header h2 {
  @apply text-2xl font-bold text-gray-900;
}

.step-header p {
  @apply text-gray-600 mt-2;
}

.ability-score-card {
  @apply transition-colors;
}

.ability-score-card:hover {
  @apply bg-gray-50;
}

/* Mobile-responsive grid adjustments */
@media (max-width: 768px) {
  .grid.lg\\:grid-cols-3 {
    @apply grid-cols-1;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .grid.lg\\:grid-cols-3 {
    @apply grid-cols-2;
  }
}

/* Enhanced focus states for accessibility */
input[type="number"]:focus {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* Better radio button styling */
input[type="radio"] {
  @apply w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500;
}

@media (max-width: 640px) {
  input[type="radio"] {
    @apply w-5 h-5;
  }
}
</style>