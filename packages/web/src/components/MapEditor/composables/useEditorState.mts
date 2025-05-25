import { ref, computed, reactive } from 'vue';
import type {
  WallObject,
  PortalObject,
  LightObject,
  EditorToolType,
  GridConfig,
  MapMetadata,
  AnyEditorObject
} from '../../../../../shared/src/types/mapEditor.mjs';

/**
 * Core state management for the map editor
 */
export function useEditorState() {
  // Core editor state
  const walls = ref<WallObject[]>([]);
  const objectWalls = ref<WallObject[]>([]); // New collection for objects_line_of_sight
  const portals = ref<PortalObject[]>([]);
  const lights = ref<LightObject[]>([]);
  const selectedObjectIds = ref<string[]>([]);
  const currentTool = ref<EditorToolType>('select');
  const isDrawing = ref(false);
  const isModified = ref(false);

  // Grid configuration
  const gridConfig = reactive<GridConfig>({
    visible: true,
    size: 50,
    color: 'rgba(0, 0, 0, 0.6)',
    snap: true,
    opacity: 0.8
  });

  // Map metadata with defaults
  const mapMetadata = reactive<MapMetadata>({
    name: 'Untitled Map',
    format: 1.0,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: 30, y: 30 },
      pixels_per_grid: 50
    },
    image: '',
    environment: {
      baked_lighting: false,
      ambient_light: '#ffffff'
    }
  });

  // Viewport transform (scale and position)
  const viewportTransform = reactive({
    scale: 1,
    position: { x: 0, y: 0 }
  });

  // Computed state
  const allObjects = computed<AnyEditorObject[]>(() => {
    return [...walls.value, ...objectWalls.value, ...portals.value, ...lights.value];
  });

  const selectedObjects = computed(() => {
    return allObjects.value.filter((obj) => selectedObjectIds.value.includes(obj.id));
  });

  // Object manipulation methods
  const addWall = (wall: WallObject) => {
    walls.value.push(wall);
    isModified.value = true;
  };

  const updateWall = (id: string, updates: Partial<WallObject>) => {
    const index = walls.value.findIndex((w) => w.id === id);
    if (index >= 0) {
      walls.value[index] = { ...walls.value[index], ...updates };
      isModified.value = true;
    }
  };

  // Methods for object walls
  const addObjectWall = (wall: WallObject) => {
    objectWalls.value.push(wall);
    isModified.value = true;
  };

  const updateObjectWall = (id: string, updates: Partial<WallObject>) => {
    const index = objectWalls.value.findIndex((w) => w.id === id);
    if (index >= 0) {
      objectWalls.value[index] = { ...objectWalls.value[index], ...updates };
      isModified.value = true;
    }
  };

  const addPortal = (portal: PortalObject) => {
    console.log('[useEditorState] addPortal. Received portal object:', JSON.parse(JSON.stringify(portal)));
    portals.value.push(portal);
    console.log('[useEditorState] addPortal. Portals count after push:', portals.value.length);
    isModified.value = true;
  };

  const updatePortal = (id: string, updates: Partial<PortalObject>) => {
    const index = portals.value.findIndex((p) => p.id === id);
    if (index >= 0) {
      portals.value[index] = { ...portals.value[index], ...updates };
      isModified.value = true;
    }
  };

  const addLight = (light: LightObject) => {
    lights.value.push(light);
    isModified.value = true;
  };

  const updateLight = (id: string, updates: Partial<LightObject>) => {
    const index = lights.value.findIndex((l) => l.id === id);
    if (index >= 0) {
      lights.value[index] = { ...lights.value[index], ...updates };
      isModified.value = true;
    }
  };

  const removeObject = (id: string) => {
    // Try to remove from each collection
    let removed = false;

    const wallIndex = walls.value.findIndex((w) => w.id === id);
    if (wallIndex >= 0) {
      walls.value.splice(wallIndex, 1);
      removed = true;
    }

    const objectWallIndex = objectWalls.value.findIndex((w) => w.id === id);
    if (objectWallIndex >= 0) {
      objectWalls.value.splice(objectWallIndex, 1);
      removed = true;
    }

    const portalIndex = portals.value.findIndex((p) => p.id === id);
    if (portalIndex >= 0) {
      portals.value.splice(portalIndex, 1);
      removed = true;
    }

    const lightIndex = lights.value.findIndex((l) => l.id === id);
    if (lightIndex >= 0) {
      lights.value.splice(lightIndex, 1);
      removed = true;
    }

    if (removed) {
      // Remove from selection if present
      const selIndex = selectedObjectIds.value.indexOf(id);
      if (selIndex >= 0) {
        selectedObjectIds.value.splice(selIndex, 1);
      }
      isModified.value = true;
    }
  };

  // Selection methods
  const selectObject = (id: string | null, addToSelection = false) => {
    if (id === null) {
      // Clear selection
      selectedObjectIds.value = [];
      return;
    }

    if (addToSelection) {
      // If already selected, unselect it
      const index = selectedObjectIds.value.indexOf(id);
      if (index >= 0) {
        selectedObjectIds.value.splice(index, 1);
      } else {
        selectedObjectIds.value.push(id);
      }
    } else {
      // Replace selection
      selectedObjectIds.value = [id];
    }
  };

  const selectObjects = (ids: string[]) => {
    selectedObjectIds.value = [...ids];
  };

  // Tool selection
  const setTool = (tool: EditorToolType) => {
    currentTool.value = tool;
    // When changing tools, exit drawing mode
    if (isDrawing.value) {
      isDrawing.value = false;
    }
  };

  // State management methods
  const resetState = () => {
    walls.value = [];
    objectWalls.value = [];
    portals.value = [];
    lights.value = [];
    selectedObjectIds.value = [];
    isDrawing.value = false;
    isModified.value = false;

    gridConfig.visible = true;
    gridConfig.size = 50;
    gridConfig.color = 'rgba(0, 0, 0, 0.6)';
    gridConfig.snap = true;
    gridConfig.opacity = 0.8;

    viewportTransform.scale = 1;
    viewportTransform.position = { x: 0, y: 0 };
  };

  const loadMap = (
    newMapMetadata: MapMetadata,
    newWalls: WallObject[] = [],
    newObjectWalls: WallObject[] = [],
    newPortals: PortalObject[] = [],
    newLights: LightObject[] = []
  ) => {
    // Update map metadata
    Object.assign(mapMetadata, newMapMetadata);

    // Replace objects
    walls.value = newWalls;
    objectWalls.value = newObjectWalls;
    portals.value = newPortals;
    lights.value = newLights;

    // Reset selection and modified state
    selectedObjectIds.value = [];
    isModified.value = false;
  };

  // Return the public API
  return {
    // State
    walls,
    objectWalls,
    portals,
    lights,
    selectedObjectIds,
    currentTool,
    isDrawing,
    isModified,
    gridConfig,
    mapMetadata,
    viewportTransform,

    // Computed
    allObjects,
    selectedObjects,

    // Methods
    addWall,
    updateWall,
    addObjectWall,
    updateObjectWall,
    addPortal,
    updatePortal,
    addLight,
    updateLight,
    removeObject,
    selectObject,
    selectObjects,
    setTool,
    resetState,
    loadMap
  };
}
