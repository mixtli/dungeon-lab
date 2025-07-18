# In-House Plugin Architecture

## Executive Summary

### Vision
Create a flexible, developer-friendly plugin system for Dungeon Lab that enables rapid development of new game systems while maintaining clean architecture and stable APIs. This simplified approach trusts our in-house developers and removes unnecessary security layers.

### Key Objectives
- **Developer Velocity**: Enable rapid plugin development with hot reload and direct code access
- **Clean Architecture**: Maintain clear boundaries between plugins and core system
- **Complex Mechanics**: Support unique game mechanics that don't fit traditional patterns
- **Type Safety**: Leverage TypeScript for compile-time safety and better developer experience
- **Maintainability**: Keep plugin code organized and easy to update

### Simplified Approach Benefits
- **No Security Overhead**: Direct code execution without sandboxing complexity
- **Full Framework Access**: Use all Vue 3 and TypeScript features
- **Faster Development**: No compilation or validation pipeline slowing development
- **Better Debugging**: Standard debugging tools work without restrictions
- **Simpler Testing**: Use standard testing frameworks without special considerations

## Technical Architecture

### Plugin Structure

#### Directory Layout
```
packages/plugins/pathfinder-2e/
├── package.json              # Standard npm package
├── manifest.json            # Simple plugin metadata
├── src/
│   ├── index.ts            # Plugin entry point
│   ├── components/         # Vue components
│   │   ├── CharacterSheet.vue
│   │   ├── InitiativeTracker.vue
│   │   └── mechanics/      # Custom mechanic UIs
│   ├── mechanics/          # Game mechanics
│   │   ├── initiative.ts
│   │   ├── combat.ts
│   │   └── spellcasting.ts
│   ├── models/            # Data models
│   │   ├── Character.ts
│   │   ├── Spell.ts
│   │   └── Item.ts
│   ├── rules/             # Game rules
│   │   └── levelUp.ts
│   └── data/              # Static game data
│       ├── classes.json
│       ├── spells.json
│       └── items.json
├── tests/                 # Plugin tests
└── assets/               # Images, icons, etc.
```

#### Simple Manifest
```json
{
  "id": "pathfinder-2e",
  "name": "Pathfinder 2E",
  "version": "1.0.0",
  "description": "Complete Pathfinder 2E game system",
  "main": "./src/index.ts",
  "components": {
    "characterSheet": "./src/components/CharacterSheet.vue",
    "initiativeTracker": "./src/components/InitiativeTracker.vue"
  },
  "supportedFeatures": [
    "character-management",
    "dice-rolling",
    "initiative",
    "combat",
    "spellcasting"
  ]
}
```

### Plugin API

#### TypeScript Interface
```typescript
// packages/shared/src/plugin/Plugin.ts
export interface Plugin {
  id: string;
  name: string;
  version: string;
  
  // Lifecycle hooks
  onLoad(context: PluginContext): Promise<void>;
  onUnload(): Promise<void>;
  
  // Feature registration
  registerComponents(registry: ComponentRegistry): void;
  registerMechanics(registry: MechanicsRegistry): void;
  registerRules(registry: RuleRegistry): void;
}

export interface PluginContext {
  // Core services
  api: DungeonLabAPI;
  store: Store;
  router: Router;
  
  // Plugin utilities
  logger: Logger;
  config: PluginConfig;
  
  // Event system
  events: EventEmitter;
}

// Component registration
export interface ComponentRegistry {
  register(name: string, component: Component): void;
  override(name: string, component: Component): void;
}

// Mechanics registration  
export interface MechanicsRegistry {
  register<T extends GameMechanic>(type: string, mechanic: T): void;
  registerCustom(name: string, mechanic: CustomMechanic): void;
}
```

