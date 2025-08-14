<template>
  <div 
    v-show="isVisible"
    id="dice-3d-container"
    class="dice-overlay"
    :class="{ visible: isVisible }"
    ref="diceContainer"
    @click="handleOverlayClick"
  >
    
    <!-- Error message if initialization fails -->
    <div 
      v-if="initializationError" 
      class="dice-error"
    >
      <span class="error-text">3D dice unavailable</span>
      <button 
        @click="retryInitialization"
        class="retry-button"
      >
        Retry
      </button>
    </div>
    
    <!-- Three.js canvas will be injected here -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { dice3DService } from '../../services/dice-3d.service.mjs';
import type { EnhancedRollResult } from '@dungeon-lab/shared/types/dice.mjs';

// Props
interface Props {
  visible?: boolean;
  autoHide?: boolean;
  hideDelay?: number;
}

withDefaults(defineProps<Props>(), {
  visible: true,
  autoHide: true,   // Enable auto-hide for production
  hideDelay: 5000   // Match service cleanup timing
});

// Reactive state
const diceContainer = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const isInitializing = ref(false);
const initializationError = ref<string | null>(null);
const hideTimer = ref<ReturnType<typeof setTimeout> | null>(null);

// Stores
const socketStore = useSocketStore();

/**
 * Initialize the 3D dice service with automatic retry logic
 */
