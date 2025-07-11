<template>
  <div class="map-editor-page">
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
      
      <MapEditorView 
        :map-id="mapId"
        :initial-data="mapData"
        @save="handleSave"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MapEditorView from '@/components/MapEditor/MapEditorComponent.vue';
import { MapsClient } from '@/../../client/src/maps.client.mjs';
import type { UVTTData, Point } from '@/../../shared/src/types/mapEditor.mjs';

// Define a wall as an array of points
type Wall = Point[];

// Extended UVTTData interface for our specific needs
// interface ExtendedUVTTData extends Omit<UVTTData, 'line_of_sight' | 'objects_line_of_sight' | 'format'> {
//   line_of_sight?: Wall[];
//   objects_line_of_sight?: Wall[];
//   format?: string | number; // Allow string or number to fix type error with schema
// }

const route = useRoute();
const router = useRouter();
const mapId = ref<string>(route.params.id as string);
const mapData = ref<UVTTData | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const mapsClient = new MapsClient();

// Navigation helper
const goBack = () => {
  router.push({ name: 'maps' }); // Assuming 'maps' is the name of the maps list route
};

// Transform a wall (array of points) from grid to pixel coordinates
const transformWallToPixel = (wall: Wall, resolution: UVTTData['resolution']): Wall => {
  if (!wall || !Array.isArray(wall)) return [];
  return wall.map(point => gridToPixel(point, resolution));
};

// Convert grid coordinates to pixel coordinates based on map resolution
const gridToPixel = (point: Point, resolution: UVTTData['resolution']): Point => {
  return {
    x: (point.x - resolution.map_origin.x) * resolution.pixels_per_grid,
    y: (point.y - resolution.map_origin.y) * resolution.pixels_per_grid
  };
};

// Convert pixel coordinates back to grid coordinates
const pixelToGrid = (point: Point, resolution: UVTTData['resolution']): Point => {
  // Check if point is valid and has numeric coordinates
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
    console.warn('Invalid point received:', point);
    // Return a default point to avoid null values
    return {
      x: resolution.map_origin.x,
      y: resolution.map_origin.y
    };
  }
  
  return {
    x: point.x / resolution.pixels_per_grid + resolution.map_origin.x,
    y: point.y / resolution.pixels_per_grid + resolution.map_origin.y
  };
};

