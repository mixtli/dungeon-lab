<template>
    <div ref="canvasContainer" class="editor-canvas-container">
        <v-stage ref="stage" :config="stageConfig" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
            @mouseup="handleMouseUp" @wheel="handleWheel" @dragend="handleStageDragEnd">
            <!-- Background layer with map image -->
            <v-layer ref="bgLayer">
                <v-image v-if="backgroundImage" :config="backgroundImageConfig" />
            </v-layer>

            <!-- Grid layer -->
            <v-layer ref="gridLayer" :config="gridLayerConfig">
                <v-line v-for="(x, index) in gridDrawingData.verticalLines" :key="`vgrid-${index}`" :config="{
                    points: [
                        x, gridDrawingData.worldView.y, 
                        x, gridDrawingData.worldView.y + gridDrawingData.worldView.height
                    ],
                    stroke: gridConfig.color,
                    strokeWidth: 1 / props.viewportTransform.scale,
                    opacity: gridConfig.opacity,
                    listening: false
                }" />
                <v-line v-for="(y, index) in gridDrawingData.horizontalLines" :key="`hgrid-${index}`" :config="{
                    points: [
                        gridDrawingData.worldView.x, y, 
                        gridDrawingData.worldView.x + gridDrawingData.worldView.width, y
                    ],
                    stroke: gridConfig.color,
                    strokeWidth: 1 / props.viewportTransform.scale,
                    opacity: gridConfig.opacity,
                    listening: false
                }" />
            </v-layer>

            <!-- Wall layer -->
            <v-layer ref="wallLayer">
                <v-line v-for="wall in visibleWalls" :key="wall.id" 
                    :config="getWallConfig(wall.points, wall.id.startsWith('object-wall-'))"
                    @click="handleObjectClick($event, wall.id)" 
                    @dragend="handleWallDragEnd($event, wall.id)" />
            </v-layer>
            
            <!-- Object Wall layer -->
            <v-layer ref="objectWallLayer">
                <v-line v-for="wall in visibleObjectWalls" :key="wall.id" :config="getObjectWallConfig(wall)"
                    @click="handleObjectClick($event, wall.id)" @dragend="handleWallDragEnd($event, wall.id)" />
            </v-layer>

            <!-- Add a dedicated vertices layer -->
            <v-layer ref="verticesLayer">
                <v-circle v-for="vertex in wallVertices" :key="`vertex-${vertex.wallId}-${vertex.index}`" 
                    :config="{
                        x: vertex.x,
                        y: vertex.y,
                        radius: 6,
                        fill: '#09f',
                        stroke: '#000',
                        strokeWidth: 1,
                        draggable: true
                    }"
                    @click="handleVertexClick($event, vertex.wallId, vertex.index)"
                    @dragmove="handleVertexDragMove($event, vertex.wallId, vertex.index)"
                    @dragend="handleVertexDragEnd($event, vertex.wallId, vertex.index)" />
            </v-layer>

            <!-- Portal layer -->
            <v-layer ref="portalLayer">
                <template v-for="portal in portals" :key="portal.id">
                    <v-group v-bind="getPortalGroupConfig(portal)" 
                        @click="(e: KonvaEventObject<MouseEvent>) => handleObjectClick(e, portal.id)"
                        @dragend="(e: KonvaEventObject<DragEvent>) => handlePortalDragEnd(e, portal.id)">
                        
                        <!-- Portal line segment -->
                        <v-line v-bind="getPortalLineConfig(portal)" />
                        
                        <!-- Portal endpoint handles (only show when selected) -->
                        <template v-if="props.selectedObjectIds.includes(portal.id)">
                            <v-circle v-bind="getPortalHandleConfig(portal, 0)"
                                @dragend="(e: KonvaEventObject<DragEvent>) => handlePortalEndpointDrag(e, portal.id, 0)" />
                            <v-circle v-bind="getPortalHandleConfig(portal, 1)"
                                @dragend="(e: KonvaEventObject<DragEvent>) => handlePortalEndpointDrag(e, portal.id, 1)" />
                        </template>
                    </v-group>
                </template>
            </v-layer>

            <!-- Light layer -->
            <v-layer ref="lightLayer">
                <v-group v-for="light in visibleLights" :key="light.id" :config="getLightGroupConfig(light)"
                    @click="handleObjectClick($event, light.id)" 
                    @dragend="handleLightDragEnd($event, light.id)">
                    <v-circle :config="getLightRangeConfig(light)" />
                    <v-circle :config="getLightMarkerConfig(light)" />
                </v-group>
            </v-layer>

            <!-- Selection layer -->
            <v-layer ref="selectionLayer">
                <v-transformer v-if="selectedObjectIds.length > 0" ref="transformer" :config="transformerConfig" />
            </v-layer>
        </v-stage>
        
        <!-- Status indicator -->
        <div v-if="isWallDrawingActive" class="drawing-status">
            <div class="status-badge">Drawing Wall</div>
            <div class="instructions">
                Click to add point, double-click to finish
            </div>
        </div>
        
        <!-- Tool help overlay -->
        <div v-if="showWallHelp" class="tool-help-overlay wall-help">
            <div class="tool-help-content">
                <h3>Wall Tool Usage</h3>
                <p>Click to start a wall, click again for each point, double-click to finish.</p>
                <button @click="hideWallHelp" class="close-help">Got it!</button>
            </div>
        </div>
        
        <!-- Hidden tools -->
        <WallTool 
            ref="wallTool" 
            :grid-config="gridConfig" 
            :is-active="currentTool === 'wall'"
            @wall-created="handleWallCreated" 
        />
        <SelectionTool
            ref="selectionTool"
            :is-active="currentTool === 'select'"
            @selection-ended="handleSelectionEnded"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import Konva from 'konva';
// Import KonvaEventObject as a value, not as a type
import { type KonvaEventObject } from 'konva/lib/Node.js';
import { useGridSystem } from '../composables/useGridSystem.mjs';
import WallTool from './tools/WallTool.vue';
import SelectionTool from './tools/SelectionTool.vue';
import type {
    WallObject,
    PortalObject,
    // LightObject,
    EditorToolType,
    GridConfig,
    Point,
    MapMetadata
} from '../../../../../shared/src/types/mapEditor.mjs';
import type { EditorLightObject } from '../composables/useEditorState.mjs';


