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
                
                <!-- Origin marker - only visible in grid-adjust mode -->
                <v-group v-if="props.currentTool === 'grid-adjust'" :config="originMarkerConfig" @dragend="handleOriginDragEnd">
                    <!-- Horizontal crosshair line -->
                    <v-line :config="{
                        points: [
                            props.mapMetadata.coordinates.offset.x - 20 / props.viewportTransform.scale,
                            props.mapMetadata.coordinates.offset.y,
                            props.mapMetadata.coordinates.offset.x + 20 / props.viewportTransform.scale,
                            props.mapMetadata.coordinates.offset.y
                        ],
                        stroke: '#ff4500',
                        strokeWidth: 2 / props.viewportTransform.scale,
                        listening: false
                    }" />
                    <!-- Vertical crosshair line -->
                    <v-line :config="{
                        points: [
                            props.mapMetadata.coordinates.offset.x,
                            props.mapMetadata.coordinates.offset.y - 20 / props.viewportTransform.scale,
                            props.mapMetadata.coordinates.offset.x,
                            props.mapMetadata.coordinates.offset.y + 20 / props.viewportTransform.scale
                        ],
                        stroke: '#ff4500',
                        strokeWidth: 2 / props.viewportTransform.scale,
                        listening: false
                    }" />
                    <!-- Center dot (draggable) -->
                    <v-circle :config="{
                        x: props.mapMetadata.coordinates.offset.x,
                        y: props.mapMetadata.coordinates.offset.y,
                        radius: 6 / props.viewportTransform.scale,
                        fill: '#ff4500',
                        stroke: '#ffffff',
                        strokeWidth: 2 / props.viewportTransform.scale,
                        draggable: true,
                        listening: true
                    }" @dragend="handleOriginDragEnd" />
                </v-group>
            </v-layer>

            <!-- Wall layer -->
            <v-layer ref="wallLayer">
                <v-line v-for="wall in visibleWalls" :key="wall.id" 
                    :config="getWallConfig(wall)"
                    @click="handleObjectClick($event, wall.id)" 
                    @dragend="handleWallDragEnd($event, wall.id)" />
            </v-layer>
            
            <!-- Objects layer -->
            <v-layer ref="objectsLayer">
                <template v-for="object in visibleObjects" :key="object.id">
                    <v-group :config="getObjectGroupConfig(object)" 
                        @click="handleObjectClick($event, object.id)"
                        @dragend="handleObjectDragEnd($event, object.id)">
                        <!-- Polygon shape -->
                        <v-line :config="getObjectPolygonConfig(object)" />
                        
                        <!-- Object vertex handles (only show when selected AND in select mode) -->
                        <template v-if="props.selectedObjectIds.includes(object.id) && props.currentTool === 'select'">
                            <v-circle v-for="(vertex, index) in getObjectVertices(object)" :key="`object-vertex-${object.id}-${index}`"
                                :config="getObjectVertexHandleConfig(object, vertex, index)"
                                @dragend="handleObjectVertexDrag($event, object.id, index)" />
                        </template>
                    </v-group>
                </template>
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
                    <v-group v-bind="getPortalGroupConfig(portal)">
                        
                        <!-- Portal line segment (draggable for whole portal movement) -->
                        <v-line v-bind="getPortalLineConfig(portal)" 
                            @click="(e: KonvaEventObject<MouseEvent>) => handleObjectClick(e, portal.id)"
                            @dragend="(e: KonvaEventObject<DragEvent>) => handlePortalDragEnd(e, portal.id)" />
                        
                        <!-- Portal endpoint handles (only show when selected AND in select mode) -->
                        <template v-if="props.selectedObjectIds.includes(portal.id) && props.currentTool === 'select'">
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
                    <!-- Dim radius (outer circle) -->
                    <v-circle v-if="light.dimRadius > 0" :config="getLightDimConfig(light)" />
                    <!-- Bright radius (inner circle) -->
                    <v-circle v-if="light.brightRadius > 0" :config="getLightRangeConfig(light)" />
                    <!-- Center marker -->
                    <v-circle :config="getLightMarkerConfig(light)" />
                </v-group>
            </v-layer>

            <!-- Selection layer -->
            <v-layer ref="selectionLayer">
                <v-transformer v-if="selectedNonWallObjectIds.length > 0" ref="transformer" :config="transformerConfig" />
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
        <ObjectTool
            ref="objectTool"
            :grid-config="gridConfig"
            :is-active="currentTool === 'object'"
            @object-created="handleObjectCreated"
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
import { snapToWorldGrid, worldToGrid } from '../../../../../shared/src/utils/coordinate-conversion.mjs';
import WallTool from './tools/WallTool.vue';
import ObjectTool from './tools/ObjectTool.vue';
import SelectionTool from './tools/SelectionTool.vue';
import type {
    WallObject,
    PortalObject,
    LightObject,
    ObjectEditorObject,
    EditorToolType,
    GridConfig,
    Point,
    MapMetadata
} from '../../../../../shared/src/types/mapEditor.mjs';


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
    objects: ObjectEditorObject[];
    portals: PortalObject[];
    lights: LightObject[];
    selectedObjectIds: string[];
    currentTool: EditorToolType;
    gridConfig: GridConfig;
    mapMetadata: MapMetadata;
    viewportTransform: { scale: number; position: Point };
}>();

