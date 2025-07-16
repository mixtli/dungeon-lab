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

    <!-- No Active Encounter State -->
    <div v-else-if="!isActiveEncounter" class="flex justify-center items-center h-screen">
      <div class="text-center text-gray-500">
        <h2 class="text-xl font-bold mb-2">No Active Encounter</h2>
        <p>The encounter is not currently active in this session.</p>
        <button
          v-if="isGameMaster"
          @click="startOrStopEncounter"
          class="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Start Encounter
        </button>
      </div>
    </div>
    <!-- Main Encounter View - Fullscreen with AppHeader -->
    <div v-else-if="encounter" class="encounter-view-fullscreen" :style="hudLayoutStyle">
        <!-- Main Content Area - Canvas -->
        <div class="encounter-content" ref="mapContainerRef">
        <!-- Pixi Map Viewer -->
        <PixiMapViewer
          v-if="encounter.mapId && !encounterStore.loading"
          :map-id="encounter.mapId"
          :tokens="encounterTokens"
          :platform="deviceConfig.type"
          :show-walls="showWalls"
          :show-objects="showObjects"
          :show-portals="showPortals"
          :show-lights="showLights"
          @token-selected="handleTokenSelection"
          @token-moved="handleTokenMoved"
          @viewport-changed="handleViewportChange"
          @canvas-click="handleMapClick"
          @canvas-right-click="handleMapRightClick"
          @mousemove="handleMouseMove"
          @show-token-context-menu="onShowTokenContextMenu"
          @show-encounter-context-menu="onShowEncounterContextMenu"
          class="w-full h-full"
        />
        
        <!-- Consolidated Debug Info -->
        <EncounterDebugInfo
          v-if="encounter"
          :visible="showDebugInfo"
          :encounter-info="{
            id: encounter.id,
            mapId: encounter.mapId,
            tokenCount: encounterTokens.length,
            selectedToken: selectedToken?.name,
            isConnected: isSocketConnected
          }"
          :viewport-info="{
            x: Math.round(viewport.x),
            y: Math.round(viewport.y),
            scale: Math.round(viewport.zoom * 100),
            platform: deviceConfig.type,
            mapName: encounter.mapId || 'None'
          }"
          :mouse-info="{
            screenX: Math.round(mousePosition.screenX),
            screenY: Math.round(mousePosition.screenY),
            worldX: Math.round(mousePosition.worldX),
            worldY: Math.round(mousePosition.worldY)
          }"
        />

        <!-- Fallback when no map -->
        <div v-else class="flex items-center justify-center h-full bg-gray-100">
          <div class="text-center text-gray-500">
            <h3 class="text-lg font-medium mb-2">No Map Assigned</h3>
            <p>This encounter doesn't have a map assigned yet.</p>
          </div>
        </div>

        <!-- UI Overlays -->
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
          <TokenContextMenu
            v-if="contextMenuToken"
            :visible="!!contextMenuToken"
            :token="contextMenuToken"
            :position="contextMenuPosition"
            @close="contextMenuToken = null"
            @action="handleTokenAction"
          />

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
          <MapContextMenu
            :visible="showMapContextMenu"
            :position="contextMenuPosition"
            :show-walls="showWalls"
            :show-objects="showObjects"
            :show-portals="showPortals"
            :show-lights="showLights"
            :show-debug-info="showDebugInfo"
            @action="handleMapContextMenuAction"
          />
        </div>
        
        <!-- HUD System overlays the encounter container -->
        <HUD v-if="deviceConfig.type !== 'phone'" />
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
      @tokensCreated="handleTokensCreated"
      @close="showTokenGenerator = false"
      class="actor-token-generator-modal"
    />
    
    <!-- Token State Manager -->
    <TokenStateManager
      v-if="showTokenManager"
      :visible="showTokenManager"
      :token="selectedToken"
      :mode="tokenManagerMode"
      :action="tokenManagerAction"
      @close="showTokenManager = false"
      @updateToken="handleTokenUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mts';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { useDeviceAdaptation } from '../../composables/useDeviceAdaptation.mjs';
// Encounter socket functionality removed - using session-based architecture
import PixiMapViewer from './PixiMapViewer.vue';
import HUD from '../hud/HUD.vue';
import ActorTokenGenerator from './ActorTokenGenerator.vue';
import TokenContextMenu from './TokenContextMenu.vue';
import TokenStateManager from './TokenStateManager.vue';
import EncounterDebugInfo from './EncounterDebugInfo.vue';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import { useAuthStore } from '../../stores/auth.store.mjs';
// Add import for MapContextMenu
import MapContextMenu from './MapContextMenu.vue';

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
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const { deviceConfig, deviceClass } = useDeviceAdaptation();
const authStore = useAuthStore();

// Get encounter ID from props or route
const currentEncounterId = computed(() => 
  props.encounterId || (route.params.id as string)
);

// Check if current user is GM
const isGameMaster = computed(() => {
  return gameSessionStore.isGameMaster;
});

// Encounter socket functionality removed - using session-based architecture through encounter store

// State
const loading = ref(true);
const error = ref<string | null>(null);
const selectedToken = ref<Token | null>(null);
const showTokenGenerator = ref(false);
const showDebugInfo = ref(false);

// Mouse tracking state
const mousePosition = ref({
  screenX: 0,
  screenY: 0,
  worldX: 0,
  worldY: 0
});

