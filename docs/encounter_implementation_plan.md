# Scene System Implementation Plan

## Overview

The encounter system will provide turn-based combat between player characters and NPCs/monsters on a shared map. Players will be able to control their characters during their turns, performing game-system-specific actions while the Game Master manages NPCs and monsters. All actions and movements will be synchronized across all connected clients.

## Scene-Based Architecture

This implementation plan adopts a more flexible scene-based architecture, where an encounter is just one type of scene. The scene system will support various interaction modes:

- **Encounter Scenes**: Turn-based combat with initiative tracking and combat actions
- **Social Scenes**: Conversation and social interaction spaces with dialogue systems
- **Exploration Scenes**: Areas for exploration with points of interest and measurements
- **Custom read()**: Extensible framework for plugin-specific scene types

All scene types share a common foundation for map rendering, token placement, and synchronization, with specialized behaviors for each type. This approach allows seamless transitions between different modes of play (e.g., moving from exploration to combat) while maintaining the same map and token positions.

## Core Components

### 1. Data Models

#### Base Scene Model

```typescript
interface Scene {
  id: string;
  campaignId: string;
  mapId: string;
  name: string;
  description?: string;
  sceneType: 'encounter' | 'social' | 'exploration' | 'custom';
  status: 'active' | 'paused' | 'archived';
  tokens: Token[];

  // Common visual and grid settings (shared by all scene types)
  viewportSettings?: {
    centerX: number; // Last saved viewport center X
    centerY: number; // Last saved viewport center Y
    zoom: number; // Last saved zoom level
    bounds: {
      // Map boundaries
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };

  gridSettings: {
    type: 'square' | 'hex' | 'none';
    size: number;
    color: string;
    opacity: number;
    offsetX?: number;
    offsetY?: number;
    showGrid: boolean;
  };

  visualSettings?: {
    theme: 'light' | 'dark' | 'custom';
    tokenAnimations: boolean;
    effectsLevel: 'high' | 'medium' | 'low' | 'off';
    fogOfWar: boolean;
    ambientLight?: {
      color: string;
      intensity: number;
    };
    background?: {
      color: string;
      imageUrl?: string;
    };
  };

  performanceSettings?: {
    maxFPS?: number;
    cullingEnabled: boolean;
    textureQuality: 'high' | 'medium' | 'low';
  };

  // For plugin-specific data
  systemSpecificData?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Encounter Scene Model

```typescript
interface EncounterScene extends Scene {
  sceneType: 'encounter'; // Always 'encounter' for this type

  // Combat-specific properties
  currentRound: number;
  currentTurnActorId: string | null;
  initiative: InitiativeTracker;
  activeEffects: Effect[];

  // Combat-specific settings
  combatSettings?: {
    turnTimeLimit?: number; // Optional time limit for turns in seconds
    autoEndTurn: boolean; // Automatically end turn when time expires
    showDamageNumbers: boolean;
    showAttackAnimations: boolean;
    highlightActiveToken: boolean;
  };
}
```

#### Social Scene Model

```typescript
interface SocialScene extends Scene {
  sceneType: 'social';

  // Social interaction specific properties
  activeConversation?: {
    speakingTokenId: string | null;
    listeners: string[]; // Token IDs of listeners
    mood?: string; // Current conversation mood
  };

  dialogueOptions?: {
    showSpeechBubbles: boolean;
    showNameLabels: boolean;
    usePortraits: boolean;
  };
}
```

#### Exploration Scene Model

```typescript
interface ExplorationScene extends Scene {
  sceneType: 'exploration';

  // Exploration-specific properties
  pointsOfInterest?: Array<{
    id: string;
    position: { x: number; y: number };
    name: string;
    description?: string;
    iconUrl?: string;
    isRevealed: boolean;
  }>;

