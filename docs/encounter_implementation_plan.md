# Encounter System Implementation Plan

## Overview

The encounter system will provide turn-based combat between player characters and NPCs/monsters on a shared map. Players will be able to control their characters during their turns, performing game-system-specific actions while the Game Master manages NPCs and monsters. All actions and movements will be synchronized across all connected clients.

This implementation focuses on **desktop and tablet platforms** with a rich HUD interface, while providing a simplified companion experience for phone users.

## Architecture Philosophy

This implementation adopts a **focused, incremental approach**:

- **Phase 1**: Core encounter functionality with basic UI
- **Later phases**: Enhanced UI, additional scene types, and advanced features
- **Platform strategy**: Desktop-first, tablet-adapted, phone-companion
- **Scope management**: Build encounters well before expanding to other scene types

The foundation is designed to be extensible, allowing future expansion to social scenes, exploration scenes, and custom scene types, but the initial implementation focuses exclusively on encounter/combat functionality.

## Target Platforms

### **Primary Platforms (Full HUD Experience)**
- **Desktop**: Full-featured HUD with complex panel management
- **Tablet**: Touch-optimized HUD with gesture support (10"+ recommended)

### **Secondary Platform (Companion Experience)**
- **Phone**: Simplified companion interface for players and spectators

### **Platform Detection Strategy**
```typescript
const deviceStrategy = {
  desktop: { minWidth: 1200, input: 'mouse' }, // Full HUD
  tablet: { minWidth: 768, maxWidth: 1199, input: 'touch' }, // Touch HUD
  phone: { maxWidth: 767, input: 'touch' } // Companion mode
};
```

## Server-Side Architecture

### **Core Components**

#### **EncounterController**

- **CRUD operations** for encounters within campaigns
- **Status management** (active, paused, completed)
- **Permission validation** using existing auth middleware
- **Input sanitization** and data validation

```typescript
// src/features/encounters/encounter.controller.mts
class EncounterController {
  async createEncounter(req: AuthenticatedRequest, res: Response) {
    // Validate user permissions (GM of campaign)
    // Sanitize and validate input
    // Create encounter with audit fields
  }

  async updateEncounter(req: AuthenticatedRequest, res: Response) {
    // Optimistic locking with version field
    // Audit trail logging
    // Real-time sync via WebSocket
  }

  async getEncounter(req: AuthenticatedRequest, res: Response) {
    // Permission check (campaign member)
    // Return filtered data based on user role
  }
  
  // New methods for Actor/Token relationship
  async createTokenFromActor(req: AuthenticatedRequest, res: Response) {
    // Create a new token instance based on an actor template
    // Allow customization of token-specific properties
    // Add the token to an encounter
  }
  
  async duplicateToken(req: AuthenticatedRequest, res: Response) {
    // Create additional instances of the same token
    // Useful for creating multiple monsters of same type
    // Preserve token-specific state in each instance
  }
}
```

#### **EncounterService**

- **Business logic** for encounter management
- **Token placement** and validation
- **Initiative calculation** and turn management
- **Combat action processing**
- **Effect management**

```typescript
// src/features/encounters/encounter.service.mts
class EncounterService {
  async addToken(encounterId: string, tokenData: CreateTokenData, userId: string) {
    // Validate encounter exists and user has permission
    // Create token with proper audit fields
    // Emit real-time update
    // Return created token
  }
  
  async createTokenFromActor(encounterId: string, actorId: string, tokenOptions: TokenOptions, userId: string) {
    // Fetch the actor template data
    // Create a new token instance with reference to actor
    // Apply token-specific overrides (position, name, etc)
    // Add token to encounter
    // Emit token:created event
    // Return the new token instance
  }
  
  async duplicateToken(encounterId: string, tokenId: string, count: number, userId: string) {
    // Fetch existing token
    // Create specified number of duplicates
    // Position duplicates appropriately
    // Add unique identifiers to duplicates
    // Return array of new token instances
  }

  async moveToken(encounterId: string, tokenId: string, position: Position, userId: string) {
    // Validate token ownership or GM permission
    // Check movement constraints
    // Update position with optimistic locking
    // Emit token:moved event
  }
  
  async updateTokenState(encounterId: string, tokenId: string, stateUpdate: TokenStateUpdate, userId: string) {
    // Update token-specific state (HP, conditions, etc.)
    // Ensures changes affect only this token instance, not the actor template
    // Validate permissions and state constraints
    // Emit token:updated event with state changes
  }

  async nextTurn(encounterId: string, userId: string) {
    // Validate GM permission
    // Update initiative tracker
    // Handle end-of-round effects
    // Emit turn:changed event
  }
}
```

### **Data Models**

#### **Actor/Token Relationship Model**

The encounter system implements a template/instance pattern for actors and tokens:

```typescript
// Actors serve as templates
interface Actor {
  id: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  stats: ActorStats;
  abilities: Ability[];
  tokenId?: string; // Default token appearance (reference to asset)
  // Other actor template data
}

// Tokens are instances with actor references
interface Token {
  id: string;
  actorId: string; // Reference to source actor template
  encounterId: string;
  name?: string; // Optional override of actor name
  position: Position;
  
  // Token-specific state (instance data)
  currentHP?: number;
  maxHP?: number; // Optional override
  conditions: Condition[];
  isHidden: boolean;
  
  // Visual properties
  scale?: number;
  rotation?: number;
  tint?: string;
  
  // Runtime state
  selected?: boolean;
  controlledBy?: string; // User ID
  
  // Audit fields
  createdBy: string;
  updatedBy: string;
  version: number;
}
```

This model provides several key advantages:

1. **Memory efficiency**: Store actor data once, regardless of how many tokens use it
2. **Template pattern**: Actors serve as templates for creating token instances
3. **Instance state**: Tokens store only instance-specific state and overrides
4. **Multiple monsters**: Create many tokens from a single monster actor
5. **Selective overrides**: Override specific actor properties on a per-token basis

#### **WebSocket Event Handlers**

```typescript
// src/features/encounters/encounter.socket.mts
export function setupEncounterSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    // Join encounter room
    socket.on('encounter:join', async (data) => {
      const { encounterId } = validateEncounterJoin.parse(data);
      // Validate user permission to view encounter
      await socket.join(`encounter:${encounterId}`);
    });

    // Token movement
    socket.on('token:move', async (data) => {
      const { encounterId, tokenId, position } = validateTokenMove.parse(data);
      // Validate and process move
      // Emit to all clients in encounter room
      socket.to(`encounter:${encounterId}`).emit('token:moved', result);
    });
    
    // Create token from actor
    socket.on('token:createFromActor', async (data) => {
      const { encounterId, actorId, options } = validateTokenCreate.parse(data);
      // Create token instance from actor template
      // Add to encounter
      // Emit to all clients in encounter room
      io.to(`encounter:${encounterId}`).emit('token:created', result);
    });
    
    // Update token state
    socket.on('token:updateState', async (data) => {
      const { encounterId, tokenId, stateUpdate } = validateTokenStateUpdate.parse(data);
      // Update token-specific state
      // Emit to all clients in encounter room
      io.to(`encounter:${encounterId}`).emit('token:updated', result);
    });

    // Combat actions
    socket.on('encounter:action', async (data) => {
      // Validate action based on game system plugin
      // Process action and effects
      // Emit action result to room
    });
  });
}
```

## Map Implementation with Pixi.js

The map component is central to the encounter system, providing the visual foundation for all token interactions. The implementation uses **Pixi.js for high-performance encounter gameplay**, while the existing map editor continues to use Konva.js for editing functionality.

### **Dual Architecture Approach**

**Map Editor (Konva.js)**: Complex interaction, editing tools, precise manipulation  
**Encounter Viewer (Pixi.js)**: High performance, real-time gameplay, smooth animations

This architectural decision leverages the strengths of each library:
- **Konva.js**: Superior for complex editing with rich interaction models
- **Pixi.js**: Optimized for real-time performance with many animated objects

**Both systems read the same UVTT data directly from MongoDB** - no conversion or bridge needed.

### **Map Components Clarification**

**Important**: DungeonLab has three distinct map-related components that serve different purposes:

1. **MapDetailView.vue** (`packages/web/src/views/map/MapDetailView.vue`)
   - **Purpose**: Simple admin page for viewing/editing map metadata
   - **Functionality**: Displays map image, edits name/description/grid size, debug view
   - **Technology**: Basic Vue component with form controls
   - **Scope**: Map metadata management only
   - **⚠️ NOT part of encounter system** - should remain unchanged

2. **Map Editor** (`packages/web/src/components/MapEditor/`)
   - **Purpose**: Complex map creation and editing tools
   - **Functionality**: Draw walls, place portals/lights, UVTT editing
   - **Technology**: Konva.js for precise editing interactions
   - **Scope**: Map content creation and modification
   - **Status**: Already implemented

3. **Encounter Map Viewer** (Task 5.5 - to be created)
   - **Purpose**: High-performance encounter gameplay
   - **Functionality**: Display maps with tokens, real-time interactions
   - **Technology**: Pixi.js for performance and animations
   - **Scope**: Encounter/combat visualization and interaction
   - **Status**: To be implemented

**All three components read the same UVTT data from MongoDB but serve completely different use cases.**

### **Encounter-Specific Map Features with Pixi.js**

```typescript
// src/services/encounter/PixiMapRenderer.mts
export class EncounterMapRenderer {
  private app: PIXI.Application;
  private mapContainer: PIXI.Container;
  private tokenContainer: PIXI.Container;
  private backgroundSprite: PIXI.Sprite;
  
  // Platform-specific rendering optimizations
  private renderConfig: PixiRenderConfig;
  
  // Token management systems
  private tokenPool: Map<string, PIXI.Sprite>;
  private tokenAnimator: TokenAnimator;
  private viewportManager: ViewportManager;
  
  constructor(canvas: HTMLCanvasElement, config: EncounterMapConfig) {
    this.app = new PIXI.Application({
      view: canvas,
      ...this.getPlatformRenderConfig(config.platform)
    });
    
    this.setupContainers();
    this.initializeTokenSystem();
    this.setupEventHandlers();
  }
  
  /**
   * Load map directly from UVTT data (same format as Konva editor uses)
   */
  async loadMapFromUVTT(uvttData: UVTTData): Promise<void> {
    // Load background image
    this.backgroundSprite = await PIXI.Sprite.from(uvttData.image);
    this.mapContainer.addChild(this.backgroundSprite);
    
    // Render walls from line_of_sight data
    if (uvttData.line_of_sight) {
      this.renderWalls(uvttData.line_of_sight, uvttData.resolution);
    }
    
    // Render portals and lights if present
    if (uvttData.portals) this.renderPortals(uvttData.portals, uvttData.resolution);
    if (uvttData.lights) this.renderLights(uvttData.lights, uvttData.resolution);
  }
  
  private renderWalls(walls: Point[][], resolution: UVTTResolution): void {
    walls.forEach(wall => {
      const graphics = new PIXI.Graphics();
      graphics.lineStyle(2, 0x000000, 0.8);
      
      if (wall.length > 0) {
        const startPoint = this.gridToPixel(wall[0], resolution);
        graphics.moveTo(startPoint.x, startPoint.y);
        
        wall.slice(1).forEach(point => {
          const pixelPoint = this.gridToPixel(point, resolution);
          graphics.lineTo(pixelPoint.x, pixelPoint.y);
        });
      }
      
      this.mapContainer.addChild(graphics);
    });
  }
  
  private gridToPixel(gridPos: Point, resolution: UVTTResolution): Point {
    return {
      x: (gridPos.x - resolution.map_origin.x) * resolution.pixels_per_grid,
      y: (gridPos.y - resolution.map_origin.y) * resolution.pixels_per_grid
    };
  }
  
  private getPlatformRenderConfig(platform: Platform): PIXI.ApplicationOptions {
    const configs = {
      desktop: {
        antialias: true,
        resolution: window.devicePixelRatio,
        powerPreference: 'high-performance',
        backgroundColor: 0x1a1a1a
      },
      tablet: {
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        powerPreference: 'default', 
        backgroundColor: 0x1a1a1a
      },
      phone: {
        antialias: false,
        resolution: 1,
        powerPreference: 'low-power',
        backgroundColor: 0x1a1a1a
      }
    };
    return configs[platform];
  }
}
```

### **Simplified Data Flow**

The architecture is clean and straightforward:

```
Database (MongoDB)
    ↓
UVTT Data (Universal Format)
    ↓           ↓
Konva Editor   Pixi Viewer
(Map Editing)  (Encounters)
```

**Key Points**:
- **Single Source of Truth**: UVTT data in MongoDB
- **No Data Conversion**: Both systems read the same format
- **Library Agnostic**: UVTT format works with any rendering library
- **Simple Integration**: Pixi.js reads existing map data directly

### **Performance Optimizations for Pixi.js**

#### **Rendering Optimizations**
- **Viewport Culling**: Only render tokens visible in viewport using Pixi.js culling
- **Sprite Pooling**: Reuse token sprites to minimize garbage collection
- **Batch Rendering**: Group similar visual elements using Pixi.js batching
- **Texture Atlas**: Combine token images using PIXI.BaseTexture management
- **Level of Detail**: Reduce token complexity at high zoom levels

#### **Platform-Specific Optimizations**
- **Desktop**: Full quality rendering with particle effects and shadows
- **Tablet**: Balanced approach with selective effects and medium quality
- **Phone**: Minimal effects, optimized for battery life and performance

#### **Memory Management**
- Automatic texture cleanup for off-screen tokens
- Sprite pooling for frequently used elements  
- Lazy loading of token assets
- Progressive image loading based on viewport
- Efficient removal from display lists when not needed

### **Token Management System**

The token renderer component handles the display and interaction with token instances:

```typescript
// src/services/encounter/TokenRenderer.mts
export class TokenRenderer {
  private tokenPool: PIXI.Sprite[] = [];
  private activeTokens: Map<string, PIXI.Sprite> = new Map();
  private tokenState: Map<string, TokenState> = new Map();
  
  // Create token sprite from token data
  createTokenSprite(token: Token, actorData: Actor): PIXI.Sprite {
    let sprite = this.tokenPool.pop() || new PIXI.Sprite();
    
    // Use token visual properties, fallback to actor properties
    const imageUrl = token.imageUrl || actorData.tokenImageUrl;
    sprite.texture = PIXI.Texture.from(imageUrl);
    
    // Apply token-specific visual properties
    sprite.x = token.position.x;
    sprite.y = token.position.y;
    sprite.scale.set(token.scale || 1);
    sprite.rotation = token.rotation || 0;
    
    // Store token state for future updates
    this.tokenState.set(token.id, {
      hp: token.currentHP || actorData.hp,
      maxHp: token.maxHP || actorData.hp,
      conditions: [...token.conditions],
      isHidden: token.isHidden
    });
    
    // Apply visual indicators for token state
    this.updateTokenStateVisuals(token.id, sprite);
    
    this.activeTokens.set(token.id, sprite);
    return sprite;
  }
  
  // Update token state visuals (HP indicators, condition icons, etc.)
  updateTokenStateVisuals(tokenId: string, sprite: PIXI.Sprite): void {
    const state = this.tokenState.get(tokenId);
    if (!state) return;
    
    // Clear existing state visuals
    this.clearStateVisuals(sprite);
    
    // Add HP indicator if damaged
    if (state.hp < state.maxHp) {
      this.addHPIndicator(sprite, state.hp, state.maxHp);
    }
    
    // Add condition icons
    if (state.conditions.length > 0) {
      this.addConditionIcons(sprite, state.conditions);
    }
    
    // Apply hidden state if needed
    sprite.alpha = state.isHidden ? 0.5 : 1.0;
  }
  
  // Update token state and refresh visuals
  updateTokenState(tokenId: string, newState: Partial<TokenState>): void {
    const state = this.tokenState.get(tokenId);
    if (!state) return;
    
    // Update state with new values
    Object.assign(state, newState);
    this.tokenState.set(tokenId, state);
    
    // Refresh visuals
    const sprite = this.activeTokens.get(tokenId);
    if (sprite) {
      this.updateTokenStateVisuals(tokenId, sprite);
    }
  }
}
```

### **Actor-to-Token UI Components**

```typescript
// src/components/encounter/ActorTokenGenerator.vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEncounterStore } from '@/stores/encounter';
import { useActorsStore } from '@/stores/actors';

const props = defineProps<{
  encounterId: string;
}>();

const encounterStore = useEncounterStore();
const actorsStore = useActorsStore();
const selectedActorId = ref<string | null>(null);
const tokenCount = ref(1);
const tokenOptions = ref({
  name: '',
  scale: 1,
  randomizeHP: false
});

// Filter actors by type (monsters for duplication)
const monsterActors = computed(() => {
  return actorsStore.actors.filter(actor => actor.type === 'monster');
});

// Create tokens from selected actor
async function createTokens() {
  if (!selectedActorId.value) return;
  
  try {
    // Create specified number of tokens
    await encounterStore.createTokensFromActor({
      encounterId: props.encounterId,
      actorId: selectedActorId.value,
      count: tokenCount.value,
      options: tokenOptions.value
    });
    
    // Reset form
    selectedActorId.value = null;
    tokenCount.value = 1;
  } catch (error) {
    console.error('Failed to create tokens:', error);
  }
}
</script>

<template>
  <div class="actor-token-generator">
    <h3>Add Tokens</h3>
    
    <div class="form-group">
      <label for="actor-select">Select Actor:</label>
      <select id="actor-select" v-model="selectedActorId">
        <option disabled value="">Choose an actor</option>
        <optgroup label="Monsters">
          <option v-for="actor in monsterActors" :key="actor.id" :value="actor.id">
            {{ actor.name }}
          </option>
        </optgroup>
      </select>
    </div>
    
    <div class="form-group">
      <label for="token-count">Number of Tokens:</label>
      <input id="token-count" type="number" v-model="tokenCount" min="1" max="10" />
    </div>
    
    <div class="form-group">
      <label for="token-name">Custom Name:</label>
      <input id="token-name" type="text" v-model="tokenOptions.name" placeholder="Optional" />
    </div>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="tokenOptions.randomizeHP" />
        Randomize HP
      </label>
    </div>
    
    <button @click="createTokens" :disabled="!selectedActorId">
      Create Tokens
    </button>
  </div>
</template>
```

### **Token State Management Component**

```typescript
// src/components/encounter/TokenStateManager.vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEncounterStore } from '@/stores/encounter';

const props = defineProps<{
  tokenId: string;
}>();

const encounterStore = useEncounterStore();

const token = computed(() => {
  return encounterStore.getTokenById(props.tokenId);
});

const actor = computed(() => {
  if (!token.value) return null;
  return encounterStore.getActorById(token.value.actorId);
});

// Current HP with fallback to actor max HP
const currentHP = ref(token.value?.currentHP ?? actor.value?.maxHP ?? 0);
const maxHP = computed(() => token.value?.maxHP ?? actor.value?.maxHP ?? 0);

// Update token HP
async function updateHP(amount: number) {
  const newHP = Math.max(0, Math.min(currentHP.value + amount, maxHP.value));
  
  if (newHP !== currentHP.value) {
    currentHP.value = newHP;
    
    await encounterStore.updateTokenState({
      tokenId: props.tokenId,
      stateUpdate: {
        currentHP: newHP
      }
    });
  }
}

// Add/remove conditions
async function toggleCondition(condition: string) {
  const hasCondition = token.value?.conditions.includes(condition);
  
  await encounterStore.updateTokenState({
    tokenId: props.tokenId,
    stateUpdate: {
      conditions: hasCondition
        ? token.value?.conditions.filter(c => c !== condition)
        : [...(token.value?.conditions || []), condition]
    }
  });
}
</script>

<template>
  <div class="token-state-manager" v-if="token && actor">
    <h3>{{ token.name || actor.name }}</h3>
    
    <div class="hp-tracker">
      <span>HP: {{ currentHP }} / {{ maxHP }}</span>
      <div class="hp-controls">
        <button @click="updateHP(-1)">-1</button>
        <button @click="updateHP(-5)">-5</button>
        <button @click="updateHP(1)">+1</button>
        <button @click="updateHP(5)">+5</button>
      </div>
    </div>
    
    <div class="conditions">
      <div class="condition-list">
        <div 
          v-for="condition in ['Prone', 'Stunned', 'Poisoned', 'Charmed']" 
          :key="condition"
          class="condition"
          :class="{ active: token.conditions.includes(condition) }"
          @click="toggleCondition(condition)"
        >
          {{ condition }}
        </div>
      </div>
    </div>
  </div>
</template>
```

## Plugin Integration Strategy

The encounter system provides extension points for game system plugins to customize combat behavior while maintaining core functionality.

### **Actor-Token Template System for Plugins**

```typescript
// packages/shared/src/base/plugin.mts
export interface EncounterPlugin {
  // Token generation from actor templates
  createTokenFromActor?(actor: Actor, options?: TokenOptions): Token;
  
  // Token state modification methods
  modifyTokenState?(token: Token, modification: StateModification): TokenUpdate;
  
  // Default token settings for actor types
  getDefaultTokenSettings?(actorType: string): TokenSettings;
  
  // Initiative system customization
  calculateInitiative?(actor: Actor, modifiers?: Record<string, number>): number;
  
  // Available actions for tokens
  getAvailableActions?(token: Token, encounter: Encounter): CombatAction[];
  
  // Action validation and processing
  validateAction?(action: CombatAction, context: ActionContext): ValidationResult;
  processAction?(action: CombatAction, context: ActionContext): ActionResult;
  
  // Effect system integration
  createEffect?(effectData: EffectData): Effect;
  applyEffect?(effect: Effect, target: Token): EffectApplication;
  removeEffect?(effectId: string, target: Token): void;
  
  // Turn management hooks
  onTurnStart?(token: Token, encounter: Encounter): void;
  onTurnEnd?(token: Token, encounter: Encounter): void;
  onRoundStart?(encounter: Encounter): void;
  onRoundEnd?(encounter: Encounter): void;
}
```

### **D&D 5e Plugin Integration**

```typescript
// packages/plugins/dnd-5e-2024/server/encounter.plugin.mts
export class DnD5eEncounterPlugin implements EncounterPlugin {
  // Actor to Token conversion
  createTokenFromActor(actor: Actor, options?: TokenOptions): Token {
    // Create token instance from actor template
    const token: Token = {
      id: generateId(),
      actorId: actor.id,
      name: options?.name || actor.name,
      position: options?.position || { x: 0, y: 0 },
      
      // Set token-specific state
      currentHP: options?.randomizeHP 
        ? this.rollRandomHP(actor)
        : actor.stats.hp.value,
      conditions: [],
      isHidden: options?.isHidden || false,
      
      // Visual properties
      scale: options?.scale || 1,
      rotation: options?.rotation || 0,
      
      // Audit fields
      createdBy: options?.userId || 'system',
      updatedBy: options?.userId || 'system',
      version: 1
    };
    
    return token;
  }
  
  // Roll random HP for monsters
  private rollRandomHP(actor: Actor): number {
    if (!actor.stats.hp.formula) return actor.stats.hp.value;
    
    // Parse HP formula (e.g., "3d8+6")
    const match = actor.stats.hp.formula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return actor.stats.hp.value;
    
    const [_, count, sides, modifier] = match;
    const modValue = modifier ? parseInt(modifier) : 0;
    
    // Roll dice
    let total = modValue;
    for (let i = 0; i < parseInt(count); i++) {
      total += Math.floor(Math.random() * parseInt(sides)) + 1;
    }
    
    return Math.max(1, total); // Minimum 1 HP
  }

  calculateInitiative(actor: Actor, modifiers: Record<string, number> = {}): number {
    const dexMod = Math.floor((actor.stats.dexterity - 10) / 2);
    const initiativeBonus = actor.stats.initiativeBonus || 0;
    const roll = Math.floor(Math.random() * 20) + 1;
    
    return roll + dexMod + initiativeBonus + (modifiers.initiative || 0);
  }

  getAvailableActions(token: Token, encounter: Encounter): CombatAction[] {
    const actor = this.getActor(token.actorId);
    const actions: CombatAction[] = [];
    
    // Basic actions
    actions.push(
      { type: 'attack', name: 'Attack', category: 'action' },
      { type: 'dodge', name: 'Dodge', category: 'action' },
      { type: 'dash', name: 'Dash', category: 'action' },
      { type: 'help', name: 'Help', category: 'action' }
    );
    
    // Spell actions if caster
    if (actor.spellcasting) {
      const spells = this.getAvailableSpells(actor);
      actions.push(...spells.map(spell => ({
        type: 'spell',
        name: spell.name,
        category: 'action',
        data: { spellId: spell.id }
      })));
    }
    
    return actions;
  }

  async processAction(action: CombatAction, context: ActionContext): Promise<ActionResult> {
    switch (action.type) {
      case 'attack':
        return this.processAttack(action, context);
      case 'spell':
        return this.processSpell(action, context);
      case 'dodge':
        return this.processDodge(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  private async processAttack(action: CombatAction, context: ActionContext): Promise<ActionResult> {
    // D&D 5e specific attack resolution
    const attacker = context.actor;
    const target = context.target;
    
    // Roll attack
    const attackRoll = this.rollD20() + attacker.stats.attackBonus;
    const targetAC = target.stats.armorClass;
    
    if (attackRoll >= targetAC) {
      // Hit - roll damage
      const damage = this.rollDamage(attacker.weapon);
      
      return {
        success: true,
        description: `${attacker.name} hits ${target.name} for ${damage} damage`,
        effects: [{
          type: 'damage',
          target: target.id,
          value: damage
        }]
      };
    } else {
      return {
        success: false,
        description: `${attacker.name} misses ${target.name}`,
        effects: []
      };
    }
  }
}
```

## Conclusion

This revised implementation plan provides a **practical, incremental approach** to building a robust encounter system that serves the needs of both players and GMs across desktop and tablet platforms.

### **Key Improvements from Original Plan**:

1. **Focused Scope**: Concentrates on encounters first, not a full scene system
2. **Platform Strategy**: Desktop + tablet focus with phone companion
3. **Incremental Delivery**: Each phase delivers working functionality
4. **Practical Architecture**: Simplified data models and state management
5. **Performance Focused**: Optimizations built in from the start

### **Success Factors**:

- **Start Simple**: Phase 1 delivers basic but working encounter functionality
- **Build Incrementally**: Each phase adds value without breaking existing features
- **User-Centered**: Regular testing and feedback integration
- **Platform-Aware**: Optimized experience for each target platform
- **Extensible Foundation**: Ready for future expansion to scene system

### **Next Steps**:

1. **Validate Technical Approach**: Review with development team
2. **Prototype Phase 1**: Build core data models and basic UI
3. **User Testing**: Early feedback on basic encounter functionality
4. **Iterate and Refine**: Adjust based on real-world usage

This plan balances ambition with practicality, ensuring a successful implementation that can grow over time into the full vision while delivering immediate value to users.

## Revised Implementation Phases

### **Phase 1: Core Infrastructure (4-6 weeks)**

**Goal**: Establish basic encounter functionality with simple UI

#### **Deliverables**:
- Basic Encounter and Token data models
- MongoDB schemas and indexing
- Core REST API endpoints (`/api/encounters`)
- Basic encounter controller and service
- Simple WebSocket connection and room management
- Basic token placement and movement
- Simple desktop UI (no HUD yet)

#### **Technical Tasks**:
1. Set up encounter data models in shared package
2. Create encounter controller with CRUD operations
3. Implement basic encounter service with token management
4. Set up WebSocket event handling for token movement
5. Create simple Vue component for encounter view
6. Implement basic map integration (existing map component)
7. Add permission validation using existing auth middleware

#### **Success Criteria**:
- GMs can create and manage encounters
- Tokens can be placed and moved on map
- Real-time synchronization working for token movement
- Basic permission system in place

### **Phase 2: Combat Mechanics (4-6 weeks)**

**Goal**: Add initiative tracking, turn management, and basic combat actions

#### **Deliverables**:
- Initiative tracker system
- Turn management and round progression
- Basic combat actions framework
- Effect system foundation
- Enhanced WebSocket events for combat
- Simple initiative UI component

#### **Technical Tasks**:
1. Implement initiative calculation and tracking
2. Add turn management logic to encounter service
3. Create combat action processing framework
4. Implement basic effect system
5. Add combat-specific WebSocket events
6. Create initiative tracker UI component
7. Add turn-based permission validation

#### **Success Criteria**:
- Initiative can be calculated and displayed
- Turn order is maintained and progresses correctly
- Basic combat actions can be performed
- Effects can be applied and tracked

### **Phase 3: Desktop HUD System (3-4 weeks)**

**Goal**: Implement the rich HUD interface for desktop users

#### **Deliverables**:
- Full HUD panel system for desktop
- Draggable, resizable panels
- Toolbar system with common tools
- Enhanced initiative tracker panel
- Character sheet integration
- Panel state persistence

#### **Technical Tasks**:
1. Create HUD store and panel management system
2. Implement draggable/resizable panel component
3. Build toolbar component with tool selection
4. Create enhanced initiative tracker panel
5. Integrate character sheet display
6. Add panel position persistence
7. Implement desktop-specific interactions

#### **Success Criteria**:
- Rich desktop HUD interface is functional
- Panels can be moved, resized, and customized
- User preferences are saved and restored
- Interface is intuitive and efficient for GMs

### **Phase 4: Tablet Adaptation (3-4 weeks)**

**Goal**: Adapt HUD system for touch devices and tablets

#### **Deliverables**:
- Touch-optimized panel system
- Gesture support for common actions
- Tablet-specific UI adaptations
- Auto-layout for different screen sizes
- Touch-friendly controls throughout

#### **Technical Tasks**:
1. Implement device detection and adaptive routing
2. Create touch-optimized panel variants
3. Add gesture support using VueUse
4. Implement tablet-specific toolbar (bottom-oriented)
5. Add touch-friendly sizing and spacing
6. Create swipe gestures for panel management
7. Optimize performance for tablet devices

#### **Success Criteria**:
- HUD system works well on tablets (10"+ screens)
- Touch interactions are smooth and intuitive
- Interface adapts automatically to screen size
- Performance is acceptable on tablet hardware

### **Phase 5: Enhanced Features (4-5 weeks)**

**Goal**: Add advanced features and polish the system

#### **Deliverables**:
- Advanced combat actions and effects
- Improved visual feedback and animations
- Sound effects and notifications
- Advanced GM tools
- Plugin system foundation
- Performance optimizations

#### **Technical Tasks**:
1. Expand combat action system
2. Add visual effects and animations
3. Implement sound system
4. Create advanced GM tools (quick actions, shortcuts)
5. Build plugin system foundation
6. Optimize rendering and real-time performance
7. Add comprehensive error handling

#### **Success Criteria**:
- Combat system feels polished and responsive
- Visual and audio feedback enhances experience
- Advanced tools improve GM efficiency
- System performs well under load

### **Phase 6: Phone Companion & Polish (2-3 weeks)**

**Goal**: Add phone companion interface and final polish

#### **Deliverables**:
- Simple phone companion interface
- Cross-device synchronization
- Final bug fixes and optimizations
- User documentation
- Deployment preparation

#### **Technical Tasks**:
1. Create phone companion component
2. Implement basic player actions on phone
3. Add spectator mode for phone users
4. Final testing and bug fixes
5. Performance optimization
6. Create user documentation
7. Prepare for production deployment

#### **Success Criteria**:
- Phone users have useful companion experience
- All platforms work together seamlessly
- System is ready for production use
- Documentation is complete

## Future Expansion Phases

### **Phase 7: Scene System (Later)**
- Expand to support social and exploration scenes
- Scene transitions and management
- Enhanced scene-specific features

### **Phase 8: Advanced Features (Later)**
- Advanced effects and spell systems
- Custom scene types
- Automation and scripting
- Advanced plugin system

## Risk Mitigation Strategies

### **Technical Risks**:
1. **Performance Issues**: Regular performance testing, especially on tablets
2. **WebSocket Reliability**: Implement reconnection and state sync
3. **Cross-Device Compatibility**: Test on multiple devices throughout
4. **Data Synchronization**: Careful conflict resolution and optimistic updates

### **Scope Risks**:
1. **Feature Creep**: Strict adherence to phase deliverables
2. **Platform Complexity**: Focus on desktop first, then adapt
3. **Integration Issues**: Regular integration testing with existing system

### **User Experience Risks**:
1. **Interface Complexity**: User testing after each major phase
2. **Learning Curve**: Provide good defaults and progressive disclosure
3. **Mobile Usability**: Test early and often on actual devices

## Success Metrics

### **Phase 1 Metrics**:
- Basic encounters can be created and used
- Real-time token movement works reliably
- No major performance issues

### **Phase 2 Metrics**:
- Combat flows smoothly through initiative order
- Turn-based actions work correctly
- GM can manage combat effectively

### **Phase 3 Metrics**:
- Desktop users prefer HUD to simple interface
- Panel system is intuitive and customizable
- GM productivity improves significantly

### **Phase 4 Metrics**:
- Tablet interface gets positive user feedback
- Touch interactions feel natural
- Performance acceptable on target tablets

### **Overall Success**:
- System is adopted by existing user base
- Combat encounters run smoothly
- Real-time collaboration works reliably
- Users report improved gaming experience

## Overall Architecture

The encounter system will be built with a clear separation between resource-oriented operations (handled via REST API) and event-oriented operations (handled via WebSockets), following the project's communication architecture strategy.

### Components

1. **Database Models**
   - Encounter model (MongoDB)
   - Token model (MongoDB)
   - Initiative tracking model
   - Effect tracking model

2. **Server Components**
   - **REST API** (resource-oriented operations)
     - Encounter CRUD operations
     - Initial token setup
     - Batch operations
     - Asset/resource management
   
   - **WebSocket Handlers** (event-oriented operations)
     - Real-time token movement
     - Turn management
     - Combat actions
     - State synchronization
     - Notifications

3. **Client Components**
   - Encounter service (abstracts API/WebSocket communication)
   - PixiJS map renderer
   - Token management UI
   - Combat UI
   - Initiative tracker

## Implementation Strategy

The implementation will follow a phased approach, starting with the core functionality and progressively adding more features.

### Phase 1: Core Infrastructure

1. Create shared types and schemas
2. Set up encounter database schema
3. Create encounter controller and REST API for resource operations
4. Implement core encounter service
5. Set up WebSocket event handling for real-time operations
6. Create basic Vue encounter component
7. Implement basic token placement and movement

### Phase 2: Combat Mechanics

8. Add initiative tracking
9. Implement turn management
10. Create action system
11. Add effect system
12. Implement combat log
13. Create condition tracking

### Phase 3: Desktop HUD System

14. Create desktop HUD system
15. Implement character sheet integration
16. Add spell and ability management
17. Create dice rolling integration
18. Add map annotation tools
19. Implement fog of war system

### Phase 4: Tablet Adaptation

20. Create tablet-specific UI
21. Implement touch controls
22. Add gesture recognition
23. Create simplified HUD for tablet
24. Optimize performance for tablets
25. Add offline mode support

### Phase 5: Enhanced Features

26. Create measurement tools
27. Implement vision and lighting system
28. Add environmental effects
29. Create area of effect visualization
30. Implement advanced pathfinding
31. Add animated spell effects

### Phase 6: Phone Companion & Polish

32. Create phone companion app
33. Implement character sheet viewer
34. Add dice roller for phone
35. Create chat integration
36. Implement notifications
37. Add final polish and optimization

## Communication Architecture

### REST API Endpoints (Resource-Oriented)

The following REST endpoints will be implemented for resource-oriented operations:

- `GET /api/encounters` - List encounters
- `POST /api/encounters` - Create encounter
- `GET /api/encounters/:id` - Get encounter details
- `PUT /api/encounters/:id` - Update encounter
- `DELETE /api/encounters/:id` - Delete encounter
- `POST /api/encounters/:id/tokens` - Add tokens to encounter
- `GET /api/encounters/:id/tokens` - Get all tokens in encounter
- `PUT /api/encounters/:id/tokens/:tokenId` - Update token details (non-real-time)
- `DELETE /api/encounters/:id/tokens/:tokenId` - Remove token from encounter
- `POST /api/encounters/:id/start` - Start encounter
- `POST /api/encounters/:id/end` - End encounter
- `POST /api/encounters/:id/pause` - Pause encounter
- `POST /api/encounters/:id/resume` - Resume encounter

### WebSocket Events (Event-Oriented)

The following WebSocket events will be implemented for event-oriented operations:

- `encounter:join` - Join encounter room
- `encounter:leave` - Leave encounter room
- `encounter:state` - Get full encounter state
- `encounter:status` - Encounter status update
- `token:add` - Add token to encounter (real-time notification)
- `token:move` - Move token on map
- `token:update` - Update token properties (real-time)
- `token:remove` - Remove token from encounter (real-time)
- `token:highlight` - Highlight token
- `initiative:roll` - Roll initiative
- `initiative:update` - Update initiative order
- `initiative:next` - Move to next turn
- `initiative:previous` - Move to previous turn
- `combat:action` - Perform combat action
- `combat:reaction` - Perform reaction
- `effect:add` - Add effect to token
- `effect:update` - Update effect
- `effect:remove` - Remove effect from token
- `map:ping` - Ping location on map
- `map:measure` - Measure distance
- `map:draw` - Draw on map
- `map:clear` - Clear drawings
- `fog:update` - Update fog of war

## Actor-Token Relationship

The system will implement a clear template-instance relationship between actors and tokens:

- **Actors** serve as **templates** with base stats, abilities, and characteristics
- **Tokens** are **instances** of actors placed on the encounter map
- Actors will store a `defaultTokenImageId` that references the default token image asset
- Tokens will reference their source actor via `actorId` but maintain instance-specific state
- Instance-specific state includes position, current HP, conditions, effects, etc.
- Tokens can override specific actor properties when needed

## Client Implementation

The client implementation will use a service abstraction layer to handle the dual protocol approach:

```typescript
// Example encounter service abstracting protocol details
class EncounterService {
  // REST resource operations
  async createEncounter(data) { /* REST API call */ }
  async getEncounter(id) { /* REST API call */ }
  async updateEncounter(id, data) { /* REST API call */ }
  async deleteEncounter(id) { /* REST API call */ }
  
  // WebSocket event operations
  moveToken(encounterId, tokenId, position) { /* WebSocket emit */ }
  highlightToken(encounterId, tokenId) { /* WebSocket emit */ }
  performAction(encounterId, tokenId, action) { /* WebSocket emit */ }
  
  // Event listeners
  onTokenMove(callback) { /* WebSocket event listener */ }
  onInitiativeChange(callback) { /* WebSocket event listener */ }
  onCombatAction(callback) { /* WebSocket event listener */ }
}
```

This service layer will hide the protocol details from the rest of the application, providing a unified API for all encounter operations regardless of the underlying protocol.

## Map Renderer Architecture

The map renderer will use PixiJS for high-performance rendering:

1. Base map layer (background)
2. Grid layer
3. Token layer (with container-based hierarchy)
4. Effect layer (visual effects)
5. Annotation layer (drawings, measurements)
6. UI layer (selection indicators, highlights)

## Implementation Timeline

- Phase 1: 4-6 weeks
- Phase 2: 3-4 weeks
- Phase 3: 4-5 weeks
- Phase 4: 3-4 weeks
- Phase 5: 4-6 weeks
- Phase 6: 3-4 weeks

Total: 21-29 weeks (~5-7 months)
