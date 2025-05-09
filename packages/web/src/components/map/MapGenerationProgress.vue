<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CheckCircleIcon, ClockIcon } from '@heroicons/vue/24/solid';

interface Props {
  step: string;
  progress: number;
  startTime?: Date | null;
}

const props = defineProps<Props>();

// Estimate the remaining time based on current progress and elapsed time
const estimatedTimeRemaining = ref<string | null>(null);
const startTimeMs = ref<number | null>(null);

// Map the step to a more human-readable label and determine step order
const steps = [
  { key: 'analyzing', label: 'Analyzing Description', order: 1 },
  { key: 'generating', label: 'Generating Image', order: 2 },
  { key: 'regenerating', label: 'Regenerating Image', order: 2 },
  { key: 'feature-detection', label: 'Detecting Map Features', order: 3 },
  { key: 'walls', label: 'Detecting Walls', order: 3.1 },
  { key: 'portals', label: 'Detecting Doors & Portals', order: 3.2 },
  { key: 'lights', label: 'Detecting Light Sources', order: 3.3 },
  { key: 'complete', label: 'Map Generation Complete', order: 4 }
];

const currentStep = computed(() => {
  return steps.find(s => s.key === props.step) || { key: 'unknown', label: 'Processing', order: 0 };
});

// Calculate the steps that are completed, in progress, or pending
const stepsStatus = computed(() => {
  const currentOrder = currentStep.value.order;
  
  return steps.map(step => ({
    ...step,
    status: step.order < currentOrder ? 'completed' : 
            step.order === currentOrder ? 'in-progress' : 'pending'
  }));
});

// Visual steps to display (without sub-steps)
const visualSteps = computed(() => {
  return stepsStatus.value.filter(step => Math.floor(step.order) === step.order);
});

// Update the estimated time remaining
watch([() => props.progress, () => props.startTime], () => {
  if (props.startTime && props.progress > 0 && props.progress < 100) {
    const now = Date.now();
    
    if (!startTimeMs.value) {
      startTimeMs.value = props.startTime.getTime();
    }
    
    const elapsed = now - startTimeMs.value;
    const totalEstimated = elapsed / (props.progress / 100);
    const remaining = totalEstimated - elapsed;
    
    if (remaining > 0) {
      if (remaining < 60000) {
        estimatedTimeRemaining.value = `${Math.ceil(remaining / 1000)} seconds`;
      } else {
        estimatedTimeRemaining.value = `${Math.ceil(remaining / 60000)} minutes`;
      }
    } else {
      estimatedTimeRemaining.value = 'Finishing up...';
    }
  } else if (props.progress >= 100) {
    estimatedTimeRemaining.value = null;
  }
}, { immediate: true });
</script>

<template>
  <div class="mt-4 mb-6 bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-medium text-gray-800 mb-4">Map Generation Progress</h2>
    
    <!-- Progress bar -->
    <div class="mb-4">
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          class="bg-blue-600 h-2.5 rounded-full" 
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <div class="flex justify-between mt-1">
        <span class="text-sm text-gray-500">{{ currentStep.label }}</span>
        <span class="text-sm font-medium">{{ progress }}%</span>
      </div>
    </div>
    
    <!-- Estimated time remaining -->
    <div v-if="estimatedTimeRemaining" class="flex items-center mb-4 text-sm text-gray-600">
      <ClockIcon class="h-4 w-4 mr-1" />
      <span>Estimated time remaining: {{ estimatedTimeRemaining }}</span>
    </div>
    
    <!-- Steps list -->
    <div class="space-y-3">
      <div 
        v-for="step in visualSteps" 
        :key="step.key" 
        class="flex items-center"
        :class="{
          'text-gray-500': step.status === 'pending',
          'text-blue-600 font-medium': step.status === 'in-progress',
          'text-green-600': step.status === 'completed'
        }"
      >
        <CheckCircleIcon 
          v-if="step.status === 'completed'" 
          class="h-5 w-5 mr-2 text-green-500" 
        />
        <div 
          v-else-if="step.status === 'in-progress'" 
          class="h-5 w-5 mr-2 rounded-full bg-blue-600 animate-pulse"
        ></div>
        <div 
          v-else 
          class="h-5 w-5 mr-2 rounded-full border-2 border-gray-300"
        ></div>
        <span>{{ step.label }}</span>
      </div>
    </div>
  </div>
</template> 