  explorationSettings?: {
    showMeasurementTools: boolean;
    enableTerrainEffects: boolean;
    revealFogOnTokenMovement: boolean;
    autoDiscoverPOIs: boolean; // Auto-discover Points of Interest
  };
}
```

#### Token Model

```typescript
interface Token {
  id: string;
  sceneId: string; // Reference to the parent scene
  actorId: string;
  actorType: 'character' | 'npc' | 'monster';
  name: string;
  isVisible: boolean;
  position: {
    x: number;
    y: number;
    rotation?: number;
  };
  size: {
    width: number;
    height: number;
  };
  // For NPCs/monsters (not propagated back to original actor)
  tempStats?: Record<string, any>;
  // For tracking state within scene
  currentHp?: number;
  maxHp?: number;
  conditions?: string[];
  // Other game-system-specific properties
  systemSpecificData?: Record<string, any>;
  visual: {
    tokenImageUrl: string;
    borderColor?: string;
    borderWidth?: number;
    scale?: number;
    tint?: string;
    effectIds?: string[];
    auraRadius?: number;
    auraColor?: string;
    lightRadius?: number;
    lightColor?: string;
    lightIntensity?: number;
    elevation?: number;
  };
  animation?: {
    enabled: boolean;
    idleAnimation?: string;
    moveAnimation?: string;
    attackAnimation?: string;
    hitAnimation?: string;
    customAnimations?: Record<string, string>;
  };
  lastPosition?: {
    x: number;
    y: number;
    rotation?: number;
  };
}
```

#### InitiativeTracker Model

```typescript
interface InitiativeTracker {
  order: Array<{
    tokenId: string;
    initiative: number;
    hasActed: boolean;
  }>;
  // Plugin can implement custom initiative logic
  systemSpecificData?: Record<string, any>;
  visual?: {
    highlightCurrentTurn: boolean;
    displayMode: 'sidebar' | 'top' | 'bottom' | 'overlay';
    compactMode: boolean;
    showPortraits: boolean;
  };
}
```

#### Effect Model

```typescript
interface Effect {
  id: string;
  name: string;
  description?: string;
  duration: {
    type: 'rounds' | 'minutes' | 'hours' | 'permanent';
    value: number;
  };
  affectedTokenIds: string[];
  creatorTokenId?: string;
  // Plugin-specific effect data
  systemSpecificData?: Record<string, any>;
  visual?: {
    effectType: 'aura' | 'light' | 'particle' | 'animation' | 'area';
    texture?: string;
    color?: string;
    secondaryColor?: string;
    scale?: number;
    opacity?: number;
    animationSpeed?: number;
    particleCount?: number;
    blendMode?: string;
    shape?: 'circle' | 'rectangle' | 'cone' | 'line';
    dimensions?: {
      width?: number;
      height?: number;
      radius?: number;
      angle?: number;
    };
  };
  mobileOptimization?: {
    simplifiedOnMobile: boolean;
    disableOnLowPerformance: boolean;
  };
}
```

### Scene Transitions

A key advantage of the scene system is the ability to transition between different scene types while preserving the map state. This allows for seamless gameplay flow as the narrative moves between different interaction modes:

#### Example: Exploration to Encounter Transition

```typescript
// Function to convert an exploration scene to an encounter
async function transitionToEncounter(explorationSceneId: string): Promise<EncounterScene> {
  // 1. Retrieve the exploration scene
  const explorationScene = await getScene(explorationSceneId);

  // 2. Create a new encounter based on the exploration scene
  const encounter: EncounterScene = {
    ...explorationScene,
    id: generateId(), // New ID for the encounter
    sceneType: 'encounter',
    status: 'paused', // Start paused so GM can set up
    currentRound: 0,
    currentTurnActorId: null,
    initiative: {
      order: []
      // Initialize with system-specific calculations if needed
    },
    activeEffects: [],
    combatSettings: {
      autoEndTurn: false,
      showDamageNumbers: true,
      showAttackAnimations: true,
      highlightActiveToken: true
    }
    // Maintain all tokens, positions, and visual settings
  };

  // 3. Save the new encounter
  return saveScene(encounter);
}
```

#### Example: Encounter to Social Transition

```typescript
// Function to convert an encounter scene to a social scene (e.g., after combat)
async function transitionToSocialScene(encounterId: string): Promise<SocialScene> {
  // 1. Retrieve the encounter scene
  const encounterScene = await getScene(encounterId);

  // 2. Create a new social scene based on the encounter
  const socialScene: SocialScene = {
    ...encounterScene,
    id: generateId(),
    sceneType: 'social',
    status: 'active',
    // Remove encounter-specific properties
    activeEffects: undefined,
    currentRound: undefined,
    currentTurnActorId: undefined,
    initiative: undefined,

    // Add social-specific properties
    activeConversation: undefined, // No active conversation initially
    dialogueOptions: {
      showSpeechBubbles: true,
      showNameLabels: true,
      usePortraits: true
    },

    // Update token states as needed
    tokens: encounterScene.tokens.map((token) => ({
      ...token,
      // Clear combat-specific conditions
      conditions: token.conditions?.filter((c) => !COMBAT_CONDITIONS.includes(c)) || []
    }))
  };

  // 3. Save the new social scene
  return saveScene(socialScene);
}
```

These transitions preserve the spatial relationships and visual state while changing the interaction rules and available actions. The UI will adapt to show the appropriate controls for the current scene type, and the server will validate actions according to the scene type's rules.

### 2. Server-Side Components

#### SceneController

- Create, read, update, delete scenes of any type
- Associate scenes with maps and campaigns
- Manage scene status (active, paused, archived)
- Handle transitions between scene types

#### SceneService

- Core business logic for scenes
- Token placement and management
- State tracking based on scene type
- Validation of moves and actions
- Scene-specific behavior delegation

#### Specialized Scene Services

- **EncounterService**: Combat-specific logic, initiative tracking, and turn management
- **SocialService**: Conversation tracking, dialogue management, and mood handling
- **ExplorationService**: Point of interest management, discovery mechanics, and measurement tools

#### WebSocket Handlers

- `sceneHandler.mts` - Manage real-time scene events common to all types
- `tokenHandler.mts` - Manage token movements and updates
- `encounterHandler.mts` - Handle combat-specific events
- `socialHandler.mts` - Handle conversation and dialogue events
- `explorationHandler.mts` - Handle exploration and discovery events

#### Plugin Integration

- Define interfaces for game system plugins to implement:
  - Scene type handlers
  - Scene-specific validation and behavior
  - Token actions by scene type
  - Scene transition hooks

### 3. Client-Side Components

#### SceneStore (Pinia)

```typescript
// stores/sceneStore.mts
export const useSceneStore = defineStore('scene', {
  state: () => ({
    currentScene: null as Scene | null,
    tokens: [] as Token[],
    selectedTokenId: null as string | null,
    hoveredTokenId: null as string | null,
    pendingAction: null as Action | null
  }),
  getters: {
    isEncounterScene: (state) => state.currentScene?.sceneType === 'encounter',
    isSocialScene: (state) => state.currentScene?.sceneType === 'social',
    isExplorationScene: (state) => state.currentScene?.sceneType === 'exploration',
    currentEncounter: (state) =>
      state.isEncounterScene ? (state.currentScene as EncounterScene) : null,
    activeConversation: (state) =>
      state.isSocialScene ? (state.currentScene as SocialScene).activeConversation : null,
    pointsOfInterest: (state) =>
      state.isExplorationScene ? (state.currentScene as ExplorationScene).pointsOfInterest : []
  },
  actions: {
    // Common actions for all scene types
    async fetchScene(id: string) {
      /* ... */
    },
    async updateScene(updates: Partial<Scene>) {
      /* ... */
    },
    setSelectedToken(tokenId: string | null) {
      /* ... */
    },
    moveToken(tokenId: string, position: Position) {
      /* ... */
    },

    // Scene transitions
    async transitionToEncounter() {
      /* ... */
    },
    async transitionToSocial() {
      /* ... */
    },
    async transitionToExploration() {
      /* ... */
    },

    // Encounter-specific actions
    async startEncounter() {
      /* ... */
    },
    async endTurn() {
      /* ... */
    },

    // Social-specific actions
    async startConversation(tokenId: string, listenerIds: string[]) {
      /* ... */
    },
    async sendDialogue(tokenId: string, text: string) {
      /* ... */
    },

    // Exploration-specific actions
    async revealPointOfInterest(poiId: string) {
      /* ... */
    },
    async measureDistance(fromTokenId: string, toTokenId: string) {
      /* ... */
    }
  }
});
```

#### UI Components

- `SceneView.vue` - Base component for all scene types
- Scene-specific views:
  - `EncounterView.vue` - Combat-specific UI
  - `SocialView.vue` - Dialogue and interaction UI
  - `ExplorationView.vue` - Exploration tools and POI display
- Common components:
  - `TokenContextMenu.vue` - Context menu with scene-specific options
  - `SceneControls.vue` - Shared controls for all scenes (pan, zoom, etc.)
  - `SceneTransitionMenu.vue` - Interface for changing scene types

#### Map Integration

- Extend existing map component to support all scene types:
- Token placement and movement (common to all scenes)
- Scene-specific overlays and visualizations
- Visual indicators for the current scene type
- Adaptive interaction modes based on scene type

### 4. WebSocket Events

All real-time communication in the scene system will use Socket.IO with zod-validated message schemas. The events will be defined in the shared package to ensure type safety between client and server. The events are hierarchical, with base scene events common to all types and specialized events for each scene type.

#### Type Definitions in Shared Package

```typescript
// packages/shared/src/types/socket/scene.mts
import { z } from 'zod';

