# Plugin-Aware Action System Architecture

**Status:** Draft  
**Created:** 2025-01-18  
**Author:** Claude Code  

## Overview

This proposal outlines a redesign of the current action system to support plugin-extensible game actions while maintaining clean separation between core VTT functionality and game-specific rules. The goal is to enable game systems like D&D 5e to register custom actions (spell casting, feature usage, item activation) with full validation and state management capabilities.

## Problem Statement

### Current Limitations

1. **Hardcoded Action Types**: The action system currently supports only a fixed set of actions (`move-token`, `remove-token`, `add-document`, etc.)
2. **No Game Rule Enforcement**: Core actions like `move-token` lack game-specific validation (movement speed limits, action economy)
3. **Limited State Tracking**: No system for tracking turn-based state like spell slots, movement used, or action economy
4. **Plugin Isolation**: Plugins cannot extend the action system to add custom actions like spell casting

### Requirements

- Plugins must be able to register custom action types
- Game-specific rules must be enforced (spell slots, movement limits, action economy)
- State tracking for resources and turn-based mechanics
- Clean separation: main app handles infrastructure, plugins handle game logic
- Backward compatibility not required (greenfield refactor)

## Proposed Architecture

### Core Components

#### 1. Unified ActionConfig Interface

```typescript
export interface ActionConfig {
  // Metadata
  pluginId?: string;  // undefined for core actions, plugin ID for plugin actions
  
  // Approval workflow
  requiresApproval: boolean;
  autoApprove: boolean;  // If requiresApproval=true, can it auto-approve after validation?
  gmOnly?: boolean;
  
  // Lifecycle methods - all actions implement these
  validate: (request: GameActionRequest, context: ActionContext) => Promise<ValidationResult>;
  execute: (request: GameActionRequest, context: ActionContext) => Promise<ActionExecutionResult>;
  planStateChanges?: (request: GameActionRequest, context: ActionContext) => Promise<StateChangesPlan>;
  
  // UI/UX
  approvalMessage: (request: GameActionRequest) => string;
}
```

#### 2. Generic ActionContext

```typescript
class ActionContext {
  // Generic state access (game-agnostic)
  getPlayerState(playerId: string): unknown
  getPluginState(pluginId: string): unknown
  getCurrentTurn(): ITurnParticipant | null
  
  // Generic resource tracking
  canAffordCost(cost: ResourceCost): boolean
  applyCost(cost: ResourceCost): void
  
  // Generic state queries
  hasState(path: string): boolean
  getState(path: string): unknown
  setState(path: string, value: unknown): void
  
  // Generic validation helpers
  isPlayerTurn(playerId: string): boolean
  getCharacterForPlayer(playerId: string): unknown
}
```

#### 3. Result Type Definitions

```typescript
export interface ValidationResult {
  valid: boolean;
  error?: { code: string; message: string };
  resourceCosts?: ResourceCost[];
  stateChanges?: StateChangePreview[];
}

export interface ActionExecutionResult {
  success: boolean;
  error?: { code: string; message: string };
  stateOperations?: JsonPatchOperation[];
  effects?: GameEffect[];  // Visual/audio effects to trigger
}

export interface ResourceCost {
  type: string;  // 'movement', 'spellSlot', 'actionEconomy', etc.
  path: string;  // JSON path to the resource
  amount: number;
}
```

### Plugin Integration

#### Plugin-Specific Context Extensions

Plugins create their own context wrappers that add game-specific methods:

```typescript
// In D&D 5e Plugin
class DnD5eActionContext {
  constructor(private baseContext: ActionContext) {}
  
  // D&D-specific methods
  canCast(spellLevel: number): boolean {
    const spellSlots = this.baseContext.getPluginState('dnd5e-2024')?.spellSlots;
    return spellSlots?.[`level${spellLevel}`] > 0;
  }
  
  getMovementRemaining(): number {
    const turnState = this.baseContext.getPluginState('dnd5e-2024')?.turnState;
    const character = this.baseContext.getCharacterForPlayer(this.baseContext.getCurrentTurn()?.playerId);
    return character.speed - (turnState?.movementUsed || 0);
  }
  
  hasCondition(condition: string): boolean {
    const character = this.baseContext.getCharacterForPlayer(this.baseContext.getCurrentTurn()?.playerId);
    return character.conditions?.includes(condition) || false;
  }
}
```

#### Plugin Action Registration

```typescript
// Single registration method for all actions
export function registerAction(actionType: string, config: ActionConfig): void {
  actionConfigs[actionType] = config;
}

// Helper for plugin actions (adds namespace)
export function registerPluginAction(
  pluginId: string, 
  actionType: string, 
  config: Omit<ActionConfig, 'pluginId'>
): void {
  registerAction(`${pluginId}:${actionType}`, { ...config, pluginId });
}
```

### State Management

#### Plugin State Storage

Game state will be extended with a `pluginState` section:

```typescript
interface ServerGameStateWithVirtuals {
  // ... existing properties
  pluginState: {
    [pluginId: string]: {
      // Plugin-specific state
      characters: { [characterId: string]: unknown };
      turnState: { [characterId: string]: unknown };
      encounterState: unknown;
      sessionState: unknown;
    }
  }
}
```

#### State Lifecycle Management

- **Turn-scoped state**: Resets when turn advances (movement used, actions taken)
- **Encounter-scoped state**: Resets when encounter ends (temporary effects, conditions)
- **Session-scoped state**: Persists across encounters (spell slots, hit points, resources)

## Complete Action Flow Example

### Spell Casting Flow: "Player casts Fireball"