const initializeDiceService = async (maxRetries: number = 3): Promise<void> => {
  if (dice3DService.isReady()) {
    console.log('3D dice service already initialized');
    return;
  }

  isInitializing.value = true;
  initializationError.value = null;

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`DiceOverlay: Initialization attempt ${attempt}/${maxRetries}`);
      
      // Ensure DOM is fully ready and container has dimensions
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Progressive delay
      
      // Verify container exists and has dimensions
      const container = document.querySelector('#dice-3d-container') as HTMLElement;
      if (!container) {
        throw new Error('Dice container not found');
      }
      
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        throw new Error(`Container has no dimensions: ${container.offsetWidth}x${container.offsetHeight}`);
      }
      
      await dice3DService.initialize('#dice-3d-container');
      console.log('DiceOverlay: 3D dice service initialized successfully');
      return; // Success - exit retry loop
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`DiceOverlay: Initialization attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Don't show error state for transient failures during retries
        console.log(`DiceOverlay: Retrying in ${100 * attempt}ms...`);
        continue;
      }
    }
  }
  
  // All retries failed - show error state
  if (lastError) {
    console.error('DiceOverlay: All initialization attempts failed:', lastError.message);
    initializationError.value = lastError.message;
  }
  
  isInitializing.value = false;
};

/**
 * Retry initialization after an error
 */
const retryInitialization = async (): Promise<void> => {
  initializationError.value = null;
  await initializeDiceService();
};

/**
 * Handle dice roll results from the server
 */
const handleRollResult = async (data: { 
  type: 'roll-result';
  result: EnhancedRollResult | unknown;
  gameSessionId: string;
}): Promise<void> => {
  console.log('DiceOverlay: Received roll result:', data);

  // Check if this is an enhanced result (has diceResults property)
  const isEnhancedResult = data.result && 
    typeof data.result === 'object' && 
    'diceResults' in data.result &&
    data.result.diceResults &&
    Object.keys(data.result.diceResults).length > 0;

  if (!isEnhancedResult) {
    console.log('DiceOverlay: Legacy roll result, skipping 3D visualization');
    return;
  }

  const enhancedResult = data.result as EnhancedRollResult;

  try {
    // Show overlay first for smooth UX
    showOverlay();
    
    // Ensure 3D dice service is ready
    if (!dice3DService.isReady()) {
      console.log('DiceOverlay: Initializing 3D dice service...');
      await initializeDiceService();
    }

    if (dice3DService.isReady()) {
      // Start 3D dice animation with predetermined results
      await dice3DService.rollWithResults(enhancedResult);
      console.log('DiceOverlay: 3D dice animation started');
    } else {
      console.warn('DiceOverlay: 3D dice service not available after initialization, skipping animation');
      hideOverlay();
    }
  } catch (error) {
    console.error('DiceOverlay: Error handling roll result:', error);
    hideOverlay();
  }
};

/**
 * Show the dice overlay
 */
const showOverlay = (): void => {
  isVisible.value = true;
  clearHideTimer();
  
  // Note: We now rely on the dice service to emit 'diceCleared' event
  // instead of using a fixed timeout. This ensures the overlay hides
  // when the dice are actually cleaned up from the service.
};

/**
 * Hide the dice overlay
 */
const hideOverlay = (): void => {
  isVisible.value = false;
  clearHideTimer();
  
  // Note: Don't call dice3DService.clearDice() here to avoid circular calls.
  // The service handles its own cleanup and emits 'diceCleared' when done.
};


/**
 * Handle dice cleared event from service
 */
const handleDiceCleared = (): void => {
  console.log('DiceOverlay: Received diceCleared event from service');
  hideOverlay();
};

/**
 * Clear the hide timer
 */
const clearHideTimer = (): void => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value);
    hideTimer.value = null;
  }
};

/**
 * Handle clicks on the overlay (for manual dismissal)
 */
const handleOverlayClick = (event: MouseEvent): void => {
  // Only hide if clicking on the overlay itself, not on dice or buttons
  if (event.target === diceContainer.value) {
    hideOverlay();
  }
};

/**
 * Setup socket listeners for roll results
 */
const setupSocketListeners = (): void => {
  if (!socketStore.socket) {
    console.warn('DiceOverlay: Socket not available, cannot listen for roll results');
    return;
  }

  console.log('DiceOverlay: Setting up socket listeners');
  socketStore.socket.on('roll-result', handleRollResult);
};

/**
 * Cleanup socket listeners
 */
const cleanupSocketListeners = (): void => {
  if (!socketStore.socket) return;
  
  console.log('DiceOverlay: Cleaning up socket listeners');
  socketStore.socket.off('roll-result', handleRollResult);
};

// Lifecycle hooks
onMounted(async () => {
  console.log('DiceOverlay: Component mounted');
  
  // Wait for next tick to ensure DOM is ready
  await nextTick();
  
  // Setup socket listeners
  setupSocketListeners();
  
  // Setup dice service event listeners
  dice3DService.on('diceCleared', handleDiceCleared);
  
  // Pre-initialize dice service if container is visible and ready
  if (diceContainer.value) {
    // Check if container has dimensions (is visible and rendered)
    const containerRect = diceContainer.value.getBoundingClientRect();
    const hasValidDimensions = containerRect.width > 0 && containerRect.height > 0;
    
    if (hasValidDimensions) {
      console.log('DiceOverlay: Container ready, pre-initializing 3D dice service...');
      try {
        await initializeDiceService();
        console.log('DiceOverlay: Pre-initialization completed successfully');
      } catch (error) {
        console.log('DiceOverlay: Pre-initialization failed, will retry on first roll');
        // Clear any error state from pre-initialization attempt
        initializationError.value = null;
      }
    } else {
      console.log('DiceOverlay: Container not visible (0x0), skipping pre-initialization - will initialize on first roll');
    }
  }
});

onUnmounted(() => {
  console.log('DiceOverlay: Component unmounting');
  
  // Cleanup timers
  clearHideTimer();
  
  // Cleanup socket listeners
  cleanupSocketListeners();
  
  // Cleanup dice service event listeners
  dice3DService.off('diceCleared', handleDiceCleared);
  
  // Cleanup dice service
  dice3DService.destroy();
});

// Expose methods for parent components
defineExpose({
  showDiceRoll: handleRollResult,
  show: showOverlay,
  hide: hideOverlay,
  isVisible: () => isVisible.value,
  isReady: () => dice3DService.isReady()
});
</script>

<style scoped>
.dice-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 55; /* Above everything including HUD (50) */
  pointer-events: auto; /* Allow interaction for manual dismissal */
  background: transparent; /* Fully transparent background so map shows through */
  
  /* Ensure minimum dimensions for Three.js renderer */
  min-width: 800px;
  min-height: 600px;
  
  /* Flex container for centering loading/error states */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

/* Ensure Three.js canvas fills the container and dice are fully visible */
.dice-overlay :deep(canvas) {
  background: transparent !important; /* Canvas background transparent so map shows through */
  max-width: 100%;
  max-height: 100%;
  pointer-events: auto; /* Allow clicking on dice */
  opacity: 1 !important; /* Ensure dice are fully visible */
  z-index: 1; /* Ensure canvas is above overlay background */
}

/* Error state styles */
.dice-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #ef4444;
  background: rgba(0, 0, 0, 0.8);
  padding: 2rem;
  border-radius: 0.5rem;
  backdrop-filter: blur(4px);
}

.error-text {
  font-size: 1.1rem;
  font-weight: 500;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #dc2626;
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .dice-overlay {
    padding: 1rem;
  }
  
  .dice-error {
    font-size: 0.9rem;
  }
  
}

/* Smooth transitions for showing/hiding */
.dice-overlay {
  transition: opacity 0.3s ease-in-out;
}

/* Hide overlay when not visible */
.dice-overlay:not(.visible) {
  opacity: 0;
  pointer-events: none;
}
</style>