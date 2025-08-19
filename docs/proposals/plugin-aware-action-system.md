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

#### 1. Multi-Handler Architecture

The system uses a multi-handler approach where both core and plugins can register handlers for the same action type. Multiple handlers are executed in priority order with fail-fast validation.

```typescript
export interface ActionHandler {
  // Metadata
  pluginId?: string;           // undefined = core handler
  priority?: number;           // Lower = runs first (core = 0, plugins = 100+)
  
  // Approval workflow (simplified)
  requiresManualApproval?: boolean;  // Default: false = auto-execute
  gmOnly?: boolean;                  // Default: false = players can use
  
  // Lifecycle methods (both optional)
  validate?: (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => Promise<ValidationResult>;
  execute?: (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => Promise<void>;
  
  // UI/UX
  approvalMessage?: (request: GameActionRequest) => string;
}
```

#### 2. Handler Registration and Execution

```typescript
// Registry stores arrays of handlers per action type
const actionHandlers: Record<string, ActionHandler[]> = {};

// Registration - both core and plugins use same method
function registerAction(actionType: string, handler: ActionHandler): void {
  if (!actionHandlers[actionType]) {
    actionHandlers[actionType] = [];
  }
  actionHandlers[actionType].push(handler);
  
  // Sort by priority (core handlers first)
  actionHandlers[actionType].sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

// Execution flow using Immer
import { produce } from 'immer';

async function handleAction(request: GameActionRequest) {
  const handlers = actionHandlers[request.action] || [];
  const currentGameState = gameStateStore.getState();
  
  // 1. Run all validations (fail-fast) - read-only gameState
  for (const handler of handlers) {
    if (handler.validate) {
      const result = await handler.validate(request, currentGameState);
      if (!result.valid) return sendError(result.error);
    }
  }
  
  // 2. Check if any handler requires manual approval
  const requiresApproval = handlers.some(h => h.requiresManualApproval);
  if (requiresApproval) return sendApprovalRequest(request);
  
  // 3. Execute all handlers within Immer transaction
  const [newState, patches] = produce(
    currentGameState,
    async (draft) => {
      // All handlers mutate the same draft state
      for (const handler of handlers) {
        if (handler.execute) {
          await handler.execute(request, draft);
        }
      }
    },
    // Capture auto-generated JSON patches
    (patches) => patches
  );
  
  // 4. Apply all patches atomically
  if (patches.length > 0) {
    await gameStateStore.updateGameState(patches);
  }
}
```

**State Update Pattern:**
The system uses **Immer's "mutable draft, immutable patches"** pattern that ensures atomic state updates:

1. **Handlers Mutate Draft**: Action handlers directly mutate the draft game state using normal JavaScript syntax (`gameState.documents[id].state.hp = 75`).

2. **Immer Generates Patches**: Immer automatically tracks all mutations and generates RFC 6902 JSON Patch operations describing the exact changes made.

3. **Atomic Application**: All generated patches are applied together in a single atomic operation using `gameStateStore.updateGameState(patches)`.

4. **Benefits of This Approach**:
   - **Natural Syntax**: Handlers use normal JavaScript object mutation
   - **Automatic Patches**: No manual JSON patch creation required
   - **Atomic Updates**: All changes happen together or not at all
   - **Predictable Order**: Handlers execute in priority order, all mutating same draft
   - **Easy Testing**: Handlers can be tested by examining final state
   - **Perfect Accuracy**: Immer tracks every mutation precisely
   - **Battle-tested**: Used by Redux Toolkit in production applications
```

#### 3. Direct Game State Access

Handlers receive the game state directly and can access any data they need using normal JavaScript object access. This eliminates the need for complex wrapper classes or helper methods.

```typescript
// Example data access patterns in handlers
function validateMovement(request: GameActionRequest, gameState: ServerGameStateWithVirtuals) {
  // Get character directly from game state
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) return { valid: false, error: { code: 'NO_CHARACTER', message: 'No character found' } };
  
  // Access character data directly
  const baseSpeed = character.pluginData.speed || 30;
  const movementUsed = character.state?.movementUsed || 0;
  const distance = request.parameters.distance;
  
  // Simple validation logic
  if (movementUsed + distance > baseSpeed) {
    return { 
      valid: false, 
      error: { code: 'INSUFFICIENT_MOVEMENT', message: 'Not enough movement remaining' }
    };
  }
  
  return { valid: true };
}

