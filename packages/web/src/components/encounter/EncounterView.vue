<template>
  <div class="encounter-container" :class="deviceClass">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center h-screen">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      <span class="ml-2">Loading encounter...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex justify-center items-center h-screen">
      <div class="text-red-500 text-center">
        <h2 class="text-xl font-bold mb-2">Error Loading Encounter</h2>
        <p>{{ error }}</p>
        <button 
          @click="retryLoad" 
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Main Encounter View -->
    <div v-else-if="encounter" class="encounter-view h-screen flex flex-col">
      <!-- Header -->
      <div class="encounter-header bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 class="text-xl font-bold">{{ encounter.name }}</h1>
          <p class="text-sm text-gray-300">Status: {{ encounter.status }}</p>
        </div>
        <div class="flex gap-2">
          <button 
            @click="toggleFullscreen"
            class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          >
            {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
          </button>
          <button 
            @click="goBack"
            class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          >
            Back
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="encounter-content flex-1 relative">
        <!-- Pixi Map Viewer -->
        <PixiMapViewer
          v-if="encounter.mapId"
          :map-id="encounter.mapId"
          :tokens="encounterTokens"
          :platform="deviceConfig.type"
          :show-debug-info="true"
          @token-selected="handleTokenSelection"
          @token-moved="handleTokenMoved"
          @viewport-changed="handleViewportChange"
          @map-clicked="handleMapClick"
          class="w-full h-full"
        />
        
        <!-- Debug info for encounter -->
        <div v-if="encounter" class="absolute top-16 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-20">
          <div>Encounter ID: {{ encounter.id }}</div>
          <div>Map ID: {{ encounter.mapId || 'None' }}</div>
          <div>Tokens: {{ encounterTokens.length }}</div>
          <div>Loading: {{ loading }}</div>
          <div>Error: {{ error || 'None' }}</div>
        </div>

        <!-- Fallback when no map -->
        <div v-else class="flex items-center justify-center h-full bg-gray-100">
          <div class="text-center text-gray-500">
            <h3 class="text-lg font-medium mb-2">No Map Assigned</h3>
            <p>This encounter doesn't have a map assigned yet.</p>
          </div>
        </div>

        <!-- UI Overlays (will be expanded in later tasks) -->
        <div class="encounter-overlays absolute inset-0 pointer-events-none">
          <!-- Selected Token Info -->
          <div 
            v-if="selectedToken" 
            class="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 pointer-events-auto"
            :class="{ 'hidden': deviceConfig.type === 'phone' }"
          >
            <h4 class="font-bold">{{ selectedToken.name }}</h4>
            <p class="text-sm text-gray-600">Position: {{ selectedToken.position.x }}, {{ selectedToken.position.y }}</p>
          </div>

          <!-- Connection Status -->
          <div 
            v-if="!isSocketConnected" 
            class="absolute top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded pointer-events-auto"
          >
            <span class="text-sm">⚠️ Disconnected - Changes may not sync</span>
          </div>

          <!-- Participants List (Desktop only) -->
          <div 
            v-if="deviceConfig.type === 'desktop' && encounterParticipants.length > 0"
            class="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 pointer-events-auto"
          >
            <h5 class="font-medium text-sm mb-2">Participants ({{ encounterParticipants.length }})</h5>
            <div class="space-y-1">
              <div 
                v-for="participant in encounterParticipants" 
                :key="participant"
                class="text-xs text-gray-600"
              >
                {{ participant }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Bottom Controls -->
      <div 
        v-if="deviceConfig.type === 'phone'"
        class="encounter-mobile-controls bg-gray-800 text-white p-2"
      >
        <div class="flex justify-between items-center">
          <div v-if="selectedToken" class="text-sm">
            <span class="font-medium">{{ selectedToken.name }}</span>
          </div>
          <div class="flex gap-2">
            <button class="px-2 py-1 bg-gray-600 rounded text-xs">
              Tokens
            </button>
            <button class="px-2 py-1 bg-gray-600 rounded text-xs">
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found State -->
    <div v-else class="flex justify-center items-center h-screen">
      <div class="text-center text-gray-500">
        <h2 class="text-xl font-bold mb-2">Encounter Not Found</h2>
        <p>The requested encounter could not be found.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.store.mjs';
import { useDeviceAdaptation } from '../../composables/useDeviceAdaptation.mjs';
import { useEncounterSocket } from '../../composables/useEncounterSocket.mjs';
import PixiMapViewer from './PixiMapViewer.vue';
import type { IToken } from '@dungeon-lab/shared/types/encounters.mjs';

// Props
interface Props {
  encounterId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  encounterId: undefined
});

// Composables
const route = useRoute();
const router = useRouter();
const encounterStore = useEncounterStore();
const { deviceConfig, deviceClass } = useDeviceAdaptation();

// Get encounter ID from props or route
const currentEncounterId = computed(() => 
  props.encounterId || (route.params.id as string)
);

const { 
  isJoined, 
  isConnected, 
  joinEncounter, 
  leaveEncounter,
  moveToken 
} = useEncounterSocket(currentEncounterId.value);

// State
const loading = ref(true);
const error = ref<string | null>(null);
const isFullscreen = ref(false);
const selectedToken = ref<IToken | null>(null);
const viewport = ref({
  x: 0,
  y: 0,
  zoom: 1
});

// Mock socket connection state (will be replaced with real socket integration)
const isSocketConnected = ref(true);
const encounterParticipants = ref<string[]>([]);

// Computed
const encounter = computed(() => encounterStore.currentEncounter);

// Convert encounter tokens to format expected by PixiMapViewer
const encounterTokens = computed(() => {
  if (!encounter.value?.tokens) return [];
  
  return encounter.value.tokens.map(token => ({
    id: token.id,
    name: token.name,
    imageUrl: token.imageUrl,
    size: token.size,
    encounterId: token.encounterId,
    position: {
      x: token.position.x,
      y: token.position.y,
      elevation: token.position.elevation
    },
    isVisible: token.isVisible,
    isPlayerControlled: token.isPlayerControlled,
    conditions: token.conditions,
    version: token.version,
    createdBy: token.createdBy,
    updatedBy: token.updatedBy,
    actorId: token.actorId,
    itemId: token.itemId,
    notes: token.notes,
    stats: token.stats
  }));
});

// Methods
const loadEncounter = async () => {
  if (!currentEncounterId.value) {
    error.value = 'No encounter ID provided';
    loading.value = false;
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    
    await encounterStore.fetchEncounter(currentEncounterId.value);
    
    if (!encounter.value) {
      error.value = 'Encounter not found';
      return;
    }
    
    // Join the encounter socket room
    if (isConnected.value) {
      await joinEncounter(currentEncounterId.value);
    }
    
  } catch (err) {
    console.error('Error loading encounter:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load encounter';
  } finally {
    loading.value = false;
  }
};

const retryLoad = () => {
  loadEncounter();
};

const goBack = () => {
  router.push({ 
    name: 'encounter-detail', 
    params: { id: route.params.id } 
  });
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  // TODO: Implement actual fullscreen API
};

// Event handlers - matching PixiMapViewer emit signatures
const handleTokenSelection = (tokenId: string) => {
  // Find the token by ID
  const token = encounterTokens.value.find(t => t.id === tokenId);
  selectedToken.value = token || null;
  console.log('Token selected:', tokenId, token);
};

const handleTokenMoved = (tokenId: string, x: number, y: number) => {
  console.log('Token moved:', { tokenId, x, y });
  
  // Update local state
  if (selectedToken.value?.id === tokenId) {
    selectedToken.value.position.x = x;
    selectedToken.value.position.y = y;
  }
  
  // Send movement to server via socket
  moveToken(tokenId, { x, y, elevation: 0 });
};

const handleViewportChange = (newViewport: { x: number; y: number; scale: number }) => {
  viewport.value = {
    x: newViewport.x,
    y: newViewport.y,
    zoom: newViewport.scale
  };
};

const handleMapClick = (x: number, y: number) => {
  console.log('Map clicked:', { x, y });
  // Clear selection when clicking empty space
  selectedToken.value = null;
};

// Lifecycle
onMounted(() => {
  loadEncounter();
});

onUnmounted(() => {
  if (isJoined.value) {
    leaveEncounter();
  }
});

// Watch for encounter ID changes
watch(currentEncounterId, (newId) => {
  if (newId) {
    loadEncounter();
  }
});

// Watch for socket connection changes
watch(isConnected, (connected) => {
  if (connected && currentEncounterId.value && !isJoined.value) {
    joinEncounter(currentEncounterId.value);
  }
});
</script>

<style scoped>
.encounter-container {
  @apply w-full h-screen overflow-hidden;
}

.encounter-view {
  @apply relative;
}

.encounter-overlays {
  z-index: 10;
}

/* Device-specific styles */
.device-phone .encounter-header {
  @apply p-2;
}

.device-phone .encounter-header h1 {
  @apply text-lg;
}

.device-tablet .encounter-overlays > div {
  @apply text-sm;
}

/* Touch-friendly sizing */
.touch-device button {
  @apply min-h-[44px] min-w-[44px];
}

.no-touch button {
  @apply min-h-[32px] min-w-[32px];
}

/* Reduced motion support */
.reduced-motion * {
  @apply transition-none;
}

.full-motion * {
  @apply transition-all duration-200;
}
</style> 