// Base models
export const position = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional()
});

export const tokenIdentifier = z.object({
  sceneId: z.string(),
  tokenId: z.string()
});

// Base scene events - common to all scene types
export const sceneEvents = {
  // Scene events
  'scene:started': z.object({
    sceneId: z.string(),
    sceneType: z.enum(['encounter', 'social', 'exploration', 'custom']),
    scene: z.any() // Will be validated based on sceneType
  }),

  'scene:updated': z.object({
    sceneId: z.string(),
    updates: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['active', 'paused', 'archived']).optional()
      // Other common properties...
    })
  }),

  'scene:transitioned': z.object({
    fromSceneId: z.string(),
    toSceneId: z.string(),
    newSceneType: z.enum(['encounter', 'social', 'exploration', 'custom'])
  }),

  // Token events (common to all scene types)
  'token:added': z.object({
    sceneId: z.string(),
    token: z.object({
      id: z.string(),
      sceneId: z.string(),
      actorId: z.string(),
      actorType: z.enum(['character', 'npc', 'monster']),
      name: z.string(),
      isVisible: z.boolean(),
      position: position
      // Other token properties...
    })
  }),

  'token:moved': z.object({
    sceneId: z.string(),
    tokenId: z.string(),
    position: position,
    path: z.array(position).optional()
  }),

  'token:updated': z.object({
    sceneId: z.string(),
    tokenId: z.string(),
    updates: z.object({
      name: z.string().optional(),
      isVisible: z.boolean().optional()
      // Other updatable token properties...
    })
  }),

  'token:removed': z.object({
    sceneId: z.string(),
    tokenId: z.string()
  }),

  // Scene attendance events
  'scene:join': z.object({
    sceneId: z.string()
  }),

  'scene:leave': z.object({
    sceneId: z.string()
  })
};

