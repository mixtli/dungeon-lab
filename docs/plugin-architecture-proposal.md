# TTRPG Plugin Architecture Proposal (Revised)
*Practical Improvements for Extensible Virtual Tabletop Systems*

## Executive Summary

This document proposes focused improvements to Dungeon Lab's plugin architecture that build upon the existing solid foundation. Rather than rebuilding from scratch, we identify specific pain points in plugin development and propose targeted solutions that enhance developer experience while maintaining system simplicity.

### Key Improvements
- **Enhanced Developer Experience**: Streamlined plugin creation with hot reloading and better tooling
- **Component Reusability**: Share UI components across different game systems
- **Event Standardization**: Consistent patterns for multiplayer interactions via WebSockets
- **Data Synchronization**: Automatic UI updates without manual state management
- **Composable Architecture**: Mix and match components from different plugins

### Core Philosophy
Build upon what works (generic `/api/documents`, WebSocket multiplayer, game-agnostic server) while solving the real challenges: plugin development complexity, component discoverability, and code duplication.

## Current Architecture Assessment

### What Works Well ✅

**Server Architecture:**
```typescript
// Elegant generic endpoints that work for any game system
POST /api/documents
{
  "name": "Fireball",
  "documentType": "item", 
  "pluginId": "dnd-5e-2024",
  "pluginData": { "damage": "8d6", "school": "evocation" }
}

// WebSocket handlers for real-time multiplayer
socket.on('item:update', (data) => { /* game-agnostic handling */ });
```

**Benefits:**
- Server stays simple and game-agnostic
- MongoDB handles complex queries on `pluginData`
- WebSockets provide excellent multiplayer foundation
- Plugin data can evolve without server changes

### Current Pain Points ❌

1. **Plugin Development Complexity**: No standardized patterns for common TTRPG operations
2. **Component Isolation**: Hard to share UI components between plugins
3. **Event Fragmentation**: Ad-hoc WebSocket event patterns per plugin
4. **Manual Data Sync**: Components manually manage state updates
5. **Development Workflow**: No hot reloading, slow iteration cycles

## Proposed Improvements

### 1. GM-Authoritative Event System

Implement a request-response architecture where the Game Master acts as the authoritative game engine, with the server providing generic message routing.

#### GM Authority Model

**The Flow:**
1. **Player Action** → Player sends request to GM
2. **GM Processing** → GM processes game mechanics (dice, damage, rule validation)
3. **State Update** → GM sends authoritative state changes to server
4. **Broadcast** → Server updates global state and broadcasts to all clients
5. **UI Updates** → All clients' UIs automatically update via reactive state

#### Generic Message Routing (Game-Agnostic Server)
```typescript
// server/socket-handlers/generic-routing.ts
export function setupGenericHandlers(socket: SocketIO.Socket) {
  
  // Generic: GM sends authoritative state updates
  socket.on('server:state-update', (stateUpdate: any) => {
    const sessionId = socket.sessionId;
    const isGM = socket.isGameMaster;
    
    if (!isGM) return; // Only GM can update state
    
    // Server doesn't care what the state looks like
    gameStateManager.updateState(sessionId, stateUpdate);
    
    // Broadcast to all clients
    io.to(`session-${sessionId}`).emit('game:state-update', stateUpdate);
  });
  
  // Generic: Route any message from players to GM
  socket.on('gm:request', (requestData: any) => {
    const sessionId = socket.sessionId;
    
    // Server doesn't care what kind of request this is
    socket.to(`gm-${sessionId}`).emit('gm:request', {
      ...requestData,
      playerId: socket.userId,
      timestamp: Date.now()
    });
  });
  
  // Generic: Route any message from GM to all players
  socket.on('players:broadcast', (messageData: any) => {
    const sessionId = socket.sessionId;
    if (!socket.isGameMaster) return;
    
    // Server doesn't care what kind of message this is
    socket.to(`session-${sessionId}`).emit('players:message', messageData);
  });
}
```

