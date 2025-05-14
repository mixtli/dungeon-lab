<template>
    <div class="map-editor-container">
        <div class="map-editor-workspace">
            <!-- Main editor layout with sidebar and canvas -->
            <div class="map-editor-sidebar">
                <!-- Editor toolbar component -->
                <EditorToolbar :current-tool="editorState.currentTool.value" @tool-selected="editorState.setTool" />

                <!-- Properties panel (conditional based on selection) -->
                <EditorPropertiesPanel v-if="editorState.selectedObjectIds.value.length > 0"
                    :selected-objects="editorState.selectedObjects.value" @property-updated="handlePropertyUpdate" />

                <!-- Layer panel -->
                <EditorLayerPanel :walls="editorState.walls.value" :portals="editorState.portals.value"
                    :lights="editorState.lights.value" @visibility-changed="handleLayerVisibility" />
            </div>

            <!-- Main canvas area -->
            <div class="map-editor-canvas-container">
                <EditorCanvas :walls="editorState.walls.value" :portals="editorState.portals.value"
                    :lights="editorState.lights.value" :selected-object-ids="editorState.selectedObjectIds.value"
                    :current-tool="editorState.currentTool.value" :grid-config="editorState.gridConfig"
                    :map-metadata="editorState.mapMetadata" :viewport-transform="editorState.viewportTransform"
                    @object-selected="handleObjectSelected" @object-added="handleObjectAdded"
                    @object-modified="handleObjectModified" @object-removed="handleObjectRemoved" />
            </div>
        </div>

        <!-- Bottom toolbar -->
        <div class="map-editor-footer">
            <div class="map-info">
                <span>{{ editorState.mapMetadata.name }}</span>
                <span v-if="editorState.isModified.value">*</span>
            </div>

            <div class="map-actions">
                <button @click="handleSave" class="save-button">Save</button>
                <button @click="handleExport" class="export-button">Export UVTT</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useEditorState } from './composables/useEditorState.mjs';
import type {
    AnyEditorObject,
    WallObject,
    PortalObject,
    LightObject,
    UVTTData
} from '@dungeon-lab/shared/src/types/mapEditor.mts';

// Import editor components
import EditorToolbar from './components/EditorToolbar.vue';
import EditorCanvas from './components/EditorCanvas.vue';
import EditorPropertiesPanel from './components/EditorPropertiesPanel.vue';
import EditorLayerPanel from './components/EditorLayerPanel.vue';

// Define props
const props = defineProps<{
    mapId?: string;
    initialData?: UVTTData | null;
}>();

// Define emits
const emit = defineEmits<{
    (e: 'save', data: UVTTData): void;
}>();

// Initialize the editor state
const editorState = useEditorState();

// Watch for initial data to load
watch(() => props.initialData, (newData) => {
    if (newData) {
        loadMapData(newData);
    }
}, { immediate: true });