function executeMovement(request: GameActionRequest, gameState: ServerGameStateWithVirtuals) {
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  // Direct mutation - Immer will track this automatically
  if (!character.state) character.state = {};
  character.state.movementUsed = (character.state.movementUsed || 0) + request.parameters.distance;
  
  // Update token position directly
  const token = gameState.currentEncounter?.tokens?.find(t => t.characterId === character.id);
  if (token) {
    token.bounds.x = request.parameters.newPosition.x;
    token.bounds.y = request.parameters.newPosition.y;
  }
}
```

#### 4. Result Type Definitions

```typescript
export interface ValidationResult {
  valid: boolean;
  error?: { code: string; message: string };
  resourceCosts?: ResourceCost[];
  stateChanges?: StateChangePreview[];
}

export interface ResourceCost {
  resourcePath: string;    // Path within plugin data (e.g., 'spellSlotsUsed.level1')
  amount: number;          // Amount to consume
  storageType: 'data' | 'state';  // 'data' = pluginData, 'state' = document state
}

export interface GameEffect {
  type: string;            // Effect type (explosion, spell cast, etc.)
  position?: { x: number; y: number };
  radius?: number;
  color?: string;
  duration?: number;
  // ... other effect properties
}
```

### Plugin Integration

#### Plugin Helper Functions

Plugins can create utility functions to encapsulate common game-specific logic and reduce code duplication across handlers:

```typescript
// In D&D 5e Plugin - utility functions for common operations
export class DnD5eHelpers {
  static canCast(character: any, spellLevel: number): boolean {
    const maxSlots = character.pluginData.spellSlots?.[`level${spellLevel}`]?.total || 0;
    const usedSlots = character.state?.spellSlotsUsed?.[`level${spellLevel}`] || 0;
    return maxSlots > usedSlots;
  }
  
  static getMovementRemaining(character: any): number {
    const baseSpeed = character.pluginData.speed || 30;
    const movementUsed = character.state?.movementUsed || 0;
    return baseSpeed - movementUsed;
  }
  
  static hasCondition(character: any, condition: string): boolean {
    const conditions = character.state?.conditions || [];
    return conditions.includes(condition);
  }
  
  static getCurrentHitPoints(character: any): number {
    return character.state?.currentHitPoints || 0;
  }
  
  static getMaxHitPoints(character: any): number {
    return character.pluginData.hitPointsMax || 0;
  }
  
  static findCharacterForPlayer(gameState: ServerGameStateWithVirtuals, playerId: string): any {
    return Object.values(gameState.documents)
      .find(doc => doc.documentType === 'character' && doc.createdBy === playerId);
  }
  
  static consumeSpellSlot(character: any, spellLevel: number): void {
    if (!character.state.spellSlotsUsed) character.state.spellSlotsUsed = {};
    const currentUsed = character.state.spellSlotsUsed[`level${spellLevel}`] || 0;
    character.state.spellSlotsUsed[`level${spellLevel}`] = currentUsed + 1;
  }
}
```

#### Plugin Registration Lifecycle

The action registration system must handle both core handlers and plugin handlers at the appropriate times in the application lifecycle.

**Core Handler Registration (App Startup):**
```typescript
// During main app initialization - before any game sessions start
function initializeCoreActionHandlers() {
  // Register core VTT functionality
  registerAction('move-token', {
    priority: 0,  // Core runs first
    validate: validateCoreMovement,
    execute: executeCoreMovement,
    approvalMessage: (req) => `wants to move token`
  });
  
  registerAction('add-document', {
    priority: 0,
    validate: validateDocumentCreation,
    execute: executeDocumentCreation
  });
  
  registerAction('end-turn', {
    priority: 0,
    validate: validateTurnEnd,
    execute: executeTurnEnd
  });
  
  // ... other core handlers
}
```

**Plugin Handler Registration (Plugin Loading):**
```typescript
// When a plugin is loaded/enabled for a campaign
class DnD5ePlugin {
  onLoad(pluginContext: PluginContext) {
    // pluginContext provides access to registerAction function
    pluginContext.registerAction('move-token', {
      pluginId: 'dnd5e-2024',
      priority: 100,  // Plugin runs after core
      validate: this.validateDnDMovement,
      execute: this.updateDnDMovementState
    });
    
    pluginContext.registerAction('dnd5e-2024:cast-spell', {
      pluginId: 'dnd5e-2024',
      validate: this.validateSpellCasting,
      execute: this.executeSpellCasting,
      approvalMessage: (req) => `wants to cast ${req.parameters.spellName}`
    });
  }
  