#### Plugin Implementation
```typescript
// packages/plugins/pathfinder-2e/src/index.ts
import { Plugin, PluginContext } from '@dungeon-lab/shared';
import CharacterSheet from './components/CharacterSheet.vue';
import { PathfinderInitiativeSystem } from './mechanics/initiative';
import { PathfinderCombatSystem } from './mechanics/combat';
import { levelUpRules } from './rules/levelUp';

export default class PathfinderPlugin implements Plugin {
  id = 'pathfinder-2e';
  name = 'Pathfinder 2E';
  version = '1.0.0';
  
  private context!: PluginContext;
  
  async onLoad(context: PluginContext) {
    this.context = context;
    
    // Load game data
    await this.loadGameData();
    
    // Register event handlers
    this.setupEventHandlers();
    
    context.logger.info('Pathfinder 2E plugin loaded');
  }
  
  async onUnload() {
    // Cleanup if needed
  }
  
  registerComponents(registry: ComponentRegistry) {
    registry.register('characterSheet', CharacterSheet);
    registry.register('initiativeTracker', InitiativeTracker);
    registry.register('spellbook', Spellbook);
  }
  
  registerMechanics(registry: MechanicsRegistry) {
    registry.register('initiative', new PathfinderInitiativeSystem());
    registry.register('combat', new PathfinderCombatSystem());
    registry.registerCustom('three-action-economy', new ThreeActionEconomy());
  }
  
  registerRules(registry: RuleRegistry) {
    registry.addRule(levelUpRules);
    registry.addRule(spellcastingRules);
  }
  
  private async loadGameData() {
    const [classes, spells, items] = await Promise.all([
      import('./data/classes.json'),
      import('./data/spells.json'),
      import('./data/items.json')
    ]);
    
    // Store in plugin's data store
    this.context.store.dispatch('pathfinder/loadData', {
      classes: classes.default,
      spells: spells.default,
      items: items.default
    });
  }
}
```

### Complex Game Mechanics

#### Supporting Unique Systems
Since we trust our developers, we can implement any mechanic directly:

```typescript
// Example: Dread's Jenga Tower
// packages/plugins/dread/src/mechanics/JengaTower.ts
export class JengaTowerMechanic implements CustomMechanic {
  private tower: Block[] = [];
  private stability = 100;
  private physics: PhysicsEngine;
  
  constructor() {
    this.physics = new PhysicsEngine();
    this.initializeTower();
  }
  
  pullBlock(blockId: string): PullResult {
    const block = this.tower.find(b => b.id === blockId);
    if (!block) return { success: false };
    
    // Simulate physics
    const result = this.physics.simulatePull(block, this.tower);
    
    if (result.towerFalls) {
      this.onTowerFall();
      return { success: false, towerFell: true };
    }
    
    this.stability = result.newStability;
    return { success: true, stability: this.stability };
  }
  
  // Full access to browser APIs for advanced features
  async visualizePull(blockId: string): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Animate the pull with requestAnimationFrame
    await this.animatePull(ctx, blockId);
  }
}
```

```vue
<!-- Dread Tower Component with full Vue features -->
<template>
  <div class="jenga-tower">
    <canvas ref="towerCanvas" @click="handleClick" />
    <div class="controls">
      <button @click="simulatePull">AI Suggest Move</button>
      <button @click="reset">New Tower</button>
    </div>
    
    <!-- Use any Vue features we want -->
    <Transition name="shake" mode="out-in">
      <div v-if="isShaking" class="tower-shake">
        Tower is unstable!
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useJengaTower } from '../composables/useJengaTower';
import { useSoundEffects } from '../composables/useSoundEffects';

const towerCanvas = ref<HTMLCanvasElement>();
const { tower, stability, pullBlock, reset } = useJengaTower();
const { playSound } = useSoundEffects();

const isShaking = computed(() => stability.value < 30);

onMounted(() => {
  // Direct canvas manipulation
  const ctx = towerCanvas.value!.getContext('2d')!;
  renderTower(ctx);
});

async function simulatePull() {
  // Use Web Workers for complex calculations
  const worker = new Worker('/workers/tower-ai.js');
  const suggestion = await getSuggestion(worker);
  highlightBlock(suggestion);
}
</script>
```

#### Initiative Systems Examples