interface KonvaLayer {
    getNode(): Konva.Layer
}

interface KonvaStage {
    getStage(): Konva.Stage
}

interface KonvaTransformer {
    getNode(): Konva.Transformer
}


// Props
const props = defineProps<{
    walls: WallObject[];
    objectWalls?: WallObject[];
    portals: PortalObject[];
    lights: EditorLightObject[];
    selectedObjectIds: string[];
    currentTool: EditorToolType;
    gridConfig: GridConfig;
    mapMetadata: MapMetadata;
    viewportTransform: { scale: number; position: Point };
}>();

// Emits
const emit = defineEmits<{
    (e: 'object-selected', id: string | null, addToSelection: boolean): void;
    (e: 'object-added', object: WallObject | PortalObject | EditorLightObject): void;
    (e: 'object-modified', id: string, updates: Partial<WallObject | PortalObject | EditorLightObject>): void;
    (e: 'object-removed', id: string): void;
    (e: 'mouse-move', pixelPos: Point, gridPos: Point): void;
}>();

// Refs
const canvasContainer = ref<HTMLDivElement | null>(null);
const stage = ref<KonvaStage | null>(null);
const bgLayer = ref<KonvaLayer | null>(null);
const gridLayer = ref<KonvaLayer | null>(null);
const wallLayer = ref<KonvaLayer | null>(null);
const portalLayer = ref<KonvaLayer | null>(null);
const lightLayer = ref<KonvaLayer | null>(null);
const selectionLayer = ref<KonvaLayer | null>(null);
const transformer = ref<KonvaTransformer | null>(null);
const wallTool = ref<InstanceType<typeof WallTool> | null>(null);
const selectionTool = ref<InstanceType<typeof SelectionTool> | null>(null);
const selectionRect = ref<Konva.Rect | null>(null);
const verticesLayer = ref<KonvaLayer | null>(null);
const objectWallLayer = ref<KonvaLayer | null>(null);

// Canvas state
const canvasSize = reactive({
    width: 1000,
    height: 800
});

// Wall tool UI state
const isWallDrawingActive = computed(() => {
    return props.currentTool === 'wall' && wallTool.value?.isDrawing === true;
});

const showWallHelp = ref(false);

const hideWallHelp = () => {
    showWallHelp.value = false;
    // Save this preference to localStorage
    localStorage.setItem('wall-help-dismissed', 'true');
};

// Background image
const backgroundImage = ref<HTMLImageElement | null>(null);
const backgroundImageConfig = computed(() => ({
    image: backgroundImage.value,
    width: backgroundImage.value?.width || 0,
    height: backgroundImage.value?.height || 0,
    x: 0,
    y: 0
}));

// Initialize grid system for local use (e.g. placing portals/lights)
const gridSystem = useGridSystem(props.gridConfig);

// Filtered objects by visibility
const visibleWalls = computed(() => {
    console.log('All walls:', props.walls.length);
    const visible = props.walls.filter(wall => wall.visible !== false);
    console.log('Visible walls:', visible.length);
    return visible;
});

const visibleObjectWalls = computed(() => {
    return props.objectWalls?.filter(wall => wall.visible !== false) || [];
});

const visibleLights = computed(() =>
    props.lights.filter(light => light.visible !== false)
);

// Stage configuration
const stageConfig = computed(() => ({
    width: canvasSize.width,
    height: canvasSize.height,
    draggable: props.currentTool === 'pan',
    x: props.viewportTransform.position.x,
    y: props.viewportTransform.position.y,
    scaleX: props.viewportTransform.scale,
    scaleY: props.viewportTransform.scale
}));

// Grid layer configuration
const gridLayerConfig = computed(() => ({
    visible: props.gridConfig.visible
}));

// Calculate grid lines and the visible world view for drawing
const gridDrawingData = computed(() => {
    const stageTransform = props.viewportTransform;
    const scale = stageTransform.scale || 1;

    // Calculate the world coordinates of the top-left corner of the visible canvas
    const worldOffsetX = -stageTransform.position.x / scale;
    const worldOffsetY = -stageTransform.position.y / scale;

    // Calculate the width and height of the visible world area
    const visibleWorldWidth = canvasSize.width / scale;
    const visibleWorldHeight = canvasSize.height / scale;

    const lines = gridSystem.getGridLines(
        visibleWorldWidth,
        visibleWorldHeight,
        worldOffsetX,
        worldOffsetY
    );

    return {
        verticalLines: lines.vertical,     // These are x-coordinates in world space
        horizontalLines: lines.horizontal, // These are y-coordinates in world space
        worldView: {                       // The bounding box in world space for drawing lines
            x: worldOffsetX,
            y: worldOffsetY,
            width: visibleWorldWidth,
            height: visibleWorldHeight
        }
    };
});

// Transformer configuration
const transformerConfig = computed(() => ({
    boundBoxFunc: (_oldBox: object, newBox: object) => {
        // Add constraints if needed
        return newBox;
    },
    rotateEnabled: true,
    resizeEnabled: true,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
}));

// Function to get wall config with the proper color based on wall type
const getWallConfig = (points: number[], isObjectWall: boolean = false) => {
    return {
        points,
        stroke: isObjectWall ? '#3399ff' : '#ff3333', // Blue for object walls, red for regular walls
        strokeWidth: 3,
        lineCap: 'round',
        lineJoin: 'round'
    };
};

const getPortalGroupConfig = (portal: PortalObject) => {
    const ppg = props.mapMetadata.resolution.pixels_per_grid;
    const pixelX = portal.position.x * ppg; // Convert grid to pixel
    const pixelY = portal.position.y * ppg; // Convert grid to pixel
    
    console.log('Portal group config (reverted to grid input logic):', {
        portalId: portal.id,
        gridPos_input: portal.position, // Expecting grid units from props
        pixelsPerGrid: ppg,
        finalPixelPos_group: { x: pixelX, y: pixelY }
    });
    
    return {
        x: pixelX, // Use converted pixel coordinates
        y: pixelY, // Use converted pixel coordinates
        draggable: props.currentTool === 'select',
        rotation: portal.rotation,
        id: portal.id
    };
};