  onUnload(pluginContext: PluginContext) {
    // Clean up handlers when plugin is disabled
    pluginContext.unregisterPluginActions('dnd5e-2024');
  }
}
```

**PluginContext Interface:**
```typescript
export interface PluginContext {
  // Registration methods exposed to plugins
  registerAction(actionType: string, handler: Omit<ActionHandler, 'pluginId'>): void;
  unregisterAction(actionType: string, pluginId: string): void;
  unregisterPluginActions(pluginId: string): void;
  
  // Access to game state (read-only for registration)
  getGameState(): ServerGameStateWithVirtuals;
}
```

**Registration Timing:**
1. **App Startup**: Core handlers registered first
2. **Campaign Load**: Active plugins loaded and register their handlers
3. **Plugin Enable/Disable**: Dynamic registration/unregistration during gameplay
4. **Plugin Unload**: Cleanup of all plugin handlers

#### Action Registration Examples

```typescript
// Core registers move-token handler
registerAction('move-token', {
  priority: 0,  // Core runs first
  validate: validateCoreMovement,    // Collision detection, permissions
  execute: executeCoreMovement,      // Update token position
  approvalMessage: (req) => `wants to move token`
});

// D&D 5e plugin also registers move-token handler  
registerAction('move-token', {
  pluginId: 'dnd5e-2024',
  priority: 100,  // Plugin runs after core
  validate: validateDnDMovement,     // Speed limits, conditions, action economy
  execute: updateDnDMovementState,   // Track movement used in character.state
});

// Pure plugin action (no core equivalent)
registerAction('dnd5e-2024:cast-spell', {
  pluginId: 'dnd5e-2024',
  requiresManualApproval: false,     // Auto-execute after validation
  validate: validateSpellCasting,   // Spell slots, range, components
  execute: executeSpellCasting,     // Apply effects, consume resources
  approvalMessage: (req) => `wants to cast ${req.parameters.spellName}`
});