#### Player Client (Action Requests)
```typescript
// stores/game-actions.ts
export function useGameActions() {
  const { socket } = useWebSocket();
  
  // Generic request function
  const sendGMRequest = (requestType: string, requestData: any) => {
    socket.emit('gm:request', {
      type: requestType,
      data: requestData,
      requestId: generateId()
    });
  };
  
  // Game-specific actions use the generic function
  const requestAttack = (attackData: AttackRequest) => {
    sendGMRequest('dnd-attack', {
      attacker: attackData.attackerId,
      target: attackData.targetId,
      weapon: attackData.weapon
    });
  };
  
  const requestMove = (characterId: string, newPosition: Position) => {
    sendGMRequest('move', {
      characterId,
      position: newPosition
    });
  };
  
  // Plugins can define any request types they need
  const requestAction = (actionType: string, actionData: any) => {
    sendGMRequest(actionType, actionData);
  };
  
  return { requestAttack, requestMove, requestAction };
}
```

#### GM Client (Game Engine)
```typescript
// stores/gm-engine.ts
export function useGMEngine() {
  const { socket } = useWebSocket();
  const { gameState } = useGameState();
  
  // Generic request handler
  const handleGMRequest = (request: { type: string, data: any, playerId: string }) => {
    // Dispatch to plugin-specific handlers
    switch (request.type) {
      case 'dnd-attack':
        handleDnDAttack(request.data);
        break;
      case 'move':
        handleMovement(request.data);
        break;
      default:
        console.warn('Unknown request type:', request.type);
    }
  };
  
  const handleDnDAttack = async (attackData: any) => {
    // GM does all the D&D mechanics
    const attacker = gameState.characters[attackData.attacker];
    const target = gameState.characters[attackData.target];
    
    const attackRoll = await rollDice('1d20');
    const hit = (attackRoll.total + attacker.attackBonus) >= target.ac;
    const damage = hit ? await rollDice(attackData.weapon.damage) : 0;
    
    // GM creates authoritative state update
    const stateUpdate = {
      characters: {
        [attackData.target]: {
          ...target,
          hp: Math.max(0, target.hp - damage.total)
        }
      }
    };
    
    // Send to server for broadcast
    socket.emit('server:state-update', stateUpdate);
    
    // Send narrative message
    socket.emit('players:broadcast', {
      type: 'combat-result',
      message: `${attacker.name} ${hit ? 'hits' : 'misses'} ${target.name}!`
    });
  };
  
  const initializeGM = () => {
    socket.on('gm:request', handleGMRequest);
  };
  
  return { initializeGM };
}
```

### 2. Shared Component Library

Provide common TTRPG components through a shared library with direct imports - simpler and more maintainable than complex capability systems.

#### Shared Framework Components
```typescript
// packages/shared-components/index.ts
export { InventoryManager } from './InventoryManager.vue';
export { DiceRoller } from './DiceRoller.vue';
export { HealthTracker } from './HealthTracker.vue';
export { AttributeBlock } from './AttributeBlock.vue';
export { SkillList } from './SkillList.vue';
export { NotesPad } from './NotesPad.vue';
export { TimerWidget } from './TimerWidget.vue';
export { ChatBox } from './ChatBox.vue';
```

#### Plugin Usage (Direct Imports)
```typescript
// plugins/dnd-5e/components/character-sheet.vue
<template>
  <div class="dnd-character-sheet">
    <!-- D&D specific components (direct imports) -->
    <SpellSlots :character="character" />
    <ClassFeatures :character="character" />
    
    <!-- Shared framework components (direct imports) -->
    <InventoryManager 
      :items="character.equipment"
      :currency="character.currency"
      @item-used="handleItemUse"
    />
    <HealthTracker 
      :current="character.hitPoints.current"
      :max="character.hitPoints.max"
      :temporary="character.hitPoints.temporary"
      @damage="applyDamage"
      @heal="applyHealing"
    />
    <DiceRoller 
      :character="character"
      :advantage-available="true"
      @roll="handleDiceRoll"
    />
  </div>
</template>

<script setup lang="ts">
// D&D specific imports (same plugin)
import SpellSlots from './SpellSlots.vue';
import ClassFeatures from './ClassFeatures.vue';

// Shared component imports (framework library)
import { 
  InventoryManager, 
  HealthTracker, 
  DiceRoller 
} from '@dungeon-lab/shared-components';
</script>
```