// Load map data from UVTT
const loadMapData = (data: UVTTData) => {
    try {
        console.log('Loading map data:', {
            format: data.format,
            resolution: data.resolution,
            line_of_sight_length: data.line_of_sight?.length || 0,
            portals_length: data.portals?.length || 0,
            lights_length: data.lights?.length || 0
        });
        
        // Log the first few line_of_sight entries to understand their structure
        if (data.line_of_sight && data.line_of_sight.length > 0) {
            console.log('First line_of_sight entry structure:', JSON.stringify(data.line_of_sight[0]));
            console.log('line_of_sight sample (first 3 entries):', JSON.stringify(data.line_of_sight.slice(0, 3)));
        }

        // Set the map metadata
        editorState.mapMetadata = {
            ...data,
            name: 'Untitled Map' // Use default name if not provided
        };
        
        // Update name if it exists in props
        if (props.mapId) {
            editorState.mapMetadata.name = `Map ${props.mapId}`;
        }

        // Load walls
        if (data.line_of_sight) {
            console.log('Loading line_of_sight data:', data.line_of_sight);
            console.log('line_of_sight type:', typeof data.line_of_sight, Array.isArray(data.line_of_sight));
            
            // Ensure line_of_sight is an array
            if (Array.isArray(data.line_of_sight)) {
                // Reset the walls array
                editorState.walls.value = [];
                
                // Process each wall
                data.line_of_sight.forEach((wall, wallIndex) => {
                    if (Array.isArray(wall)) {
                        // For nested arrays, each wall is an array of points
                        console.log(`Processing wall ${wallIndex} with ${wall.length} points`);
                        
                        // Convert the points to our internal format
                        const wallPoints = wall.map(point => {
                            if (point && typeof point.x === 'number' && typeof point.y === 'number') {
                                return [point.x, point.y];
                            }
                            return null;
                        }).filter(point => point !== null) as [number, number][];
                        
                        if (wallPoints.length >= 2) {
                            // Create a new wall object
                            editorState.walls.value.push({
                                id: `wall-${wallIndex}`,
                                objectType: 'wall',
                                points: flattenWallPointsForKonva(wallPoints),
                                visible: true,
                                locked: false
                            });
                        }
                    } else if (wall && typeof wall.x === 'number' && typeof wall.y === 'number') {
                        // For flat arrays, each element is a point
                        console.warn('Unexpected format: line_of_sight contains individual points, not arrays of points');
                    }
                });
                
                console.log(`Loaded ${editorState.walls.value.length} walls`);
            }
        }

        // Load portals
        if (data.portals) {
            editorState.portals.value = data.portals.map((portal, index) => ({
                id: `portal-${index}`,
                objectType: 'portal',
                position: portal.position,
                rotation: portal.rotation,
                bounds: portal.bounds,
                closed: portal.closed,
                freestanding: portal.freestanding,
                visible: true,
                locked: false
            }));
        }

        // Load lights
        if (data.lights) {
            editorState.lights.value = data.lights.map((light, index) => ({
                id: `light-${index}`,
                objectType: 'light',
                position: light.position,
                range: light.range,
                intensity: light.intensity,
                color: light.color,
                shadows: light.shadows,
                visible: true,
                locked: false
            }));
        }

        // Reset modification flag
        editorState.isModified.value = false;
    } catch (error) {
        console.error('Error loading map data:', error);
    }
};

// Helper for flattening wall points for Konva
const flattenWallPointsForKonva = (points: [number, number][]): number[] => {
    // Konva expects a flat array of numbers [x1, y1, x2, y2, ...]
    return points.flatMap(point => [point[0], point[1]]);
};

// Event handlers
const handleObjectSelected = (id: string | null, addToSelection = false) => {
    editorState.selectObject(id, addToSelection);
};

const handleObjectAdded = (object: AnyEditorObject) => {
    if (object.objectType === 'wall') {
        editorState.addWall(object as WallObject);
    } else if (object.objectType === 'portal') {
        editorState.addPortal(object as PortalObject);
    } else if (object.objectType === 'light') {
        editorState.addLight(object as LightObject);
    }
    
    // Mark as modified
    editorState.isModified.value = true;
};

const handleObjectModified = (id: string, updates: Partial<AnyEditorObject>) => {
    // Special case for viewport transform
    if (id === 'viewport' && 'viewportTransform' in updates) {
        // Update the viewport transform directly
        const viewportUpdates = updates.viewportTransform as { scale: number; position: { x: number; y: number } };
        editorState.viewportTransform.scale = viewportUpdates.scale;
        editorState.viewportTransform.position = viewportUpdates.position;
        return;
    }

    // Find object to determine its type
    const object = editorState.allObjects.value.find(obj => obj.id === id);

    if (!object) return;

    if (object.objectType === 'wall') {
        editorState.updateWall(id, updates as Partial<WallObject>);
    } else if (object.objectType === 'portal') {
        editorState.updatePortal(id, updates as Partial<PortalObject>);
    } else if (object.objectType === 'light') {
        editorState.updateLight(id, updates as Partial<LightObject>);
    }
    
    // Mark as modified
    editorState.isModified.value = true;
};