const getPortalLineConfig = (portal: PortalObject) => {
    const ppg = props.mapMetadata.resolution.pixels_per_grid;

    // portal.bounds are absolute GRID coordinates: [{x,y}, {x,y}]
    // portal.position is absolute GRID coordinates for the group's center (already converted to pixels by getPortalGroupConfig for the group itself)
    // We need to calculate line points relative to the group's center, in PIXELS.

    if (!portal.bounds || portal.bounds.length < 2 || !portal.bounds[0] || !portal.bounds[1] || !portal.position) {
        const halfLengthPixels = 0.5 * ppg; // Default to 1 grid unit wide portal centered in the group
        console.warn('Portal line (default/malformed bounds or missing position - reverted logic):', {
            portalId: portal.id,
            portalPos_grid_input: portal.position, // This is grid
            portalBounds_grid_input: portal.bounds, // This is grid
            halfLengthPixels: halfLengthPixels,
            final_points_pixel_relative: [-halfLengthPixels, 0, halfLengthPixels, 0]
        });
        return {
            points: [-halfLengthPixels, 0, halfLengthPixels, 0],
            stroke: '#00FF00', // Bright green for all portals
            strokeWidth: 10, // Match object wall thickness
            lineCap: 'round',
            lineJoin: 'round'
        };
    }

    // Calculate relative pixel points for the line within the group
    // portal.position is the group's center in GRID coordinates.
    const p0_relative_pixel_x = (portal.bounds[0].x - portal.position.x) * ppg;
    const p0_relative_pixel_y = (portal.bounds[0].y - portal.position.y) * ppg;
    const p1_relative_pixel_x = (portal.bounds[1].x - portal.position.x) * ppg;
    const p1_relative_pixel_y = (portal.bounds[1].y - portal.position.y) * ppg;

    const relativePixelPoints = [
        p0_relative_pixel_x, p0_relative_pixel_y,
        p1_relative_pixel_x, p1_relative_pixel_y
    ];

    console.log('Portal line (reverted - calculated from grid bounds relative to grid position):', {
        portalId: portal.id,
        portalPos_grid_input: portal.position,
        bounds_grid_input: portal.bounds,
        ppg: ppg,
        calculated_p0_relative_pixel: {x: p0_relative_pixel_x, y: p0_relative_pixel_y},
        calculated_p1_relative_pixel: {x: p1_relative_pixel_x, y: p1_relative_pixel_y},
        final_points_pixel_relative: relativePixelPoints
    });

    return {
        points: relativePixelPoints,
        stroke: '#00FF00', // Bright green for all portals
        strokeWidth: 10, // Match object wall thickness
        lineCap: 'round',
        lineJoin: 'round'
    };
};

const getPortalHandleConfig = (portal: PortalObject, endpointIndex: number) => {
    const ppg = props.mapMetadata.resolution.pixels_per_grid;

    // If bounds are empty or malformed, position handles relative to the group's (0,0)
    // (which corresponds to portal.position)
    if (!portal.bounds || portal.bounds.length < 2 || !portal.bounds[0] || !portal.bounds[1]) {
        const halfLengthPixels = 0.5 * ppg;
        const handleX_relative = endpointIndex === 0 ? -halfLengthPixels : halfLengthPixels;
        const handleY_relative = 0;

        console.log('Portal handle (default/new):', {
            portalId: portal.id,
            portalPos_grid: portal.position,
            endpointIndex: endpointIndex,
            handle_pixel_relative: {x: handleX_relative, y: handleY_relative}
        });

        return {
            x: handleX_relative,
            y: handleY_relative,
            radius: 6,
            fill: '#4CAF50',
            stroke: '#2E7D32',
            strokeWidth: 2,
            draggable: true
        };
    }

    // For EXISTING portals with bounds:
    // Calculate handle positions relative to portal.position (group's center).
    const groupCenterX_grid = portal.position.x;
    const groupCenterY_grid = portal.position.y;

    const endpoint_grid = portal.bounds[endpointIndex];
    const handleX_grid_relative = endpoint_grid.x - groupCenterX_grid;
    const handleY_grid_relative = endpoint_grid.y - groupCenterY_grid;

    const handleX_pixel_relative = handleX_grid_relative * ppg;
    const handleY_pixel_relative = handleY_grid_relative * ppg;
    
    console.log('Portal handle (existing with bounds):', {
        portalId: portal.id,
        portalPos_grid: portal.position,
        endpointIndex: endpointIndex,
        endpoint_grid: endpoint_grid,
        groupCenter_grid: { x: groupCenterX_grid, y: groupCenterY_grid },
        handle_grid_relative: { x: handleX_grid_relative, y: handleY_grid_relative },
        handle_pixel_relative: {x: handleX_pixel_relative, y: handleY_pixel_relative}
    });

    return {
        x: handleX_pixel_relative,
        y: handleY_pixel_relative,
        radius: 6,
        fill: '#4CAF50',
        stroke: '#2E7D32',
        strokeWidth: 2,
        draggable: true
    };
};

const getLightGroupConfig = (light: EditorLightObject) => ({
    x: light.position.x,
    y: light.position.y,
    draggable: props.currentTool === 'select',
    id: light.id
});

const getLightRangeConfig = (light: EditorLightObject) => ({
    x: 0,
    y: 0,
    radius: light.range,
    fill: light.color || '#FFFF00',
    opacity: typeof light.opacity === 'number' ? light.opacity : (light.intensity || 0.5) * 0.5,
    stroke: light.color || '#FFFF00',
    strokeWidth: 1,
    listening: false,
    perfectDrawEnabled: false
});

const getLightMarkerConfig = (light: EditorLightObject) => ({
    x: 0,
    y: 0,
    radius: 5,
    fill: light.color || '#FFFF00',
    opacity: typeof light.opacity === 'number' ? light.opacity : 1,
    stroke: '#000000',
    strokeWidth: 1,
    perfectDrawEnabled: false
});

// Add config for object walls with blue color
const getObjectWallConfig = (wall: WallObject) => {
    console.log('Rendering object wall ID:', wall.id);
    
    // Ensure all points are valid numbers
    const validPoints = Array.isArray(wall.points) ? 
        wall.points.map((p, index) => {
            const isValid = typeof p === 'number' && !isNaN(p);
            if (!isValid) {
                console.warn(`Invalid point at index ${index}, value:`, p);
            }
            return isValid ? p : 0;
        }) : [];
    
    const config = {
        points: validPoints,
        stroke: wall.stroke || '#0000ff',
        strokeWidth: wall.strokeWidth || 10,
        lineCap: 'round',
        lineJoin: 'round',
        draggable: props.currentTool === 'select',
        id: wall.id
    };
    console.log(config)

    return config;
};

