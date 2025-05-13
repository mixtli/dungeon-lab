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
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue';
import Konva from 'konva';
// Import KonvaEventObject as a value, not as a type
import { type KonvaEventObject } from 'konva/lib/Node.js';
import { useGridSystem } from '../composables/useGridSystem.mjs';
import type {
    WallObject,
    PortalObject,
    LightObject,
    EditorToolType,
    GridConfig,
    Point,
    MapMetadata
} from '../../../../../shared/src/types/mapEditor.mjs';

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
const stage = ref<Konva.Stage | null>(null);
const bgLayer = ref<Konva.Layer | null>(null);
const gridLayer = ref<Konva.Layer | null>(null);
const wallLayer = ref<Konva.Layer | null>(null);
const portalLayer = ref<Konva.Layer | null>(null);
const lightLayer = ref<Konva.Layer | null>(null);
const selectionLayer = ref<Konva.Layer | null>(null);
const transformer = ref<Konva.Transformer | null>(null);

// Canvas state
const canvasSize = reactive({
    width: 1000,
    height: 800
});

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
const getWallConfig = (wall: WallObject) => ({
    points: wall.points,
    stroke: wall.stroke || '#ff3333',
    strokeWidth: wall.strokeWidth || 3,
    lineCap: 'round',
    lineJoin: 'round',
    draggable: props.currentTool === 'select',
    id: wall.id
});

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
    // Handle mouse down events based on current tool
    const konvaStage = stage.value?.getStage();
    const pos = konvaStage?.getPointerPosition();

    if (!pos) return;

    // If clicked on stage background and not on an object
    if (e.target === konvaStage) {
        // Clear selection
        emit('object-selected', null, false);

        // Start drawing if in drawing tool mode
        if (props.currentTool === 'wall') {
            startWallDrawing(pos);
        } else if (props.currentTool === 'portal') {
            placePortal(pos);
        } else if (props.currentTool === 'light') {
            placeLight(pos);
        }
    }
};

const handleMouseMove = () => {
    // Handle mouse move for drawing
    const pos = stage.value?.getStage()?.getPointerPosition();
    if (!pos) return;

    // Implement drawing operations
};

const handleMouseUp = () => {
    // Handle mouse up for finishing drawing
    const pos = stage.value?.getStage()?.getPointerPosition();
    if (!pos) return;

    // Implement drawing operations
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

// Drawing methods
const startWallDrawing = (pos: Point) => {
    // Implementation will be added
    console.log('Start wall drawing at', pos);
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

// Watch for selected objects to update transformer
watch(() => props.selectedObjectIds, (newSelectedIds) => {
    if (!transformer.value || !stage.value) return;

    if (newSelectedIds.length === 0) {
        transformer.value.nodes([]);
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

    transformer.value.nodes(selectedNodes);
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

    // Load map image if available
    if (props.mapMetadata.image) {
        loadMapImage(props.mapMetadata.image);
    }
});

watch(() => [canvasSize.width, canvasSize.height], () => {
    if (stage.value) {
        const konvaStage = stage.value.getStage();
        konvaStage?.width(canvasSize.width);
        konvaStage?.height(canvasSize.height);
    }
});
</script>

<style scoped>
.editor-canvas-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    background-color: #f0f0f0;
}
</style>