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
          <router-link
            :to="{ name: 'encounter-run', params: { id: encounter.id }}"
            class="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
          >
            Run Encounter
          </router-link>
          <button 
            @click="toggleFullscreen"
            class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          >
            {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
          </button>
          <button 
            @click="$router.go(-1)"
            class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          >
            Back
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="encounter-content flex-1 relative" ref="mapContainerRef">
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
          @canvas-click="handleMapClick"
          @canvas-right-click="handleMapRightClick"
          class="w-full h-full"
        />
        
        <!-- Debug info for encounter -->
        <div v-if="encounter" class="absolute top-16 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-20">
          <div>Encounter ID: {{ encounter.id }}</div>
          <div>Map ID: {{ encounter.mapId || 'None' }}</div>
          <div>Tokens: {{ encounterTokens.length }}</div>
          <div>Selected Token: {{ selectedToken?.name || 'None' }}</div>
          <div>Socket: {{ isSocketConnected ? 'Connected' : 'Disconnected' }}</div>
          <button 
            @click="showTokenGenerator = true; lastClickPosition = { x: 100, y: 100, elevation: 0 }"
            class="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs"
          >
            Test Add Token
          </button>
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
            <div class="mt-2">
              <button 
                @click="deselectToken" 
                class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
              >
                Deselect
              </button>
            </div>
          </div>

          <!-- Token Context Menu -->
          <div
            v-if="contextMenuToken"
            class="absolute bg-white rounded-lg shadow-lg p-2 pointer-events-auto z-30"
            :style="tokenGeneratorStyle"
          >
            <div class="text-sm font-semibold border-b pb-1 mb-1">{{ contextMenuToken.name }}</div>
            <div class="space-y-1">
              <button 
                @click="handleTokenAction('move')" 
                class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
              >
                Move
              </button>
              <button 
                @click="handleTokenAction('select')" 
                class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
              >
                Select
              </button>
              <button 
                @click="handleTokenAction('remove')" 
                class="block w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Remove
              </button>
            </div>
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

          <!-- Map Context Menu -->
          <div
            v-if="showMapContextMenu"
            class="absolute bg-white rounded-lg shadow-lg p-2 pointer-events-auto z-30"
            :style="{
              top: `${contextMenuPosition.y}px`,
              left: `${contextMenuPosition.x}px`
            }"
          >
            <div class="text-sm font-semibold border-b pb-1 mb-1">Map Options</div>
            <div class="space-y-1">
              <button 
                @click="handleMapContextMenuAction('add-token')" 
                class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
              >
                Add Token
              </button>
              <button 
                @click="handleMapContextMenuAction('center-view')" 
                class="block w-full text-left px-2 py-1 text-sm hover:bg-blue-100 rounded"
              >
                Center View
              </button>
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

    <!-- Actor Token Generator -->
    <ActorTokenGenerator
      v-if="showTokenGenerator"
      :encounter-id="currentEncounterId"
      :actors="encounter?.participants || []"
      :initial-position="lastClickPosition"
      @tokens-created="handleTokensCreated"
      @cancel="showTokenGenerator = false"
      class="actor-token-generator-modal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.store.mjs';
import { useDeviceAdaptation } from '../../composables/useDeviceAdaptation.mjs';
import { useEncounterSocket } from '../../composables/useEncounterSocket.mjs';
import PixiMapViewer from './PixiMapViewer.vue';
import ActorTokenGenerator from './ActorTokenGenerator.vue';
import type { IToken } from '@dungeon-lab/shared/types/tokens.mjs';

// Props
interface Props {
  encounterId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  encounterId: undefined
});

// Composables
const route = useRoute();
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
  moveToken,
  deleteToken,
  createToken
} = useEncounterSocket(currentEncounterId.value);

// State
const loading = ref(true);
const error = ref<string | null>(null);
const isFullscreen = ref(false);
const selectedToken = ref<IToken | null>(null);
const showTokenGenerator = ref(false);

// Position tracking for token placement
const mapContainerRef = ref<HTMLElement | null>(null);
const lastClickPosition = ref<{ x: number; y: number; elevation: number } | undefined>(undefined);

// Viewport state
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

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    mapContainerRef.value?.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

// Event handlers - matching PixiMapViewer emit signatures
const handleTokenSelection = (tokenId: string) => {
  if (!encounter.value) return;
  
  // Find the token in the encounter
  selectedToken.value = encounter.value.tokens.find(t => t.id === tokenId) || null;
  
  // Close context menu if open
  contextMenuToken.value = null;
};

const handleTokenMoved = (tokenId: string, x: number, y: number, elevation: number = 0) => {
  if (!encounter.value) return;
  
  // Update token position in local state
  const token = encounter.value.tokens.find(t => t.id === tokenId);
  if (token) {
    token.position.x = x;
    token.position.y = y;
    token.position.elevation = elevation;
    
    // Send update via socket
    moveToken(tokenId, { x, y, elevation });
  }
};