// Event handlers
const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    console.log('Mouse down event:', { tool: props.currentTool, pos: e.target.getStage()?.getPointerPosition() });
    
    // Get mouse position relative to stage
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    // Convert position to world coordinates
    const worldPos = {
        x: (pos.x - stage.x()) / stage.scaleX(),
        y: (pos.y - stage.y()) / stage.scaleY()
    };
    
    // Handle based on current tool
    switch (props.currentTool) {
        case 'wall':
            if (!wallTool.value?.isDrawing) {
                // Start a new wall only if not already drawing
                console.log('Starting new wall drawing at:', worldPos);
                startWallDrawing(worldPos);
            }
            // We'll handle extending the wall in handleMouseUp for better click handling
            break;
        case 'portal':
            placePortal(worldPos);
            break;
        case 'light':
            placeLight(worldPos);
            break;
        case 'select':
            startSelection(worldPos);
            break;
    }
};

const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    // Get mouse position relative to stage
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    // Convert position to world coordinates (pixel coordinates)
    const worldPos = {
        x: (pos.x - stage.x()) / stage.scaleX(),
        y: (pos.y - stage.y()) / stage.scaleY()
    };
    
    // Convert pixel coordinates to grid coordinates
    const gridPos = {
        x: worldPos.x / props.mapMetadata.resolution.pixels_per_grid,
        y: worldPos.y / props.mapMetadata.resolution.pixels_per_grid
    };
    
    // Emit coordinates for the coordinate display
    emit('mouse-move', worldPos, gridPos);
    
    // Handle based on current tool
    switch (props.currentTool) {
        case 'wall':
            if (wallTool.value?.isDrawing) {
                console.log('Mouse move: updating wall drawing', { 
                    pos: worldPos,
                    isDrawing: wallTool.value.isDrawing,
                    multiPointMode: wallTool.value.multiPointMode 
                });
                wallTool.value.updateDrawing(worldPos);
                drawTemporaryWall();
            }
            break;
        case 'select':
            selectionTool.value?.updateSelection(worldPos);
            updateSelectionRect();
            break;
    }
};

const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    // Handle based on current tool
    const stage = e.target.getStage();
    if (!stage) return;
    
    console.log('MouseUp event:', { 
        detail: e.evt.detail, 
        tool: props.currentTool, 
        isDrawing: wallTool.value?.isDrawing 
    });
    
    // If it's a double-click, handle differently
    if (e.evt.detail === 2) {
        if (props.currentTool === 'wall' && wallTool.value?.isDrawing) {
            console.log('Double click detected while drawing wall, finishing...');
            finishWallDrawing();
        }
    } else if (props.currentTool === 'wall' && wallTool.value?.isDrawing) {
        // For single clicks while drawing a wall, add a point
        const pos = stage.getPointerPosition();
        if (pos) {
            const worldPos = {
                x: (pos.x - stage.x()) / stage.scaleX(),
                y: (pos.y - stage.y()) / stage.scaleY()
            };
            console.log('Single click while drawing wall, extending...');
            extendWallDrawing(worldPos);
        }
    } else if (props.currentTool === 'select' && selectionTool.value?.isSelecting) {
        selectionTool.value.endSelection();
        clearSelectionRect();
    }
};

const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    // Handle zooming
    e.evt.preventDefault();

    const stageInstance = e.target.getStage();
    const oldScale = props.viewportTransform.scale;
    const pointer = stageInstance?.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
        x: (pointer.x - props.viewportTransform.position.x) / oldScale,
        y: (pointer.y - props.viewportTransform.position.y) / oldScale
    };

    // Determine new scale (zoom in/out)
    const zoomDirection = e.evt.deltaY > 0 ? -1 : 1;
    const zoomFactor = 1.1;
    const newScale = zoomDirection > 0 ? oldScale * zoomFactor : oldScale / zoomFactor;

    // Need to update the viewportTransform, but this is not directly in our object types
    // Cast the update to bypass type checking for this specific case
    const updates = {
        viewportTransform: {
            scale: newScale,
            position: {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale
            }
        }
    } as unknown as Partial<WallObject | PortalObject | EditorLightObject>; // Using type assertion to match emit type

    // Emit changes for parent component to update viewport transform
    emit('object-modified', 'viewport', updates);
};

const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (props.currentTool !== 'pan') return; // Only act if pan tool was active

    const stageInstance = e.target.getStage();
    if (!stageInstance) return;

    const newPosition = {
        x: stageInstance.x(),
        y: stageInstance.y()
    };

    // Emit changes for parent component to update viewport transform position
    // Keep the existing scale
    const updates = {
        viewportTransform: {
            scale: props.viewportTransform.scale, // Keep current scale
            position: newPosition
        }
    } as unknown as Partial<WallObject | PortalObject | EditorLightObject>; // Using type assertion

    emit('object-modified', 'viewport', updates);
};

const handleObjectClick = (e: KonvaEventObject<MouseEvent>, id: string) => {
    if (props.currentTool !== 'select') return;

    e.evt.preventDefault();
    e.cancelBubble = true;

    // Check if Shift key is pressed for multi-selection
    const addToSelection = e.evt.shiftKey;
    emit('object-selected', id, addToSelection);
};

const handleWallDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    // Update wall position after drag
    const node = e.target as Konva.Line;

    // For walls, we need to update the points
    const points = node.points ? [...node.points()] : [];

    emit('object-modified', id, { points });
};

const handlePortalDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    const newPixelPos = { x: node.x(), y: node.y() };

    // Snap the new pixel position if snap is enabled
    const snappedPixelPos = props.gridConfig.snap ? gridSystem.snapToGrid(newPixelPos) : newPixelPos;
    
    // Convert back to grid coordinates since portal positions are stored in grid coordinates
    const ppg = props.mapMetadata.resolution.pixels_per_grid;
    const positionToUse = {
        x: snappedPixelPos.x / ppg,
        y: snappedPixelPos.y / ppg
    };

    console.log('Portal drag end:', {
        id,
        originalPixelPos: newPixelPos,
        snappedPixelPos: snappedPixelPos,
        finalGridPos: positionToUse,
        snapEnabled: props.gridConfig.snap,
        ppg: ppg
    });

    emit('object-modified', id, {
        position: positionToUse, // Position is stored in grid coordinates
        rotation: node.rotation()
    });
};

const handleLightDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    // Update light position after drag
    const node = e.target;

    emit('object-modified', id, {
        position: { x: node.x(), y: node.y() }
    });
};

// Wall tool status is already defined elsewhere in the file

// Drawing methods
const startWallDrawing = (pos: Point) => {
    console.log('=== WALL TOOL DEBUGGING ===');
    console.log('startWallDrawing called with pos:', pos);
    console.log('currentTool:', props.currentTool);
    console.log('wallTool exists:', !!wallTool.value);
    
    if (!wallTool.value) {
        console.error('Wall tool ref is null!');
        return;
    }
    
    // Check if tool is active
    if (props.currentTool !== 'wall') {
        console.warn('Wall tool is not the active tool!');
        return;
    }
    
    // Show help text if first time using wall tool
    if (!localStorage.getItem('wall-help-dismissed')) {
        showWallHelp.value = true;
    }
    
    // Call the start drawing method
    wallTool.value.startDrawing(pos);
    console.log('After startDrawing call:');
    console.log('isDrawing:', wallTool.value.isDrawing);
    
    // Debugging info about wallTool
    console.log('wallTool available:', !!wallTool.value);
    console.log('Known methods: startDrawing, updateDrawing, extendDrawing, endDrawing, cancelDrawing, toggleMultiPointMode');
    
    // Update UI state
    drawTemporaryWall();
};

const extendWallDrawing = (pos: Point) => {
    console.log('extendWallDrawing called with pos:', pos);
    
    if (!wallTool.value) {
        console.error('Wall tool ref is null!');
        return;
    }
    
    if (props.currentTool !== 'wall') return;
    
    wallTool.value.extendDrawing(pos);
    drawTemporaryWall();
};

const finishWallDrawing = () => {
    console.log('finishWallDrawing called');
    
    if (!wallTool.value) {
        console.error('Wall tool ref is null!');
        return;
    }
    
    if (props.currentTool !== 'wall') return;
    
    wallTool.value.endDrawing();
    clearTemporaryWall();
    
    console.log('Wall drawing finished, isDrawing state:', wallTool.value.isDrawing);
};

const cancelWallDrawing = () => {
    console.log('cancelWallDrawing called');
    
    if (!wallTool.value) return;
    
    wallTool.value.cancelDrawing();
    clearTemporaryWall();
};

// Handle keyboard events
const handleKeyDown = (e: KeyboardEvent) => {
    console.log('Key pressed:', e.key);
    
    // Cancel drawing on Escape
    if (e.key === 'Escape') {
        if (props.currentTool === 'wall' && wallTool.value?.isDrawing) {
            cancelWallDrawing();
        }
    }
    
    // Complete drawing on Enter
    if (e.key === 'Enter') {
        if (props.currentTool === 'wall' && wallTool.value?.isDrawing) {
            finishWallDrawing();
        }
    }
    
    // Delete selected objects on Delete or Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && props.currentTool === 'select') {
        // Check if we have a selected vertex
        if (selectionTool.value?.selectedVertex) {
            const vertex = selectionTool.value.selectedVertex;
            handleSegmentDeletion(vertex.objectId, vertex.vertexIndex);
            selectionTool.value.endVertexMove(); // Clear vertex selection
        } 
        // Otherwise delete selected objects
        else if (props.selectedObjectIds.length > 0) {
            props.selectedObjectIds.forEach(id => {
                emit('object-removed', id);
            });
        }
    }
};

const placePortal = (pos: Point) => {
    console.log('[EditorCanvas] placePortal called with world pixel pos:', JSON.parse(JSON.stringify(pos)), 'Current tool:', props.currentTool);

    if (props.currentTool !== 'portal') {
        console.warn('[EditorCanvas] placePortal called, but current tool is not portal. Aborting.');
        return;
    }

    const ppg = props.mapMetadata.resolution.pixels_per_grid;
    
    // 1. Convert the incoming world pixel position to absolute GRID position for the portal's center.
    // Snap the original pixel pos first if snap is enabled, then convert to grid.
    const snappedWorldPixelPos = props.gridConfig.snap ? gridSystem.snapToGrid(pos) : pos;
    const portalCenter_grid_x = snappedWorldPixelPos.x / ppg;
    const portalCenter_grid_y = snappedWorldPixelPos.y / ppg;
    const portalCenter_grid: Point = { x: portalCenter_grid_x, y: portalCenter_grid_y };

    // 2. Define portal length in GRID units. Default to 2 grid units.
    const portalLength_grid = 2; 

    // 3. Calculate ABSOLUTE GRID coordinates for bounds.
    // Assuming a horizontal portal centered at portalCenter_grid for simplicity upon creation.
    // The user can then rotate or adjust endpoints.
    const bounds_grid: [Point, Point] = [
        { x: portalCenter_grid_x - portalLength_grid / 2, y: portalCenter_grid_y },
        { x: portalCenter_grid_x + portalLength_grid / 2, y: portalCenter_grid_y }
    ];

    const newPortal: PortalObject = {
        id: `portal-${Date.now()}`,
        objectType: 'portal',
        position: portalCenter_grid, // Store position in GRID coordinates
        rotation: 0, // Default rotation
        bounds: bounds_grid,     // Store bounds in absolute GRID coordinates
        closed: false,
        freestanding: true,
        visible: true,
        locked: false
    };

    console.log('[EditorCanvas] placePortal - Emitting new portal (GRID coordinates):', JSON.parse(JSON.stringify(newPortal)));
    emit('object-added', newPortal);
};