// Encounter-specific events extend the base scene events
export const encounterEvents = {
  ...sceneEvents,

  'encounter:turn:changed': z.object({
    sceneId: z.string(),
    currentTurnActorId: z.string().nullable(),
    initiative: z.object({
      order: z.array(
        z.object({
          tokenId: z.string(),
          initiative: z.number(),
          hasActed: z.boolean()
        })
      )
    }),
    round: z.number()
  }),

  'encounter:effect:added': z.object({
    sceneId: z.string(),
    effect: z.object({
      id: z.string(),
      name: z.string()
      // Other effect properties...
    })
  })

  // Other encounter-specific events...
};

// Social scene events extend the base scene events
export const socialEvents = {
  ...sceneEvents,

  'social:conversation:started': z.object({
    sceneId: z.string(),
    speakingTokenId: z.string(),
    listenerTokenIds: z.array(z.string())
  }),

  'social:dialogue:sent': z.object({
    sceneId: z.string(),
    tokenId: z.string(),
    text: z.string(),
    mood: z.string().optional()
  })

  // Other social-specific events...
};

// Exploration scene events extend the base scene events
export const explorationEvents = {
  ...sceneEvents,

  'exploration:poi:revealed': z.object({
    sceneId: z.string(),
    poiId: z.string(),
    revealedBy: z.string() // tokenId that discovered it
  }),

  'exploration:measurement:created': z.object({
    sceneId: z.string(),
    id: z.string(),
    fromPosition: position,
    toPosition: position,
    distance: z.number()
  })

  // Other exploration-specific events...
};
```

### Scene Transitions

A key advantage of the scene system is the ability to transition between different scene types while preserving the map state:

```typescript
// Function to convert an exploration scene to an encounter
async function transitionToEncounter(explorationSceneId: string): Promise<EncounterScene> {
  // 1. Retrieve the exploration scene
  const explorationScene = await getScene(explorationSceneId);

  // 2. Create a new encounter based on the exploration scene
  const encounter: EncounterScene = {
    ...explorationScene,
    id: generateId(), // New ID for the encounter
    sceneType: 'encounter',
    status: 'paused', // Start paused so GM can set up
    currentRound: 0,
    currentTurnActorId: null,
    initiative: {
      order: []
      // Initialize with system-specific calculations if needed
    },
    activeEffects: [],
    combatSettings: {
      autoEndTurn: false,
      showDamageNumbers: true,
      showAttackAnimations: true,
      highlightActiveToken: true
    }
    // Maintain all tokens, positions, and visual settings
  };

  // 3. Save the new encounter
  return saveScene(encounter);
}
```

### Data Flow Examples

#### Example 1: Player Moves Token (Common for All Scene Types)

1. Player drags their token on the map UI
2. Client validates the move is within allowed range (preview UI feedback)
3. On drop, client sends `token:move` event
4. Server:
   - Validates player owns the token
   - Validates if token can move (depends on scene type)
   - Updates token position in database
   - Emits `token:moved` to all clients
5. All clients (including sender) update token position in their SceneStore
6. Map component re-renders with new token position

#### Example 2: Player Attacks (Encounter Scene)

1. Player selects their token, then selects target token for attack
2. Client sends `token:action` with type 'attack'
3. Server:
   - Validates scene is an encounter
   - Validates player owns the token
   - Validates it's the token's turn
   - Validates target is in range and line of sight
   - Calls game system plugin to resolve attack
   - Updates target token HP based on damage
   - Emits `action:result` with attack outcome
   - Emits `token:updated` with new target HP
4. All clients show attack animation and result
5. All clients update target token's HP in their SceneStore

#### Example 3: Starting a Conversation (Social Scene)

1. GM selects an NPC token and a player character token
2. GM initiates conversation through UI
3. Client sends `conversation:start` event
4. Server:
   - Validates scene is a social scene
   - Validates GM permission
   - Creates conversation state
   - Emits `conversation:started` to all clients
5. All clients update UI to show conversation state
6. Active conversation participants get UI for dialogue

## Map Implementation with Pixi.js

The map component is central to the scene system, as it's where all the visual interaction happens. This section provides a focused implementation plan using Pixi.js as our rendering engine for all scene types, with special consideration for mobile and future native app deployment.

### Scene-Specific Rendering Adaptations

The basic Pixi.js architecture will be extended to handle different scene types:

```typescript
// src/composables/useSceneRenderer.mts
export function useSceneRenderer(callbacks: SceneCallbacks = {}) {
  // ... base renderer setup as described previously ...

  // Scene type specific setup
  function setupSceneByType(scene: Scene) {
    // Clear any previous scene-specific elements
    clearSceneSpecificElements();

    // Setup based on scene type
    switch (scene.sceneType) {
      case 'encounter':
        setupEncounterElements(scene as EncounterScene);
        break;
      case 'social':
        setupSocialElements(scene as SocialScene);
        break;
      case 'exploration':
        setupExplorationElements(scene as ExplorationScene);
        break;
      case 'custom':
        // Handle plugin-provided custom scenes
        setupCustomSceneElements(scene);
        break;
    }
  }

  function setupEncounterElements(scene: EncounterScene) {
    // Create initiative display
    // Setup combat-specific UI elements
    // Add turn indicators
    // Create combat effect visualizations
  }

  function setupSocialElements(scene: SocialScene) {
    // Setup speech bubbles
    // Add conversation indicators
    // Create mood visualizations
    // Setup dialogue UI elements
  }

  function setupExplorationElements(scene: ExplorationScene) {
    // Add points of interest markers
    // Setup measurement tools
    // Create discovery indicators
    // Setup terrain effect visualizations
  }

  // ... rest of renderer implementation ...

  return {
    // ... existing return values ...
    setupSceneByType
  };
}
```

### Common Interactive Elements Across Scene Types

While each scene type has specific behavior, many interactive elements are shared:

```typescript
// src/components/scene/SceneView.vue
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSceneRenderer } from '@/composables/useSceneRenderer';
import { useSceneStore } from '@/stores/sceneStore';
import EncounterControls from './EncounterControls.vue';
import SocialControls from './SocialControls.vue';
import ExplorationControls from './ExplorationControls.vue';