const handleViewportChange = (newViewport: { x: number; y: number; scale: number }) => {
  viewport.value = {
    x: newViewport.x,
    y: newViewport.y,
    zoom: newViewport.scale
  };
};

// Handle right-click for context menu
const handleMapRightClick = (x: number, y: number) => {
  // Store click position for context menu
  contextMenuPosition.value = { 
    x: lastClientX.value,
    y: lastClientY.value 
  };
  
  // Close any existing context menu
  contextMenuToken.value = null;
  
  // Store position for token placement
  lastClickPosition.value = { x, y, elevation: 0 }; // Default elevation to 0
  
  // For desktop/tablet, show map context menu
  if (deviceConfig.value.type !== 'phone') {
    showMapContextMenu.value = true;
  }
};

// Close all menus when clicking on map
const handleMapClick = (x: number, y: number, event?: MouseEvent) => {
  // Store the click position for token placement
  lastClickPosition.value = { x, y, elevation: 0 }; // Default elevation to 0
  
  // Close all context menus
  showMapContextMenu.value = false;
  contextMenuToken.value = null;
  
  // Track mouse position for context menus if event is available
  if (event) {
    lastClientX.value = event.clientX;
    lastClientY.value = event.clientY;
  }
  
  // Optionally open token generator
  if (deviceConfig.value.type !== 'phone') {
    showTokenGenerator.value = true;
  }
};

// Track last mouse position for context menus
const lastClientX = ref(0);
const lastClientY = ref(0);
const showMapContextMenu = ref(false);

// Deselect the current token
const deselectToken = () => {
  selectedToken.value = null;
};

// Handle token action from context menu
const handleTokenAction = (action: string) => {
  if (!contextMenuToken.value) return;
  
  const tokenId = contextMenuToken.value.id;
  
  switch (action) {
    case 'move':
      // Set token as selected and enable movement
      handleTokenSelection(tokenId);
      break;
    case 'select':
      // Just select the token
      handleTokenSelection(tokenId);
      break;
    case 'remove':
      // Remove token from encounter
      if (confirm(`Remove token "${contextMenuToken.value.name}"?`)) {
        removeTokenFromEncounter(tokenId);
      }
      break;
  }
  
  // Close context menu
  contextMenuToken.value = null;
};

// Remove token from encounter
const removeTokenFromEncounter = (tokenId: string) => {
  if (!encounter.value) return;
  
  // Update local state
  encounter.value.tokens = encounter.value.tokens.filter(t => t.id !== tokenId);
  
  // If this was the selected token, deselect it
  if (selectedToken.value?.id === tokenId) {
    selectedToken.value = null;
  }
  
  // Send update via socket
  deleteToken(tokenId);
};

// Handle tokens created from ActorTokenGenerator
const handleTokensCreated = async (tokens: IToken[]) => {
  if (!encounter.value) return;
  
  try {
    // Add tokens to the local state first for immediate feedback
    encounter.value.tokens = [...encounter.value.tokens, ...tokens];
    
    // Create tokens on the server via socket
    for (const token of tokens) {
      createToken(token);
    }
    
    // Close the token generator
    showTokenGenerator.value = false;
  } catch (error) {
    console.error('Failed to create tokens:', error);
    // Remove the tokens from local state if server creation failed
    if (encounter.value) {
      encounter.value.tokens = encounter.value.tokens.filter(t => 
        !tokens.some(newToken => newToken.id === t.id)
      );
    }
  }
};

// Handle map context menu action
const handleMapContextMenuAction = (action: string) => {
  switch (action) {
    case 'add-token':
      console.log('[Debug] Add token action triggered');
      console.log('[Debug] Encounter data:', encounter.value);
      
      // Set lastClickPosition if needed and show token generator
      if (!lastClickPosition.value && encounter.value?.mapId) {
        // Default to center of map if no position is set
        lastClickPosition.value = { x: 100, y: 100, elevation: 0 };
      }
      
      showTokenGenerator.value = true;
      break;
    case 'center-view':
      // If we had a mapViewer ref, we could call centerOn here
      break;
  }
  
  // Close context menu
  showMapContextMenu.value = false;
};

// Properly position the token generator
const tokenGeneratorStyle = computed(() => {
  // Position next to the context menu or click position
  const x = contextMenuPosition.value.x + 10; 
  const y = contextMenuPosition.value.y;
  
  return {
    position: 'absolute' as const,
    top: `${y}px`,
    left: `${x}px`,
    zIndex: 1000
  };
});

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

// UI State
const contextMenuToken = ref<IToken | null>(null);
const contextMenuPosition = ref({ x: 0, y: 0 });
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