// Action requiring manual approval
registerAction('dnd5e-2024:use-legendary-action', {
  pluginId: 'dnd5e-2024', 
  requiresManualApproval: true,      // Always requires GM approval
  validate: validateLegendaryAction,
  execute: executeLegendaryAction,
  approvalMessage: (req) => `wants to use legendary action: ${req.parameters.actionName}`
});
```

### Resource Management Architecture

The action system uses a simplified two-field approach to resource storage that builds on the existing character document structure while solving key problems like token recreation and data persistence.

#### Storage Locations Overview

The system provides two primary storage locations for game resources:

1. **Character/Actor Documents** - Both permanent character definition AND current state
2. **Tokens** - Pure visual representation with generic bars pointing to character data

#### Resource Storage Strategy

##### Character/Actor Documents (Permanent + Current)

**Purpose:** Store both permanent character definition AND current transient state in two separate fields.

**Storage Structure:**
```typescript
// Character document structure
{
  id: "character-123",
  name: "Wizard Bob",
  // ... core character data
  
  // PERMANENT character definition (existing field)
  pluginData: {
    hitPointsMax: 45,
    spellSlots: {
      level1: { total: 4 },
      level2: { total: 3 },
      level3: { total: 2 }
    },
    classFeatures: {
      arcanumRecovery: { maxUses: 1 },
      spellMastery: { selected: ["fireball"] }
    },
    abilities: { strength: 10, intelligence: 18 },
    speed: 30
  },
  
  // CURRENT transient state (NEW field)
  state: {
    currentHitPoints: 32,
    spellSlotsUsed: {
      level1: 1,
      level2: 2,
      level3: 0
    },
    conditions: ["concentrating", "blessed"],
    movementUsed: 20,
    actionsUsed: ["action"],
    classFeatureUses: {
      arcanumRecovery: 1
    }
  }
}
```

**Resource Types by Field:**

**pluginData (Permanent):**
- Core character statistics (ability scores, proficiencies, levels)
- Maximum values (hit point maximum, spell slot totals, feature uses)
- Equipment and inventory
- Character progression data (experience, levels)
- Class features and abilities

**state (Current):**
- Current hit points and resources
- Spell slots and feature uses consumed
- Active conditions and temporary effects
- Movement and actions used this turn
- Current status and temporary state

**Why This Approach:**
- ✅ **Solves token recreation problem** - Current state follows character across encounters
- ✅ **Simple mental model** - Permanent vs Current is intuitive
- ✅ **Builds on existing structure** - pluginData already exists
- ✅ **No synchronization needed** - One source of truth per resource type

##### Tokens (Visual Display Only)

**Purpose:** Pure visual representation with generic bars that point to character state for display.

**Storage Structure:**
```typescript
// Token structure
{
  id: "token-456", 
  characterId: "character-123",
  bounds: { x: 150, y: 200, width: 50, height: 50 },
  orientation?: 45, // degrees
  
  // Generic configurable bars that point to character data
  bars: {
    "health": {
      resourcePath: "currentHitPoints",     // character.state path
      maxResourcePath: "hitPointsMax",      // character.pluginData path
      color: "red",
      visible: true
    },
    "spellSlots": {
      resourcePath: "spellSlotsUsed.level1",
      maxResourcePath: "spellSlots.level1.total",
      color: "blue",
      visible: false  // Hidden by default
    }
  }
}
```

**Resource Types:**
- Position and orientation (visual positioning)
- Generic bars configuration (points to character data)
- Display preferences (bar visibility, colors)

**Why This Approach:**
- ✅ **No data duplication** - Token bars just point to character data
- ✅ **Flexible display** - Any character resource can be visualized
- ✅ **Token recreation is simple** - Just recreate bars pointing to existing character data
- ✅ **No data loss** - All game state lives in character documents

##### State Lifecycle Management

**Turn-scoped Resources** (reset when turn advances):
- Movement used this turn → `character.state.movementUsed`
- Actions taken → `character.state.actionsUsed`
- Bonus actions → `character.state.bonusActionUsed`

**Encounter-scoped Resources** (reset when encounter ends):
- Current hit points → `character.state.currentHitPoints` 
- Active conditions → `character.state.conditions`
- Temporary effects → `character.state.temporaryEffects`

**Session-scoped Resources** (reset on long rest):
- Spell slots used → `character.state.spellSlotsUsed`
- Class feature uses → `character.state.classFeatureUses`
- Exhaustion level → `character.state.exhaustion`

**Lifecycle Reset Implementation:**
```typescript
// Turn advancement
function advanceTurn(characterId: string) {
  const operations = [
    { op: 'replace', path: `/documents/${characterId}/state/movementUsed`, value: 0 },
    { op: 'replace', path: `/documents/${characterId}/state/actionsUsed`, value: [] },
    { op: 'replace', path: `/documents/${characterId}/state/bonusActionUsed`, value: false }
  ];
  return operations;
}