```typescript
// Standard D&D style
export class DnDInitiativeSystem implements InitiativeSystem {
  roll(character: Character): InitiativeResult {
    const roll = rollDice('1d20');
    const modifier = getModifier(character.dexterity);
    return {
      total: roll + modifier,
      roll,
      modifier,
      tiebreaker: character.dexterity
    };
  }
}

// Savage Worlds card-based
export class SavageWorldsInitiativeSystem implements InitiativeSystem {
  private deck: PlayingCard[] = [];
  
  constructor() {
    this.shuffleDeck();
  }
  
  roll(character: Character): InitiativeResult {
    const card = this.drawCard();
    return {
      card,
      canHold: card.rank >= 10, // Face cards can hold
      total: this.getCardValue(card)
    };
  }
  
  // Direct access to store for state management
  holdAction(characterId: string, store: Store) {
    store.commit('initiative/holdAction', { characterId });
  }
}

// Completely custom system
export class PhaseBasedInitiative implements InitiativeSystem {
  // Characters act in phases based on action type
  getPhases(): Phase[] {
    return [
      { name: 'Mental Actions', test: (c) => c.plannedAction.type === 'mental' },
      { name: 'Ranged Attacks', test: (c) => c.plannedAction.type === 'ranged' },
      { name: 'Movement', test: (c) => c.plannedAction.type === 'movement' },
      { name: 'Melee', test: (c) => c.plannedAction.type === 'melee' }
    ];
  }
}
```

### Development Workflow

#### Hot Reload Development
```json
// packages/plugins/pathfinder-2e/package.json
{
  "name": "@dungeon-lab/plugin-pathfinder-2e",
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "test": "vitest",
    "lint": "eslint src"
  }
}
```

```typescript
// Development mode with hot reload
if (import.meta.hot) {
  import.meta.hot.accept('./mechanics/combat', (newModule) => {
    // Hot reload combat system
    registry.update('combat', newModule.PathfinderCombatSystem);
  });
}
```

#### Testing Approach
```typescript
// Standard Vitest testing
describe('PathfinderInitiative', () => {
  it('should roll initiative correctly', () => {
    const character = createTestCharacter({ dexterity: 14 });
    const system = new PathfinderInitiativeSystem();
    
    const result = system.roll(character);
    expect(result.modifier).toBe(2);
    expect(result.total).toBeGreaterThanOrEqual(3); // 1 + 2
    expect(result.total).toBeLessThanOrEqual(22); // 20 + 2
  });
});
```

### Plugin Loading System

```typescript
// packages/server/src/plugins/PluginLoader.ts
export class PluginLoader {
  private plugins = new Map<string, Plugin>();
  
  async loadPlugin(pluginPath: string): Promise<Plugin> {
    // Direct import of plugin module
    const module = await import(pluginPath);
    const PluginClass = module.default;
    
    const plugin = new PluginClass();
    const context = this.createContext(plugin.id);
    
    await plugin.onLoad(context);
    this.plugins.set(plugin.id, plugin);
    
    // Register all plugin features
    plugin.registerComponents(this.componentRegistry);
    plugin.registerMechanics(this.mechanicsRegistry);
    plugin.registerRules(this.ruleRegistry);
    
    return plugin;
  }
  
  // Simple file watching for development
  watchPlugins() {
    const watcher = chokidar.watch('packages/plugins/*/src/**/*.{ts,vue}');
    
    watcher.on('change', async (path) => {
      const pluginId = this.getPluginIdFromPath(path);
      await this.reloadPlugin(pluginId);
    });
  }
}
```

## Implementation Roadmap

### Phase 1: Core Plugin System (Week 1-2)

#### Week 1: Foundation
- Create plugin TypeScript interfaces and base classes
- Implement plugin loader with hot reload support
- Set up component and mechanics registries
- Create development tooling (CLI commands, watchers)

#### Week 2: Integration
- Integrate plugin system with existing architecture
- Create plugin context API
- Implement plugin lifecycle management
- Add debugging and logging utilities

### Phase 2: Migrate D&D 5e (Week 3-4)

#### Week 3: Core Migration
- Convert existing D&D 5e code to plugin format
- Separate game-specific logic from core system
- Create D&D 5e components and mechanics
- Maintain backward compatibility

#### Week 4: Enhancement
- Add new D&D 5e features using plugin capabilities
- Optimize performance without security overhead
- Create comprehensive tests
- Document migration patterns

### Phase 3: New Game Systems (Week 5-8)