// Context menu and overlay state
const showTokenManager = ref(false);
const tokenManagerMode = ref<'health' | 'conditions' | 'properties'>('health');
const tokenManagerAction = ref<'damage' | 'heal'>();

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
  const tokens = encounterStore.encounterTokens;
  console.log('[EncounterView] encounterTokens computed, count:', tokens.length);
  return tokens.map(token => ({
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
    data: token.data || {}
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
    
    // If GM is opening the encounter runner, emit encounter:start to set it as current encounter
    if (isGameMaster.value && gameSessionStore.currentSession && socketStore.socket) {
      console.log('[Debug] GM opened encounter runner, emitting encounter:start event');
      socketStore.socket.emit('encounter:start', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId: currentEncounterId.value
      });
    }
    
    // Socket events are now handled automatically via session rooms
    
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
    encounterStore.moveToken(tokenId, { x, y, elevation });
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
const handleMapRightClick = (x: number, y: number, event?: MouseEvent) => {
  // Store click position for context menu
  contextMenuPosition.value = { 
    x: event?.clientX || 0,
    y: event?.clientY || 0 
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

// Handle mouse movement for coordinate tracking
const handleMouseMove = (event: MouseEvent, worldX: number, worldY: number) => {
  if (!encounter.value) return;
  
  // Get the canvas element to calculate screen coordinates
  const canvas = event.target as HTMLCanvasElement;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  
  // Update mouse position with both screen and world coordinates
  mousePosition.value = {
    screenX: Math.round(screenX),
    screenY: Math.round(screenY),
    worldX: Math.round(worldX),
    worldY: Math.round(worldY)
  };
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
};

// Track last mouse position for context menus
const lastClientX = ref(0);
const lastClientY = ref(0);
const showMapContextMenu = ref(false);

// Context menu state
const contextMenuToken = ref<Token | null>(null);
const contextMenuPosition = ref({ x: 0, y: 0 });

// Wall highlighting state
const showWalls = ref(false);
const showObjects = ref(false);
const showPortals = ref(false);
// Light highlighting state
const showLights = ref(false); // Default: lights hidden

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
  encounterStore.deleteToken(tokenId);
};

// Handle tokens created from ActorTokenGenerator
const handleTokensCreated = async (tokenIds: string[]) => {
  if (!encounter.value || !lastClickPosition.value) return;
  
  try {
    // Update the position of each created token
    for (const tokenId of tokenIds) {
      const token = encounterTokens.value.find(t => t.id === tokenId);
      if (token) {
        // Update token position and emit socket event
        handleTokenMoved(
          tokenId,
          lastClickPosition.value.x,
          lastClickPosition.value.y,
          lastClickPosition.value.elevation
        );
      }
    }
    
    // Close the token generator
    showTokenGenerator.value = false;
    
    // Clear the last click position
    lastClickPosition.value = undefined;
  } catch (error) {
    console.error('Failed to place tokens:', error);
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
    case 'toggle-walls':
      showWalls.value = !showWalls.value;
      break;
    case 'toggle-objects':
      showObjects.value = !showObjects.value;
      break;
    case 'toggle-portals':
      showPortals.value = !showPortals.value;
      break;
    case 'toggle-lights':
      showLights.value = !showLights.value;
      break;
    case 'toggle-debug':
      showDebugInfo.value = !showDebugInfo.value;
      break;
  }
  
  // Close context menu
  showMapContextMenu.value = false;
};

// Lifecycle
onMounted(() => {
  loadEncounter();
});

onUnmounted(() => {
  // No cleanup needed for theater mode
});

// Watch for encounter ID changes
watch(currentEncounterId, (newId) => {
  if (newId) {
    loadEncounter();
  }
});

// Socket connection management is now handled automatically via session rooms

// Handle token update from TokenStateManager
const handleTokenUpdate = (updatedToken: Token) => {
  if (!encounter.value) return;
  if (!authStore.user?.id) return;
  
  // Update token in encounter store
  // Include all required fields from CreateTokenData
  const { name, imageUrl, size, position, isVisible, isPlayerControlled, conditions } = updatedToken;
  encounterStore.updateToken(updatedToken.id, {
    name,
    imageUrl,
    size,
    encounterId: encounter.value.id,
    position,
    isVisible,
    isPlayerControlled,
    conditions,
    data: updatedToken.data || {} // Ensure data is never undefined
  });
};

function onShowTokenContextMenu({ token, position }: { token: Token; position: { x: number; y: number } }) {
  contextMenuToken.value = token;
  contextMenuPosition.value = position;
  showMapContextMenu.value = false;
}

function onShowEncounterContextMenu({ position }: { position: { x: number; y: number } }) {
  contextMenuToken.value = null;
  contextMenuPosition.value = position;
  showMapContextMenu.value = true;
}

const startOrStopEncounter = () => {
  const session = gameSessionStore.currentSession;
  if (!session) return;
  if (session.currentEncounterId === currentEncounterId.value) {
    // Stop encounter
    socketStore.emit('encounter:stop', {
      sessionId: session.id,
      encounterId: currentEncounterId.value,
      userId: authStore.user?.id || ''
    });
  } else {
    // Start encounter
    socketStore.emit('encounter:start', {
      sessionId: session.id,
      encounterId: currentEncounterId.value
    });
  }
};

const isActiveEncounter = computed(() => {
  const session = gameSessionStore.currentSession;
  return session && session.currentEncounterId === currentEncounterId.value;
});

// HUD layout adjustments - no longer needed as HUD overlays the content
const hudLayoutStyle = computed(() => {
  return {};
});
</script>

<style scoped>

.encounter-view-fullscreen {
  position: fixed;
  top: 64px; /* Below AppHeader */
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: calc(100vh - 64px);
  background: #000;
  margin: 0;
  padding: 0;
  z-index: 50; /* Above normal content but below modals */
}

.encounter-container {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.encounter-content {
  width: 100%;
  height: 100%;
  position: relative;
  margin: 0;
  padding: 0;
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

/* Fullscreen encounter experience */
</style> 