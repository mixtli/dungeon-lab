<template>
    <div ref="canvasContainer" class="editor-canvas-container">
        <v-stage ref="stage" :config="stageConfig" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
            @mouseup="handleMouseUp" @wheel="handleWheel">
            <!-- Background layer with map image -->
            <v-layer ref="bgLayer">
                <v-image v-if="backgroundImage" :config="backgroundImageConfig" />
            </v-layer>

            <!-- Grid layer -->
            <v-layer ref="gridLayer" :config="gridLayerConfig">
                <v-line v-for="(x, index) in gridLines.vertical" :key="`vgrid-${index}`" :config="{
                    points: [x, 0, x, canvasSize.height],
                    stroke: gridConfig.color,
                    strokeWidth: 1,
                    opacity: gridConfig.opacity
                }" />
                <v-line v-for="(y, index) in gridLines.horizontal" :key="`hgrid-${index}`" :config="{
                    points: [0, y, canvasSize.width, y],
                    stroke: gridConfig.color,
                    strokeWidth: 1,
                    opacity: gridConfig.opacity
                }" />
            </v-layer>

            <!-- Wall layer -->
            <v-layer ref="wallLayer">
                <v-line v-for="wall in visibleWalls" :key="wall.id" :config="getWallConfig(wall)"
                    @click="handleObjectClick($event, wall.id)" @dragend="handleWallDragEnd($event, wall.id)" />
            </v-layer>

            <!-- Portal layer -->
            <v-layer ref="portalLayer">
                <v-group v-for="portal in visiblePortals" :key="portal.id" :config="getPortalGroupConfig(portal)"
                    @click="handleObjectClick($event, portal.id)" @dragend="handlePortalDragEnd($event, portal.id)">
                    <v-rect :config="getPortalRectConfig(portal)" />
                </v-group>
            </v-layer>

            <!-- Light layer -->
            <v-layer ref="lightLayer">
                <v-circle v-for="light in visibleLights" :key="light.id" :config="getLightConfig(light)"
                    @click="handleObjectClick($event, light.id)" @dragend="handleLightDragEnd($event, light.id)" />
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
    LightObject,
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
    (e: 'object-added', object: WallObject | PortalObject | LightObject): void;
    (e: 'object-modified', id: string, updates: Partial<WallObject | PortalObject | LightObject>): void;
    (e: 'object-removed', id: string): void;
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

// Get grid system
const gridSystem = useGridSystem(props.gridConfig);

// Filtered objects by visibility
const visibleWalls = computed(() =>
    props.walls.filter(wall => wall.visible !== false)
);

const visiblePortals = computed(() =>
    props.portals.filter(portal => portal.visible !== false)
);

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

// Calculate grid lines for the visible area
const gridLines = computed(() => {
    return gridSystem.getGridLines(
        canvasSize.width,
        canvasSize.height,
        0,
        0
    );
});

// Transformer configuration
const transformerConfig = computed(() => ({
    boundBoxFunc: (_oldBox: object, newBox: object) => {
        // Add constraints if needed
        return newBox;
    },
    rotateEnabled: true,
    resizeEnabled: true
}));

// Configure objects based on their data
const getWallConfig = (wall: WallObject) => {
    // Ensure all points are valid numbers
    const validPoints = wall.points.map(p => typeof p === 'number' && !isNaN(p) ? p : 0);
    
    return {
        points: validPoints,
        stroke: wall.stroke || '#ff3333',
        strokeWidth: wall.strokeWidth || 3,
        lineCap: 'round',
        lineJoin: 'round',
        draggable: props.currentTool === 'select',
        id: wall.id
    };
};

const getPortalGroupConfig = (portal: PortalObject) => ({
    x: portal.position.x,
    y: portal.position.y,
    draggable: props.currentTool === 'select',
    rotation: portal.rotation,
    id: portal.id
});

const getPortalRectConfig = (portal: PortalObject) => {
    // Simplified portal representation
    return {
        width: 40,
        height: 10,
        offsetX: 20,
        offsetY: 5,
        fill: portal.closed ? '#8B4513' : '#D2B48C',
        stroke: '#000000',
        strokeWidth: 1
    };
};

const getLightConfig = (light: LightObject) => ({
    x: light.position.x,
    y: light.position.y,
    radius: 10,
    fill: light.color || '#ffdd00',
    stroke: '#000000',
    strokeWidth: 1,
    draggable: props.currentTool === 'select',
    id: light.id,
    shadowColor: light.color || '#ffdd00',
    shadowBlur: 10,
    shadowOpacity: 0.5
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
    
    // Convert position to world coordinates
    const worldPos = {
        x: (pos.x - stage.x()) / stage.scaleX(),
        y: (pos.y - stage.y()) / stage.scaleY()
    };
    
    // Track mouse position for UI if needed
// Remove this line for now
    
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
    } as unknown as Partial<WallObject | PortalObject | LightObject>; // Using type assertion to match emit type

    // Emit changes for parent component to update viewport transform
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
    // Update portal position after drag
    const node = e.target;

    emit('object-modified', id, {
        position: { x: node.x(), y: node.y() },
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
};

const placePortal = (pos: Point) => {
    const snappedPos = gridSystem.snapToGrid(pos);

    // Generate portal data
    const portal: PortalObject = {
        id: `portal-${Date.now()}`,
        objectType: 'portal',
        position: snappedPos,
        rotation: 0,
        bounds: [], // This would be calculated based on portal size
        closed: true,
        freestanding: false
    };

    emit('object-added', portal);
};

const placeLight = (pos: Point) => {
    const snappedPos = gridSystem.snapToGrid(pos);

    // Generate light data
    const light: LightObject = {
        id: `light-${Date.now()}`,
        objectType: 'light',
        position: snappedPos,
        range: 120,
        intensity: 0.8,
        color: '#ffdd00',
        shadows: true
    };

    emit('object-added', light);
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
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('keydown', handleKeyDown);

    // Load map image if available
    if (props.mapMetadata.image) {
        loadMapImage(props.mapMetadata.image);
    }
});

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
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    text-align: center;
}

.tool-help-content h3 {
    margin-top: 0;
    color: #333;
}

.close-help {
    margin-top: 15px;
    padding: 8px 16px;
    background-color: #4a6da7;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.close-help:hover {
    background-color: #3a5d97;
}

.drawing-status {
    position: absolute;
    top: 15px;
    right: 15px;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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