const sceneStore = useSceneStore();
const currentScene = computed(() => sceneStore.currentScene);
const sceneType = computed(() => currentScene.value?.sceneType || 'encounter');

const {
  renderer,
  initialize,
  updateTokens,
  setupSceneByType,
  // ... other methods ...
} = useSceneRenderer({
  onTokenSelect: (tokenId) => sceneStore.setSelectedToken(tokenId),
  onTokenMove: (tokenId, position) => sceneStore.moveToken(tokenId, position),
  // ... other callbacks ...
});

// Setup the scene when it changes
watch(() => sceneStore.currentScene, (newScene) => {
  if (newScene) {
    updateTokens(newScene.tokens);
    setupSceneByType(newScene);
  }
}, { immediate: true, deep: true });

// ... rest of component implementation ...
</script>

<template>
  <div class="scene-view">
    <div ref="mapRef" class="scene-map"></div>

    <!-- Scene-specific controls -->
    <EncounterControls v-if="sceneType === 'encounter'" />
    <SocialControls v-else-if="sceneType === 'social'" />
    <ExplorationControls v-else-if="sceneType === 'exploration'" />

    <!-- Common controls -->
    <SceneControls />
  </div>
</template>
```

## HUD Interface Architecture

The encounter system will use a full-screen HUD (Heads Up Display) interface similar to Foundry VTT, where the map serves as the primary canvas and all tools and information panels float as semi-transparent overlays.

### Full-Screen Encounter Mode

#### Window Management
- Encounters open in a new browser window/tab for dedicated focus
- Full-screen mode available for immersive gameplay
- Window can be resized but maintains aspect ratio for map consistency
- Support for multiple monitor setups (map on one screen, tools on another)

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Scene Navigation Bar (Top)                                  │
├─┬───────────────────────────────────────────────────────┬───┤
│T│                                                       │ S │
│o│                                                       │ c │
│o│                    Map Canvas                         │ e │
│l│                  (Full Background)                    │ n │
│b│                                                       │ e │
│a│                                                       │   │
│r│                                                       │ B │
│ │                                                       │ r │
│ │                                                       │ o │
│ │                                                       │ w │
│ │                                                       │ s │
│ │                                                       │ e │
│ │                                                       │ r │
├─┴───────────────────────────────────────────────────────┴───┤
│ Player Tokens & Hotbar (Bottom)                            │
└─────────────────────────────────────────────────────────────┘
```

