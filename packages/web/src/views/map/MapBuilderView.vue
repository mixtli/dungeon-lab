<script setup lang="ts">
import { ref, reactive, onUnmounted, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import MapDescriptionInput from '../../components/map/MapDescriptionInput.vue';
import MapGenerationProgress from '../../components/map/MapGenerationProgress.vue';
import { useWorkflowProgress } from '../../composables/useWorkflowProgress.mjs';
import { useSocketStore } from '../../stores/socket.store.mts';
import type { MapGenerationResponse } from '@dungeon-lab/shared/types/socket/index.mjs';

const router = useRouter();
const socketStore = useSocketStore();

// Flow ID for tracking progress
const flowId = ref('');

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

// Setup socket event listeners for map generation progress
onMounted(() => {
  if (!socketStore.socket) {
    console.error('Socket not initialized');
    return;
  }
  
  // Listen for progress updates
  socketStore.socket.on('workflow:progress:map', ({ flow_id, step, progress, metadata }) => {
    if (flow_id === flowId.value) {
      generationStep.value = step;
      generationProgress.value = progress;
      
      // If we get image URL in metadata, update the preview
      if (metadata && typeof metadata === 'object' && 'imageUrl' in metadata && typeof metadata.imageUrl === 'string') {
        previewImage.value = metadata.imageUrl;
        previewReady.value = true;
      }
    }
  });
  
  // Listen for generation complete event
  socketStore.socket.on('map:generation:complete', ({ flowId: completedFlowId, mapId, imageUrl }) => {
    if (completedFlowId === flowId.value) {
      previewImage.value = imageUrl;
      previewReady.value = true;
      generationStep.value = 'complete';
      generationProgress.value = 100;
      
      // Store the map ID for the editor
      localStorage.setItem('lastGeneratedMapId', mapId);
    }
  });
});

// Clean up socket listeners on unmount
onUnmounted(() => {
  if (socketStore.socket) {
    socketStore.socket.off('workflow:progress:map');
    socketStore.socket.off('map:generation:complete');
  }
});

// Map generation function using socket.io
const generateMap = async () => {
  if (!description.value.trim()) {
    descriptionError.value = 'Please provide a description of your map';
    return;
  }
  
  if (!socketStore.socket || !socketStore.connected) {
    descriptionError.value = 'Not connected to server';
    return;
  }
  
  try {
    resetGenerationProgress();
    descriptionError.value = '';
    
    // Request map generation via socket
    socketStore.socket.emit('map:generate', {
      description: description.value,
      parameters
    }, (response: MapGenerationResponse) => {
      if (response.success) {
        flowId.value = response.flowId;
        console.log('Map generation started with flow ID:', flowId.value);
      } else {
        throw new Error(response.error || 'Failed to start map generation');
      }
    });
    
  } catch (error) {
    descriptionError.value = 'An error occurred during map generation';
    console.error('Map generation error:', error);
  }
};

// Function to regenerate the map with changes
const regenerateMap = async () => {
  resetGenerationProgress();
  await generateMap();
};

// Function to proceed to edit the generated map
const proceedToEdit = () => {
  const mapId = localStorage.getItem('lastGeneratedMapId');
  router.push({ 
    name: 'map-edit', 
    params: { 
      id: mapId || 'new'
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