#### Benefits of Direct Imports
```typescript
// ✅ IDE Support: Autocomplete, go-to-definition, refactoring
import { InventoryManager } from '@dungeon-lab/shared-components';

// ✅ Type Safety: Full TypeScript support
<InventoryManager 
  :items="character.equipment"    // TypeScript validates props
  @item-used="handleItemUse"      // TypeScript validates events
/>

// ✅ Clear Dependencies: Obvious what components are used
// ✅ Better Performance: Build-time resolution, tree shaking
// ✅ Standard Vue Patterns: No new concepts to learn
```

#### Optional: Simple Capability System for Edge Cases
```typescript
// Only use capability system for truly dynamic cases
<template>
  <div class="character-sheet">
    <!-- Most components: direct imports (simple, fast, type-safe) -->
    <InventoryManager :items="character.equipment" />
    <HealthTracker :character="character" />
    
    <!-- Only dynamic for user customization -->
    <component 
      :is="getUserPreferredDiceRoller()" 
      :character="character"
    />
  </div>
</template>

<script setup lang="ts">
import { InventoryManager, HealthTracker } from '@dungeon-lab/shared-components';

// Simple function for user preferences
const getUserPreferredDiceRoller = () => {
  const preference = userSettings.diceRollerType;
  return preference === '3d-animated' ? AnimatedDiceRoller : SimpleDiceRoller;
};
</script>
```

### 3. Global Reactive Game State

Replace individual data fetching with a single reactive game state that automatically updates all components when changed.

#### Global Game State Store
```typescript
// stores/game-state.ts
interface GameState {
  sessionId: string | null;
  players: Record<string, Player>;
  characters: Record<string, Character>;
  monsters: Record<string, Monster>;
  items: Record<string, Item>;
  map: {
    currentScene: string;
    tokens: Record<string, TokenPosition>;
    lighting: 'bright' | 'dim' | 'dark';
  };
  combat: {
    active: boolean;
    round: number;
    currentTurn: string | null;
    initiative: Array<{ id: string; value: number }>;
  };
  ui: {
    selectedTokens: string[];
    activeModal: string | null;
  };
}

// Single source of truth for entire game state
const gameState = ref<GameState>({
  sessionId: null,
  players: {},
  characters: {},
  monsters: {},
  items: {},
  map: { currentScene: '', tokens: {}, lighting: 'bright' },
  combat: { active: false, round: 0, currentTurn: null, initiative: [] },
  ui: { selectedTokens: [], activeModal: null }
});

export function useGameState() {
  const { socket } = useWebSocket();
  
  // Initialize state when joining session
  const initializeGameState = async (sessionId: string) => {
    const response = await fetch(`/api/sessions/${sessionId}/state`);
    const initialState = await response.json();
    gameState.value = { ...initialState.data, sessionId };
  };
  
  // Handle state updates from server (GM authority)
  const handleStateUpdate = (update: Partial<GameState>) => {
    mergeGameState(gameState.value, update);
  };
  
  // Subscribe to WebSocket state updates
  socket.on('game:state-update', handleStateUpdate);
  
  return {
    gameState: readonly(gameState),
    initializeGameState,
    
    // Computed helpers for common access patterns
    characters: computed(() => gameState.value.characters),
    monsters: computed(() => gameState.value.monsters),
    combat: computed(() => gameState.value.combat),
    
    // Helper functions
    getCharacter: (id: string) => computed(() => gameState.value.characters[id]),
    getMonster: (id: string) => computed(() => gameState.value.monsters[id]),
    getCurrentTurnEntity: computed(() => {
      const turnId = gameState.value.combat.currentTurn;
      return turnId ? 
        gameState.value.characters[turnId] || gameState.value.monsters[turnId] 
        : null;
    })
  };
}

// Deep merge helper for state updates
function mergeGameState(target: GameState, source: Partial<GameState>) {
  for (const key in source) {
    const sourceValue = source[key as keyof GameState];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      Object.assign(target[key as keyof GameState], sourceValue);
    } else {
      (target as any)[key] = sourceValue;
    }
  }
}
```

