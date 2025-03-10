<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.mts';

const route = useRoute();
const encounterStore = useEncounterStore();
const loadError = ref<string | null>(null);

onMounted(async () => {
  try {
    const encounterId = route.params.id as string;
    const campaignId = route.params.campaignId as string;
    await encounterStore.fetchEncounter(encounterId, campaignId);
  } catch (error) {
    console.error('Failed to load encounter:', error);
    loadError.value = 'Failed to load encounter data';
  }
});
</script>

<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="encounterStore.loading" class="flex justify-center items-center">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      <span class="ml-2">Loading...</span>
    </div>
    
    <!-- Error State -->
    <div v-else-if="encounterStore.error || loadError" class="text-red-500 text-center">
      {{ encounterStore.error || loadError }}
    </div>
    
    <!-- Encounter Details -->
    <div v-else-if="encounterStore.currentEncounter" class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold">{{ encounterStore.currentEncounter.name }}</h1>
      
      <!-- Description if available -->
      <p v-if="encounterStore.currentEncounter.description" class="mt-4 text-gray-600">
        {{ encounterStore.currentEncounter.description }}
      </p>
      
      <!-- Map info if available -->
      <div v-if="encounterStore.currentEncounter.mapId" class="mt-6 p-4 bg-gray-50 rounded-lg">
        <h2 class="text-lg font-medium">Map</h2>
        <p>{{ 
          typeof encounterStore.currentEncounter.mapId === 'object' && 
          'name' in (encounterStore.currentEncounter.mapId as any) ? 
          (encounterStore.currentEncounter.mapId as any).name : 'Map loaded' 
        }}</p>
      </div>
      
      <!-- Participants section -->
      <div class="mt-6">
        <h2 class="text-lg font-medium mb-2">Participants</h2>
        <div v-if="!encounterStore.currentEncounter.participants || 
                   encounterStore.currentEncounter.participants.length === 0" 
             class="text-gray-500">
          No participants added yet
        </div>
        <ul v-else class="space-y-2">
          <li v-for="participant in encounterStore.currentEncounter.participants" 
              :key="participant?.id || Math.random()" 
              class="p-2 bg-gray-50 rounded flex items-center">
            <span>{{ participant?.name || 'Unknown Actor' }}</span>
          </li>
        </ul>
      </div>
    </div>
    
    <!-- Not Found State -->
    <div v-else class="text-center text-gray-500">
      Encounter not found
    </div>
  </div>
</template> 