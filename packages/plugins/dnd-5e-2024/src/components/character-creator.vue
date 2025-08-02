<template>
  <div class="dnd5e-character-creator">
    <!-- Progress indicator -->
    <div class="step-progress mb-6">
      <div class="flex justify-between items-center">
        <div
          v-for="(step, index) in FORM_STEPS"
          :key="step.id"
          class="flex items-center"
          :class="{ 'flex-1': index < FORM_STEPS.length - 1 }"
        >
          <div
            class="step-indicator"
            :class="{
              'step-completed': index < currentStep,
              'step-active': index === currentStep,
              'step-pending': index > currentStep
            }"
          >
            <div class="step-number">
              <Icon
                v-if="index < currentStep"
                name="check"
                class="w-4 h-4"
              />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-name">{{ step.name }}</span>
          </div>
          
          <!-- Progress line -->
          <div
            v-if="index < FORM_STEPS.length - 1"
            class="step-line"
            :class="{
              'step-line-completed': index < currentStep,
              'step-line-pending': index >= currentStep
            }"
          />
        </div>
      </div>
      
      <!-- Overall progress -->
      <div class="mt-4">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{{ completionProgress }}%</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${completionProgress}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Validation errors summary -->
    <div
      v-if="Object.keys(validationErrors).length > 0"
      class="validation-summary mb-6"
    >
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-red-800 mb-2">
          Please correct the following errors:
        </h3>
        <ul class="text-sm text-red-700 space-y-1">
          <li
            v-for="(errors, field) in validationErrors"
            :key="field"
            class="flex items-start"
          >
            <Icon name="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <strong class="capitalize">{{ field }}:</strong>
              <span v-for="(error, idx) in errors" :key="idx">
                {{ error }}{{ idx < errors.length - 1 ? ', ' : '' }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Dynamic step content -->
    <div class="step-content">
      <component
        :is="currentStepComponent"
        :model-value="getCurrentStepData()"
        :origin-data="FORM_STEPS[currentStep].id === 'abilities' ? {
          ...state.characterData.origin,
          background: backgroundDocument
        } : undefined"
        @update:model-value="handleStepDataUpdate"
        @validate="handleValidation"
        @next="handleNext"
        @back="handleBack"
      />
    </div>

    <!-- Navigation controls -->
    <div class="navigation-controls mt-8 flex justify-between">
      <button
        v-if="!isFirstStep"
        @click="handleBack"
        class="btn btn-secondary"
        type="button"
      >
        <Icon name="arrow-left" class="w-4 h-4 mr-2" />
        Back
      </button>
      
      <button
        v-else
        @click="handleBackToBasics"
        class="btn btn-secondary"
        type="button"
      >
        <Icon name="arrow-left" class="w-4 h-4 mr-2" />
        Back to Basics
      </button>

      <button
        @click="handleNext"
        :disabled="!canProceed"
        class="btn btn-primary"
        type="button"
      >
        {{ isLastStep ? 'Create Character' : 'Next' }}
        <Icon
          :name="isLastStep ? 'check' : 'arrow-right'"
          class="w-4 h-4 ml-2"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useCharacterCreation } from '../composables/useCharacterCreation.mjs';
import type { DndBackgroundDocument } from '../types/dnd/background.mjs';
import type { BasicCharacterInfo } from '../types/character-creation.mjs';
import Icon from './common/Icon.vue'; // Assuming there's a common Icon component
import ClassSelectionStep from './character-creator/steps/ClassSelectionStep.vue';
import OriginSelectionStep from './character-creator/steps/OriginSelectionStep.vue';
import AbilityScoresStep from './character-creator/steps/AbilityScoresStep.vue';
import CharacterDetailsStep from './character-creator/steps/CharacterDetailsStep.vue';

