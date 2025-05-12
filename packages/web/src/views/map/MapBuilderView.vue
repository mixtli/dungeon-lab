<script setup lang="ts">
import { ref, reactive, onUnmounted, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import MapDescriptionInput from '../../components/map/MapDescriptionInput.vue';
import MapEditInput from '../../components/map/MapEditInput.vue';
import MapGenerationProgress from '../../components/map/MapGenerationProgress.vue';
import { useWorkflowProgress } from '../../composables/useWorkflowProgress.mjs';
import { useSocketStore } from '../../stores/socket.store.mts';
import type { MapGenerationResponse, MapEditResponse } from '@dungeon-lab/shared/types/socket/index.mjs';

const router = useRouter();
const socketStore = useSocketStore();

// Flow ID for tracking progress
const flowRunId = ref('');

// Map description
const description = ref('');
const descriptionError = ref('');

// For map editing
const editPrompt = ref('');
const isEditing = ref(false);
const editStatus = ref('');
const editError = ref('');

// Use the workflow progress composable for map generation and editing
const {
  progress: generationProgress,
  startTime: generationStartTime,
  isComplete: generationComplete,
  reset: resetGenerationProgress
} = useWorkflowProgress('map');

// Use a separate progress tracker for edit operations
const {
  progress: editProgress,
  startTime: editStartTime,
  isComplete: editComplete,
  reset: resetEditProgress
} = useWorkflowProgress('map-edit');

// Status message for the workflow
const statusMessage = ref('');

// Preview image
const previewImage = ref('');
const previewReady = ref(false);
const originalImage = ref(''); // Store the original image for comparison

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

// Function to set up socket event listeners
function setupSocketListeners() {
  if (!socketStore.socket) {
    console.error('Socket not initialized, cannot set up listeners');
    return;
  }

  // Clean up any existing listeners first to prevent duplicates
  cleanupSocketListeners();

  console.log('Setting up socket event listeners for map generation and editing');

  // Listen for map generation progress updates
  socketStore.socket.on('workflow:progress:generate-map', (payload) => {
    console.log('Received workflow progress update:', payload);

    // Extract the flow run ID from the payload
    const receivedFlowRunId = payload.flowRun;

    if (receivedFlowRunId === flowRunId.value) {
      // Use optional chaining and type assertion to safely access message
      statusMessage.value = (payload as any).message || payload.status || 'Processing';
      generationProgress.value = payload.progress;

      // If we get image URL in metadata, update the preview
      if (payload.metadata && typeof payload.metadata === 'object' && 'imageUrl' in payload.metadata && typeof payload.metadata.imageUrl === 'string') {
        previewImage.value = payload.metadata.imageUrl;
        previewReady.value = true;
      }
    }
  });

  // Listen for map generation state updates
  socketStore.socket.on('workflow:state:generate-map', (payload) => {
    console.log('Received workflow state update:', payload);

    // Extract the flow run ID from the payload
    const receivedFlowRunId = payload.flowRun;

    if (receivedFlowRunId === flowRunId.value) {
      if (payload.state === 'COMPLETED' || payload.state === 'Completed') {
        console.log('Workflow completed', payload);
        statusMessage.value = 'Map Generation Complete';
        generationProgress.value = 100;

        // If we have a result with an image URL, update the preview
        if (payload.result && typeof payload.result === 'object' && 'image_url' in payload.result && typeof payload.result.image_url === 'string') {
          previewImage.value = payload.result.image_url;
          originalImage.value = payload.result.image_url; // Save original image
          previewReady.value = true;
        }

        // If we have a mapId in the result, store it for editor access
        if (payload.result && typeof payload.result === 'object' && 'mapId' in payload.result && typeof payload.result.mapId === 'string') {
          localStorage.setItem('lastGeneratedMapId', payload.result.mapId);
        }
      }
    }
  });

  // Listen for map edit progress updates
  socketStore.socket.on('workflow:progress:edit-map', (payload) => {
    console.log('Received map edit progress update:', payload);

    // Extract the flow run ID from the payload
    const receivedFlowRunId = payload.flowRun;

    if (receivedFlowRunId === flowRunId.value) {
      // Use optional chaining and type assertion to safely access message
      editStatus.value = (payload as any).message || payload.status || 'Processing Edit';
      editProgress.value = payload.progress;

      // If we get image URL in metadata, update the preview
      if (payload.metadata && typeof payload.metadata === 'object' && 'imageUrl' in payload.metadata && typeof payload.metadata.imageUrl === 'string') {
        previewImage.value = payload.metadata.imageUrl;
        previewReady.value = true;
      }
    }
  });

  // Listen for map edit state updates
  socketStore.socket.on('workflow:state:edit-map', (payload) => {
    console.log('Received map edit state update:', payload);

    // Extract the flow run ID from the payload
    const receivedFlowRunId = payload.flowRun;

    if (receivedFlowRunId === flowRunId.value) {
      // Always show the current state in the UI
      editStatus.value = `Map Edit: ${payload.state}`;

      if (payload.state === 'COMPLETED' || payload.state === 'Completed') {
        console.log('Map edit workflow completed', payload);
        editStatus.value = 'Map Edit Complete';
        editProgress.value = 100;
        resetEditProgress();
        editProgress.value = 100;
        isEditing.value = false;

        // If we have a result with an image URL, update the preview
        if (payload.result && typeof payload.result === 'object' && 'image_url' in payload.result && typeof payload.result.image_url === 'string') {
          previewImage.value = payload.result.image_url;
          previewReady.value = true;
        }

        // If we have a mapId in the result, store it for editor access
        if (payload.result && typeof payload.result === 'object' && 'mapId' in payload.result && typeof payload.result.mapId === 'string') {
          localStorage.setItem('lastGeneratedMapId', payload.result.mapId);
        }
      } else if (['FAILED', 'Failed', 'CRASHED', 'Crashed', 'ERROR', 'Error'].includes(payload.state)) {
        // Handle all failure states consistently
        console.log('Map edit workflow failed with state:', payload.state);
        isEditing.value = false;

        // Extract error message from result if available
        let errorMessage = 'Map Edit Failed';
        if (payload.result && typeof payload.result === 'object') {
          if ('error' in payload.result) {
            errorMessage = String(payload.result.error);
          } else if ('message' in payload.result) {
            errorMessage = String(payload.result.message);
          }
        }

        // Set error state with clear message including the state
        editError.value = `${errorMessage} (State: ${payload.state})`;
        editStatus.value = `Edit Failed: ${payload.state}`;
        resetEditProgress();
        editProgress.value = 100;
      }
    }
  });
}

// Function to clean up socket listeners
function cleanupSocketListeners() {
  if (!socketStore.socket) return;

  console.log('Removing socket event listeners');
  socketStore.socket.off('workflow:progress:generate-map');
  socketStore.socket.off('workflow:state:generate-map');
  socketStore.socket.off('workflow:progress:edit-map');
  socketStore.socket.off('workflow:state:edit-map');
}

// Setup socket event listeners when component is mounted
onMounted(() => {
  // If socket is already connected, set up listeners immediately
  if (socketStore.socket && socketStore.connected) {
    setupSocketListeners();
  }

  // Watch for socket connection changes and reattach listeners if needed
  watch(() => socketStore.connected, (isConnected) => {
    if (isConnected) {
      console.log('Socket reconnected, reattaching event listeners after short delay');
      // Add a small delay to ensure the socket is fully ready
      setTimeout(() => {
        setupSocketListeners();
      }, 500);
    } else {
      console.log('Socket disconnected, cleaning up event listeners');
      cleanupSocketListeners();
    }
  });
});

// Clean up socket listeners on unmount
onUnmounted(() => {
  cleanupSocketListeners();
});

// Map generation function using socket.io
const generateMap = async () => {
  if (!description.value.trim()) {
    descriptionError.value = 'Please provide a description of your map';
    return;
  }

  // Check socket connection and try to reconnect if necessary
  if (!socketStore.socket || !socketStore.connected) {
    console.log('Socket not connected, attempting to reconnect...');
    try {
      await socketStore.initSocket();

      // Reattach event listeners after reconnection
      if (socketStore.connected) {
        setupSocketListeners();
      } else {
        descriptionError.value = 'Unable to connect to server. Please try again later.';
        return;
      }
    } catch (error) {
      descriptionError.value = 'Failed to connect to server. Please try again later.';
      console.error('Socket reconnection error:', error);
      return;
    }
  }

  try {
    resetGenerationProgress();
    descriptionError.value = '';
    statusMessage.value = 'Map Generation Started';

    // Request map generation via socket - add a safety check for socket
    if (!socketStore.socket) {
      descriptionError.value = 'Socket connection not available';
      return;
    }

    socketStore.socket.emit('map:generate', {
      description: description.value,
      parameters
    }, (response: MapGenerationResponse) => {
      if (response.success) {
        flowRunId.value = response.flowRunId;
        console.log('Map generation started with flow run ID:', flowRunId.value);
      } else {
        statusMessage.value = response.error || 'Failed to start map generation';
        throw new Error(response.error || 'Failed to start map generation');
      }
    });

  } catch (error) {
    descriptionError.value = 'An error occurred during map generation';
    console.error('Map generation error:', error);
  }
};

// Function to edit the map based on prompt
const editMap = async () => {
  if (!editPrompt.value.trim() || !previewImage.value) {
    return;
  }

  try {
    isEditing.value = true;
    resetEditProgress();
    editError.value = '';
    editStatus.value = 'Preparing Map Edit';

    // Store the original image for comparison
    if (!originalImage.value) {
      originalImage.value = previewImage.value;
    }

    // Check socket connection
    if (!socketStore.socket || !socketStore.connected) {
      console.log('Socket not connected, attempting to reconnect...');
      try {
        await socketStore.initSocket();
        setupSocketListeners();
      } catch (error) {
        throw new Error('Failed to connect to server');
      }
    }

    // Request map edit via socket
    if (!socketStore.socket) {
      throw new Error('Socket connection not available');
    }

    socketStore.socket.emit('map:edit', {
      originalImageUrl: previewImage.value,
      editPrompt: editPrompt.value,
      parameters
    }, (response: MapEditResponse) => {
      if (response.success) {
        flowRunId.value = response.flowRunId;
        editStatus.value = 'Applying Map Edits';
        console.log('Map edit started with flow run ID:', flowRunId.value);
      } else {
        editStatus.value = response.error || 'Failed to edit map';
        editError.value = response.error || 'Failed to edit map';
        isEditing.value = false;
        throw new Error(response.error || 'Failed to edit map');
      }
    });
  } catch (error) {
    editStatus.value = 'An error occurred during map editing';
    editError.value = 'An error occurred during map editing';
    console.error('Map editing error:', error);
    isEditing.value = false;
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

// Function to reset edit state and return to original image
const cancelEdit = () => {
  if (originalImage.value) {
    previewImage.value = originalImage.value;
  }
  editPrompt.value = '';
  isEditing.value = false;
  editError.value = '';
  editStatus.value = '';
  resetEditProgress();
};
</script>

<template>
  <div class="p-6">
    <div class="flex items-center mb-6">
      <button @click="router.back()"
        class="flex items-center px-4 py-2 mr-4 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
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
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ descriptionError }}</p>
            </div>
          </div>
        </div>

        <!-- Status Message Display -->
        <div v-if="statusMessage" class="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <!-- Info icon -->
              <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-blue-700">{{ statusMessage }}</p>
            </div>
          </div>
        </div>

        <!-- Map Generation Progress Tracker -->
        <MapGenerationProgress v-if="generationProgress > 0" :step="statusMessage" :progress="generationProgress"
          :start-time="generationStartTime" />

        <!-- Map Description Input Component -->
        <MapDescriptionInput v-model="description" :error="descriptionError"
          placeholder="Describe your map in detail..." @submit="generateMap" />

        <!-- Map Parameters -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-medium text-gray-800 mb-4">Map Parameters</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Map Width (Squares)
              </label>
              <input v-model="parameters.width" type="number" min="10" max="100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Map Height (Squares)
              </label>
              <input v-model="parameters.height" type="number" min="10" max="100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Art Style
              </label>
              <select v-model="parameters.style"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option v-for="option in styleOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Pixels Per Grid
              </label>
              <input v-model="parameters.pixelsPerGrid" type="number" min="50" max="200" step="10"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Map Name
            </label>
            <input v-model="parameters.name" type="text" placeholder="Enter a name for your map"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <!-- Generate Button -->
        <div class="flex justify-end">
          <button @click="generateMap" :disabled="generationComplete || !description || isEditing"
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
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
            <img :src="previewImage" :alt="parameters.name" class="w-full h-auto" />
          </div>

          <div class="mt-4 flex justify-between">
            <button @click="regenerateMap" :disabled="generationComplete || isEditing"
              class="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50">
              Regenerate
            </button>

            <button @click="proceedToEdit" :disabled="isEditing"
              class="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50">
              Proceed to Editor
            </button>
          </div>
        </div>

        <!-- Map Editing Form -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-medium text-gray-800 mb-2">Edit Map</h2>
          <p class="text-sm text-gray-600 mb-4">Describe the changes you'd like to make to the map</p>

          <!-- Edit Status and Progress -->
          <div v-if="editStatus" class="mb-4 p-3 rounded-md border" :class="{
            'bg-blue-50 border-blue-200 text-blue-700': isEditing && !editError,
            'bg-green-50 border-green-200 text-green-700': editComplete && !editError,
            'bg-red-50 border-red-200 text-red-700': editError
          }">
            <div class="flex items-center">
              <!-- Loading spinner when editing and not in error state -->
              <svg v-if="isEditing && !editError" class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
              <!-- Success icon when complete and no error -->
              <svg v-else-if="editComplete && !editError" class="h-5 w-5 mr-2 text-green-500" fill="currentColor"
                viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"></path>
              </svg>
              <!-- Error icon for any error state -->
              <svg v-else-if="editError" class="h-5 w-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"></path>
              </svg>
              <!-- Display status message -->
              <span>{{ editStatus }}</span>
            </div>

            <!-- Display error message if present -->
            <div v-if="editError" class="mt-2 text-red-700 text-sm">
              {{ editError }}
            </div>

            <!-- Progress bar -->
            <div v-if="isEditing || editComplete" class="mt-2">
              <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="h-2.5 rounded-full"
                  :class="{ 'bg-blue-600': isEditing && !editError, 'bg-green-600': editComplete && !editError, 'bg-red-600': editError }"
                  :style="`width: ${editProgress}%`"></div>
              </div>
              <div class="flex justify-between mt-1 text-xs">
                <span>{{ editProgress }}%</span>
                <span v-if="editStartTime && isEditing">Started {{ new Date(editStartTime).toLocaleTimeString()
                }}</span>
              </div>
            </div>
          </div>

          <MapEditInput v-model="editPrompt" :disabled="isEditing"
            placeholder="e.g., Add a secret door in the south wall, make the north room larger..." @submit="editMap">
            <template #hint>
              Press Ctrl+Enter or Cmd+Enter to submit
            </template>

            <div class="flex space-x-2">
              <button v-if="isEditing" @click="cancelEdit"
                class="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
                Cancel
              </button>

              <button @click="editMap" :disabled="!editPrompt || isEditing"
                class="px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
                <span v-if="isEditing">Processing...</span>
                <span v-else>Apply Changes</span>
              </button>
            </div>
          </MapEditInput>
        </div>

        <div v-if="generationComplete" class="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
          <div class="flex">
            <div class="flex-shrink-0">
              <!-- Success icon -->
              <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"></path>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium">Map generation complete!</p>
              <p class="mt-1 text-sm">You can now proceed to the editor to refine your map or use the edit function to
                make changes.</p>
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