// Emits
const emit = defineEmits<{
    (e: 'object-selected', id: string | null, addToSelection: boolean): void;
    (e: 'object-added', object: WallObject | PortalObject | LightObject | ObjectEditorObject): void;
    (e: 'object-modified', id: string, updates: Partial<WallObject | PortalObject | LightObject | ObjectEditorObject> | { viewportTransform?: any; worldUnitsPerCell?: number; offset?: Point; }): void;
    (e: 'object-removed', id: string): void;
    (e: 'mouse-move', pixelPos: Point, gridPos: Point): void;
    (e: 'selection-cleared'): void;
}>();

// Refs
const canvasContainer = ref<HTMLDivElement | null>(null);
const stage = ref<KonvaStage | null>(null);
const bgLayer = ref<KonvaLayer | null>(null);
const gridLayer = ref<KonvaLayer | null>(null);
const wallLayer = ref<KonvaLayer | null>(null);
const objectsLayer = ref<KonvaLayer | null>(null);
const portalLayer = ref<KonvaLayer | null>(null);
const lightLayer = ref<KonvaLayer | null>(null);
const selectionLayer = ref<KonvaLayer | null>(null);
const transformer = ref<KonvaTransformer | null>(null);
const wallTool = ref<InstanceType<typeof WallTool> | null>(null);
const objectTool = ref<InstanceType<typeof ObjectTool> | null>(null);
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