// Props
interface Props {
  basicInfo: BasicCharacterInfo;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

// Emits
interface Emits {
  (e: 'character-ready', data: any): void;
  (e: 'back-to-basics'): void;
  (e: 'validation-change', isValid: boolean): void;
}

const emit = defineEmits<Emits>();

// Use character creation composable
const {
  state,
  isFirstStep,
  isLastStep,
  canProceed,
  completionProgress,
  nextStep,
  previousStep,
  updateClassSelection,
  updateOriginSelection,
  updateAbilityScores,
  updateCharacterDetails,
  validateCurrentStep,
  validateCompleteForm,
  createCompleteCharacterData,
  fetchBackgrounds,
  FORM_STEPS
} = useCharacterCreation();

// Store full background document for ability scores step
const backgroundDocument = ref<DndBackgroundDocument | null>(null);

// Watch for origin changes to fetch background document
watch(() => state.characterData.origin?.background.id, async (backgroundId) => {
  if (backgroundId) {
    try {
      const backgrounds = await fetchBackgrounds();
      backgroundDocument.value = backgrounds.find(bg => bg.id === backgroundId) || null;
      console.log('Debug - Loaded background document:', backgroundDocument.value);
    } catch (error) {
      console.error('Failed to fetch background document:', error);
      backgroundDocument.value = null;
    }
  } else {
    backgroundDocument.value = null;
  }
}, { immediate: true });

// Computed properties
const currentStep = computed(() => state.currentStep);
const validationErrors = computed(() => state.validationErrors);

const currentStepComponent = computed(() => {
  const stepId = FORM_STEPS[state.currentStep].id;
  switch (stepId) {
    case 'class':
      return ClassSelectionStep;
    case 'origin':
      return OriginSelectionStep;
    case 'abilities':
      return AbilityScoresStep;
    case 'details':
      return CharacterDetailsStep;
    default:
      return ClassSelectionStep;
  }
});

// Methods
const getCurrentStepData = (): any => {
  const stepId = FORM_STEPS[state.currentStep].id;
  switch (stepId) {
    case 'class':
      return state.characterData.class;
    case 'origin':
      return state.characterData.origin;
    case 'abilities':
      return state.characterData.abilities;
    case 'details':
      return state.characterData.details;
    default:
      return null;
  }
};

const handleStepDataUpdate = (data: any) => {
  const stepId = FORM_STEPS[state.currentStep].id;
  
  switch (stepId) {
    case 'class':
      updateClassSelection(data);
      break;
    case 'origin':
      updateOriginSelection(data);
      break;
    case 'abilities':
      updateAbilityScores(data);
      break;
    case 'details':
      updateCharacterDetails(data);
      break;
  }
  
  // Emit validation change
  emit('validation-change', canProceed.value);
};

const handleValidation = () => {
  const isValid = validateCurrentStep();
  emit('validation-change', isValid);
};

const handleNext = () => {
  if (isLastStep.value) {
    // Final step - create character
    handleCreateCharacter();
  } else {
    // Move to next step
    const success = nextStep();
    if (!success) {
      console.warn('Cannot proceed to next step');
    }
  }
};

const handleBack = () => {
  const success = previousStep();
  if (!success) {
    console.warn('Cannot go back to previous step');
  }
};

const handleBackToBasics = () => {
  emit('back-to-basics');
};

const handleCreateCharacter = () => {
  try {
    if (!validateCompleteForm()) {
      console.error('Character data is not valid');
      return;
    }
    
    const completeCharacterData = createCompleteCharacterData(props.basicInfo);
    emit('character-ready', completeCharacterData);
  } catch (error) {
    console.error('Failed to create character:', error);
    // Could emit an error event or show user feedback
  }
};

// Lifecycle
onMounted(() => {
  // Validate initial state
  emit('validation-change', canProceed.value);
});

onUnmounted(() => {
  // Component cleanup - no state persistence to clear
});

// Watch for readonly prop changes
// If readonly, disable all form interactions
</script>

<style scoped>
.dnd5e-character-creator {
  @apply max-w-4xl mx-auto p-6;
}

/* Mobile-first responsive layout - remove margins on mobile */
@media (max-width: 768px) {
  .dnd5e-character-creator {
    @apply p-4 max-w-none mx-0;
  }
}

@media (max-width: 640px) {
  .dnd5e-character-creator {
    @apply p-2 max-w-none mx-0;
  }
}

/* Step progress styles */
.step-progress {
  @apply bg-white rounded-lg border border-gray-200 p-6;
}

@media (max-width: 768px) {
  .step-progress {
    @apply p-4 rounded-none border-x-0;
  }
}

@media (max-width: 640px) {
  .step-progress {
    @apply p-3 rounded-none border-x-0;
  }
}

.step-indicator {
  @apply flex flex-col items-center text-center min-w-0;
}

@media (max-width: 640px) {
  .step-indicator {
    @apply flex-row gap-2;
  }
}

.step-number {
  @apply w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 transition-colors;
}

@media (max-width: 640px) {
  .step-number {
    @apply w-8 h-8 mb-0 text-xs;
  }
}

.step-active .step-number {
  @apply bg-blue-600 text-white;
}

.step-completed .step-number {
  @apply bg-green-600 text-white;
}

.step-pending .step-number {
  @apply bg-gray-200 text-gray-600;
}

.step-name {
  @apply text-sm font-medium text-gray-700;
}

@media (max-width: 640px) {
  .step-name {
    @apply text-xs;
  }
}

.step-active .step-name {
  @apply text-blue-600;
}

.step-completed .step-name {
  @apply text-green-600;
}

.step-line {
  @apply flex-1 h-0.5 mx-4 transition-colors;
}

@media (max-width: 640px) {
  .step-line {
    @apply mx-2;
  }
}

.step-line-completed {
  @apply bg-green-600;
}

.step-line-pending {
  @apply bg-gray-200;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-2;
}

.progress-fill {
  @apply bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out;
}

/* Navigation controls */
.navigation-controls {
  @apply border-t border-gray-200 pt-6;
}

@media (max-width: 768px) {
  .navigation-controls {
    @apply pt-4;
  }
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center;
}

@media (max-width: 640px) {
  .btn {
    @apply px-3 py-3 text-sm;
  }
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.btn-outline {
  @apply border border-gray-300 text-gray-700 hover:bg-gray-50;
}

/* Step content */
.step-content {
  @apply bg-white rounded-lg border border-gray-200 p-6 min-h-96;
}

@media (max-width: 768px) {
  .step-content {
    @apply p-4 rounded-none border-x-0 min-h-80;
  }
}

@media (max-width: 640px) {
  .step-content {
    @apply p-3 rounded-none border-x-0 min-h-72;
  }
}

/* Validation summary */
.validation-summary {
  @apply rounded-lg;
}

@media (max-width: 768px) {
  .validation-summary {
    @apply rounded-none;
  }
}
</style>