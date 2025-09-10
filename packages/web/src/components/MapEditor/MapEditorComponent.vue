<template>
    <div class="map-editor-container">
        <div class="map-editor-workspace">
            <!-- Main editor layout with sidebar and canvas -->
            <div class="map-editor-sidebar">
                <!-- Editor toolbar component -->
                <EditorToolbar 
                    :current-tool="editorState.currentTool.value" 
                    :current-wall-type="currentWallType"
                    :current-grid-size="editorState.gridConfig.worldUnitsPerCell"
                    :grid-visible="editorState.gridConfig.visible"
                    :snap-enabled="editorState.gridConfig.snap"
                    @tool-selected="editorState.setTool" 
                    @wall-type-changed="handleWallTypeChanged"
                    @grid-size-changed="handleGridSizeChanged"
                    @toggle-grid="handleToggleGrid"
                    @toggle-snap="handleToggleSnap"
                />

                <!-- Properties panel removed - using floating inspector window instead -->

                <!-- Layer panel -->
                <EditorLayerPanel :walls="editorState.walls.value" 
                    :objects="editorState.objects.value"
                    :doors="editorState.doors.value"
                    :lights="editorState.lights.value" 
                    @visibility-changed="handleLayerVisibility" />
            </div>

            <!-- Main canvas area -->
            <div class="map-editor-canvas-container">
                <!-- Coordinate display in upper right -->
                <CoordinateDisplay 
                    :pixel-coordinates="mousePosition.pixel" 
                    :grid-coordinates="mousePosition.grid"
                />
                
                <EditorCanvas :walls="editorState.walls.value" 
                    :objects="editorState.objects.value"
                    :doors="editorState.doors.value"
                    :lights="editorState.lights.value" 
                    :selected-object-ids="editorState.selectedObjectIds.value"
                    :current-tool="editorState.currentTool.value" 
                    :grid-config="editorState.gridConfig"
                    :map-metadata="editorState.mapMetadata" 
                    :viewport-transform="editorState.viewportTransform"
                    @object-selected="handleObjectSelected" 
                    @object-added="handleObjectAdded"
                    @object-modified="handleObjectModified" 
                    @object-removed="handleObjectRemoved"
                    @mouse-move="handleMouseMove"
                    @selection-cleared="handleSelectionCleared" />
            </div>
        </div>

        <!-- Floating Inspector Window -->
        <InspectorWindow
            :selected-objects="editorState.selectedObjects.value"
            :grid-size="editorState.gridConfig.worldUnitsPerCell"
            :visible="inspectorVisible"
            @property-updated="handlePropertyUpdate"
            @position-updated="handlePositionUpdate"
            @delete-objects="handleDeleteObjects"
            @duplicate-objects="handleDuplicateObjects"
            @close="handleInspectorClose"
        />

        <!-- Bottom toolbar -->
        <div class="map-editor-footer">
            <div class="map-info">
                <span>{{ editorState.mapMetadata.name }}</span>
                <span v-if="editorState.isModified.value">*</span>
            </div>

            <div class="map-actions">
                <button @click="handleSave" class="save-button">Save</button>
                <button @click="() => handleExport('uvtt')" class="export-button">Export UVTT</button>
                <button @click="() => handleExport('dd2vtt')" class="export-button export-dd2vtt-button">Export DD2VTT</button>
                <button @click="toggleInspector" class="inspector-button" :class="{ active: inspectorVisible }">Inspector</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useEditorState } from './composables/useEditorState.mjs';
// Removed UVTT conversion import - using pure world coordinates
import type {
    WallObject,
    DoorObject,
    LightObject,
    ObjectEditorObject,
    Point,
    AnyEditorObject
} from '@dungeon-lab/shared/types/index.mjs';
import type { internalMapDataSchema } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import { z } from 'zod';

type InternalMapData = z.infer<typeof internalMapDataSchema>;
import { MapsClient } from '@dungeon-lab/client/index.mjs';

// Update payload types (matches EditorCanvas.vue)
interface ViewportUpdate {
    viewportTransform?: {
        scale: number;
        position: Point;
    };
}

interface GridConfigUpdate {
    worldUnitsPerCell?: number;
}

interface GridOffsetUpdate {
    offset?: Point;
}

// Union type for all possible updates
type EditorUpdatePayload = 
    | Partial<WallObject | DoorObject | LightObject | ObjectEditorObject>
    | ViewportUpdate 
    | GridConfigUpdate 
    | GridOffsetUpdate;