// Long rest
function completeLongRest(characterId: string) {
  const operations = [
    { op: 'replace', path: `/documents/${characterId}/state/spellSlotsUsed`, value: {} },
    { op: 'replace', path: `/documents/${characterId}/state/classFeatureUses`, value: {} }
  ];
  return operations;
}
```

**Why This Approach:**
- ✅ **Simple reset logic** - Just clear specific character.state fields
- ✅ **No complex scoping** - Character-based storage with explicit reset methods
- ✅ **Existing infrastructure** - Uses existing document update operations

#### Encounter-Wide State

**Instead of complex encounter.pluginData, use existing structures:**

- **Initiative/Turn Order** → Already handled by existing `turnManager`
- **Environmental Effects** → Store in map/scene properties or create special "Environment" character
- **Battlefield Spells** → Create temporary "Environment" character document with its own state
- **Global Modifiers** → Part of core encounter structure

**Example: Environment Character for Battlefield Effects:**
```typescript
// Create an "Environment" character for encounter-wide effects
{
  id: "env-encounter-123",
  name: "Environment",
  documentType: "actor",
  pluginId: "dnd5e-2024",
  state: {
    activeSpells: [
      {
        spellId: "darkness",
        area: { x: 100, y: 100, radius: 20 },
        duration: 600 // seconds
      }
    ],
    environmentalHazards: [
      {
        type: "poison_gas",
        concentration: 3,
        area: { x: 200, y: 200, radius: 30 }
      }
    ]
  }
}
```

## Complete Action Flow Examples

### Example 1: Multi-Handler Action - "Player moves token"

This demonstrates how both core and plugin handlers work together for a single action, using the simplified character-based storage.

#### 1. Player Initiates Action
```typescript
gameActionClient.requestAction({
  action: 'move-token',
  parameters: {
    tokenId: 'char123-token',
    newPosition: { x: 150, y: 200 },
    distance: 25  // feet moved
  }
});
```

#### 2. GM Client Processes Request
```typescript
// Get all handlers for move-token (core + plugin)
const handlers = actionHandlers['move-token'];
// handlers = [
//   { priority: 0, validate: validateCoreMovement, execute: executeCoreMovement },
//   { pluginId: 'dnd5e-2024', priority: 100, validate: validateDnDMovement, execute: updateDnDMovementState }
// ]

const gameState = gameStateStore.getState();
```

#### 3. Validation Phase (All handlers, fail-fast)
```typescript
// Core validation runs first (priority 0)
const coreValidation = await validateCoreMovement(request, gameState);
// Checks: collision detection, player owns token, player's turn
// Resource Access: None (basic permission checks)

if (!coreValidation.valid) {
  return sendErrorResponse(request.id, coreValidation.error);
}

// Plugin validation runs second (priority 100)  
const pluginValidation = await validateDnDMovement(request, gameState);
// Resource Access Examples:
// - Character speed: character.pluginData.speed
// - Movement used this turn: character.state.movementUsed
// - Conditions: character.state.conditions

function validateDnDMovement(request, gameState) {
  const character = DnD5eHelpers.findCharacterForPlayer(gameState, request.playerId);
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found' } };
  }
  
  // Get character's base speed (from character.pluginData)
  const baseSpeed = character.pluginData.speed || 30;
  
  // Get movement already used this turn (from character.state)
  const movementUsed = character.state?.movementUsed || 0;
  
  // Check if character has enough movement remaining
  const availableMovement = baseSpeed - movementUsed;
  if (request.parameters.distance > availableMovement) {
    return {
      valid: false,
      error: { 
        code: 'INSUFFICIENT_MOVEMENT',
        message: `Need ${request.parameters.distance} feet, have ${availableMovement} remaining`
      }
    };
  }
  
  // Check for conditions that prevent movement (from character.state)
  const conditions = character.state?.conditions || [];
  if (conditions.includes('grappled') || conditions.includes('paralyzed')) {
    return {
      valid: false,
      error: { code: 'MOVEMENT_RESTRICTED', message: 'Character cannot move due to conditions' }
    };
  }
  
  return { valid: true };
}

if (!pluginValidation.valid) {
  return sendErrorResponse(request.id, pluginValidation.error);
}
```

#### 4. Approval Check
```typescript
// Check if any handler requires manual approval
const requiresApproval = handlers.some(h => h.requiresManualApproval);
// Result: false (neither handler requires approval for basic movement)
```

#### 5. Execution Phase (Using Immer)
```typescript
// Execute all handlers within Immer transaction
const [newState, patches] = produce(
  gameState,
  async (draft) => {
    // Core execution runs first (priority 0)
    await executeCoreMovement(request, draft);
    
    // Plugin execution runs second (priority 100)
    await updateDnDMovementState(request, draft);
  },
  (patches) => patches
);