const placeLight = (pos: Point) => {
    // const ppg = props.mapMetadata.resolution.pixels_per_grid; // Removed unused variable
    // Default range in grid units, to be converted to pixels by parent
    const defaultRangeInGridUnits = 5; 

    const positionToUse = props.gridConfig.snap ? gridSystem.snapToGrid(pos) : pos;

    const newLight: EditorLightObject = {
        id: `light-${Date.now()}`,
        objectType: 'light',
        position: { x: positionToUse.x, y: positionToUse.y },
        range: defaultRangeInGridUnits, // Emitted as grid units
        intensity: 0.7,
        color: '#ffdd00',    // Default color yellow
        shadows: true,
        opacity: 1 // Default opacity
    };

    // When emitting, the parent (MapEditorComponent) will be responsible for converting
    // this grid unit range to pixels if necessary before adding to its state
    // that eventually feeds back into this component's props.
    emit('object-added', newLight);
};

const drawTemporaryWall = () => {
    console.log('drawTemporaryWall called');
    if (!wallTool.value || !wallLayer.value) {
        console.log('Missing required refs:', { 
            wallTool: !!wallTool.value, 
            wallLayer: !!wallLayer.value 
        });
        return;
    }
    
    // Clear temporary shapes
    clearTemporaryWall();
    
    // Get the current points from the wall tool
    const points = wallTool.value.currentPoints;
    console.log('Current points from wallTool:', points);
    
    // Draw temporary wall line
    if (points && points.length >= 2) {
        console.log('Drawing temporary wall with points:', points);
        
        // Draw a temporary line with the current points
        const line = new Konva.Line({
            points: points,
            stroke: '#ff0000',
            strokeWidth: 3,
            name: 'temp-wall',
            dash: [5, 5]
        });
        
        // Get the Konva layer instance
        const konvaLayer = wallLayer.value.getNode();
        
        // Add the line to the layer
        konvaLayer.add(line);
        konvaLayer.batchDraw();
        console.log('Temporary wall drawn successfully');
    } else {
        console.log('Not enough points to draw temporary wall');
    }
};

const clearTemporaryWall = () => {
    if (!wallLayer.value) return;
    
    // Get the Konva layer instance
    const konvaLayer = wallLayer.value.getNode();
    
    // Find and remove any temporary walls
    const tempWalls = konvaLayer.find('.temp-wall');
    tempWalls.forEach(wall => wall.destroy());
    konvaLayer.batchDraw();
    console.log('Temporary walls cleared');
};

// Handle wall creation from WallTool
const handleWallCreated = (wall: WallObject) => {
    emit('object-added', wall);
    
    // Clear temporary wall drawing
    if (wallLayer.value) {
        const konvaLayer = wallLayer.value.getNode();
        const tempWalls = konvaLayer.find('.temp-wall');
        tempWalls.forEach(wall => wall.destroy());
        konvaLayer.batchDraw();
    }
};

// Selection methods
const startSelection = (pos: Point) => {
    if (!selectionTool.value) return;
    
    selectionTool.value.startSelection(pos);
    // Initialize selection rectangle
    createSelectionRect();
};

const createSelectionRect = () => {
    if (!selectionLayer.value || !selectionTool.value?.selectionRect) return;
    
    // Clear any existing selection rectangle
    clearSelectionRect();
    
    // Create new selection rectangle
    const rect = new Konva.Rect({
        x: selectionTool.value.selectionRect.start.x,
        y: selectionTool.value.selectionRect.start.y,
        width: 0,
        height: 0,
        fill: 'rgba(0, 123, 255, 0.3)',
        stroke: 'rgba(0, 123, 255, 0.7)',
        strokeWidth: 1,
        name: 'selection-rect'
    });
    
    selectionRect.value = rect;
    // Get the Konva layer instance
    const konvaLayer = selectionLayer.value.getNode();
    konvaLayer.add(rect);
    konvaLayer.batchDraw();
};

const updateSelectionRect = () => {
    if (!selectionRect.value || !selectionTool.value?.selectionRect) return;
    
    const { start, end } = selectionTool.value.selectionRect;
    
    selectionRect.value.setAttrs({
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y)
    });
    
    if (selectionLayer.value) {
        selectionLayer.value.getNode().batchDraw();
    }
};

const clearSelectionRect = () => {
    if (!selectionLayer.value) return;
    
    if (selectionRect.value) {
        selectionRect.value.destroy();
        selectionRect.value = null;
    }
    
    // Get the Konva layer instance
    const konvaLayer = selectionLayer.value.getNode();
    
    // Find and remove any selection rectangles
    const existingRect = konvaLayer.findOne('.selection-rect');
    if (existingRect) {
        existingRect.destroy();
    }
    
    konvaLayer.batchDraw();
};

// Selection events
const handleSelectionEnded = (rect: { start: Point; end: Point }) => {
    // Find all objects that intersect with the selection rectangle
    const { start, end } = rect;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    
    // Get all objects in the selection area
    const selectedIds: string[] = [];
    
    // Check walls
    for (const wall of props.walls) {
        if (wall.visible === false) continue;
        
        // Check if any point of the wall is inside the selection rectangle
        for (let i = 0; i < wall.points.length; i += 2) {
            const pointX = wall.points[i];
            const pointY = wall.points[i + 1];
            
            if (pointX >= x && pointX <= x + width && pointY >= y && pointY <= y + height) {
                selectedIds.push(wall.id);
                break;
            }
        }
    }
    
    // Check portals
    for (const portal of props.portals) {
        if (portal.visible === false) continue;
        
        const portalX = portal.position.x;
        const portalY = portal.position.y;
        
        if (portalX >= x && portalX <= x + width && portalY >= y && portalY <= y + height) {
            selectedIds.push(portal.id);
        }
    }
    
    // Check lights
    for (const light of props.lights) {
        if (light.visible === false) continue;
        
        const lightX = light.position.x;
        const lightY = light.position.y;
        
        if (lightX >= x && lightX <= x + width && lightY >= y && lightY <= y + height) {
            selectedIds.push(light.id);
        }
    }
    
    // Emit the selected objects (with shift key for multi-selection)
    if (selectedIds.length > 0) {
        emit('object-selected', selectedIds[0], false); // Select the first one
        
        // Select the rest with multi-selection
        for (let i = 1; i < selectedIds.length; i++) {
            emit('object-selected', selectedIds[i], true);
        }
    }
};