// Import editor components
import EditorToolbar from './components/EditorToolbar.vue';
import EditorCanvas from './components/EditorCanvas.vue';
import InspectorWindow from './components/InspectorWindow.vue';
import EditorLayerPanel from './components/EditorLayerPanel.vue';
import CoordinateDisplay from './components/CoordinateDisplay.vue';
const mapsClient = new MapsClient();

// Define props
const props = defineProps<{
    mapId?: string;
    initialData?: InternalMapData | null;
    imageUrl?: string;
}>();

// Define emits
const emit = defineEmits<{
    (e: 'save', data: { mapData: InternalMapData }): void;
}>();

// Initialize the editor state
const editorState = useEditorState();

// Wall type state
const currentWallType = ref<'regular' | 'object'>('regular');

// Mouse position state for coordinate display
const mousePosition = ref<{
    pixel: Point | null;
    grid: Point | null;
}>({
    pixel: null,
    grid: null
});

// Inspector window state
const inspectorVisible = ref(false);

// Removed unused flattenWallPointsForKonva helper function

// Load map data from new internal format
const loadMapData = (data: InternalMapData) => {
    try {
        console.log('Loading map data (new format):', {
            version: data.version,
            coordinates: data.coordinates,
            walls_length: data.walls?.length || 0,
            objects_length: data.objects?.length || 0,
            doors_length: data.doors?.length || 0,
            lights_length: data.lights?.length || 0
        });
        
        console.log('EditorState properties:', Object.keys(editorState));
        console.log('EditorState.objects:', editorState.objects);
        
        // Set the map metadata using the new format directly - no conversion needed!
        editorState.mapMetadata = {
            name: 'Untitled Map', // Use default name - will be set by parent component
            image: props.imageUrl || '', // Use image URL from props
            coordinates: data.coordinates, // Use actual image dimensions from data!
            environment: data.environment
        };
        
        // Update name if it exists in props
        if (props.mapId) {
            editorState.mapMetadata.name = `Map ${props.mapId}`;
        }

        // Update grid size from converted metadata with fallback
        const worldUnitsFromMetadata = editorState.mapMetadata.coordinates.worldUnitsPerGridCell;
        editorState.gridConfig.worldUnitsPerCell = worldUnitsFromMetadata || 50; // Default fallback
        console.log(`Grid world units per cell set to: ${editorState.gridConfig.worldUnitsPerCell} from converted map data (was ${worldUnitsFromMetadata})`);

        // Load walls from InternalMapData format
        if (data.walls && Array.isArray(data.walls)) {
            console.log('Loading walls from InternalMapData format:', data.walls);
            
            // Reset the walls array
            editorState.walls.value = [];
            
            // Convert server Wall format (start/end) to editor WallObject format (points array)
            data.walls.forEach((serverWall, wallIndex) => {
                // Convert start/end coordinates to points array for Konva
                const points = [
                    serverWall.start.x, serverWall.start.y,
                    serverWall.end.x, serverWall.end.y
                ];
                
                editorState.walls.value.push({
                    id: serverWall.id || `wall-${wallIndex}`,
                    objectType: 'wall',
                    points: points,
                    visible: true,
                    locked: false
                });
            });
            
            console.log(`Loaded ${editorState.walls.value.length} walls from InternalMapData`);
        }
        
        // Load objects from InternalMapData format 
        if (data.objects && Array.isArray(data.objects)) {
            console.log('Loading objects from InternalMapData format:', data.objects);
            
            // Reset the objects array - ensure editorState.objects exists
            if (editorState.objects?.value) {
                editorState.objects.value = [];
                
                // Convert server objects to editor objects
                data.objects.forEach((serverObject, objectIndex) => {
                    // Get object center position
                    const objPosition = {
                        x: serverObject.position?.x || 0,
                        y: serverObject.position?.y || 0
                    };
                    
                    // Convert bounds array (absolute coordinates) to flat points array (relative to position)
                    const points: number[] = [];
                    if (serverObject.bounds && Array.isArray(serverObject.bounds)) {
                        serverObject.bounds.forEach(point => {
                            points.push(point.x - objPosition.x, point.y - objPosition.y);
                        });
                    }
                    
                    editorState.objects.value.push({
                        id: serverObject.id || `object-${objectIndex}`,
                        objectType: 'object',
                        position: objPosition,
                        rotation: serverObject.rotation || 0,
                        points: points,
                        shapeType: serverObject.shapeType || 'polygon',
                        type: serverObject.type || 'other',
                        height: serverObject.height || 0,
                        blocksMovement: serverObject.blocksMovement || false,
                        blocksLight: serverObject.blocksLight || false,
                        blocksSound: serverObject.blocksSound || false,
                        interactable: serverObject.interactable || false,
                        searchable: serverObject.searchable || false,
                        moveable: serverObject.moveable || false,
                        color: serverObject.color || '#666666',
                        opacity: serverObject.opacity || 0.3,
                        tags: serverObject.tags || [],
                        locked: false
                    });
                });
                
                console.log(`Loaded ${editorState.objects.value.length} objects from InternalMapData`);
            } else {
                console.warn('editorState.objects is not available - objects loading skipped. You may need to refresh your browser.');
            }
        }

        // Load doors
        if (data.doors) {
            editorState.doors.value = data.doors.map((door, index) => ({
                id: door.id || `door-${index}`,
                objectType: 'door' as const,
                coords: door.coords || [0, 0, 0, 0],
                state: door.state || 'closed',
                material: door.material || 'wood',
                stroke: door.stroke || '#8B4513',
                strokeWidth: door.strokeWidth || 3,
                requiresKey: door.requiresKey || false,
                tags: door.tags || [],
                visible: true,
                locked: false
            }));
        }

        // Load lights from enhanced schema format
        if (data.lights) {
            console.log('[MapEditorComponent] Loading lights from enhanced schema format');
            editorState.lights.value = data.lights.map((light, index) => ({
                id: light.id || `light-${index}`,
                objectType: 'light' as const,
                position: light.position,
                type: light.type || 'point',
                brightRadius: light.brightRadius || 0,
                dimRadius: light.dimRadius || 0,
                intensity: light.intensity || 1,
                color: light.color || '#ffffff',
                temperature: light.temperature,
                shadows: light.shadows !== undefined ? light.shadows : true,
                shadowQuality: light.shadowQuality || 'medium',
                falloffType: light.falloffType || 'quadratic',
                animation: light.animation || {
                    type: 'none',
                    speed: 1,
                    intensity: 0.1
                },
                enabled: light.enabled !== undefined ? light.enabled : true,
                controllable: light.controllable !== undefined ? light.controllable : false,
                name: light.name,
                description: light.description,
                visible: true,
                locked: false,
                selected: false
            }));
        }

        // Reset modification flag
        editorState.isModified.value = false;
    } catch (error) {
        console.error('Error loading map data:', error);
    }
};