function executeCoreMovement(request, gameState) {
  // Update token position directly
  const token = gameState.currentEncounter?.tokens?.find(t => t.id === request.parameters.tokenId);
  if (!token) {
    throw new Error('Token not found'); // Immer will handle this properly
  }
  
  // Direct mutation - Immer tracks this automatically
  token.bounds.x = request.parameters.newPosition.x;
  token.bounds.y = request.parameters.newPosition.y;
  token.lastMoved = Date.now();
}

function updateDnDMovementState(request, gameState) {
  const character = DnD5eHelpers.findCharacterForPlayer(gameState, request.playerId);
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Initialize state if needed
  if (!character.state) character.state = {};
  
  // Update movement used this turn directly
  const currentMovementUsed = character.state.movementUsed || 0;
  character.state.movementUsed = currentMovementUsed + request.parameters.distance;
}

// Apply all patches atomically
if (patches.length > 0) {
  await gameStateStore.updateGameState(patches);
}
```

### Example 2: Plugin-Only Action - "Player casts Fireball"

This demonstrates a pure plugin action with resource management using the simplified character-based storage.

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

#### 2. Single Handler Processing
```typescript
// Only one handler registered for this action
const handlers = actionHandlers['dnd5e-2024:cast-spell'];
// handlers = [{ pluginId: 'dnd5e-2024', validate: validateSpellCasting, execute: executeSpellCasting }]

const gameState = gameStateStore.getState();
```

#### 3. Plugin Validation with Character-Based Resource Checks
```typescript
function validateSpellCasting(request, gameState) {
  const character = DnD5eHelpers.findCharacterForPlayer(gameState, request.playerId);
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found' } };
  }
  
  // 1. Check spell slots (character.pluginData vs character.state)
  const maxSlots = character.pluginData.spellSlots?.[`level${request.parameters.spellLevel}`]?.total || 0;
  const usedSlots = character.state?.spellSlotsUsed?.[`level${request.parameters.spellLevel}`] || 0;
  
  if (usedSlots >= maxSlots) {
    return {
      valid: false,
      error: { code: 'NO_SPELL_SLOTS', message: `No level ${request.parameters.spellLevel} spell slots remaining` }
    };
  }
  
  // 2. Check action economy (character.state)
  const actionsUsed = character.state?.actionsUsed || [];
  if (actionsUsed.includes('action')) {
    return {
      valid: false,
      error: { code: 'ACTION_ALREADY_USED', message: 'Action already used this turn' }
    };
  }
  
  // 3. Check conditions preventing spellcasting (character.state)
  const conditions = character.state?.conditions || [];
  if (conditions.includes('silenced') || conditions.includes('unconscious')) {
    return {
      valid: false,
      error: { code: 'CANNOT_CAST', message: 'Cannot cast spells due to conditions' }
    };
  }
  
  // 4. Check spell known/prepared (character.pluginData)
  const knownSpells = character.pluginData.spells?.known || [];
  const preparedSpells = character.pluginData.spells?.prepared || [];
  
  if (!knownSpells.includes(request.parameters.spellId) && !preparedSpells.includes(request.parameters.spellId)) {
    return {
      valid: false,
      error: { code: 'SPELL_NOT_KNOWN', message: 'Character does not know this spell' }
    };
  }
  
  return { 
    valid: true,
    resourceCosts: [{
      resourcePath: `spellSlotsUsed.level${request.parameters.spellLevel}`,
      amount: 1,
      storageType: 'state'
    }]
  };
}

const validation = await validateSpellCasting(request, gameState);
if (!validation.valid) {
  return sendErrorResponse(request.id, validation.error);
}
```

#### 4. Simplified Spell Execution with Immer
```typescript
// Execute within Immer transaction
const [newState, patches, effects] = produce(
  gameState,
  (draft) => {
    const effects = executeSpellCasting(request, draft);
    return effects; // Return effects for use outside
  },
  (patches) => patches
);

