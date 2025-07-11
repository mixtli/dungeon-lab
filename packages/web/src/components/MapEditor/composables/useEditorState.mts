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
import type { UVTTLight } from '../../../../../shared/src/types/maps.mts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utility: Convert { color: #RRGGBB, opacity } to 8-char hex (RRGGBBAA)
 */
function toUVTTColor(color: string, opacity: number): string {
  // Remove # if present
  const rgb = color.replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `${rgb}${a}`;
}

/**
 * Extend LightObject for editor UI to include opacity
 */
export interface EditorLightObject extends LightObject {
  opacity: number;
}

/**
 * Convert UVTTLight to LightObject for editor state
 */
function uvttLightToEditorLight(uvtt: UVTTLight): EditorLightObject {
  const { color, opacity } = parseUVTTColor(uvtt.color);
  console.log('[uvttLightToEditorLight] Original UVTT color:', uvtt.color, 'Parsed color:', color, 'Opacity:', opacity);
  return {
    id: uuidv4(),
    objectType: 'light',
    position: uvtt.position,
    range: uvtt.range,
    intensity: uvtt.intensity,
    color, // UI color (#RRGGBB)
    opacity, // UI opacity
    shadows: uvtt.shadows,
    name: undefined,
    visible: true,
    locked: false,
    selected: false,
  };
}

/**
 * Convert LightObject to UVTTLight for DB/UVTT export
 */
function editorLightToUVTTLight(light: EditorLightObject): UVTTLight {
  return {
    position: light.position,
    range: light.range,
    intensity: light.intensity,
    color: toUVTTColor(light.color, light.opacity),
    shadows: light.shadows
  };
}

/**
 * Utility: Convert 8-char hex (RRGGBBAA) to { color: #RRGGBB, opacity }
 */
export function parseUVTTColor(hex: string): { color: string; opacity: number } {
  if (/^[0-9a-fA-F]{8}$/.test(hex)) {
    const rgb = hex.slice(0, 6);
    const a = hex.slice(6, 8);
    let opacity = parseInt(a, 16) / 255;
    opacity = Math.max(opacity, 0.2); // Clamp to minimum 0.2
    return {
      color: `#${rgb}`,
      opacity
    };
  }
  // fallback: treat as solid white
  return { color: '#ffffff', opacity: 1 };
}

/**
 * Core state management for the map editor
 */
export function useEditorState() {
  // Core editor state
  const walls = ref<WallObject[]>([]);
  const objectWalls = ref<WallObject[]>([]); // New collection for objects_line_of_sight
  const portals = ref<PortalObject[]>([]);
  // Use EditorLightObject for lights
  const lights = ref<EditorLightObject[]>([]);
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

  // When adding a light, ensure color/opacity is stored for UI and DB
  const addLight = (light: Omit<EditorLightObject, 'id' | 'objectType'>) => {
    lights.value.push({
      ...light,
      id: uuidv4(),
      objectType: 'light',
    });
    isModified.value = true;
  };

  // When updating a light, ensure color/opacity is handled
  const updateLight = (id: string, updates: Partial<Omit<EditorLightObject, 'id' | 'objectType'>>) => {
    const index = lights.value.findIndex((l) => l.id === id);
    if (index >= 0) {
      lights.value[index] = {
        ...lights.value[index],
        ...updates,
      };
      isModified.value = true;
    }
  };

  // When loading from DB/UVTT, convert UVTTLight[] to EditorLightObject[]
  function loadLightsFromUVTT(uvttLights: UVTTLight[]) {
    lights.value = uvttLights.map(uvttLightToEditorLight);
  }

  // When saving to DB/UVTT, convert EditorLightObject[] to UVTTLight[]
  function saveLightsToUVTT(): UVTTLight[] {
    return lights.value.map(editorLightToUVTTLight);
  }

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
    newLights: UVTTLight[] = []
  ) => {
    // Update map metadata
    Object.assign(mapMetadata, newMapMetadata);

    // Replace objects
    walls.value = newWalls;
    objectWalls.value = newObjectWalls;
    portals.value = newPortals;
    lights.value = newLights.map(light => uvttLightToEditorLight(light));

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
    loadMap,
    loadLightsFromUVTT,
    saveLightsToUVTT
  };
}