### Panel System Architecture

#### Panel Types and Positioning

```typescript
interface HUDPanel {
  id: string;
  type: 'initiative' | 'character-sheet' | 'chat' | 'spells' | 'inventory' | 'notes' | 'settings';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  state: 'expanded' | 'collapsed' | 'minimized' | 'hidden';
  isMovable: boolean;
  isResizable: boolean;
  opacity: number; // 0.7-0.95 for semi-transparency
  zIndex: number;
  dockable: boolean; // Can snap to screen edges
  alwaysOnTop: boolean;
}
```

#### Core HUD Panels

1. **Initiative Tracker Panel**
   - Default position: Top-right corner
   - Shows turn order, current actor, round counter
   - Collapsible to show only current turn
   - Drag to reorder initiative

2. **Character Sheet Panel**
   - Opens when token is selected
   - Shows stats, abilities, conditions
   - Can pin multiple character sheets
   - Tabbed interface for multiple characters

3. **Chat Panel**
   - Default position: Bottom-right
   - Dice rolls, actions, GM messages
   - Collapsible to show only recent messages
   - Filter by message type

4. **Spell/Ability Panel**
   - Default position: Right side, middle
   - Quick access to character abilities
   - Drag-and-drop to hotbar
   - Search and filter capabilities

5. **Scene Browser Panel**
   - Default position: Right side (as shown in screenshot)
   - Navigate between scenes/maps
   - Scene thumbnails and quick switching
   - Collapsible to icon-only view

#### Toolbar System

```typescript
interface ToolbarConfig {
  position: 'left' | 'right' | 'top' | 'bottom';
  orientation: 'horizontal' | 'vertical';
  tools: ToolbarItem[];
  collapsible: boolean;
  autoHide: boolean; // Hide when not in use
}

interface ToolbarItem {
  id: string;
  icon: string;
  tooltip: string;
  action: () => void;
  isActive: boolean;
  hasSubmenu: boolean;
  submenuItems?: ToolbarItem[];
}
```

**Left Toolbar** (Primary Tools):
- Select/Move tool
- Measure distance tool
- Area of effect templates
- Lighting tools
- Fog of war tools
- Drawing tools
- Note/pin tools

**Top Navigation Bar**:
- Scene tabs/navigation
- Scene controls (play/pause)
- View controls (zoom, center)
- Settings access

**Bottom Hotbar**:
- Numbered slots (1-0 keys)
- Drag abilities/spells from panels
- Quick access to common actions
- Player-specific customization

### Component Architecture

#### Core HUD Components

```typescript
// src/components/hud/EncounterHUD.vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useHUDStore } from '@/stores/hudStore';
import { useSceneStore } from '@/stores/sceneStore';
import MapCanvas from './MapCanvas.vue';
import HUDPanel from './HUDPanel.vue';
import Toolbar from './Toolbar.vue';
import SceneNavigation from './SceneNavigation.vue';
import Hotbar from './Hotbar.vue';

const hudStore = useHUDStore();
const sceneStore = useSceneStore();

// Panel management
const panels = computed(() => hudStore.visiblePanels);
const activeTool = computed(() => hudStore.activeTool);

// Full-screen management
const isFullscreen = ref(false);
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};
</script>

<template>
  <div class="encounter-hud" :class="{ 'fullscreen': isFullscreen }">
    <!-- Map Canvas (Full Background) -->
    <MapCanvas class="map-background" />
    
    <!-- Scene Navigation (Top) -->
    <SceneNavigation class="scene-nav" />
    
    <!-- Left Toolbar -->
    <Toolbar 
      position="left" 
      :tools="hudStore.leftToolbarTools"
      class="left-toolbar"
    />
    
    <!-- Dynamic HUD Panels -->
    <HUDPanel
      v-for="panel in panels"
      :key="panel.id"
      :panel="panel"
      @move="hudStore.movePanel"
      @resize="hudStore.resizePanel"
      @toggle="hudStore.togglePanel"
      @close="hudStore.closePanel"
    />
    
    <!-- Scene Browser (Right) -->
    <div class="scene-browser">
      <!-- Scene thumbnails and navigation -->
    </div>
    
    <!-- Bottom Hotbar -->
    <Hotbar class="bottom-hotbar" />
    
    <!-- Context Menus and Tooltips -->
    <div class="overlay-layer">
      <!-- Dynamic overlays -->
    </div>
  </div>
</template>

<style scoped>
.encounter-hud {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
  font-family: 'Roboto', sans-serif;
}

.map-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.scene-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

.left-toolbar {
  position: absolute;
  left: 8px;
  top: 50px;
  z-index: 90;
}

.scene-browser {
  position: absolute;
  right: 8px;
  top: 50px;
  bottom: 60px;
  width: 200px;
  z-index: 90;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  border-radius: 8px;
}

.bottom-hotbar {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
}

.overlay-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 200;
  pointer-events: none;
}
</style>
```

