<template>
  <div class="map-editor-page">
    <!-- App Header -->
    <AppHeader />
    
    <!-- Main Editor Content -->
    <div class="editor-content">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading map...</div>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <button @click="goBack" class="btn">Go Back</button>
      </div>
      
      <template v-else>
        <div v-if="saving" class="saving-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">Saving map...</div>
        </div>
        
        <MapEditorComponent 
          :map-id="mapId"
          :initial-data="mapData"
          :image-url="imageUrl"
          @save="handleSave"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MapEditorComponent from '@/components/MapEditor/MapEditorComponent.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { MapsClient } from '@/../../client/src/maps.client.mjs';
import type { IInternalMapData } from '@/../../shared/src/types/index.mjs';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';


const route = useRoute();
const router = useRouter();
const mapId = ref<string>(route.params.id as string);
const mapData = ref<IInternalMapData | null>(null);
const imageUrl = ref<string | undefined>(undefined);
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const mapsClient = new MapsClient();

// Navigation helper
const goBack = () => {
  router.push({ name: 'maps' }); // Assuming 'maps' is the name of the maps list route
};


// Load map data on mount
onMounted(async () => {
  if (!mapId.value) {
    error.value = 'No map ID provided';
    return;
  }
  
  try {
    loading.value = true;
    
    // Get the map details which includes InternalMapData
    const mapDetails = await mapsClient.getMap(mapId.value);
    
    // Use the InternalMapData directly from mapDetails
    mapData.value = mapDetails.mapData as IInternalMapData;
    
    // Set the image URL separately
    if (mapDetails.image && mapDetails.image.url) {
      imageUrl.value = transformAssetUrl(mapDetails.image.url);
      console.log('Map has image asset:', imageUrl.value);
    } else {
      console.warn('No image asset found in mapDetails');
    }
    
    // Store the map name for future use
    const mapName = mapDetails.name || 'Untitled Map';
    console.log(`Loaded map: ${mapName} with ${mapData.value.walls.length} walls`);
    
    loading.value = false;
  } catch (err) {
    console.error('Error loading map:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load map data';
    loading.value = false;
  }
});

// Handle save events from the editor
const handleSave = async (editorData: { mapData: any }) => {
  try {
    if (!mapId.value) {
      throw new Error('No map ID available for saving');
    }
    
    saving.value = true;
    
    // Debug the editor data
    console.log('Editor data structure:', {
      hasMapData: !!editorData.mapData,
      mapDataStructure: editorData.mapData ? Object.keys(editorData.mapData) : 'undefined'
    });
    
    // First get the current map data to preserve name
    let mapName = 'Updated Map';
    try {
      const currentMap = await mapsClient.getMap(mapId.value);
      mapName = currentMap.name || mapName;
    } catch (error) {
      console.warn('Could not fetch current map name:', error);
    }
    
    console.log('Saving map with world coordinate system:', editorData);
    
    // Create the update data with the new coordinate system
    const mapUpdateData = {
      name: mapName,
      mapData: editorData.mapData
    };
    
    try {
      // Use MapsClient to update the map
      await mapsClient.updateMap(mapId.value, mapUpdateData);
      console.log('Map saved successfully with world coordinate system');
    } catch (saveError) {
      console.error('Error saving map:', saveError);
      throw saveError;
    }
  } catch (error) {
    console.error('Error in handleSave:', error);
    alert('Failed to save map: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.map-editor-page {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.editor-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding-top: 64px; /* Account for header height */
}

.loading-overlay,
.saving-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.saving-overlay {
  background-color: rgba(255, 255, 255, 0.6);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 18px;
  color: #333;
}

.error-message {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  text-align: center;
}

.error-message p {
  margin-bottom: 20px;
  color: #e74c3c;
  font-size: 18px;
}

.btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn:hover {
  background-color: #2980b9;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 