const visibleObjects = computed(() => {
    return props.objects?.filter(object => object.visible !== false) || [];
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

// Origin marker configuration
const originMarkerConfig = computed(() => ({
    visible: props.currentTool === 'grid-adjust',
    draggable: props.currentTool === 'grid-adjust'
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
        worldOffsetY,
        props.mapMetadata.coordinates.offset
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

// Selected objects excluding walls and portals (they use endpoint handles instead of transformer)
const selectedNonWallObjectIds = computed(() => {
    return props.selectedObjectIds.filter(id => {
        // Check if this ID belongs to a wall
        const isWall = props.walls.some(wall => wall.id === id);
        // Check if this ID belongs to a portal
        const isPortal = props.portals.some(portal => portal.id === id);
        // Check if this ID belongs to an object
        const isObject = props.objects.some(object => object.id === id);
        return !isWall && !isPortal && !isObject;
    });
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
const getWallConfig = (wall: WallObject) => {
    const isObjectWall = wall.id.startsWith('object-wall-');
    
    return {
        points: wall.points,
        stroke: wall.stroke || (isObjectWall ? '#3399ff' : '#ff3333'), // Use wall's stroke color or default
        strokeWidth: wall.strokeWidth || 3, // Use wall's stroke width or default
        lineCap: 'round',
        lineJoin: 'round',
        draggable: props.currentTool === 'select',
        id: wall.id
    };
};

const getPortalGroupConfig = (portal: PortalObject) => {
    // Portals use endpoint handles for all manipulation (like walls)
    // Group is just for organizing the line and handles, not for dragging
    
    console.log('Portal group config (endpoint handles only):', {
        portalId: portal.id,
        coords: portal.coords
    });
    
    return {
        x: 0, // Portal line and handles use absolute coordinates
        y: 0, // Portal line and handles use absolute coordinates  
        draggable: false, // No group dragging - all manipulation via endpoint handles
        id: portal.id
    };
};

const getPortalLineConfig = (portal: PortalObject) => {
    // Use coords array directly for line segment coordinates
    let points: number[];
    
    if (portal.coords && portal.coords.length >= 4) {
        // Use new coords format directly [x1, y1, x2, y2]
        points = [...portal.coords];
        console.log('Portal line (coords format):', {
            portalId: portal.id,
            coords: portal.coords,
            final_points: points
        });
    } else if (portal.bounds && portal.bounds.length >= 2 && portal.bounds[0] && portal.bounds[1]) {
        // Legacy support: convert from bounds format
        points = [
            portal.bounds[0].x, portal.bounds[0].y,
            portal.bounds[1].x, portal.bounds[1].y
        ];
        console.warn('Portal line (legacy bounds):', {
            portalId: portal.id,
            bounds: portal.bounds,
            converted_points: points
        });
    } else {
        // Default fallback: horizontal line segment
        const worldUnitsPerCell = props.mapMetadata.coordinates.worldUnitsPerGridCell;
        const portalLength = worldUnitsPerCell;
        const centerX = portal.position?.x || 0;
        const centerY = portal.position?.y || 0;
        
        points = [
            centerX - portalLength / 2, centerY,
            centerX + portalLength / 2, centerY
        ];
        console.warn('Portal line (default fallback):', {
            portalId: portal.id,
            center: { x: centerX, y: centerY },
            length: portalLength,
            final_points: points
        });
    }

    return {
        points: points,
        stroke: portal.stroke || '#8B4513', // Brown default to match schema
        strokeWidth: portal.strokeWidth || 3, // Default width to match schema
        lineCap: 'round',
        lineJoin: 'round',
        draggable: props.currentTool === 'select', // Make line draggable like walls
        id: portal.id
    };
};

const getPortalHandleConfig = (portal: PortalObject, endpointIndex: number) => {
    // Get endpoint coordinates from coords array or fallback to legacy bounds
    let handleX: number, handleY: number;
    
    if (portal.coords && portal.coords.length >= 4) {
        // Use coords array directly [x1, y1, x2, y2]
        const coordIndex = endpointIndex * 2; // 0 for start (x1,y1), 2 for end (x2,y2)
        handleX = portal.coords[coordIndex];
        handleY = portal.coords[coordIndex + 1];
        
        console.log('Portal handle (coords format):', {
            portalId: portal.id,
            endpointIndex: endpointIndex,
            coords: portal.coords,
            handle_absolute: { x: handleX, y: handleY }
        });
    } else if (portal.bounds && portal.bounds.length >= 2 && portal.bounds[endpointIndex]) {
        // Legacy bounds support
        const endpoint = portal.bounds[endpointIndex];
        handleX = endpoint.x;
        handleY = endpoint.y;
        
        console.warn('Portal handle (legacy bounds):', {
            portalId: portal.id,
            endpointIndex: endpointIndex,
            endpoint: endpoint,
            handle_absolute: { x: handleX, y: handleY }
        });
    } else {
        // Default fallback
        const worldUnitsPerCell = props.mapMetadata.coordinates.worldUnitsPerGridCell;
        const portalLength = worldUnitsPerCell;
        const centerX = portal.position?.x || 0;
        const centerY = portal.position?.y || 0;
        
        handleX = endpointIndex === 0 ? 
            centerX - portalLength / 2 : 
            centerX + portalLength / 2;
        handleY = centerY;
        
        console.warn('Portal handle (default fallback):', {
            portalId: portal.id,
            endpointIndex: endpointIndex,
            center: { x: centerX, y: centerY },
            handle_absolute: { x: handleX, y: handleY }
        });
    }

    return {
        x: handleX, // Absolute coordinates since group is at (0,0)
        y: handleY, // Absolute coordinates since group is at (0,0)
        radius: 6,
        fill: '#4CAF50',
        stroke: '#2E7D32',
        strokeWidth: 2,
        draggable: true
    };
};

const getLightGroupConfig = (light: LightObject) => ({
    x: light.position.x,
    y: light.position.y,
    draggable: props.currentTool === 'select',
    id: light.id
});

const getLightRangeConfig = (light: LightObject) => ({
    x: 0,
    y: 0,
    radius: light.brightRadius,
    fill: light.color || '#FFFF00',
    opacity: (light.intensity || 1) * 0.3,
    stroke: light.color || '#FFFF00',
    strokeWidth: 1,
    listening: false,
    perfectDrawEnabled: false
});

const getLightDimConfig = (light: LightObject) => ({
    x: 0,
    y: 0,
    radius: light.dimRadius,
    fill: light.color || '#FFFF00',
    opacity: (light.intensity || 1) * 0.1,
    stroke: light.color || '#FFFF00',
    strokeWidth: 1,
    dash: [5, 5],
    listening: false,
    perfectDrawEnabled: false
});

const getLightMarkerConfig = (light: LightObject) => ({
    x: 0,
    y: 0,
    radius: 5,
    fill: light.color || '#FFFF00',
    opacity: 1,
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

// Object configuration methods
const getObjectGroupConfig = (object: ObjectEditorObject) => ({
    x: object.position.x,
    y: object.position.y,
    rotation: object.rotation || 0,
    draggable: props.currentTool === 'select',
    id: object.id
});

const getObjectPolygonConfig = (object: ObjectEditorObject) => {
    // Ensure all points are valid numbers
    const validPoints = Array.isArray(object.points) ? 
        object.points.map((p, index) => {
            const isValid = typeof p === 'number' && !isNaN(p);
            if (!isValid) {
                console.warn(`Invalid object point at index ${index}, value:`, p);
            }
            return isValid ? p : 0;
        }) : [];
    
    // Close the polygon by adding the first point at the end
    const closedPoints = [...validPoints];
    if (closedPoints.length >= 4) {
        closedPoints.push(closedPoints[0], closedPoints[1]);
    }
    
    return {
        points: closedPoints,
        stroke: object.stroke || '#666666',
        strokeWidth: object.strokeWidth || 2,
        fill: object.fill || 'rgba(100, 100, 100, 0.3)',
        lineCap: 'round',
        lineJoin: 'round',
        closed: true,
        listening: true
    };
};

const getObjectVertices = (object: ObjectEditorObject) => {
    const vertices = [];
    for (let i = 0; i < object.points.length; i += 2) {
        vertices.push({
            x: object.points[i],
            y: object.points[i + 1]
        });
    }
    return vertices;
};

const getObjectVertexHandleConfig = (object: ObjectEditorObject, vertex: { x: number; y: number }, index: number) => ({
    x: vertex.x,
    y: vertex.y,
    radius: 6,
    fill: '#09f',
    stroke: '#000',
    strokeWidth: 1,
    draggable: true,
    listening: true
});

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
        case 'object':
            if (objectTool.value && !objectTool.value.getIsDrawing()) {
                console.log('Object tool starting new polygon at:', worldPos);
                objectTool.value.startDrawing(worldPos);
            }
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
    
    // Convert world coordinates to grid coordinates
    const gridPos = worldToGrid(
        worldPos,
        props.mapMetadata.coordinates.worldUnitsPerGridCell,
        props.mapMetadata.coordinates.offset
    );
    
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
        case 'object':
            if (objectTool.value?.getIsDrawing()) {
                drawTemporaryObject(worldPos);
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
        } else if (props.currentTool === 'object' && objectTool.value?.getIsDrawing()) {
            console.log('Double click detected while drawing object, finishing...');
            objectTool.value.finishDrawing();
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
    } else if (props.currentTool === 'object' && objectTool.value?.getIsDrawing()) {
        // For single clicks while drawing an object, add a point
        const pos = stage.getPointerPosition();
        if (pos) {
            const worldPos = {
                x: (pos.x - stage.x()) / stage.scaleX(),
                y: (pos.y - stage.y()) / stage.scaleY()
            };
            console.log('Single click while drawing object, adding point...');
            objectTool.value.addPoint(worldPos);
        }
    } else if (props.currentTool === 'select' && selectionTool.value?.isSelecting) {
        selectionTool.value.endSelection();
        clearSelectionRect();
    }
};

const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    // Handle grid adjustment when grid-adjust tool is active (fine-tuning with mouse wheel)
    if (props.currentTool === 'grid-adjust') {
        const delta = e.evt.deltaY > 0 ? -1 : 1; // Resize grid by 1 unit per wheel tick for fine adjustment
        const newSize = gridSystem.adjustGridSize(delta);
        
        // Emit grid config change so parent component can update the grid
        emit('object-modified', 'grid-config', { worldUnitsPerCell: newSize });
        return;
    }

    // Handle zooming for other tools
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
    } as unknown as Partial<WallObject | PortalObject | LightObject>; // Using type assertion to match emit type

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
    } as unknown as Partial<WallObject | PortalObject | LightObject>; // Using type assertion

    emit('object-modified', 'viewport', updates);
};

const handleOriginDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (props.currentTool !== 'grid-adjust') return;

    const shape = e.target;
    const newOffset = {
        x: shape.x(),
        y: shape.y()
    };

    // Emit grid offset change so parent component can update the grid origin
    emit('object-modified', 'grid-offset', { offset: newOffset });
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
    const dragOffset = { x: node.x(), y: node.y() };

    // Find the portal to get its current coords
    const portal = props.portals.find(p => p.id === id);
    if (!portal || !portal.coords || portal.coords.length < 4) {
        console.error('Portal or coords not found for drag end:', { id, portal });
        return;
    }

    // Calculate the center of the original portal
    const originalCenterX = (portal.coords[0] + portal.coords[2]) / 2;
    const originalCenterY = (portal.coords[1] + portal.coords[3]) / 2;
    
    // Calculate new center position
    const newCenterX = originalCenterX + dragOffset.x;
    const newCenterY = originalCenterY + dragOffset.y;
    
    // Apply snapping to the center if enabled
    const snappedCenter = props.gridConfig.snap 
        ? snapToWorldGrid(
            { x: newCenterX, y: newCenterY }, 
            props.mapMetadata.coordinates.worldUnitsPerGridCell,
            props.mapMetadata.coordinates.offset
          )
        : { x: newCenterX, y: newCenterY };

    // Calculate the offset to apply to all coordinates
    const deltaX = snappedCenter.x - originalCenterX;
    const deltaY = snappedCenter.y - originalCenterY;

    // Update coords by applying the offset
    const newCoords = [
        portal.coords[0] + deltaX, // x1
        portal.coords[1] + deltaY, // y1
        portal.coords[2] + deltaX, // x2
        portal.coords[3] + deltaY  // y2
    ];

    console.log('Portal drag end (coords system):', {
        id,
        originalCoords: portal.coords,
        dragOffset,
        originalCenter: { x: originalCenterX, y: originalCenterY },
        newCenter: snappedCenter,
        delta: { x: deltaX, y: deltaY },
        newCoords
    });

    // Reset node position since we're updating coords directly
    node.position({ x: 0, y: 0 });

    emit('object-modified', id, {
        coords: newCoords,
        // Update legacy fields for backward compatibility
        position: snappedCenter,
        bounds: [
            { x: newCoords[0], y: newCoords[1] },
            { x: newCoords[2], y: newCoords[3] }
        ]
    });
};

const handleLightDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    // Update light position after drag
    const node = e.target;

    emit('object-modified', id, {
        position: { x: node.x(), y: node.y() }
    });
};

// Object drag handlers
const handleObjectDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    // Update object position after drag
    const node = e.target;
    emit('object-modified', id, {
        position: { x: node.x(), y: node.y() }
    });
};

const handleObjectVertexDrag = (e: KonvaEventObject<DragEvent>, objectId: string, vertexIndex: number) => {
    // Update object vertex position after drag
    const node = e.target;
    const newX = node.x();
    const newY = node.y();
    
    // Find the object and update the specific vertex
    const object = props.objects.find(obj => obj.id === objectId);
    if (object) {
        const newPoints = [...object.points];
        newPoints[vertexIndex * 2] = newX;
        newPoints[vertexIndex * 2 + 1] = newY;
        
        emit('object-modified', objectId, { points: newPoints });
    }
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
    
    // Cancel drawing on Escape or clear selection
    if (e.key === 'Escape') {
        if (props.currentTool === 'wall' && wallTool.value?.isDrawing) {
            cancelWallDrawing();
        }
        else if (props.currentTool === 'object' && objectTool.value?.getIsDrawing()) {
            console.log('Canceling object drawing with Escape key');
            objectTool.value.cancelDrawing();
            clearTemporaryObject();
        }
        // Clear selection if any objects are selected
        else if (props.selectedObjectIds.length > 0) {
            emit('selection-cleared');
        }
    }
    
    // Complete drawing on Enter
    if (e.key === 'Enter') {
        if (props.currentTool === 'wall' && wallTool.value?.isDrawing) {
            finishWallDrawing();
        }
        else if (props.currentTool === 'object' && objectTool.value?.getIsDrawing()) {
            console.log('Finishing object drawing with Enter key');
            objectTool.value.finishDrawing();
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

    // Snap the world position if snap is enabled
    const snappedWorldPos = props.gridConfig.snap 
        ? snapToWorldGrid(
            pos, 
            props.mapMetadata.coordinates.worldUnitsPerGridCell,
            props.mapMetadata.coordinates.offset
          )
        : pos;
    
    // Define portal length in world units. Default to 1 grid cell.
    const worldUnitsPerCell = props.mapMetadata.coordinates.worldUnitsPerGridCell;
    const portalLength = worldUnitsPerCell;

    // Create line segment coordinates [x1, y1, x2, y2] centered at snappedWorldPos
    // Default to horizontal portal
    const coords = [
        snappedWorldPos.x - portalLength / 2, snappedWorldPos.y,  // Start point
        snappedWorldPos.x + portalLength / 2, snappedWorldPos.y   // End point
    ];

    const newPortal: PortalObject = {
        id: `portal-${Date.now()}`,
        objectType: 'portal',
        coords: coords, // Simple line segment coordinates
        state: 'closed', // Default to closed
        material: 'wood', // Default material
        stroke: '#8B4513', // Brown color to match schema default
        strokeWidth: 3, // Default width to match schema
        requiresKey: false,
        visible: true,
        locked: false,
        
        // Legacy support for backward compatibility
        position: snappedWorldPos,
        rotation: 0,
        bounds: [
            { x: coords[0], y: coords[1] },
            { x: coords[2], y: coords[3] }
        ],
        freestanding: true,
        closed: true
    };

    console.log('[EditorCanvas] placePortal - Emitting new portal with coords:', JSON.parse(JSON.stringify(newPortal)));
    emit('object-added', newPortal);
};

const placeLight = (pos: Point) => {
    // Default range in world units
    const worldUnitsPerCell = props.mapMetadata.coordinates.worldUnitsPerGridCell;
    const defaultRange = 5 * worldUnitsPerCell; // 5 grid cells worth of range

    const positionToUse = props.gridConfig.snap 
        ? snapToWorldGrid(
            pos,
            worldUnitsPerCell,
            props.mapMetadata.coordinates.offset
          )
        : pos;

    const newLight: LightObject = {
        id: `light-${Date.now()}`,
        objectType: 'light',
        position: { x: positionToUse.x, y: positionToUse.y },
        type: 'point',
        brightRadius: defaultRange, // Bright radius in world units
        dimRadius: defaultRange * 2, // Dim radius (twice the bright radius)
        intensity: 1,
        color: '#ffdd00',    // Default color yellow
        shadows: true,
        shadowQuality: 'medium',
        falloffType: 'quadratic',
        animation: {
            type: 'none',
            speed: 1,
            intensity: 0.1
        },
        enabled: true,
        controllable: false,
        visible: true,
        locked: false,
        selected: false
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

// Temporary object drawing
const drawTemporaryObject = (currentMousePos: Point) => {
    if (!objectTool.value || !objectsLayer.value) {
        return;
    }
    
    clearTemporaryObject();
    
    const currentPoints = objectTool.value.getCurrentPoints();
    if (currentPoints.length < 2) {
        return; // Need at least one point to start drawing
    }
    
    // Create temporary polygon showing current shape + mouse position
    const tempPoints = [...currentPoints, currentMousePos.x, currentMousePos.y];
    
    // Close the polygon if we have more than 2 points
    if (tempPoints.length >= 6) {
        tempPoints.push(tempPoints[0], tempPoints[1]); // Close polygon
    }
    
    const konvaLayer = objectsLayer.value.getNode();
    const tempObject = new Konva.Line({
        points: tempPoints,
        stroke: '#09f',
        strokeWidth: 2,
        fill: 'rgba(0, 153, 255, 0.1)',
        closed: tempPoints.length >= 6,
        dash: [5, 5],
        listening: false,
        name: 'temp-object'
    });
    
    konvaLayer.add(tempObject);
    konvaLayer.batchDraw();
};

const clearTemporaryObject = () => {
    if (!objectsLayer.value) return;
    
    const konvaLayer = objectsLayer.value.getNode();
    const tempObjects = konvaLayer.find('.temp-object');
    tempObjects.forEach(obj => obj.destroy());
    konvaLayer.batchDraw();
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

// Handle object creation from ObjectTool
const handleObjectCreated = (object: ObjectEditorObject) => {
    emit('object-added', object);
    clearTemporaryObject(); // Clear the temporary dashed drawing lines
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

// Watch for selected non-wall objects to update transformer
watch(() => selectedNonWallObjectIds.value, (newSelectedIds) => {
    if (!transformer.value || !stage.value) return;

    if (newSelectedIds.length === 0) {
        const konvaTransformer = transformer.value.getNode();
        konvaTransformer.nodes([]);
        return;
    }

    const konvaStage = stage.value.getStage();
    const selectedNodes: Konva.Node[] = [];

    for (const id of newSelectedIds) {
        // Find the node in portal or light layers (walls are excluded)
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
    // Only allow portal editing when using select tool
    if (props.currentTool !== 'select') return;
    
    const portal = props.portals.find(p => p.id === id);
    if (!portal || !portal.coords || portal.coords.length < 4) {
        console.error('Portal or coords not found for endpoint drag', { id, portal });
        return;
    }

    const handleNode = e.target; // This is the handle (Konva.Circle)

    // 1. Get the handle's new position directly from the node
    const handleNewPos = { x: handleNode.x(), y: handleNode.y() };

    // 2. Snap this position if snap is enabled
    const snappedHandlePos = props.gridConfig.snap 
        ? snapToWorldGrid(
            handleNewPos,
            props.mapMetadata.coordinates.worldUnitsPerGridCell,
            props.mapMetadata.coordinates.offset
          )
        : handleNewPos;

    // 3. Update the coords array with the new endpoint position
    const newCoords = [...portal.coords];
    const coordIndex = endpointIndex * 2; // 0 for start (x1,y1), 2 for end (x2,y2)
    newCoords[coordIndex] = snappedHandlePos.x;
    newCoords[coordIndex + 1] = snappedHandlePos.y;
    
    console.log('[EditorCanvas] Portal endpoint drag (coords system):', {
        id, endpointIndex,
        originalCoords: portal.coords,
        handleNewPos,
        snappedHandlePos,
        coordIndex,
        newCoords
    });

    // Reset handle position since we're using absolute coordinates
    handleNode.position({ x: snappedHandlePos.x, y: snappedHandlePos.y });

    // 4. Emit the object-modified event with updated coords
    emit('object-modified', id, {
        coords: newCoords,
        // Update legacy fields for backward compatibility
        bounds: [
            { x: newCoords[0], y: newCoords[1] },
            { x: newCoords[2], y: newCoords[3] }
        ],
        position: {
            x: (newCoords[0] + newCoords[2]) / 2,
            y: (newCoords[1] + newCoords[3]) / 2
        }
    });

    // Redraw the layer containing the portal
    const portalKonvaNode = handleNode.getParent();
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