// Load map data on mount
onMounted(async () => {
  if (!mapId.value) {
    error.value = 'No map ID provided';
    return;
  }
  
  try {
    loading.value = true;
    
    // Get the map details which already includes uvtt data
    const mapDetails = await mapsClient.getMap(mapId.value);
    
    // Use the UVTT data directly from mapDetails with proper type assertion
    const originalUvttData = (mapDetails.uvtt as unknown) as UVTTData;
    
    // Make sure we have the image URL from mapDetails
    if (mapDetails.image && mapDetails.image.url) {
      console.log('Using image URL from mapDetails:', mapDetails.image.url);
      // Add the image URL to the UVTT data
      originalUvttData.image = mapDetails.image.url;
    } else {
      console.warn('No image URL found in mapDetails');
    }
    
    console.log('Original line_of_sight structure:', originalUvttData.line_of_sight);
    
    // Transform line_of_sight - PRESERVE the array of arrays structure
    // Each element is a wall, which is an array of points
    let transformedLineOfSight: Wall[] = [];
    
    if (originalUvttData.line_of_sight && Array.isArray(originalUvttData.line_of_sight)) {
      // Checking if the first element is an array to determine if it's already array of arrays
      if (originalUvttData.line_of_sight.length > 0 && Array.isArray(originalUvttData.line_of_sight[0])) {
        // It's already array of arrays (wall -> points)
        transformedLineOfSight = (originalUvttData.line_of_sight as unknown as Wall[]).map(wall => {
          return transformWallToPixel(wall, originalUvttData.resolution);
        });
      } else {
        // It's a flat array, so we treat it as a single wall
        transformedLineOfSight = [(originalUvttData.line_of_sight as unknown as Wall).map(point => {
          return gridToPixel(point, originalUvttData.resolution);
        })];
      }
      
      console.log(`Transformed ${transformedLineOfSight.length} walls`);
    }
    
    // Transform objects_line_of_sight in the same way
    let transformedObjectsLineOfSight: Wall[] = [];
    if (originalUvttData.objects_line_of_sight && Array.isArray(originalUvttData.objects_line_of_sight)) {
      // Checking if the first element is an array to determine if it's already array of arrays
      if (originalUvttData.objects_line_of_sight.length > 0 && Array.isArray(originalUvttData.objects_line_of_sight[0])) {
        // It's already array of arrays (wall -> points)
        transformedObjectsLineOfSight = (originalUvttData.objects_line_of_sight as unknown as Wall[]).map(wall => {
          return transformWallToPixel(wall, originalUvttData.resolution);
        });
      } else {
        // It's a flat array, so we treat it as a single wall
        transformedObjectsLineOfSight = [(originalUvttData.objects_line_of_sight as unknown as Wall).map(point => {
          return gridToPixel(point, originalUvttData.resolution);
        })];
      }
    }
    
    // Transform portals
    const transformedPortals = originalUvttData.portals?.map(portal => {
      // Keep bounds in GRID coordinates. EditorCanvas will handle pixel conversion.
      const bounds_grid = portal.bounds 
        ? portal.bounds.map(point => ({ x: point.x, y: point.y })) // Ensure it's a new array of simple points
        : [];
        
      console.log("portal from DB (View)", portal, "transformed bounds_grid (View):", bounds_grid);
      return {
        ...portal,
        position: portal.position, // Keep position in GRID coordinates
        bounds: bounds_grid       // Pass GRID coordinate bounds
      };
    }) || [];
    
    // Transform lights
    const transformedLights = originalUvttData.lights?.map(light => ({
      ...light,
      position: gridToPixel(light.position as Point, originalUvttData.resolution),
      // Also convert range from grid units to pixels
      range: light.range * originalUvttData.resolution.pixels_per_grid
    })) || [];
    
    // Create the transformed data for the editor
    // Need to cast format to number for compatibility with schema
    const format = typeof originalUvttData.format === 'string' 
      ? parseFloat(originalUvttData.format) 
      : originalUvttData.format;
      
    mapData.value = {
      ...originalUvttData,
      format,
      line_of_sight: transformedLineOfSight as unknown as Point[], // Keep array of arrays structure
      objects_line_of_sight: transformedObjectsLineOfSight as unknown as Point[],
      portals: transformedPortals,
      lights: transformedLights
    };
    
    // Store the map name for future use
    const mapName = mapDetails.name || 'Untitled Map';
    console.log(`Loaded map: ${mapName} with ${transformedLineOfSight.length} walls`);
    
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
    if (!mapId.value) {
      throw new Error('No map ID available for saving');
    }
    
    saving.value = true;
    
    // Debug the editor data
    console.log('Editor data structure:', {
      hasLineOfSight: !!editorData.line_of_sight,
      lineOfSightType: editorData.line_of_sight ? typeof editorData.line_of_sight : 'undefined',
      isArray: editorData.line_of_sight ? Array.isArray(editorData.line_of_sight) : false,
      lineOfSightLength: editorData.line_of_sight ? editorData.line_of_sight.length : 0,
      resolution: editorData.resolution,
    });
    
    // First get the current map data to preserve name
    let mapName = 'Updated Map';
    try {
      const currentMap = await mapsClient.getMap(mapId.value);
      mapName = currentMap.name || mapName;
    } catch (error) {
      console.warn('Could not fetch current map name:', error);
    }
    
    console.log('Saving editor data:', editorData);
    
    // Validate line_of_sight data
    if (!editorData.line_of_sight || !Array.isArray(editorData.line_of_sight)) {
      console.warn('Invalid line_of_sight data structure', editorData.line_of_sight);
      editorData.line_of_sight = []; // Set to empty array to avoid errors
    }
    
    // Process line_of_sight - check structure and transform
    let gridLineOfSight: Wall[] = [];
    
    // Check if editor data has appropriate structure and is not empty
    if (editorData.line_of_sight && Array.isArray(editorData.line_of_sight) && editorData.line_of_sight.length > 0) {
      console.log('Line of sight data structure:', editorData.line_of_sight);
      
      // Check if it's already array of arrays or a flat array
      if (Array.isArray(editorData.line_of_sight[0])) {
        // It's already array of arrays, process each wall
        gridLineOfSight = (editorData.line_of_sight as unknown as Wall[]).map(wall => 
          wall.filter(point => point && typeof point.x === 'number' && typeof point.y === 'number')
              .map(point => pixelToGrid(point, editorData.resolution))
        ).filter(wall => wall.length >= 2); // Only keep walls with at least 2 points
      } else {
        // It's a flat array, convert to walls
        const pointsArray = editorData.line_of_sight.filter(
          point => point && typeof point.x === 'number' && typeof point.y === 'number'
        ) as Point[];
        
        // Only process if we have valid points
        if (pointsArray.length > 0) {
          // Group points by wall segments (assuming points are ordered)
          const processedWalls: Wall[] = [];
          let currentWall: Point[] = [];
          
          // Process all points
          pointsArray.forEach((point, index) => {
            // Add point to current wall (if valid)
            if (typeof point.x === 'number' && typeof point.y === 'number') {
              currentWall.push(pixelToGrid(point, editorData.resolution));
              
              // Check if this is the end of a segment
              const isEndOfSegment = 
                // End of array
                (index === pointsArray.length - 1) || 
                // Large distance to next point suggests a new segment
                (index < pointsArray.length - 1 && 
                  Math.hypot(
                    pointsArray[index + 1].x - point.x, 
                    pointsArray[index + 1].y - point.y
                  ) > 50); // Threshold for new segment
                  
              if (isEndOfSegment && currentWall.length > 1) {
                processedWalls.push([...currentWall]);
                currentWall = [];
              }
            }
          });
          
          // Add any remaining points
          if (currentWall.length > 1) {
            processedWalls.push(currentWall);
          }
          
          gridLineOfSight = processedWalls;
        }
      }
    }
    
    console.log(`Processed ${gridLineOfSight.length} walls with valid coordinates`);
    
    // Filter out any invalid structures before creating clean version
    gridLineOfSight = gridLineOfSight.filter(wall => 
      wall && Array.isArray(wall) && wall.length >= 2 && 
      wall.every(point => point && typeof point.x === 'number' && typeof point.y === 'number')
    );
    
    // Process objects_line_of_sight similarly with the same validation
    let gridObjectsLineOfSight: Wall[] = [];
    
    if (editorData.objects_line_of_sight && Array.isArray(editorData.objects_line_of_sight) && 
        editorData.objects_line_of_sight.length > 0) {
      
      // Check if it's already array of arrays or a flat array
      if (Array.isArray(editorData.objects_line_of_sight[0])) {
        // It's already array of arrays, process each wall
        gridObjectsLineOfSight = (editorData.objects_line_of_sight as unknown as Wall[]).map(wall => 
          wall.filter(point => point && typeof point.x === 'number' && typeof point.y === 'number')
              .map(point => pixelToGrid(point, editorData.resolution))
        ).filter(wall => wall.length >= 2); // Only keep walls with at least 2 points
      } else {
        // It's a flat array, so process to walls
        const pointsArray = editorData.objects_line_of_sight.filter(
          point => point && typeof point.x === 'number' && typeof point.y === 'number'
        ) as Point[];
        
        if (pointsArray.length > 0) {
          const processedWalls: Wall[] = [];
          let currentWall: Point[] = [];
          
          pointsArray.forEach((point, index) => {
            if (typeof point.x === 'number' && typeof point.y === 'number') {
              currentWall.push(pixelToGrid(point, editorData.resolution));
              
              const isEndOfSegment = 
                (index === pointsArray.length - 1) || 
                (index < pointsArray.length - 1 && 
                  Math.hypot(
                    pointsArray[index + 1].x - point.x, 
                    pointsArray[index + 1].y - point.y
                  ) > 50);
                  
              if (isEndOfSegment && currentWall.length > 1) {
                processedWalls.push([...currentWall]);
                currentWall = [];
              }
            }
          });
          
          if (currentWall.length > 1) {
            processedWalls.push(currentWall);
          }
          
          gridObjectsLineOfSight = processedWalls;
        }
      }
    }
    
    // Filter out any invalid structures before creating clean version
    gridObjectsLineOfSight = gridObjectsLineOfSight.filter(wall => 
      wall && Array.isArray(wall) && wall.length >= 2 && 
      wall.every(point => point && typeof point.x === 'number' && typeof point.y === 'number')
    );
    
    // Clean the points to only have x and y properties
    const cleanLineOfSight = gridLineOfSight.map(wall => 
      wall.map(point => ({
        x: point.x,
        y: point.y
      }))
    );
    
    const cleanObjectsLineOfSight = gridObjectsLineOfSight.map(wall => 
      wall.map(point => ({
        x: point.x,
        y: point.y
      }))
    );
    
    // Log the final line of sight structure
    console.log('Final line_of_sight structure:', 
      cleanLineOfSight.length > 0 
        ? `${cleanLineOfSight.length} walls, first wall has ${cleanLineOfSight[0].length} points` 
        : 'empty array');
        
    if (cleanLineOfSight.length > 0) {
      console.log('Sample wall points:', cleanLineOfSight[0].slice(0, 2));
    }
    
    // Transform portals (portals are already in grid coordinates from the editor)
    const gridPortals = editorData.portals?.map(portal => {
      if (!portal || !portal.position || typeof portal.position.x !== 'number' || 
          typeof portal.position.y !== 'number') {
        console.warn('Invalid portal data:', portal);
        return null;
      }
      
      const portalBounds = portal.bounds as unknown as Point[];
      const gridBounds = portalBounds 
        ? portalBounds
            .filter(point => point && typeof point.x === 'number' && typeof point.y === 'number')
            // Portal bounds are already in grid coordinates from the editor, don't convert
            .map(point => ({ x: point.x, y: point.y }))
        : [];
        
              // Portal position and bounds are already in grid coordinates from the editor
        return {
          position: {
            x: portal.position.x,
            y: portal.position.y
          },
          bounds: gridBounds,
        rotation: portal.rotation,
        closed: portal.closed,
        freestanding: portal.freestanding
      };
    }).filter(Boolean) || [];
    
    // Transform lights back to grid coordinates
    const gridLights = editorData.lights?.map(light => {
      if (!light || !light.position || typeof light.position.x !== 'number' || 
          typeof light.position.y !== 'number') {
        console.warn('Invalid light data:', light);
        return null;
      }
      
      // Convert position to grid coordinates
      const gridPosition = pixelToGrid(light.position as Point, editorData.resolution);
      
      return {
        position: {
          x: gridPosition.x,
          y: gridPosition.y
        },
        // Convert range from pixels back to grid units
        range: typeof light.range === 'number' 
          ? light.range / editorData.resolution.pixels_per_grid 
          : 0,
        intensity: light.intensity,
        color: light.color,
        shadows: light.shadows
      };
    }).filter(Boolean) || [];
    
    // Convert format to number if it's a string
    const format = typeof editorData.format === 'string'
      ? parseFloat(editorData.format)
      : editorData.format;
    
    // Create a properly formatted UVTT object with grid coordinates
    const formattedUvtt = {
      format,
      resolution: editorData.resolution,
      // Preserve the array of arrays structure for line_of_sight
      line_of_sight: cleanLineOfSight.length > 0 ? cleanLineOfSight : [],
      objects_line_of_sight: cleanObjectsLineOfSight.length > 0 ? cleanObjectsLineOfSight : [],
      portals: gridPortals.filter(portal => portal !== null) as {
        position: { x: number; y: number };
        bounds: { x: number; y: number }[];
        rotation: number;
        closed: boolean;
        freestanding: boolean;
      }[],
      lights: gridLights.filter(light => light !== null) as {
        position: { x: number; y: number };
        range: number;
        intensity: number;
        color: string;
        shadows: boolean;
      }[],
      environment: editorData.environment || { 
        baked_lighting: false, 
        ambient_light: "#ffffff" 
      }
      //image: editorData.image
    };
    
    console.log('Formatted UVTT for saving with line_of_sight structure:', 
      formattedUvtt.line_of_sight ? `[${formattedUvtt.line_of_sight.length} walls]` : 'undefined');
    
    // Create the update data
    const mapUpdateData = {
      name: mapName,
      uvtt: formattedUvtt
    };
    
    try {
      // Use MapsClient to update the map
      await mapsClient.updateMap(mapId.value, mapUpdateData);
      
      // Show success message
      console.log('Map saved successfully!');
      
      // Redirect to map details page if needed
      // router.push({
      //   name: 'map-detail',
      //   params: { id: mapId.value }
      // });
    } catch (updateError) {
      console.error('Error updating map:', updateError);
      
      // Try removing any properties that might cause compatibility issues
      const safeUpdateData = {
        name: mapName,
        uvtt: {
          ...formattedUvtt,
          format: typeof formattedUvtt.format === 'string' ? parseInt(formattedUvtt.format, 10) : formattedUvtt.format
        }
      };
      
      console.log('Attempting update with sanitized data...');
      await mapsClient.updateMap(mapId.value, safeUpdateData);
      
      // Show success message
      console.log('Map saved successfully (with format conversion)!');
      
      // Redirect to map details page if needed
      // router.push({
      //   name: 'map-detail',
      //   params: { id: mapId.value }
      // });
    }
  } catch (err) {
    console.error('Error saving map:', err);
    // Show error message
    console.error('Failed to save map: ' + (err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.map-editor-page {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;
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