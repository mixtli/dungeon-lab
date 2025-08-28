<template>
  <div class="mobile-tabs-container" :class="{ 'landscape-fullscreen': isMobileLandscape }">
    <!-- Encounter Tab Content -->
    <div 
      v-show="activeTab === 'encounter'" 
      class="tab-content encounter-content"
    >
      <EncounterView />
    </div>

    <!-- Actors Tab Content -->
    <div 
      v-show="activeTab === 'actors'" 
      class="tab-content actors-content"
    >
      <!-- Show actor list or specific actor sheet based on state -->
      <MobileActorsView v-if="!currentActorId" />
      <MobileActorSheetView 
        v-else 
        :key="currentActorId"
        :actorId="currentActorId" 
        @back="handleActorBack"
      />
    </div>

    <!-- Chat Tab Content -->
    <div 
      v-show="activeTab === 'chat'" 
      class="tab-content chat-content"
    >
      <ChatTab />
    </div>

    <!-- Settings Tab Content -->
    <div 
      v-show="activeTab === 'settings'" 
      class="tab-content settings-content"
    >
      <SettingsView />
    </div>

    <!-- Bottom Navigation - Hide in mobile landscape mode for fullscreen encounter -->
    <BottomNavigation 
      v-if="!isMobileLandscape"
      :activeTab="activeTab"
      :containerMode="true"
      @tab-change="handleTabChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EncounterView from '@/components/encounter/EncounterView.vue';
import MobileActorsView from '@/views/MobileActorsView.vue';
import MobileActorSheetView from '@/views/MobileActorSheetView.vue';
import ChatTab from '@/components/hud/tabs/ChatTab.vue';
import SettingsView from '@/views/SettingsView.vue';
import BottomNavigation from '@/components/layout/BottomNavigation.vue';
import { useMobileActorsState } from '@/composables/useMobileActorsState.mjs';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';

type MobileTabType = 'encounter' | 'actors' | 'chat' | 'settings';

const route = useRoute();
const router = useRouter();
const { setLastOpenedActor, getLastOpenedActor } = useMobileActorsState();
const { isMobileLandscape } = useDeviceAdaptation();

// Tab state
const activeTab = ref<MobileTabType>('encounter');
const currentActorId = ref<string | null>(null);

// Initialize from URL parameters
onMounted(() => {
  // Read initial tab from URL params
  const urlTab = route.query.tab as MobileTabType;
  if (urlTab && ['encounter', 'actors', 'chat', 'settings'].includes(urlTab)) {
    activeTab.value = urlTab;
  }

  // Read actor ID from URL params
  const urlActorId = route.query.actor as string;
  if (urlActorId) {
    currentActorId.value = urlActorId;
    setLastOpenedActor(urlActorId);
  } else if (activeTab.value === 'actors') {
    // Restore last opened actor if navigating to actors tab
    const lastActorId = getLastOpenedActor();
    if (lastActorId) {
      currentActorId.value = lastActorId;
    }
  }
});

// Handle tab changes from bottom navigation
const handleTabChange = (tab: string) => {
  activeTab.value = tab as MobileTabType;
  
  // Update URL without navigation
  const query = { ...route.query };
  query.tab = tab;
  
  // Handle actors tab specific logic
  if (tab === 'actors') {
    // If we have a current actor, keep it in URL
    if (currentActorId.value) {
      query.actor = currentActorId.value;
    } else {
      // Check if we should restore last opened actor
      const lastActorId = getLastOpenedActor();
      if (lastActorId) {
        currentActorId.value = lastActorId;
        query.actor = lastActorId;
      } else {
        delete query.actor;
      }
    }
  } else {
    // Not on actors tab, remove actor from URL but keep in memory
    delete query.actor;
  }
  
  // Update URL without triggering navigation
  router.replace({ query });
};

// Handle navigation to specific actor (called from long press or actors list)
const navigateToActor = (actorId: string) => {
  activeTab.value = 'actors';
  currentActorId.value = actorId;
  setLastOpenedActor(actorId);
  
  // Update URL
  router.replace({ 
    query: { 
      ...route.query, 
      tab: 'actors', 
      actor: actorId 
    } 
  });
};

// Handle back from actor sheet to actors list
const handleActorBack = () => {
  currentActorId.value = null;
  
  // Update URL to remove actor but keep actors tab
  const query = { ...route.query };
  delete query.actor;
  router.replace({ query });
};

// Expose navigation method for external use (like long press from encounter)
defineExpose({
  navigateToActor
});

// Watch for external URL changes (browser back/forward)
watch(() => route.query, (newQuery) => {
  const urlTab = newQuery.tab as string;
  if (urlTab && ['encounter', 'actors', 'chat', 'settings'].includes(urlTab)) {
    activeTab.value = urlTab as MobileTabType;
  }
  
  const urlActorId = newQuery.actor as string;
  if (urlActorId !== currentActorId.value) {
    currentActorId.value = urlActorId || null;
    if (urlActorId) {
      setLastOpenedActor(urlActorId);
    }
  }
}, { deep: true });
</script>

<style scoped>
.mobile-tabs-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  width: 100%;
}

.encounter-content,
.actors-content,
.chat-content,
.settings-content {
  height: 100%;
}

/* Ensure proper layering */
.tab-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 64px; /* Space for bottom navigation */
}

/* Landscape fullscreen mode - no bottom navigation space */
.landscape-fullscreen .tab-content {
  bottom: 0;
}

/* Bottom navigation positioning */
:deep(.bottom-navigation) {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
}
</style>