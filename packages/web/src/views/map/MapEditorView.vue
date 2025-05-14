<template>
  <div class="map-editor-page">
    <MapEditorView 
      :map-id="mapId"
      :initial-data="mapData"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MapEditorView from '@/components/MapEditor/MapEditorView.vue';
import axios from 'axios';
// Import UVTTData type from shared types
import type { UVTTData } from '@/../../shared/src/types/mapEditor.mjs';

const route = useRoute();
const router = useRouter();
const mapId = ref<string>(route.params.id as string);
const mapData = ref<UVTTData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Load map data on mount
onMounted(async () => {
  if (!mapId.value) {
    error.value = 'No map ID provided';
    return;
  }
  
  try {
    loading.value = true;
    
    // Fetch the map as UVTT format
    const response = await axios.get(`/api/maps/${mapId.value}`, {
      headers: {
        'Accept': 'application/uvtt'
      }
    });
    
    // Parse the UVTT data
    mapData.value = response.data;
    loading.value = false;
  } catch (err) {
    console.error('Error loading map:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load map data';
    loading.value = false;
  }
});

// Handle save events from the editor
const handleSave = async (editorData: UVTTData) => {
  try {
    // Save the map data
    await axios.put(`/api/maps/${mapId.value}`, editorData, {
      headers: {
        'Content-Type': 'application/uvtt'
      }
    });
    
    // Redirect to map details page
    router.push({
      name: 'map-detail',
      params: { id: mapId.value }
    });
  } catch (err) {
    console.error('Error saving map:', err);
    // Handle save error
  }
};
</script>

<style scoped>
.map-editor-page {
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
</style> 