#### Component Usage (Automatic Updates)
```typescript
// plugins/dnd-5e/components/character-sheet.vue
<template>
  <div class="character-sheet" v-if="character">
    <h1>{{ character.name }}</h1>
    
    <!-- Auto-updates when character.hp changes from ANY source -->
    <div class="health">
      HP: {{ character.hp }}/{{ character.maxHp }}
      <button @click="requestDamage(5)">Take 5 Damage</button>
    </div>
    
    <!-- Auto-updates when character position changes -->
    <div class="position">
      Position: {{ tokenPosition?.x }}, {{ tokenPosition?.y }}
    </div>
    
    <!-- Auto-updates when combat state changes -->
    <div class="turn-indicator" v-if="isCurrentTurn">
      IT'S YOUR TURN!
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ characterId: string }>();
const { getCharacter, gameState } = useGameState();
const { requestAction } = useGameActions();

// Reactive character data - automatically updates when state changes
const character = getCharacter(props.characterId);

// Reactive position tracking
const tokenPosition = computed(() => 
  gameState.map.tokens[props.characterId]
);

// Reactive turn tracking
const isCurrentTurn = computed(() => 
  gameState.combat.currentTurn === props.characterId
);

// Actions send requests to GM (not direct state updates)
const requestDamage = (amount: number) => {
  requestAction('take-damage', {
    characterId: props.characterId,
    amount
  });
};
</script>
```

#### Map Component (Automatic Sync)
```vue
<template>
  <div class="map">
    <!-- All tokens auto-update positions when state changes -->
    <div 
      v-for="(character, id) in characters"
      :key="id"
      class="character-token"
      :class="{ 'current-turn': combat.currentTurn === id }"
      :style="getTokenStyle(id)"
      @click="selectToken(id)"
    >
      {{ character.name }}
      <!-- HP bar automatically reflects current health -->
      <div class="hp-bar">
        <div 
          class="hp-fill" 
          :style="{ width: (character.hp / character.maxHp) * 100 + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { gameState, characters, combat } = useGameState();
const { requestAction } = useGameActions();

const getTokenStyle = (tokenId: string) => {
  const position = gameState.map.tokens[tokenId];
  return position ? {
    left: position.x + 'px',
    top: position.y + 'px'
  } : {};
};

const selectToken = (tokenId: string) => {
  // Request GM to update UI state
  requestAction('select-token', { tokenId });
};
</script>
```

### 4. Shared TTRPG Mixins

Reusable functionality for common tabletop gaming patterns.

#### Dice Rolling Mixin
```typescript
// framework/mixins/use-dice-rolling.ts
export function useDiceRolling() {
  const { gameEvents } = useGameEvents(); // Framework events
  
  const rollDice = async (expression: string, options: DiceOptions = {}) => {
    return new Promise<DiceResult>((resolve) => {
      const rollId = generateId();
      
      // Listen for framework dice result
      const unsubscribe = gameEvents.on('dice:roll-completed', (event) => {
        if (event.rollId === rollId) {
          unsubscribe();
          resolve(event.result);
        }
      });
      
      // Use framework event for multiplayer dice rolling
      gameEvents.emit('dice:roll-requested', {
        rollId,
        expression,
        reason: options.reason || 'dice-roll',
        character: options.character,
        metadata: options.metadata
      });
    });
  };
  
  // Common TTRPG patterns any game system can use
  const rollWithAdvantage = (baseExpression: string, advantage?: boolean) => {
    if (advantage === true) {
      return rollDice(`2${baseExpression}kh1`);
    } else if (advantage === false) {
      return rollDice(`2${baseExpression}kl1`);
    }
    return rollDice(baseExpression);
  };
  
  return { rollDice, rollWithAdvantage };
}
```

#### Character Management Mixin
```typescript
// framework/mixins/use-character-management.ts
export function useCharacterManagement() {
  const { gameEvents } = useGameEvents(); // Framework events
  
  const calculateModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
  };
  
  const applyDamage = async (characterId: string, damage: number) => {
    const { data: character, update } = usePluginData('character', characterId);
    
    const currentHP = character.value.pluginData.hitPoints?.current || 0;
    const newHP = Math.max(0, currentHP - damage);
    
    // Update character data using existing API
    await update({
      pluginData: {
        ...character.value.pluginData,
        hitPoints: {
          ...character.value.pluginData.hitPoints,
          current: newHP
        }
      }
    });
    
    // Use framework event for multiplayer coordination
    gameEvents.emit('character:updated', {
      characterId,
      changes: { 'pluginData.hitPoints.current': newHP }
    });
  };
  
  return { calculateModifier, applyDamage };
}
```