#### Movable Panel Component

```typescript
// src/components/hud/HUDPanel.vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDraggable } from '@vueuse/core';

interface Props {
  panel: HUDPanel;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  move: [id: string, position: { x: number; y: number }];
  resize: [id: string, size: { width: number; height: number }];
  toggle: [id: string];
  close: [id: string];
}>();

const panelRef = ref<HTMLElement>();
const headerRef = ref<HTMLElement>();

// Make panel draggable by header
const { x, y, isDragging } = useDraggable(panelRef, {
  initialValue: { x: props.panel.position.x, y: props.panel.position.y },
  handle: headerRef,
  onEnd: () => {
    emit('move', props.panel.id, { x: x.value, y: y.value });
  }
});

const isExpanded = computed(() => props.panel.state === 'expanded');
const isCollapsed = computed(() => props.panel.state === 'collapsed');
</script>

<template>
  <div
    ref="panelRef"
    class="hud-panel"
    :class="{
      'is-dragging': isDragging,
      'is-expanded': isExpanded,
      'is-collapsed': isCollapsed
    }"
    :style="{
      left: `${x}px`,
      top: `${y}px`,
      width: `${panel.position.width}px`,
      height: isCollapsed ? 'auto' : `${panel.position.height}px`,
      opacity: panel.opacity,
      zIndex: panel.zIndex
    }"
  >
    <!-- Panel Header -->
    <div ref="headerRef" class="panel-header">
      <h3 class="panel-title">{{ panel.title }}</h3>
      <div class="panel-controls">
        <button @click="emit('toggle', panel.id)" class="toggle-btn">
          {{ isExpanded ? '−' : '+' }}
        </button>
        <button @click="emit('close', panel.id)" class="close-btn">×</button>
      </div>
    </div>
    
    <!-- Panel Content -->
    <div v-show="isExpanded" class="panel-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.hud-panel {
  position: absolute;
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  min-width: 200px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: move;
  user-select: none;
}

.panel-title {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.panel-controls {
  display: flex;
  gap: 4px;
}

.toggle-btn,
.close-btn {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
}

.toggle-btn:hover,
.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.panel-content {
  padding: 12px;
  color: #fff;
  overflow-y: auto;
  max-height: calc(90vh - 40px);
}

.is-dragging {
  transform: rotate(2deg);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
}
</style>
```

### HUD State Management

```typescript
// src/stores/hudStore.mts
export const useHUDStore = defineStore('hud', {
  state: () => ({
    panels: new Map<string, HUDPanel>(),
    activeTool: 'select' as string,
    isFullscreen: false,
    hotbarSlots: Array(10).fill(null) as (Action | null)[],
    userPreferences: {
      panelOpacity: 0.9,
      autoHidePanels: false,
      snapToGrid: true,
      showTooltips: true
    }
  }),

  getters: {
    visiblePanels: (state) => 
      Array.from(state.panels.values()).filter(p => p.state !== 'hidden'),
    
    leftToolbarTools: () => [
      { id: 'select', icon: 'cursor-arrow', tooltip: 'Select/Move' },
      { id: 'measure', icon: 'ruler', tooltip: 'Measure Distance' },
      { id: 'template', icon: 'circle', tooltip: 'Area Templates' },
      { id: 'light', icon: 'lightbulb', tooltip: 'Lighting' },
      { id: 'fog', icon: 'eye-slash', tooltip: 'Fog of War' },
      { id: 'draw', icon: 'pencil', tooltip: 'Drawing Tools' },
      { id: 'note', icon: 'map-pin', tooltip: 'Notes' }
    ]
  },

  actions: {
    openPanel(type: HUDPanel['type'], config?: Partial<HUDPanel>) {
      const defaultConfig = this.getDefaultPanelConfig(type);
      const panel: HUDPanel = {
        ...defaultConfig,
        ...config,
        id: config?.id || `${type}-${Date.now()}`
      };
      
      this.panels.set(panel.id, panel);
      this.bringToFront(panel.id);
    },

    closePanel(id: string) {
      this.panels.delete(id);
    },

    togglePanel(id: string) {
      const panel = this.panels.get(id);
      if (panel) {
        panel.state = panel.state === 'expanded' ? 'collapsed' : 'expanded';
      }
    },

    movePanel(id: string, position: { x: number; y: number }) {
      const panel = this.panels.get(id);
      if (panel) {
        panel.position.x = position.x;
        panel.position.y = position.y;
        this.saveUserPreferences();
      }
    },

    bringToFront(id: string) {
      const maxZ = Math.max(...Array.from(this.panels.values()).map(p => p.zIndex));
      const panel = this.panels.get(id);
      if (panel) {
        panel.zIndex = maxZ + 1;
      }
    },

    setActiveTool(tool: string) {
      this.activeTool = tool;
    },

    saveUserPreferences() {
      // Save panel positions and preferences to localStorage
      const preferences = {
        panels: Object.fromEntries(this.panels),
        userPreferences: this.userPreferences
      };
      localStorage.setItem('hud-preferences', JSON.stringify(preferences));
    },

    loadUserPreferences() {
      // Load saved preferences
      const saved = localStorage.getItem('hud-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        // Restore panel positions and settings
      }
    }
  }
});
```