// Watch for selected objects to update transformer
watch(() => props.selectedObjectIds, (newSelectedIds) => {
    if (!transformer.value || !stage.value) return;

    if (newSelectedIds.length === 0) {
        const konvaTransformer = transformer.value.getNode();
        konvaTransformer.nodes([]);
        return;
    }

    const konvaStage = stage.value.getStage();
    const selectedNodes: Konva.Node[] = [];

    for (const id of newSelectedIds) {
        // Find the node in wall, portal, or light layers
        const node = konvaStage.findOne(`#${id}`);
        if (node) {
            selectedNodes.push(node);
        }
    }

    transformer.value.getNode().nodes(selectedNodes);
}, { immediate: true });

// Resize canvas when container size changes
const updateCanvasSize = () => {
    if (!canvasContainer.value) return;

    canvasSize.width = canvasContainer.value.clientWidth;
    canvasSize.height = canvasContainer.value.clientHeight;
};

// Load map image
const loadMapImage = (src: string) => {
    if (!src) {
        backgroundImage.value = null;
        return;
    }

    const img = new Image();
    img.src = src;
    img.onload = () => {
        backgroundImage.value = img;
    };
};

// Watch for map changes
watch(() => props.mapMetadata.image, (newImageSrc) => {
    loadMapImage(newImageSrc);
});

// Lifecycle hooks
onMounted(() => {
    // Set up canvas size
    updateCanvasSize();
    
    // Add event listeners
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('keydown', handleKeyDown);

    // Load map image if available
    if (props.mapMetadata.image) {
        loadMapImage(props.mapMetadata.image);
    }
    console.log('[EditorCanvas] Mounted. Initial lights:', JSON.parse(JSON.stringify(props.lights)));
});

watch(() => props.lights, (newLights) => {
    console.log('[EditorCanvas] Lights prop changed:', JSON.parse(JSON.stringify(newLights)));
}, { deep: true });

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateCanvasSize);
    window.removeEventListener('keydown', handleKeyDown);
});

watch(() => [canvasSize.width, canvasSize.height], () => {
    if (stage.value) {
        const konvaStage = stage.value.getStage();
        konvaStage?.width(canvasSize.width);
        konvaStage?.height(canvasSize.height);
    }
});

// Watch for tool changes to show help
let hasShownWallHelp = false;
watch(() => props.currentTool, (newTool) => {
    if (newTool === 'wall' && !hasShownWallHelp && !localStorage.getItem('wall-help-dismissed')) {
        showWallHelp.value = true;
        hasShownWallHelp = true; // Only show once per session
    }
}, { immediate: true });

// Add computed property for wall vertices
const wallVertices = computed(() => {
    // Only show vertices for selected walls when in select mode
    if (props.currentTool !== 'select') return [];
    
    // Get all selected walls
    const selectedWalls = props.walls.filter(wall => 
        props.selectedObjectIds.includes(wall.id));
    
    // Generate points for each vertex
    const vertices: { x: number; y: number; wallId: string; index: number; }[] = [];
    
    selectedWalls.forEach(wall => {
        if (!wall.points || wall.points.length < 2) return;
        
        // Wall points are stored as flat array [x1, y1, x2, y2, ...]
        // Convert to separate vertex points
        for (let i = 0; i < wall.points.length; i += 2) {
            vertices.push({
                x: wall.points[i],
                y: wall.points[i + 1],
                wallId: wall.id,
                index: i / 2  // Convert flat index to point index
            });
        }
    });
    
    return vertices;
});

// Handle the selection tool's segment-deleted event directly in the vertex click handler
const handleVertexClick = (e: KonvaEventObject<MouseEvent>, wallId: string, vertexIndex: number) => {
    if (props.currentTool !== 'select') return;
    
    e.evt.preventDefault();
    e.cancelBubble = true;
    
    // If Shift key is pressed, this is a segment deletion request
    if (e.evt.shiftKey) {
        handleSegmentDeletion(wallId, vertexIndex);
        return;
    }
    
    // Otherwise select the vertex
    if (selectionTool.value) {
        selectionTool.value.selectVertex(wallId, vertexIndex);
    }
};

// Add a new method to handle segment deletion
const handleSegmentDeletion = (wallId: string, vertexIndex: number) => {
    // Find the wall
    const wall = props.walls.find(w => w.id === wallId);
    if (!wall || !wall.points) return;
    
    // For a segment, we need to remove points from the wall
    // If the wall has only 2 points, delete the entire wall
    if (wall.points.length <= 4) {
        emit('object-removed', wallId);
        return;
    }
    
    // Determine which segment to delete - we'll delete the segment after this vertex
    // If this is the last vertex, we'll delete the segment before it
    const pointCount = wall.points.length / 2;
    let startIndex = vertexIndex;
    let endIndex = (vertexIndex + 1) % pointCount;
    
    if (startIndex === pointCount - 1) {
        // If it's the last point, delete segment between last and first
        startIndex = pointCount - 1;
        endIndex = 0;
    }
    
    // Create a copy of the points array
    const updatedPoints = [...wall.points];
    
    // Convert vertex indices to flat array indices
    const flatStartIndex = startIndex * 2;
    const flatEndIndex = endIndex * 2;
    
    // Remove the segment (2 points)
    // If we're removing the last segment to first, handle differently
    if (endIndex === 0) {
        // Remove last segment (last point and first point)
        updatedPoints.splice(flatStartIndex, 2); // Remove last point
        updatedPoints.splice(0, 2); // Remove first point
    } else {
        // Regular case, remove sequential points
        updatedPoints.splice(flatEndIndex, 2);
    }
    
    // Emit the update
    emit('object-modified', wallId, { points: updatedPoints });
};

// Add these methods for vertex handling 
const handleVertexDragMove = (e: KonvaEventObject<DragEvent>, wallId: string, vertexIndex: number) => {
    if (props.currentTool !== 'select') return;
    
    const circle = e.target;
    const newPos = { x: circle.x(), y: circle.y() };
    
    // Update the vertex position temporarily during drag
    if (selectionTool.value) {
        selectionTool.value.moveVertex(wallId, vertexIndex, newPos);
    }
};