#### Week 5-6: Pathfinder 2E
- Implement three-action economy
- Create Pathfinder-specific character sheet
- Add unique mechanics (focus points, etc.)
- Integrate with existing systems

#### Week 7-8: Unique Systems
- Implement Dread with Jenga tower mechanic
- Create FATE with aspect-based gameplay
- Add Savage Worlds with card initiative
- Demonstrate flexibility of plugin system

### Phase 4: Developer Experience (Week 9-10)

#### Week 9: Documentation
- Write plugin development guide
- Create API reference
- Build example plugins
- Document best practices

#### Week 10: Tooling
- Enhance development tools
- Create plugin templates
- Add performance profiling
- Implement plugin debugging tools

## Migration from Current System

### Assessment of Current Code
```typescript
// Current plugin structure (to migrate from)
packages/plugins/dnd5e-2024/
├── shared/
├── server/
└── web/

// New structure (to migrate to)
packages/plugins/dnd5e-2024/
├── src/
│   ├── index.ts
│   ├── components/
│   ├── mechanics/
│   └── data/
└── package.json
```

### Migration Steps

1. **Consolidate Code**: Merge web/server/shared into unified plugin
2. **Remove Abstractions**: Eliminate unnecessary interfaces
3. **Direct Implementation**: Convert abstract classes to concrete implementations
4. **Simplify Imports**: Use direct imports instead of dependency injection
5. **Type Safety**: Add proper TypeScript types throughout

### Backward Compatibility
- Maintain existing game data formats
- Support current save files
- Keep API compatibility for critical features
- Provide migration utilities for campaigns

## Benefits Over Complex Architecture

### Development Speed
- **No Security Overhead**: Direct coding without restrictions
- **Standard Tools**: Use familiar development tools
- **Fast Iteration**: Hot reload and immediate feedback
- **Simple Debugging**: Standard Chrome DevTools work perfectly

### Flexibility
- **Any Mechanic Possible**: No limitations on what can be built
- **Full Framework Access**: Use any Vue 3 or browser features
- **Custom UI**: Complete freedom in component design
- **External Libraries**: Can use any npm packages needed

### Maintainability
- **Clear Structure**: Simple, intuitive organization
- **Type Safety**: Full TypeScript support
- **Standard Testing**: Use Vitest without special considerations
- **Easy Updates**: Direct code changes without compilation pipeline

### Performance
- **No Sandboxing Overhead**: Direct execution
- **Optimized Builds**: Standard Vite optimization
- **Efficient Hot Reload**: Fast development cycles
- **Native Performance**: No abstraction layers

## Example: Complex Mechanic Implementation

### Blades in the Dark - Flashback System
```typescript
// Full implementation possible with direct code access
export class BladesFlashbackSystem {
  private scene: Scene;
  private timeline: TimelineEvent[] = [];
  
  async initiateFlashback(trigger: string): Promise<void> {
    // Pause current scene
    this.scene.pause();
    
    // Create flashback UI with full Vue reactivity
    const flashback = await this.createFlashbackUI();
    
    // Let player establish facts in the past
    const establishedFacts = await flashback.establish();
    
    // Calculate stress cost based on impact
    const stressCost = this.calculateStressCost(establishedFacts);
    
    // Apply to timeline
    this.timeline.insert(establishedFacts);
    
    // Resume with new context
    this.scene.resume(establishedFacts);
  }
  
  private createFlashbackUI(): FlashbackUI {
    // Can use any UI framework features
    return new FlashbackUI({
      animations: true,
      sound: true,
      particleEffects: true
    });
  }
}
```

## Conclusion

This simplified in-house plugin architecture provides all the benefits of a clean, extensible system while removing unnecessary complexity. By trusting our developers and providing them with full access to modern web technologies, we can:

1. **Build Faster**: No security overhead or compilation pipeline
2. **Create Anything**: Support for any game mechanic imaginable  
3. **Maintain Easily**: Simple, clear code structure
4. **Iterate Quickly**: Hot reload and standard debugging
5. **Scale Effectively**: Clean boundaries between plugins

The architecture maintains the good parts of the original design (clean interfaces, stable APIs, extensibility) while removing the complexity that comes from untrusted code execution. This approach is perfect for a small team building a variety of game systems in-house.