#### 1. Player Initiates Action
```typescript
gameActionClient.requestAction({
  action: 'dnd5e-2024:cast-spell',
  parameters: {
    spellId: 'fireball',
    spellLevel: 3,
    targetTokens: ['token1', 'token2'],
    targetPoint: { x: 150, y: 200 }
  }
});
```

#### 2. GM Client Processes Request
```typescript
// GM Action Handler receives the request
const config = getActionConfig('dnd5e-2024:cast-spell');
const context = new ActionContext(/* current game state */);

// Plugin creates D&D-specific context wrapper
const dndContext = new DnD5eActionContext(context);
```

#### 3. Multi-Phase Validation
```typescript
// Plugin validates D&D 5e rules
const validation = await config.validate(request, context);
// Checks:
// - Does character know Fireball?
// - Has 3rd level spell slot remaining?
// - Are targets in range (150 feet)?
// - Has character already used their Action this turn?
// - Any conditions preventing spellcasting?

if (!validation.valid) {
  return sendErrorResponse(request.id, validation.error);
}
```

#### 4. State Change Planning
```typescript
const stateChanges = await config.planStateChanges(request, context);
// Returns:
// {
//   resourceCosts: { spellSlots: { level3: 1 } },
//   turnState: { actionUsed: true },
//   effects: [
//     { tokenId: 'token1', type: 'damage', amount: 28, damageType: 'fire' },
//     { tokenId: 'token2', type: 'damage', amount: 15, damageType: 'fire' }
//   ]
// }
```

#### 5. Execution and State Update
```typescript
const result = await config.execute(request, context);
// Applies all state changes atomically:
const operations = [
  { op: 'replace', path: '/pluginState/dnd5e-2024/characters/char123/spellSlots/level3', value: 2 },
  { op: 'replace', path: '/pluginState/dnd5e-2024/turnState/char123/actionUsed', value: true },
  { op: 'replace', path: '/currentEncounter/tokens/0/hitPoints', value: 12 },
  { op: 'replace', path: '/currentEncounter/tokens/1/hitPoints', value: 25 }
];

await gameStateStore.updateGameState(operations);
```

#### 6. Response and Effects
```typescript
// Send success response to player
socketStore.emit('gameAction:response', { success: true, requestId: request.id });

// Broadcast visual effects
socketStore.broadcast('spell:effect', {
  spellId: 'fireball',
  origin: casterToken.position,
  target: { x: 150, y: 200 },
  radius: 20,
  duration: 2000
});
```

## Implementation Plan

### Phase 1: Core Architecture (Week 1)
1. **Design and implement new ActionConfig interface**
   - Create unified interface with validate/execute methods
   - Define result types (ValidationResult, ActionExecutionResult)
   - Update action registry to use new interface

2. **Create ActionContext class**
   - Generic, game-agnostic state access methods
   - Resource tracking capabilities
   - State query and modification helpers

3. **Update GM Action Handler**
   - Unified processing pipeline for all actions
   - Support for plugin actions alongside core actions
   - Enhanced approval workflow

### Phase 2: State Management (Week 2)
1. **Extend game state with plugin storage**
   - Add pluginState section to ServerGameStateWithVirtuals
   - Implement namespaced state access
   - State lifecycle management (turn/encounter/session scoped)

2. **Resource tracking system**
   - Generic ResourceCost interface
   - Cost validation and application
   - State change planning and preview

### Phase 3: Plugin Integration (Week 2-3)
1. **Plugin action handler interface**
   - Standard interface for plugins to implement
   - Registration helpers for plugin actions
   - Context extension patterns

2. **D&D 5e reference implementation**
   - Spell casting action with full validation
   - Movement tracking with speed limits
   - Action economy enforcement (Action, Bonus Action, Reaction)
   - Feature usage tracking

### Phase 4: Migration and Testing (Week 3-4)
1. **Convert existing core actions**
   - Migrate move-token, end-turn, etc. to new interface
   - Ensure all existing functionality preserved
   - Clean up legacy action handling code

2. **Comprehensive testing**
   - Unit tests for all action types
   - Integration tests for complete action flows
   - Plugin isolation testing
   - Performance testing for state management

## Benefits

### For Plugin Developers
- **First-class action support**: Plugin actions have same capabilities as core actions
- **Rich validation**: Full access to game state for complex rule validation
- **State management**: Automatic tracking of resources and turn-based state
- **Clean interfaces**: Well-defined contracts for action implementation

### For Core Application
- **Extensibility**: Easy to add new action types without core changes
- **Maintainability**: Clear separation between infrastructure and game logic
- **Consistency**: All actions follow same validation and execution pipeline
- **Performance**: Efficient state management with minimal overhead

### For Users
- **Rich gameplay**: Game-specific actions like spell casting, feature usage
- **Rule enforcement**: Automatic validation of game system rules
- **Better UX**: Clear feedback on resource costs and limitations
- **Visual effects**: Rich feedback for complex actions

## Technical Considerations

### Performance
- State operations are batched and applied atomically
- Plugin state is namespaced to prevent conflicts
- Lazy loading of plugin contexts to minimize overhead

### Security
- Plugin actions cannot bypass core validation
- State modifications go through same JSON patch system
- Resource costs are validated before application

### Extensibility
- Action registration is dynamic, supporting hot-loading of plugins
- Context extension pattern allows unlimited customization
- Effect system supports rich visual and audio feedback

## Conclusion

This architecture provides a clean, extensible foundation for game-specific actions while maintaining the separation of concerns that makes Dungeon Lab's plugin system powerful. It enables rich gameplay mechanics like D&D 5e spell casting while keeping the core application game-agnostic.

The unified action pipeline ensures consistency and maintainability, while the plugin extension system provides unlimited customization capabilities for different game systems.