const handleVertexDragEnd = (e: KonvaEventObject<DragEvent>, wallId: string, vertexIndex: number) => {
    if (props.currentTool !== 'select') return;
    
    const circle = e.target;
    const newPos = { x: circle.x(), y: circle.y() };
    
    // Find the wall and update its point
    const wall = props.walls.find(w => w.id === wallId);
    if (wall && wall.points) {
        // Create a copy of the points array
        const updatedPoints = [...wall.points];
        // Update the specific point (multiply by 2 because points are stored as flat array)
        updatedPoints[vertexIndex * 2] = newPos.x;
        updatedPoints[vertexIndex * 2 + 1] = newPos.y;
        
        // Emit the update
        emit('object-modified', wallId, { points: updatedPoints });
    }
    
    // End vertex move mode
    if (selectionTool.value) {
        selectionTool.value.endVertexMove();
    }
};

// Add event handlers for the SelectionTool events directly
watch(() => selectionTool.value, (tool) => {
    if (tool) {
        // These will be called directly through the vertex click/drag handlers
        console.log('Selection tool is ready');
    }
}, { immediate: true });

// Add a new method to handle portal endpoint drag
const handlePortalEndpointDrag = (e: KonvaEventObject<DragEvent>, id: string, endpointIndex: number) => {
    const portal = props.portals.find(p => p.id === id);
    // Ensure portal and its existing bounds (which should be in grid coords) exist
    if (!portal || !portal.bounds || !portal.bounds[0] || !portal.bounds[1] || !portal.position) { 
        console.error('Portal, portal.position, or portal.bounds not found for endpoint drag', {id, portal});
        return;
    }

    const handleNode = e.target; // This is the handle (Konva.Circle)
    const ppg = props.mapMetadata.resolution.pixels_per_grid;

    // 1. Get the handle's absolute position on the page (as returned by Konva for a dragged node)
    const handleAbsPagePos = handleNode.getAbsolutePosition();
    if (!handleAbsPagePos) {
      console.error("[EditorCanvas] Could not get absolute page position of handle for portal endpoint drag");
      return;
    }

    // 2. Convert absolute page position to world pixel position (accounting for stage pan/zoom)
    const stageTx = props.viewportTransform.position.x;
    const stageTy = props.viewportTransform.position.y;
    const stageScale = props.viewportTransform.scale;

    const handleWorldPixelPos = {
        x: (handleAbsPagePos.x - stageTx) / stageScale,
        y: (handleAbsPagePos.y - stageTy) / stageScale
    };

    // 3. Snap this world pixel position if snap is enabled
    const snappedHandleWorldPixelPos = props.gridConfig.snap 
        ? gridSystem.snapToGrid(handleWorldPixelPos) 
        : handleWorldPixelPos;

    // 4. Convert the snapped world pixel position to an ABSOLUTE GRID coordinate
    const newEndpoint_grid_x = snappedHandleWorldPixelPos.x / ppg;
    const newEndpoint_grid_y = snappedHandleWorldPixelPos.y / ppg;
    const newEndpoint_grid: Point = { x: newEndpoint_grid_x, y: newEndpoint_grid_y };

    // 5. Create a new bounds array with the updated absolute grid coordinate
    // The portal.bounds from props should already be in absolute grid coordinates.
    const newBounds_grid: [Point, Point] = [
        endpointIndex === 0 ? newEndpoint_grid : { ...portal.bounds[0] },
        endpointIndex === 1 ? newEndpoint_grid : { ...portal.bounds[1] }
    ];
    
    console.log('[EditorCanvas] Portal endpoint drag - GRID focus:', {
        id, endpointIndex,
        handleAbsPagePos,
        stageTransform: { x: stageTx, y: stageTy, scale: stageScale },
        calculated_handleWorldPixelPos: handleWorldPixelPos,
        snappedHandleWorldPixelPos,
        newEndpoint_grid, // This is the new absolute grid coordinate for the dragged endpoint
        originalPortalBounds_grid: portal.bounds, // Should be grid
        newBounds_grid_emitted: newBounds_grid // This is what gets emitted
    });

    // Emit the object-modified event with the updated bounds in ABSOLUTE GRID coordinates.
    // The portal's main `position` (its group center in grid) remains unchanged by this operation.
    emit('object-modified', id, {
        bounds: newBounds_grid 
    });

    // Redraw the layer containing the portal to ensure the line updates visually.
    // The portal group's x/y (derived from portal.position) hasn't changed,
    // but its internal line (derived from portal.bounds relative to portal.position)
    // and its handles (derived from portal.bounds relative to portal.position) need re-rendering.
    const portalKonvaNode = handleNode.getParent(); // Get the Konva.Group for the portal
    portalKonvaNode?.getLayer()?.batchDraw();
};
</script>

<style scoped>
.editor-canvas-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    background-color: #f0f0f0;
}

.tool-help-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.tool-help-content {
    background-color: var(--stone, #f5f5f4);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    text-align: center;
    border: 1px solid var(--stone-300, #d6d3d1);
    color: var(--onyx, #333);
}

@media (prefers-color-scheme: dark) {
    .tool-help-content {
        background-color: var(--stone-700, #44403c);
        border-color: var(--stone-600, #57534e);
        color: var(--parchment, #f5f5dc);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
}

.tool-help-content h3 {
    margin-top: 0;
    color: var(--dragon, #8b4513);
}

@media (prefers-color-scheme: dark) {
    .tool-help-content h3 {
        color: var(--gold, #ffd700);
    }
}

.close-help {
    margin-top: 15px;
    padding: 8px 16px;
    background-color: var(--success, #4a6da7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.close-help:hover {
    background-color: var(--success-700, #3a5d97);
}

@media (prefers-color-scheme: dark) {
    .close-help {
        background-color: var(--gold, #ffd700);
        color: var(--onyx, #333);
    }
    
    .close-help:hover {
        background-color: var(--gold-600, #e6c200);
    }
}

.drawing-status {
    position: absolute;
    top: 15px;
    right: 15px;
    background-color: var(--stone, rgba(245, 245, 244, 0.9));
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--stone-300, #d6d3d1);
    color: var(--onyx, #333);
}

@media (prefers-color-scheme: dark) {
    .drawing-status {
        background-color: var(--stone-700, rgba(68, 64, 60, 0.9));
        border-color: var(--stone-600, #57534e);
        color: var(--parchment, #f5f5dc);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
}

.status-badge {
    display: inline-block;
    background-color: #f44336;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-weight: bold;
    margin-bottom: 5px;
}

.instructions {
    font-size: 14px;
    color: #333;
}
</style>