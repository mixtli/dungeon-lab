<template>
  <div class="character-details-step">
    <div class="step-header mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Character Details</h2>
      <p class="text-gray-600 mt-2">
        Add the finishing touches to your character with alignment, appearance, and personality traits.
      </p>
    </div>

    <div class="character-details-content space-y-6">

      <!-- Alignment -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-3">
          Alignment *
        </label>
        <div class="grid grid-cols-3 gap-2">
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="lawful-good"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Lawful Good</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="neutral-good"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Neutral Good</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="chaotic-good"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Chaotic Good</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="lawful-neutral"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Lawful Neutral</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="neutral"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">True Neutral</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="chaotic-neutral"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Chaotic Neutral</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="lawful-evil"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Lawful Evil</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="neutral-evil"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Neutral Evil</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.alignment"
              type="radio"
              value="chaotic-evil"
              class="mr-2"
              @change="updateDetails"
            />
            <span class="text-sm text-gray-900">Chaotic Evil</span>
          </label>
        </div>
      </div>

      <!-- Physical Characteristics -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Physical Characteristics</h3>
        
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <input
              v-model="localData.age"
              type="text"
              placeholder="25"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              @input="updateDetails"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Height
            </label>
            <input
              v-model="localData.height"
              type="text"
              placeholder="5'10&quot;"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              @input="updateDetails"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Weight
            </label>
            <input
              v-model="localData.weight"
              type="text"
              placeholder="160 lbs"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              @input="updateDetails"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Eyes
            </label>
            <input
              v-model="localData.eyes"
              type="text"
              placeholder="Brown"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              @input="updateDetails"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Hair
            </label>
            <input
              v-model="localData.hair"
              type="text"
              placeholder="Black"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              @input="updateDetails"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Skin
            </label>
            <input
              v-model="localData.skin"
              type="text"
              placeholder="Tan"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
              @input="updateDetails"
            />
          </div>
        </div>
      </div>

      <!-- Personality -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Personality</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Personality Traits
          </label>
          <textarea
            v-model="localData.personalityTraits"
            rows="2"
            placeholder="I am always polite and respectful..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            @input="updateDetails"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Ideals
          </label>
          <textarea
            v-model="localData.ideals"
            rows="2"
            placeholder="Freedom is the most precious gift..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            @input="updateDetails"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Bonds
          </label>
          <textarea
            v-model="localData.bonds"
            rows="2"
            placeholder="My family means everything to me..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            @input="updateDetails"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Flaws
          </label>
          <textarea
            v-model="localData.flaws"
            rows="2"
            placeholder="I have a weakness for fine wine..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            @input="updateDetails"
          />
        </div>
      </div>

      <!-- Additional Details -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Additional Details</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Backstory
          </label>
          <textarea
            v-model="localData.backstory"
            rows="4"
            placeholder="Tell your character's story..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            @input="updateDetails"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Allies & Organizations
          </label>
          <textarea
            v-model="localData.allies"
            rows="2"
            placeholder="Important contacts and group memberships..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            @input="updateDetails"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Additional Features & Traits
          </label>
          <textarea
            v-model="localData.additionalFeatures"
            rows="2"
            placeholder="Any other notable features..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2"
            @input="updateDetails"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { CharacterDetails } from '../../../../types/character-creation.mjs';

// Props
interface Props {
  modelValue: CharacterDetails | null;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'update:modelValue', value: CharacterDetails): void;
  (e: 'validate'): void;
  (e: 'next'): void;
  (e: 'back'): void;
}

const emit = defineEmits<Emits>();

// Local reactive data
const localData = ref<Partial<CharacterDetails>>({
  alignment: props.modelValue?.alignment || 'neutral',
  age: props.modelValue?.age || '',
  height: props.modelValue?.height || '',
  weight: props.modelValue?.weight || '',
  eyes: props.modelValue?.eyes || '',
  hair: props.modelValue?.hair || '',
  skin: props.modelValue?.skin || '',
  personalityTraits: props.modelValue?.personalityTraits || '',
  ideals: props.modelValue?.ideals || '',
  bonds: props.modelValue?.bonds || '',
  flaws: props.modelValue?.flaws || '',
  backstory: props.modelValue?.backstory || '',
  allies: props.modelValue?.allies || '',
  additionalFeatures: props.modelValue?.additionalFeatures || ''
});

// Computed
const isValid = computed(() => {
  return localData.value.alignment !== undefined;
});

// Methods
const updateDetails = () => {
  if (isValid.value) {
    emit('update:modelValue', localData.value as CharacterDetails);
  }
  
  emit('validate');
};

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    localData.value = { ...newValue };
  }
}, { deep: true });

// Initialize with default alignment
if (!props.modelValue?.alignment) {
  updateDetails();
}
</script>

<style scoped>
.character-details-step {
  @apply space-y-6;
}

.step-header h2 {
  @apply text-2xl font-bold text-gray-900;
}

.step-header p {
  @apply text-gray-600 mt-2;
}
</style>