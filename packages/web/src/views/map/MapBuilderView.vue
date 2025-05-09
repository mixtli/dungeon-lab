<script setup lang="ts">
import { ref, reactive,  onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import MapDescriptionInput from '../../components/map/MapDescriptionInput.vue';
import MapGenerationProgress from '../../components/map/MapGenerationProgress.vue';
import { useWorkflowProgress } from '../../composables/useWorkflowProgress.mjs';

const router = useRouter();

// Map description
const description = ref('');
const descriptionError = ref('');

// Use the workflow progress composable for map generation
const { 
  step: generationStep, 
  progress: generationProgress, 
  startTime: generationStartTime,
  isComplete: generationComplete,
  reset: resetGenerationProgress
} = useWorkflowProgress('map');

// Preview image
const previewImage = ref('');
const previewReady = ref(false);

// Map parameters
const parameters = reactive({
  width: 30,
  height: 30,
  style: 'fantasy',
  pixelsPerGrid: 70,
  name: 'AI Generated Map'
});

// Style options
const styleOptions = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'modern', label: 'Modern' },
  { value: 'medieval', label: 'Medieval' },
  { value: 'hand-drawn', label: 'Hand Drawn' },
  { value: 'realistic', label: 'Realistic' }
];

// Add back the timeouts array and clearAllTimeouts function for simulation
const timeouts: number[] = [];
function clearAllTimeouts() {
  timeouts.forEach(id => window.clearTimeout(id));
  timeouts.length = 0;
}

// Clean up timeouts on unmount
onUnmounted(() => {
  clearAllTimeouts();
});

// Map generation function with timeouts for simulation
const generateMap = async () => {
  if (!description.value.trim()) {
    descriptionError.value = 'Please provide a description of your map';
    return;
  }
  
  try {
    resetGenerationProgress();
    descriptionError.value = '';
    
    // In the actual implementation, this would call the backend API
    // For now, we'll simulate the generation process
    
    // Step 1: Analyze description
    generationStep.value = 'analyzing';
    generationProgress.value = 10;
    
    const timeout1 = window.setTimeout(async () => {
      // Step 2: Generate image
      generationStep.value = 'generating';
      generationProgress.value = 30;
      
      const timeout2 = window.setTimeout(() => {
        // Simulate progress updates
        generationProgress.value = 60;
        
        const timeout3 = window.setTimeout(() => {
          // Simulate preview image (would come from API)
          previewImage.value = 'https://via.placeholder.com/800x600/e6f0ff/0055cc?text=AI+Generated+Map';
          previewReady.value = true;
          
          // Step 3: Complete
          generationStep.value = 'complete';
          generationProgress.value = 100;
        }, 2000);
        
        timeouts.push(timeout3);
      }, 2000);
      
      timeouts.push(timeout2);
    }, 1000);
    
    timeouts.push(timeout1);
    
    // In a real implementation, we would call the backend API:
    /*
    const response = await fetch('/api/maps/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: description.value,
        parameters
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate map');
    }
    
    sessionId.value = data.sessionId;
    */
    
  } catch (error) {
    descriptionError.value = 'An error occurred during map generation';
    console.error('Map generation error:', error);
  }
};

// Function to regenerate the map with changes
const regenerateMap = async () => {
  // This would send the previous image along with the new description
  // to generate changes based on the existing map
  resetGenerationProgress();
  
  // For now, just call the same generateMap function
  await generateMap();
};

// Function to proceed to edit the generated map
const proceedToEdit = () => {
  // In the real implementation, this would save the generated map and proceed to the editor
  router.push({ 
    name: 'map-edit', 
    params: { 
      id: 'new' // This would be the actual ID from the server
    } 
  });
};
</script>

<template>
  <div class="p-6">
    <div class="flex items-center mb-6">
      <button
        @click="router.back()"
        class="flex items-center px-4 py-2 mr-4 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <ArrowLeftIcon class="h-5 w-5 mr-1" />
        Back
      </button>
      <h1 class="text-2xl font-bold">AI Map Builder</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left Column: Input Form -->
      <div class="space-y-6">
        <div v-if="descriptionError" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <!-- Error icon -->
              <svg
                class="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ descriptionError }}</p>
            </div>
          </div>
        </div>

        <!-- Map Generation Progress Tracker -->
        <MapGenerationProgress
          v-if="generationComplete || previewReady"
          :step="generationStep"
          :progress="generationProgress"
          :start-time="generationStartTime"
        />

        <!-- Map Description Input Component -->
        <MapDescriptionInput
          v-model="description"
          :error="descriptionError"
          placeholder="Describe your map in detail..."
          @submit="generateMap"
        />

        <!-- Map Parameters -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-medium text-gray-800 mb-4">Map Parameters</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Map Width (Squares)
              </label>
              <input
                v-model="parameters.width"
                type="number"
                min="10"
                max="100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Map Height (Squares)
              </label>
              <input
                v-model="parameters.height"
                type="number"
                min="10"
                max="100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Art Style
              </label>
              <select
                v-model="parameters.style"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="option in styleOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Pixels Per Grid
              </label>
              <input
                v-model="parameters.pixelsPerGrid"
                type="number"
                min="50"
                max="200"
                step="10"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Map Name
            </label>
            <input
              v-model="parameters.name"
              type="text"
              placeholder="Enter a name for your map"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <!-- Generate Button -->
        <div class="flex justify-end">
          <button
            @click="generateMap"
            :disabled="generationComplete || !description"
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="generationComplete">
              Regenerate Map
            </span>
            <span v-else>
              Generate Map
            </span>
          </button>
        </div>
      </div>

      <!-- Right Column: Preview & Results -->
      <div v-if="previewReady" class="space-y-6">
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-medium text-gray-800 mb-2">Preview</h2>
          
          <div class="relative rounded-lg overflow-hidden">
            <img 
              :src="previewImage" 
              :alt="parameters.name"
              class="w-full h-auto"
            />
          </div>
          
          <div class="mt-4 flex justify-between">
            <button
              @click="regenerateMap"
              :disabled="generationComplete"
              class="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Regenerate
            </button>
            
            <button
              @click="proceedToEdit"
              class="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Proceed to Editor
            </button>
          </div>
        </div>
        
        <div v-if="generationComplete" class="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
          <div class="flex">
            <div class="flex-shrink-0">
              <!-- Success icon -->
              <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium">Map generation complete!</p>
              <p class="mt-1 text-sm">You can now proceed to the editor to refine your map.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Any additional custom styles */
</style> 