// Watch for initial data to load
watch(() => props.initialData, (newData) => {
    if (newData) {
        loadMapData(newData);
    }
}, { immediate: true });

// Watch for image URL changes
watch(() => props.imageUrl, (newImageUrl) => {
    if (editorState.mapMetadata) {
        editorState.mapMetadata.image = newImageUrl || '';
    }
});

// Event handlers
const handleObjectSelected = (id: string | null, addToSelection: boolean) => {
    editorState.selectObject(id, addToSelection);
};

const handleSelectionCleared = () => {
    editorState.selectedObjectIds.value = [];
};

const handleObjectAdded = (object: AnyEditorObject) => {
    editorState.isModified.value = true;
    if (object.objectType === 'wall') {
        editorState.addWall(object as WallObject);
    } else if (object.objectType === 'object') {
        editorState.addObject(object as ObjectEditorObject);
    } else if (object.objectType === 'door') {
        console.log('[MapEditorComponent] handleObjectAdded for Door. Received door object:', JSON.parse(JSON.stringify(object)));
        editorState.addDoor(object as DoorObject);
    } else if (object.objectType === 'light') {
        const light = object as LightObject;
        // Light bright radius is in world units
        console.log(`MapEditorComponent: Adding new light. Bright radius (world units): ${light.brightRadius}`);

        editorState.addLight({
            ...light
        });
    }
};