function executeSpellCasting(request, gameState) {
  const character = DnD5eHelpers.findCharacterForPlayer(gameState, request.playerId);
  if (!character) throw new Error('Character not found');
  
  // Initialize state if needed
  if (!character.state) character.state = {};
  
  // 1. Consume spell slot (direct mutation)
  DnD5eHelpers.consumeSpellSlot(character, request.parameters.spellLevel);
  
  // 2. Mark action as used (direct mutation)
  if (!character.state.actionsUsed) character.state.actionsUsed = [];
  character.state.actionsUsed.push('action');
  
  // 3. Apply damage to target characters (direct mutation)
  for (const targetTokenId of request.parameters.targetTokens) {
    // Find the character associated with this token
    const token = gameState.currentEncounter?.tokens?.find(t => t.id === targetTokenId);
    if (!token?.characterId) continue;
    
    const targetCharacter = gameState.documents[token.characterId];
    if (!targetCharacter) continue;
    
    // Initialize state if needed
    if (!targetCharacter.state) targetCharacter.state = {};
    
    const currentHp = targetCharacter.state.currentHitPoints || 0;
    const damageRoll = rollDamage('8d6'); // Simulate damage roll
    const newHp = Math.max(0, currentHp - damageRoll);
    
    // Direct mutation
    targetCharacter.state.currentHitPoints = newHp;
  }
  
  // 4. Return visual effects (not stored in state)
  return [{
    type: 'explosion',
    position: request.parameters.targetPoint,
    radius: 20, // 20-foot radius for Fireball
    color: 'orange'
  }];
}

// Apply all patches atomically and trigger effects
if (patches.length > 0) {
  await gameStateStore.updateGameState(patches);
}

if (effects && effects.length > 0) {
  socketStore.emit('game:effects', { effects });
}
```

## Implementation Plan

### Phase 1: Core Architecture (Week 1)
1. **Add Immer dependency and implement multi-handler ActionHandler interface**
   - Install Immer library for immutable state updates
   - Create ActionHandler interface with gameState parameter (no ActionContext)
   - Define result types (ValidationResult, ResourceCost, GameEffect)
   - Implement handler registration system with priority ordering

2. **Update GM Action Handler with Immer integration**
   - Multi-handler processing pipeline (validation → approval → execution)
   - Immer produce() wrapper for automatic patch generation
   - Priority-based execution ordering within single draft transaction
   - Simplified approval system (ANY requires approval)

### Phase 2: Character State Extension (Week 2)
1. **Add state field to character documents**
   - Extend Character/Actor schema with state field
   - Initialize empty state for existing characters
   - Update document validation and serialization

2. **Implement simple resource lifecycle management**
   - Turn reset: Clear movement, actions used from character.state
   - Encounter reset: Clear conditions, temporary effects
   - Long rest reset: Clear spell slots used, feature uses

3. **Create token bar configuration system**
   - Generic bar configuration pointing to character data paths
   - Bar display logic using character.pluginData and character.state
   - Token creation/recreation with automatic bar setup

### Phase 3: Plugin Integration (Week 2-3)
1. **Plugin action handler interface**
   - Standard interface for plugins to implement
   - Registration helpers for plugin actions
   - Helper utility functions for common game operations

2. **D&D 5e reference implementation**
   - Spell casting action using direct state mutations
   - Movement tracking with direct character.state updates
   - Action economy enforcement using simple state checks
   - Feature usage tracking with Immer-powered mutations

### Phase 4: Migration and Testing (Week 3-4)
1. **Convert existing core actions to multi-handler system**
   - Migrate move-token, end-turn, etc. to ActionHandler interface
   - Remove redundant requiresApproval/autoApprove logic
   - Replace with simplified requiresManualApproval system

2. **Comprehensive testing**
   - Unit tests for multi-handler execution
   - Integration tests for core + plugin validation flows
   - Priority ordering and approval aggregation testing
   - Character state lifecycle testing

## Benefits

### For Plugin Developers
- **Natural syntax**: Direct state mutations using normal JavaScript object access
- **No learning curve**: No complex ActionContext API to learn
- **Symmetric registration**: Plugins use same registration API as core actions
- **Action enhancement**: Can extend core actions with game-specific validation and state tracking
- **Custom actions**: Can create entirely new action types with full system integration
- **Helper functions**: Simple utility functions for common game operations

### For Core Application
- **Automatic patch generation**: Immer handles all JSON patch creation automatically
- **Simple architecture**: Single registration system, uniform execution pipeline
- **No complex abstractions**: Direct gameState access eliminates ActionContext layer
- **Extensible by design**: Core actions can be enhanced without modification
- **Fail-fast validation**: Early termination prevents invalid state changes
- **Maintainable**: Clear separation between core infrastructure and game logic
- **Battle-tested technology**: Immer is proven in production (Redux Toolkit)

### For Users
- **Rich gameplay**: Game-specific actions like spell casting, feature usage
- **Rule enforcement**: Automatic validation of game system rules
- **Better UX**: Clear feedback on resource costs and limitations
- **Visual effects**: Rich feedback for complex actions

## Technical Considerations

### Performance
- State operations are batched and applied atomically
- Simple character document lookups (no priority-based searching)
- Character state is namespaced by plugin to prevent conflicts
- Minimal overhead with direct character data/state access

### Security
- Plugin actions cannot bypass core validation
- State modifications go through same JSON patch system
- Resource costs are validated before application
- Single source of truth per resource prevents data corruption

### Extensibility
- Action registration is dynamic, supporting hot-loading of plugins
- Context extension pattern allows unlimited customization
- Layered resource storage supports any game system
- Effect system supports rich visual and audio feedback

### Token Bar Configuration

The simplified system uses generic token bars that point to character data for visual display:

#### Token Bar Examples
```typescript
// Health bar pointing to character data
{
  "health": {
    resourcePath: "currentHitPoints",      // character.state path
    maxResourcePath: "hitPointsMax",       // character.pluginData path  
    color: "red",
    visible: true
  }
}