### Mobile and Responsive Considerations

#### Adaptive Panel Layout
- On mobile/tablet, panels automatically dock to screen edges
- Swipe gestures to show/hide panels
- Touch-friendly panel headers and controls
- Simplified toolbar with essential tools only

#### Performance Optimizations
- Panel content virtualization for large lists
- Lazy loading of panel components
- Reduced transparency effects on low-en:w
d devices
- Simplified animations on mobile

## Implementation Phases

### Phase 1: Basic Foundations
1. Define base Scene model and specialized scene type models
2. Create REST API endpoints for general scene management
3. Implement basic server-side controllers and services
4. Set up scene transition mechanisms

### Phase 2: Map and Token Framework

1. Extend map component to support the scene system
2. Implement token placement and movement common to all scenes
3. Create base token context menu with scene-type adapters
4. Set up synchronization of scene state via WebSockets

### Phase 3: Encounter Scene Implementation

1. Implement initiative tracker
2. Develop turn management system
3. Create UI for combat-specific elements
4. Implement combat actions and effects

### Phase 4: Social Scene Implementation

1. Implement conversation system
2. Develop dialogue UI
3. Create speech bubble and mood visualizations
4. Implement social interactions

### Phase 5: Exploration Scene Implementation

1. Implement points of interest system
2. Develop measurement tools
3. Create discovery and revelation mechanics
4. Implement terrain interactions

### Phase 6: Integration and Transitions

1. Implement scene transition mechanics
2. Create scene switching UI
3. Develop conversion utilities between scene types
4. Ensure consistent state management across transitions

## Plugin Integration

Plugins can extend the scene system by implementing specific interfaces:

```typescript
interface GameSystemPlugin {
  // Base scene handling functions
  validateToken(token: Token, scene: Scene): ValidationResult;

  // Encounter-specific functions
  calculateInitiative?(actor: Actor, modifiers?: any): number;
  getAvailableActions?(token: Token, scene: EncounterScene): Action[];
  validateAction?(action: Action, token: Token, scene: EncounterScene): ValidationResult;
  executeAction?(action: Action, token: Token, scene: EncounterScene): ActionResult;

  // Social-specific functions
  getMoodOptions?(scene: SocialScene): string[];
  getDialogueOptions?(token: Token, scene: SocialScene): DialogueOption[];

  // Exploration-specific functions
  calculateMovementCost?(
    token: Token,
    fromPos: Position,
    toPos: Position,
    scene: ExplorationScene
  ): number;
  handlePOIDiscovery?(token: Token, poi: PointOfInterest, scene: ExplorationScene): DiscoveryResult;
}
```

## Security Considerations

1. **Permission Validation**:

   - Scene-specific permissions (GM for most scene management)
   - Players can only control their tokens based on scene rules
   - Scene type specific validations (e.g., turn order in encounters)

2. **Data Integrity**:

   - Validate all actions server-side based on scene type
   - Prevent illegal interactions based on scene constraints
   - Ensure action outcomes follow game system rules

3. **Synchronization**:
   - Handle disconnections gracefully with scene state preservation
   - Resolve conflicts in scene state
   - Ensure all clients have consistent state for the current scene type

## Technical Implementation Guidelines

1. Use TypeScript interfaces with generics for scene type handling
2. Implement real-time updates using Socket.IO with scene-specific channels
3. Store scene data with type discrimination in MongoDB
4. Use Pinia for client-side state management with scene type awareness
5. Implement plugin system for scene type extensions
6. Use Vue's reactivity system for scene-based UI updates

## Future Enhancements

1. Advanced scene transitions with animations
2. Custom scene types for specialized gameplay
3. Scene templates and presets
4. Scene history and playback
5. Multi-scene management (picture-in-picture)
6. Cross-scene interactions