const handleObjectModified = (id: string, updates: EditorUpdatePayload) => {
    // Special case for viewport transform
    if (id === 'viewport' && 'viewportTransform' in updates) {
        // Update the viewport transform directly
        const viewportUpdates = updates.viewportTransform as { scale: number; position: { x: number; y: number } };
        editorState.viewportTransform.scale = viewportUpdates.scale;
        editorState.viewportTransform.position = viewportUpdates.position;
        return;
    }

    // Special case for grid config updates
    if (id === 'grid-config') {
        if ('worldUnitsPerCell' in updates && typeof updates.worldUnitsPerCell === 'number') {
            editorState.gridConfig.worldUnitsPerCell = updates.worldUnitsPerCell;
            editorState.isModified.value = true;
        }
        return;
    }

    // Special case for grid offset updates
    if (id === 'grid-offset') {
        if ('offset' in updates && typeof updates.offset === 'object' && updates.offset) {
            const offset = updates.offset as { x: number; y: number };
            editorState.mapMetadata.coordinates.offset = offset;
            editorState.isModified.value = true;
        }
        return;
    }

    // Find object to determine its type
    const object = editorState.allObjects.value.find(obj => obj.id === id);

    if (!object) return;

    if (object.objectType === 'wall') {
        editorState.updateWall(id, updates as Partial<WallObject>);
    } else if (object.objectType === 'object') {
        editorState.updateObject(id, updates as Partial<ObjectEditorObject>);
    } else if (object.objectType === 'door') {
        editorState.updateDoor(id, updates as Partial<DoorObject>);
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

// Inspector window handlers
const handlePositionUpdate = (objectId: string, x: number, y: number) => {
    const object = editorState.allObjects.value.find(obj => obj.id === objectId);
    if (!object) return;
    
    let updates;
    
    // Handle position updates based on object type
    if (object.objectType === 'light') {
        // Lights store position in position.x/y
        updates = { position: { x, y } };
    } else if (object.objectType === 'object') {
        // ObjectEditorObjects store position in position.x/y
        updates = { position: { x, y } };
    } else if (object.objectType === 'door') {
        // For doors, we would need to translate coords array, but position updates 
        // for doors should be handled through coord array updates instead
        console.warn('Position updates for doors should be handled through coord array updates');
        return;
    } else {
        // For walls and other objects, position updates aren't directly supported
        console.warn(`Position updates not supported for ${object.objectType} objects`);
        return;
    }
    
    handleObjectModified(objectId, updates);
};

const handleDeleteObjects = (objectIds: string[]) => {
    objectIds.forEach(id => {
        handleObjectRemoved(id);
    });
};

const handleDuplicateObjects = (objectIds: string[]) => {
    // TODO: Implement object duplication logic
    console.log('Duplicate objects:', objectIds);
    // For now, just log - this can be implemented later
};

const handleInspectorClose = () => {
    inspectorVisible.value = false;
};

const toggleInspector = () => {
    inspectorVisible.value = !inspectorVisible.value;
};

// Auto-show inspector when objects are selected
watch(() => editorState.selectedObjectIds.value.length, (newLength) => {
    if (newLength > 0 && !inspectorVisible.value) {
        inspectorVisible.value = true;
    }
});

const handleLayerVisibility = (layerType: 'walls' | 'objects' | 'doors' | 'lights', visible: boolean) => {
    // Update visibility for all objects in the layer
    let collection;
    
    if (layerType === 'walls') {
        collection = editorState.walls.value;
    } else if (layerType === 'objects') {
        collection = editorState.objects.value;
    } else if (layerType === 'doors') {
        collection = editorState.doors.value;
    } else if (layerType === 'lights') {
        collection = editorState.lights.value;
    } else {
        return; // Unknown layer type
    }

    collection.forEach((obj: AnyEditorObject) => {
        handleObjectModified(obj.id, { visible });
    });
};

const handleSave = async () => {
    // Convert editor state to world coordinate system
    const mapData = convertEditorStateToWorldCoordinates();
    
    // Emit save event with the data
    emit('save', mapData);
    
    // Reset modification flag
    editorState.isModified.value = false;
};

const handleExport = async (format: 'uvtt' | 'dd2vtt' = 'uvtt') => {
    if (!props.mapId) {
        alert('No mapId provided. Cannot export.');
        return;
    }
    try {
        // Call the new server endpoint to get UVTT data
        const uvttData = await mapsClient.exportMapAsUVTT(props.mapId);
        
        // Get map name for filename
        const mapData = await mapsClient.getMap(props.mapId);
        const filename = `${mapData.name || 'map'}.${format}`;
        
        // Create a JSON string
        const jsonString = JSON.stringify(uvttData, null, 2);
        
        // Create a blob and trigger download
        const blob = new Blob([jsonString], { type: 'application/uvtt' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Export error:', err);
        alert('Failed to export map: ' + (err instanceof Error ? err.message : String(err)));
    }
};

// Helper function to convert flat points array to wall segments with start/end coordinates
const convertPointsToWallSegments = (wall: WallObject, wallType: 'wall' | 'terrain' = 'wall') => {
    const segments = [];
    const points = wall.points;
    
    // Convert flat array [x1, y1, x2, y2, x3, y3, ...] to segments
    for (let i = 0; i < points.length - 2; i += 2) {
        segments.push({
            id: `${wall.id}-segment-${i/2}`, // Unique ID for each segment  
            start: {
                x: points[i],
                y: points[i + 1], 
                z: 0 // Default z-coordinate for 2D walls
            },
            end: {
                x: points[i + 2],
                y: points[i + 3],
                z: 0 // Default z-coordinate for 2D walls  
            },
            height: 10, // Default height for editor walls
            thickness: 1, // Default thickness
            material: 'stone' as const, // Default material for editor walls
            blocksMovement: true,
            blocksLight: wallType === 'wall', // Walls block light, terrain may not
            blocksSound: wallType === 'wall',
            transparency: 0, // Opaque by default
            oneWayVision: false,
            destructible: false,
            name: undefined, // Editor walls don't have names by default
            description: `${wallType === 'wall' ? 'Wall' : 'Terrain'} segment`,
            tags: []
        });
    }
    
    return segments;
};

// Convert editor state to world coordinate system  
const convertEditorStateToWorldCoordinates = () => {
    // Convert walls - from points arrays to start/end segments
    const walls = editorState.walls.value.flatMap(wall => 
        convertPointsToWallSegments(wall, 'wall')
    );
    
    // Use walls directly (no separate objectWalls collection)
    const allWalls = [...walls];
    
    // Convert doors 
    const doors = editorState.doors.value.map(door => ({
        id: door.id,
        tags: door.tags || [],
        material: door.material || 'wood',
        state: door.state || 'closed',
        coords: door.coords || [0, 0, 0, 0],
        stroke: door.stroke || '#8B4513',
        strokeWidth: door.strokeWidth || 3,
        requiresKey: door.requiresKey || false
    }));
    
    // Convert lights
    const lights = editorState.lights.value.map(light => ({
        id: light.id || `light-${Date.now()}`,
        position: {
            x: light.position.x,
            y: light.position.y,
            z: 5 // Default Z-coordinate for 2D editor lights
        },
        type: light.type || 'point',
        brightRadius: light.brightRadius || 0,
        dimRadius: light.dimRadius || 0,
        intensity: light.intensity ?? 1,
        color: light.color || '#ffffff',
        temperature: light.temperature,
        shadows: light.shadows ?? true,
        shadowQuality: light.shadowQuality || 'medium',
        falloffType: light.falloffType || 'quadratic',
        animation: light.animation || {
            type: 'none',
            speed: 1,
            intensity: 0.1
        },
        enabled: light.enabled ?? true,
        controllable: light.controllable ?? false,
        tags: [], // Empty tags array for editor lights
        name: light.name,
        description: light.description
    }));

    // Convert objects from editor format to schema format
    const objects = editorState.objects.value.map(obj => ({
        id: obj.id,
        position: {
            x: obj.position.x,
            y: obj.position.y,
            z: 0
        },
        rotation: obj.rotation || 0,
        // bounds should be a simple array of coordinate objects (polygonSchema)
        // Convert from relative points to absolute world coordinates by adding object position
        bounds: obj.points ? obj.points.reduce((acc: Array<{x: number, y: number}>, _, i, arr) => {
            if (i % 2 === 0) {
                acc.push({ 
                    x: arr[i] + obj.position.x, 
                    y: arr[i + 1] + obj.position.y 
                });
            }
            return acc;
        }, []) : [],
        shapeType: obj.shapeType || 'polygon',
        type: obj.type || 'other',
        height: obj.height || 1,
        blocksMovement: obj.blocksMovement ?? true,
        blocksLight: obj.blocksLight ?? false,
        blocksSound: obj.blocksSound ?? false,
        interactable: obj.interactable ?? false,
        searchable: obj.searchable ?? false,
        moveable: obj.moveable ?? false,
        color: obj.color || '#666666',
        opacity: obj.opacity ?? 1,
        tags: obj.tags || [],
        name: obj.name,
        description: obj.description
    }));
    
    // Return the complete mapData structure conforming to InternalMapData schema
    return {
        mapData: {
            version: '1.0',
            coordinates: editorState.mapMetadata.coordinates,
            walls: allWalls,
            terrain: [], // No terrain regions in current editor
            objects,
            regions: [], // No regions in current editor
            doors,
            lights,
            environment: editorState.mapMetadata.environment,
            semanticData: {
                mapType: 'other' as const,
                keywords: []
            },
            conversionSettings: {
                defaultPolygonPrecision: 16,
                useAdaptivePrecision: true,
                targetSegmentLength: 7.5
            }
        }
    };
};

// Handle wall type change
const handleWallTypeChanged = (type: 'regular' | 'object') => {
    currentWallType.value = type;
    console.log('Wall type changed to:', type);
};

// Handle grid toggle
const handleToggleGrid = () => {
    editorState.gridConfig.visible = !editorState.gridConfig.visible;
    console.log('Grid visibility toggled to:', editorState.gridConfig.visible);
};

// Handle snap toggle
const handleToggleSnap = () => {
    editorState.gridConfig.snap = !editorState.gridConfig.snap;
    console.log('Grid snap toggled to:', editorState.gridConfig.snap);
};

// Handle grid size change from toolbar input
const handleGridSizeChanged = (size: number) => {
    editorState.gridConfig.worldUnitsPerCell = size;
    editorState.isModified.value = true;
    console.log('Grid size changed to:', size);
};

// Handle mouse move events from canvas
const handleMouseMove = (pixelPos: Point, gridPos: Point) => {
    mousePosition.value = {
        pixel: pixelPos,
        grid: gridPos
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
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.map-editor-workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.map-editor-sidebar {
    width: 220px;
    border-right: 1px solid var(--stone-300, #ddd);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background-color: var(--stone, #f5f5f4);
}

@media (prefers-color-scheme: dark) {
    .map-editor-sidebar {
        border-right-color: var(--stone-600, #57534e);
        background-color: var(--stone-700, #44403c);
    }
}

.map-editor-canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.map-editor-footer {
    height: 40px;
    border-top: 1px solid var(--stone-300, #ddd);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    background-color: var(--stone, #f5f5f4);
}

@media (prefers-color-scheme: dark) {
    .map-editor-footer {
        border-top-color: var(--stone-600, #57534e);
        background-color: var(--stone-700, #44403c);
    }
}

.map-info {
    font-size: 14px;
    color: var(--onyx, #333);
}

@media (prefers-color-scheme: dark) {
    .map-info {
        color: var(--parchment, #f5f5dc);
    }
}

.map-actions {
    display: flex;
    gap: 8px;
}

.map-actions button {
    padding: 4px 12px;
    background: var(--stone-100, #f0f0f0);
    border: 1px solid var(--stone-300, #ccc);
    border-radius: 4px;
    cursor: pointer;
    color: var(--onyx, #333);
}

@media (prefers-color-scheme: dark) {
    .map-actions button {
        background: var(--stone-600, #57534e);
        border-color: var(--stone-500, #78716c);
        color: var(--parchment, #f5f5dc);
    }
}

.map-actions button:hover {
    background: var(--stone-200, #e0e0e0);
}

@media (prefers-color-scheme: dark) {
    .map-actions button:hover {
        background: var(--stone-500, #78716c);
    }
}

.save-button {
    background-color: #4CAF50 !important;
    color: white !important;
}

.export-button {
    background-color: #2196F3 !important;
    color: white !important;
}

.export-dd2vtt-button {
    background-color: #673AB7 !important;
}

.inspector-button {
    background-color: var(--gold-500, #eab308) !important;
    color: var(--stone-900, #1c1917) !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
}

.inspector-button:hover {
    background-color: var(--gold-600, #d97706) !important;
}

.inspector-button.active {
    background-color: var(--gold-600, #d97706) !important;
    box-shadow: 0 0 0 2px var(--gold-300, #fcd34d) !important;
}

@media (prefers-color-scheme: dark) {
    .inspector-button {
        background-color: var(--gold-600, #d97706) !important;
        color: var(--stone-100, #f5f5f4) !important;
    }
    
    .inspector-button:hover {
        background-color: var(--gold-700, #b45309) !important;
    }
    
    .inspector-button.active {
        background-color: var(--gold-700, #b45309) !important;
        box-shadow: 0 0 0 2px var(--gold-400, #facc15) !important;
    }
}
</style>