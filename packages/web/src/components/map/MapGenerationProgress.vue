<script setup lang="ts">
import { ref, watch } from 'vue';
import { ClockIcon } from '@heroicons/vue/24/solid';

interface Props {
  step: string; // This is now just the raw status message from the server
  progress: number;
  startTime?: Date | null;
}

const props = defineProps<Props>();

// Estimate the remaining time based on current progress and elapsed time
const estimatedTimeRemaining = ref<string | null>(null);
const startTimeMs = ref<number | null>(null);

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
        <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="flex justify-between mt-1">
        <span class="text-sm text-gray-500">{{ step }}</span>
        <span class="text-sm font-medium">{{ progress }}%</span>
      </div>
    </div>

    <!-- Estimated time remaining -->
    <div v-if="estimatedTimeRemaining" class="flex items-center mb-4 text-sm text-gray-600">
      <ClockIcon class="h-4 w-4 mr-1" />
      <span>Estimated time remaining: {{ estimatedTimeRemaining }}</span>
    </div>

    <!-- Status indicator -->
    <div class="flex items-center justify-center p-3 bg-blue-50 rounded-md">
      <div v-if="progress < 100" class="h-4 w-4 mr-2 rounded-full bg-blue-600 animate-pulse"></div>
      <div v-else class="h-4 w-4 mr-2 rounded-full bg-green-500"></div>
      <span class="text-sm" :class="{ 'text-blue-700': progress < 100, 'text-green-700': progress >= 100 }">
        {{ progress < 100 ? 'Processing: ' : 'Completed: ' }}{{ step }} </span>
    </div>
  </div>
</template>