// Spell slot bar (level 1)
{
  "spellSlots1": {
    resourcePath: "spellSlotsUsed.level1", // character.state path
    maxResourcePath: "spellSlots.level1.total", // character.pluginData path
    color: "blue", 
    visible: false  // Hidden by default, shown when relevant
  }
}
```

#### Benefits
- **No data duplication** - Bars are just pointers to character data
- **Flexible display** - Any character resource can be visualized  
- **Automatic updates** - Bar display updates when character data changes
- **Easy token recreation** - Just recreate bar configuration pointing to existing data

## Key Architectural Decisions

### Multi-Handler vs. Hook Pattern
The multi-handler approach was chosen over a hook pattern because:
- **Symmetry**: Core and plugins use identical registration APIs
- **Simplicity**: Single registration method, single execution pipeline  
- **Uniformity**: All handlers have same capabilities (validate, execute, approval)
- **Mental model**: Easy to understand "multiple things handle move-token"

### Approval Aggregation Logic
The "ANY requires approval" rule was chosen because:
- **Safety first**: Better to ask unnecessarily than skip required approval
- **Plugin autonomy**: Plugins can add security restrictions to core actions
- **Additive security**: Each handler can add constraints, none can remove them
- **GM authority**: GM can always approve, so false positives are manageable

### Execution Ordering
Priority-based execution with core-first default ensures:
- **Predictable behavior**: Core infrastructure runs before game-specific logic
- **State consistency**: Core state is established before plugin enhancements
- **Override capability**: Plugins can adjust priority when needed
- **Validation independence**: Validation can run in any order (fail-fast)

## Conclusion

This multi-handler architecture provides a clean, symmetric system for extending VTT actions with game-specific logic. By using Immer for state management, we eliminate the complexity of manual JSON patch creation while providing natural JavaScript mutation syntax for handlers.

By allowing both core and plugins to register handlers for the same action type, we enable rich gameplay mechanics like D&D 5e movement validation and spell casting while keeping the core application game-agnostic. The Immer-powered execution system, priority-based handler ordering, and simplified resource storage ensure predictable, secure behavior with minimal complexity.

**Key benefits of this approach:**
- ✅ Natural JavaScript mutation syntax (no complex ActionContext API)
- ✅ Automatic JSON patch generation (Immer handles all the complexity)
- ✅ Solves token recreation problem (state follows character across encounters)
- ✅ Simple mental model (permanent vs current vs visual display)
- ✅ Battle-tested technology (used by Redux Toolkit in production)
- ✅ Easy to learn and use (familiar object mutation patterns)