const handleObjectRemoved = (id: string) => {
    editorState.removeObject(id);
    
    // Mark as modified
    editorState.isModified.value = true;
};

const handlePropertyUpdate = (objectId: string, property: string, value: unknown) => {
    const object = editorState.allObjects.value.find(obj => obj.id === objectId);

    if (!object) return;

    const updates = { [property]: value };

    handleObjectModified(objectId, updates);
};

const handleLayerVisibility = (layerType: 'walls' | 'portals' | 'lights', visible: boolean) => {
    // Update visibility for all objects in the layer
    const collection = editorState[layerType].value;

    collection.forEach((obj: AnyEditorObject) => {
        handleObjectModified(obj.id, { visible });
    });
};

const handleSave = async () => {
    // Convert editor state to UVTT format
    const uvttData = convertEditorStateToUVTT();
    
    // Emit save event with the data
    emit('save', uvttData);
    
    // Reset modification flag
    editorState.isModified.value = false;
};

const handleExport = () => {
    // Convert editor state to UVTT format
    const uvttData = convertEditorStateToUVTT();
    
    // Create a JSON string
    const jsonString = JSON.stringify(uvttData, null, 2);
    
    // Create a blob and trigger download
    const blob = new Blob([jsonString], { type: 'application/uvtt' });
    const url = URL.createObjectURL(blob);
    const filename = `${editorState.mapMetadata.name || 'map'}.uvtt`;
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Convert editor state to UVTT format
const convertEditorStateToUVTT = (): UVTTData => {
    // Convert walls to line_of_sight
    const line_of_sight = editorState.walls.value.flatMap(wall => {
        const points = [];
        for (let i = 0; i < wall.points.length; i += 2) {
            points.push({
                x: wall.points[i],
                y: wall.points[i + 1]
            });
        }
        return points;
    });
    
    // Convert portals
    const portals = editorState.portals.value.map(portal => ({
        position: portal.position,
        bounds: portal.bounds,
        rotation: portal.rotation,
        closed: portal.closed,
        freestanding: portal.freestanding
    }));
    
    // Convert lights
    const lights = editorState.lights.value.map(light => ({
        position: light.position,
        range: light.range,
        intensity: light.intensity,
        color: light.color,
        shadows: light.shadows
    }));
    
    // Return UVTT data
    return {
        format: editorState.mapMetadata.format || 1.0,
        resolution: editorState.mapMetadata.resolution,
        line_of_sight,
        portals,
        environment: editorState.mapMetadata.environment || {
            baked_lighting: false,
            ambient_light: '#ffffff'
        },
        lights,
        image: editorState.mapMetadata.image
    };
};

// Lifecycle hooks
onMounted(() => {
    // Initialize editor or load map data
    // Removed event listener for beforeunload
});

onUnmounted(() => {
    // Removed event listener for beforeunload
});

// Prevent accidental navigation when map is modified (disabled)
// const handleBeforeUnload = (e: BeforeUnloadEvent) => {
//     if (editorState.isModified.value) {
//         const message = 'You have unsaved changes. Are you sure you want to leave?';
//         e.returnValue = message;
//         return message;
//     }
// };
</script>

<style scoped>
.map-editor-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
}

.map-editor-workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.map-editor-sidebar {
    width: 300px;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.map-editor-canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.map-editor-footer {
    height: 40px;
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
}

.map-info {
    font-size: 14px;
    color: #333;
}

.map-actions {
    display: flex;
    gap: 8px;
}

.map-actions button {
    padding: 4px 12px;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
}

.map-actions button:hover {
    background: #e0e0e0;
}

.save-button {
    background-color: #4CAF50 !important;
    color: white !important;
}

.export-button {
    background-color: #2196F3 !important;
    color: white !important;
}
</style>