### 5. Enhanced Development Experience

#### Plugin Hot Reloading
```typescript
// framework/development/hot-reload.ts
export class PluginHotReloader {
  private watchers = new Map<string, FileWatcher>();
  
  async enableHotReload(pluginId: string) {
    if (process.env.NODE_ENV !== 'development') return;
    
    const pluginPath = `./packages/plugins/${pluginId}`;
    const watcher = new FileWatcher(pluginPath);
    
    watcher.on('change', async (file) => {
      console.log(`[Hot Reload] ${pluginId} changed: ${file}`);
      
      try {
        // Clear module cache
        this.clearPluginCache(pluginId);
        
        // Reload plugin
        const newPlugin = await import(`${pluginPath}/index.ts?t=${Date.now()}`);
        
        // Update registry
        await pluginRegistry.reloadPlugin(pluginId, newPlugin);
        
        // Emit reload event for UI updates
        gameEvents.emit('plugin:reloaded', { pluginId });
        
      } catch (error) {
        console.error(`[Hot Reload] Failed to reload ${pluginId}:`, error);
      }
    });
  }
}
```

#### Plugin Development CLI
```bash
# New development commands
npm run plugin:create my-new-system    # Scaffold new plugin
npm run plugin:dev dnd-5e-2024        # Start with hot reload
npm run plugin:test dnd-5e-2024       # Run plugin tests
npm run plugin:build dnd-5e-2024      # Build for production
```

## Simplified Plugin Structure

### Minimal Plugin Implementation
```typescript
// plugins/fate/index.ts
export class FatePlugin extends BasePlugin {
  private fateEvents = new FateEventBus(); // Plugin-internal events
  
  // Simple plugin registration - just the main entry points
  registerComponents() {
    this.register('character-sheet', FateCharacterSheet);
    this.register('character-creator', FateCharacterCreator);
  }
  
  // Use shared mixins for common functionality
  async initialize() {
    const { rollDice } = useDiceRolling(); // Framework mixin
    const { calculateModifier } = useCharacterManagement(); // Framework mixin
    
    // Setup FATE-specific event handling (internal to plugin)
    this.setupFateEventHandlers();
  }
  
  private setupFateEventHandlers() {
    // Handle FATE-specific mechanics internally
    this.fateEvents.on('compel-aspect', (event) => {
      // Award fate point, create narrative complication
      this.handleAspectCompel(event);
    });
    
    this.fateEvents.on('invoke-aspect', (event) => {
      // Spend fate point, provide mechanical bonus
      this.handleAspectInvoke(event);
    });
  }
}
```

### Component Implementation
```typescript
// plugins/fate/components/character-sheet.vue
<template>
  <div class="fate-character-sheet">
    <h1>{{ character.name }}</h1>
    
    <!-- Automatic data binding with your existing API -->
    <input 
      v-model="character.pluginData.concept" 
      @input="updateCharacter"
      placeholder="High Concept"
    />
    
    <!-- Use shared framework components (direct imports) -->
    <DiceRoller 
      :character="character"
      :dice-type="'fate'"
      @roll="handleDiceRoll"
    />
    <HealthTracker 
      :current="character.pluginData.stress.physical"
      :max="character.pluginData.stress.physicalMax"
      label="Physical Stress"
    />
    <NotesPad 
      :notes="character.pluginData.notes"
      @update="updateNotes"
    />
    
    <!-- FATE-specific components (same plugin) -->
    <AspectManager :aspects="character.pluginData.aspects" />
    <StuntList :stunts="character.pluginData.stunts" />
    <FatePointTracker 
      :current="character.pluginData.fatePoints"
      @compel="compelAspect"
      @invoke="invokeAspect"
    />
  </div>
</template>

<script setup lang="ts">
// Framework components (direct imports)
import { 
  DiceRoller, 
  HealthTracker, 
  NotesPad 
} from '@dungeon-lab/shared-components';

// FATE-specific components (same plugin)
import AspectManager from './AspectManager.vue';
import StuntList from './StuntList.vue';
import FatePointTracker from './FatePointTracker.vue';

// Framework handles data sync and multiplayer coordination
const { data: character, update } = usePluginData('character', characterId);
const { rollDice } = useDiceRolling(); // Framework mixin
const { fateEvents } = useFatePlugin(); // Plugin-specific events

const updateCharacter = debounce(() => {
  update(character.value);
}, 500);

// FATE-specific mechanics using internal events
const compelAspect = (aspect: string) => {
  fateEvents.emit('compel-aspect', {
    character: character.value.id,
    aspect,
    player: getCurrentPlayer()
  });
};

const invokeAspect = (aspect: string) => {
  fateEvents.emit('invoke-aspect', {
    character: character.value.id, 
    aspect,
    bonus: '+2'
  });
};
</script>
```

