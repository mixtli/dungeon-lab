<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { useMobileActorsState } from '../composables/useMobileActorsState.mjs';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import DocumentSheetContainer from '../components/common/DocumentSheetContainer.vue';

interface Props {
  actorId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  back: [];
}>();

const route = useRoute();
const router = useRouter();
const gameStateStore = useGameStateStore();
const { setLastOpenedActor } = useMobileActorsState();

// Get actor ID from props (container mode) or route params (standalone mode)
const actorId = computed(() => props.actorId || (route.params.id as string));

// Save this actor as the last opened when the component mounts
onMounted(() => {
  setLastOpenedActor(actorId.value);
});

// Find the actor/character to get its name and type
const actor = computed(() => {
  // First check characters
  const character = gameStateStore.characters.find(c => c.id === actorId.value);
  if (character) {
    return {
      ...character,
      type: 'character' as const,
      documentType: 'character' as const
    };
  }
  
  // Then check actors
  const actor = gameStateStore.actors.find(a => a.id === actorId.value);
  if (actor) {
    return {
      ...actor,
      type: 'actor' as const,
      documentType: 'vtt-document' as const
    };
  }
  
  return null;
});

// Navigate back to actors list
function goBack() {
  if (props.actorId) {
    // Container mode - emit back event
    emit('back');
  } else {
    // Standalone mode - use router navigation
    router.push({ name: 'mobile-actors' });
  }
}

// Handle close event from DocumentSheetContainer
function handleClose() {
  goBack();
}
</script>

<template>
  <div class="mobile-actor-sheet mobile-with-bottom-nav">
    <!-- Mobile Header with Back Button -->
    <div class="mobile-header">
      <button 
        class="back-button"
        @click="goBack"
        aria-label="Go back to actors list"
      >
        <ArrowLeftIcon class="back-icon" />
      </button>
      
      <div class="header-title">
        <h1 class="actor-name">{{ actor?.name || 'Loading...' }}</h1>
        <p class="actor-type">{{ actor?.type === 'character' ? 'Character' : 'NPC' }}</p>
      </div>
      
      <!-- Spacer to balance the back button -->
      <div class="header-spacer"></div>
    </div>

    <!-- Document Sheet -->
    <div class="sheet-container">
      <DocumentSheetContainer
        v-if="actor"
        :show="true"
        :document-id="actorId"
        :document-type="actor.documentType"
        :context="'admin'"
        :readonly="false"
        @close="handleClose"
      />
      
      <div v-else class="loading-state">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading actor sheet...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-actor-sheet {
  min-height: 100vh;
  background: #f5f5f4; /* stone-100 */
  display: flex;
  flex-direction: column;
}

.dark .mobile-actor-sheet {
  background: #1c1917; /* stone-900 */
}

.mobile-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e7e5e4; /* stone-200 */
  min-height: 60px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.dark .mobile-header {
  background: #292524; /* stone-800 */
  border-bottom-color: #44403c; /* stone-700 */
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #3b82f6; /* blue-500 */
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.back-button:hover {
  background: #f1f5f9; /* slate-100 */
}

.back-button:active {
  background: #e2e8f0; /* slate-200 */
}

.dark .back-button:hover {
  background: #334155; /* slate-700 */
}

.dark .back-button:active {
  background: #475569; /* slate-600 */
}

.back-icon {
  width: 20px;
  height: 20px;
}

.header-title {
  flex: 1;
  text-align: center;
  min-width: 0; /* Allow text to truncate */
}

.actor-name {
  font-size: 18px;
  font-weight: 600;
  color: #1c1917; /* stone-900 */
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .actor-name {
  color: #fafaf9; /* stone-50 */
}

.actor-type {
  font-size: 12px;
  color: #78716c; /* stone-500 */
  margin: 2px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .actor-type {
  color: #a8a29e; /* stone-400 */
}

.header-spacer {
  width: 40px;
  flex-shrink: 0;
}

.sheet-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allow container to shrink */
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e7e5e4; /* stone-200 */
  border-top: 3px solid #3b82f6; /* blue-500 */
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.dark .loading-spinner {
  border-color: #44403c; /* stone-700 */
  border-top-color: #3b82f6; /* blue-500 */
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #78716c; /* stone-500 */
  margin: 0;
}

.dark .loading-text {
  color: #a8a29e; /* stone-400 */
}

/* Override DocumentSheetContainer styles for mobile */
.sheet-container :deep(.document-sheet-container) {
  height: 100%;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.sheet-container :deep(.character-sheet-container) {
  max-width: 100%;
  box-sizing: border-box;
}

.sheet-container :deep(.dnd5e-character-sheet) {
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}
</style>