## Migration Strategy

### Phase 1: Foundation (2-3 weeks)
- Implement event system bridging client and WebSocket
- Create basic capability registry  
- Build reactive data hooks using existing API
- Add plugin hot reloading for development

### Phase 2: Mixin Library (2-3 weeks)  
- Extract common TTRPG patterns into mixins
- Migrate D&D plugin to use new patterns
- Create shared component library
- Add development CLI tools

### Phase 3: Enhancement (2-3 weeks)
- Cross-plugin component usage
- Advanced event patterns
- Performance optimization
- Documentation and examples

### Backward Compatibility
Existing plugins continue working unchanged. New features are opt-in:

```typescript
// Old plugins keep working
class LegacyDnDPlugin extends BaseGameSystemPlugin {
  getComponent('character-sheet') { return CharacterSheet; }
}

// New plugins get enhanced features
class ModernDnDPlugin extends BasePlugin {
  registerCapabilities() {
    this.register('character-sheet', CharacterSheet);
  }
}
```

## Benefits Over Current System

1. **True Real-Time Sync**: Single game state automatically updates all UIs when changed
2. **GM Authority**: Game Master acts as authoritative rules engine, ensuring consistent gameplay
3. **Game-Agnostic Server**: Server routes messages generically without understanding game mechanics
4. **Automatic UI Updates**: Components automatically re-render when relevant state changes
5. **Shared Component Library**: Reusable TTRPG components with direct imports and full type safety
6. **Enhanced DX**: Hot reloading, shared mixins, and simplified plugin development
7. **Consistent State**: Impossible for components to show different versions of the same data
8. **Plugin Extensibility**: Plugins can define custom request/response patterns without server changes

## Implementation Complexity

**Low Risk Changes:**
- Event system (builds on existing WebSocket)
- Data hooks (use existing API)
- Mixin library (just shared functions)

**Medium Risk Changes:**
- Component capability system
- Hot reloading infrastructure  

**What We're NOT Changing:**
- Server architecture (stays game-agnostic)
- Database structure (still uses `pluginData`)  
- Existing plugin structure (backward compatible)

## Conclusion

This proposal combines three powerful patterns into a cohesive architecture:

1. **GM-Authoritative Gameplay**: Game Master acts as the rules engine, ensuring consistent and fair gameplay
2. **Global Reactive State**: Single source of truth automatically synchronizes all UIs in real-time  
3. **Game-Agnostic Server**: Generic message routing allows any game system without server changes

### Key Architectural Advantages

**Simplicity Through Separation:**
- **Players**: Send action requests  
- **GM**: Process game mechanics, send state updates
- **Server**: Route messages, broadcast state changes
- **Components**: Read reactive state, automatically update

**Real-Time by Design:**
- GM updates state → All UIs instantly reflect changes
- Move a token → Character sheet, initiative tracker, everything updates
- Deal damage → HP bars, status indicators, combat log all sync automatically

**Future-Proof Extensibility:**
- New game systems: Just add plugin, no server changes needed
- New mechanics: Define request types, server routes them generically  
- New components: Import from shared library or create plugin-specific ones

### The Result

Transform Dungeon Lab from individual components managing their own data into a **unified real-time game state** where:

- Every participant sees the same game state instantly
- The GM maintains authoritative control over game mechanics
- Plugin developers focus on game rules, not data synchronization
- The server stays simple and game-agnostic

This architecture delivers the responsive, synchronized experience players expect from modern virtual tabletops while maintaining the flexibility to support any TTRPG system.