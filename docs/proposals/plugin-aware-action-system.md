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
  validate?: (request: GameActionRequest, context: ActionContext) => Promise<ValidationResult>;
  execute?: (request: GameActionRequest, context: ActionContext) => Promise<ActionExecutionResult>;
  
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

// Execution flow
async function handleAction(request: GameActionRequest) {
  const handlers = actionHandlers[request.action] || [];
  
  // 1. Run all validations (fail-fast)
  for (const handler of handlers) {
    if (handler.validate) {
      const result = await handler.validate(request, context);
      if (!result.valid) return sendError(result.error);
    }
  }
  
  // 2. Check if any handler requires manual approval
  const requiresApproval = handlers.some(h => h.requiresManualApproval);
  if (requiresApproval) return sendApprovalRequest(request);
  
  // 3. Execute all handlers in priority order
  for (const handler of handlers) {
    if (handler.execute) {
      const result = await handler.execute(request, context);
      if (!result.success) return sendError(result.error);
    }
  }
}
```

#### 3. Generic ActionContext

The ActionContext provides unified resource access that abstracts storage location complexity and handles synchronization between different storage layers.

```typescript
class ActionContext {
  constructor(
    private gameState: ServerGameStateWithVirtuals,
    private currentPlayerId?: string
  ) {}
  
  // === Unified Resource Access ===
  // Automatically finds resources in appropriate storage location
  
  /**
   * Get resource value, checking all storage locations in priority order:
   * 1. Plugin state (scoped, fastest access)
   * 2. Token data (scene-specific)  
   * 3. Character document (persistent, authoritative)
   */
  getResource(characterId: string, resourceType: string, scope?: 'turn' | 'encounter' | 'session'): unknown {
    // Implementation handles priority-based lookup
  }
  
  /**
   * Check if character can afford a resource cost
   */
  canAffordCost(characterId: string, costs: ResourceCost[]): boolean {
    return costs.every(cost => this.checkResourceAvailability(characterId, cost));
  }
  
  /**
   * Apply resource costs, updating appropriate storage locations
   */
  applyCost(characterId: string, costs: ResourceCost[]): JsonPatchOperation[] {
    const operations: JsonPatchOperation[] = [];
    for (const cost of costs) {
      operations.push(...this.generateResourceCostOperations(characterId, cost));
    }
    return operations;
  }
  
  // === Specific Storage Access ===
  // Direct access when storage location is known
  
  /**
   * Access character document resources (persistent)
   */
  getCharacterResource<T = unknown>(characterId: string, pluginId: string, resourcePath: string): T | undefined {
    const character = this.gameState.gameSession?.characters?.find(c => c.id === characterId);
    return character?.pluginData?.[pluginId]?.[resourcePath] as T;
  }
  
  /**
   * Access token resources (scene-specific)
   */
  getTokenResource<T = unknown>(tokenId: string, resourcePath: string): T | undefined {
    const token = this.gameState.currentEncounter?.tokens?.find(t => t.id === tokenId);
    return this.getNestedProperty(token, resourcePath) as T;
  }
  
  /**
   * Access plugin state resources (scoped)
   * Note: Plugins should cast the return type to their expected structure
   */
  getPluginResource<T = unknown>(
    pluginId: string, 
    scope: 'turn' | 'encounter' | 'session', 
    resourcePath: string
  ): T | undefined {
    const scopeKey = `${scope}State`;
    const scopeData = this.gameState.pluginState?.[pluginId]?.[scopeKey];
    return this.getNestedProperty(scopeData, resourcePath) as T;
  }
  
  // === Resource Modification ===
  
  /**
   * Generate operations to update character document resources
   */
  setCharacterResource(characterId: string, pluginId: string, resourcePath: string, value: unknown): JsonPatchOperation[] {
    const character = this.gameState.gameSession?.characters?.find(c => c.id === characterId);
    if (!character) return [];
    
    const characterIndex = this.gameState.gameSession!.characters!.indexOf(character);
    return [{
      op: 'replace',
      path: `/gameSession/characters/${characterIndex}/pluginData/${pluginId}/${resourcePath}`,
      value
    }];
  }
  
  /**
   * Generate operations to update token resources  
   */
  setTokenResource(tokenId: string, resourcePath: string, value: unknown): JsonPatchOperation[] {
    const token = this.gameState.currentEncounter?.tokens?.find(t => t.id === tokenId);
    if (!token) return [];
    
    const tokenIndex = this.gameState.currentEncounter!.tokens!.indexOf(token);
    return [{
      op: 'replace', 
      path: `/currentEncounter/tokens/${tokenIndex}/${resourcePath}`,
      value
    }];
  }
  
  /**
   * Generate operations to update plugin state resources
   */
  setPluginResource(
    pluginId: string,
    scope: 'turn' | 'encounter' | 'session',
    resourcePath: string, 
    value: unknown
  ): JsonPatchOperation[] {
    const scopeKey = `${scope}State`;
    return [{
      op: 'replace',
      path: `/pluginState/${pluginId}/${scopeKey}/${resourcePath}`,
      value
    }];
  }
  
  // === Convenience Methods ===
  
  /**
   * Get current turn participant
   */
  getCurrentTurn(): ITurnParticipant | null {
    const turnManager = this.gameState.turnManager;
    if (!turnManager || !turnManager.isActive) return null;
    
    return turnManager.participants[turnManager.currentTurn] || null;
  }
  
  /**
   * Check if it's a specific player's turn
   */
  isPlayerTurn(playerId: string): boolean {
    const currentTurn = this.getCurrentTurn();
    return currentTurn?.playerId === playerId;
  }
  
  /**
   * Get character associated with a player
   */
  getCharacterForPlayer(playerId: string): unknown {
    return this.gameState.gameSession?.characters?.find(c => c.createdBy === playerId);
  }
  
  /**
   * Get token for a character
   */
  getTokenForCharacter(characterId: string): unknown {
    return this.gameState.currentEncounter?.tokens?.find(t => t.characterId === characterId);
  }
  
  // === Resource Synchronization ===
  
  /**
   * Sync resources between storage locations (e.g., current HP from character to token)
   */
  syncResource(
    fromStorage: 'character' | 'token' | 'plugin',
    toStorage: 'character' | 'token' | 'plugin',
    characterId: string,
    resourcePath: string,
    options?: { 
      pluginId?: string; 
      scope?: 'turn' | 'encounter' | 'session';
      tokenId?: string;
    }
  ): JsonPatchOperation[] {
    // Implementation handles cross-storage synchronization
    return [];
  }
  
  // === Private Helpers ===
  
  private checkResourceAvailability(characterId: string, cost: ResourceCost): boolean {
    const currentValue = this.getResource(characterId, cost.resourceType, cost.scope);
    return typeof currentValue === 'number' && currentValue >= cost.amount;
  }
  
  private generateResourceCostOperations(characterId: string, cost: ResourceCost): JsonPatchOperation[] {
    // Determine storage location and generate appropriate operations
    // Implementation varies based on resource type and scope
    return [];
  }
  
  private getNestedProperty(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => 
      current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, 
      obj
    );
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

export interface ActionExecutionResult {
  success: boolean;
  error?: { code: string; message: string };
  stateOperations?: JsonPatchOperation[];
  effects?: GameEffect[];  // Visual/audio effects to trigger
}

export interface ResourceCost {
  resourceType: string;  // 'movement', 'spellSlot', 'actionEconomy', etc.
  amount: number;
  scope?: 'turn' | 'encounter' | 'session';  // Determines storage location priority
  storageHint?: 'character' | 'token' | 'plugin';  // Override automatic storage detection
}
```

### Plugin Integration

#### Plugin-Specific Context Extensions

Plugins create their own context wrappers that add game-specific methods:

```typescript
// In D&D 5e Plugin
class DnD5eActionContext {
  constructor(private baseContext: ActionContext) {}
  
  // D&D-specific methods with proper type casting
  canCast(spellLevel: number): boolean {
    const character = this.baseContext.getCharacterForPlayer(this.baseContext.getCurrentTurn()?.playerId);
    const spellSlots = this.baseContext.getCharacterResource<any>(character.id, 'dnd5e-2024', 'spellSlots');
    const slotsAvailable = spellSlots?.[`level${spellLevel}`]?.total - spellSlots?.[`level${spellLevel}`]?.used || 0;
    return slotsAvailable > 0;
  }
  
  getMovementRemaining(): number {
    const character = this.baseContext.getCharacterForPlayer(this.baseContext.getCurrentTurn()?.playerId);
    const baseSpeed = this.baseContext.getCharacterResource<number>(character.id, 'dnd5e-2024', 'speed') || 30;
    const turnState = this.baseContext.getPluginResource<DnD5eTurnState>('dnd5e-2024', 'turn', character.id);
    return baseSpeed - (turnState?.movementUsed || 0);
  }
  
  hasCondition(condition: string): boolean {
    const character = this.baseContext.getCharacterForPlayer(this.baseContext.getCurrentTurn()?.playerId);
    const token = this.baseContext.getTokenForCharacter(character.id);
    const conditions = this.baseContext.getTokenResource<string[]>(token.id, 'visibleConditions') || [];
    return conditions.includes(condition);
  }
}
```

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
  execute: updateDnDMovementState,   // Track movement used this turn
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

The action system requires a layered approach to resource storage that leverages the strengths of each storage location based on resource lifecycle and persistence requirements.

#### Storage Locations Overview

The system provides three primary storage locations for game resources:

1. **Character/Actor Documents** (with `pluginData`) - Persistent character-defining resources
2. **Tokens** - Scene-specific, visual data for active encounters  
3. **Plugin State** - Scoped temporary resources with lifecycle management

#### Resource Storage Strategy

##### Character/Actor Documents (with pluginData)

**Purpose:** Store persistent, character-defining resources that survive across sessions.

**Resource Types:**
- Core character statistics (ability scores, proficiencies, levels)
- Long rest resources (daily spell slots, class features with daily uses)
- Maximum values (hit point maximum, spell slot totals)
- Equipment and inventory
- Character progression data (experience, levels)
- Persistent conditions that survive encounters (curses, diseases)

**Storage Structure:**
```typescript
// Character document structure
{
  id: "character-123",
  name: "Wizard Bob",
  // ... core character data
  pluginData: {
    "dnd5e-2024": {
      hitPointsMax: 45,
      spellSlots: {
        level1: { total: 4, used: 0 },
        level2: { total: 3, used: 1 },
        level3: { total: 2, used: 0 }
      },
      classFeatures: {
        arcanumRecovery: { used: false },
        spellMastery: { selected: ["fireball"] }
      },
      abilities: { strength: 10, intelligence: 18 }
    }
  }
}
```

**Why Character Documents:**
- Data persists across game sessions
- Part of character sheet and identity
- Handles complex nested structures well
- Already established pluginData pattern

##### Tokens

**Purpose:** Store scene-specific data that represents the character's current state in an active encounter.

**Resource Types:**
- Current position and facing direction
- Current hit points (may sync from character document)
- Visible conditions for UI display (stunned, prone, concentrating)
- Combat-specific temporary modifiers
- Scene-specific states (hidden, invisible, elevation)

**Storage Structure:**
```typescript
// Token structure
{
  id: "token-456", 
  characterId: "character-123",
  position: { x: 150, y: 200 },
  hitPointsCurrent: 32, // Synced from character or managed independently
  visibleConditions: ["concentrating", "blessed"],
  combatModifiers: {
    ac: +2, // Shield spell
    speed: -10 // Difficult terrain
  }
}
```

**Why Tokens:**
- Represents character "in the scene"
- Quick updates for visual feedback
- Handles positional and combat-specific data
- Can be created/destroyed without affecting character

##### Plugin State

**Purpose:** Store scoped temporary resources with automatic lifecycle management.

**Resource Types by Scope:**
- **Turn-scoped**: Movement used this turn, actions taken, bonus actions used
- **Encounter-scoped**: Initiative order, concentration tracking, temporary effects  
- **Session-scoped**: Short rest benefits, exhaustion levels, inspiration points

**Storage Structure:**
```typescript
interface ServerGameStateWithVirtuals {
  // ... existing properties
  pluginState: {
    [pluginId: string]: {
      // Turn-scoped: Reset when turn advances
      turnState?: unknown;
      
      // Encounter-scoped: Reset when encounter ends  
      encounterState?: unknown;
      
      // Session-scoped: Persist until long rest
      sessionState?: unknown;
    }
  }
}
```

**Plugin Type Definition Example:**
```typescript
// Each plugin defines their own types for the unknown fields above
// Example: D&D 5e plugin would define:

interface DnD5eTurnState {
  [characterId: string]: {
    movementUsed: number;
    actionUsed: boolean;
    bonusActionUsed: boolean;
    reactionUsed: boolean;
    freeActionsUsed: string[];
  }
}

interface DnD5eEncounterState {
  initiative: { [characterId: string]: number };
  concentration: {
    [characterId: string]: {
      spellId: string;
      duration: number;
      saveBonus: number;
    }
  };
  temporaryEffects: {
    [effectId: string]: {
      targets: string[];
      duration: number;
      effect: unknown;
    }
  };
}

interface DnD5eSessionState {
  shortRestBenefits: { [characterId: string]: boolean };
  exhaustionLevel: { [characterId: string]: number };
  inspirationPoints: { [characterId: string]: number };
  hitDice: { 
    [characterId: string]: { 
      [dieType: string]: { total: number; used: number } 
    }
  };
}
```

**Why Plugin State:**
- Automatic lifecycle management with scoped resets
- Optimized for frequently accessed turn-based data
- Centralized plugin resource management
- Clean separation from persistent character data

#### State Lifecycle Management

##### Turn-scoped Resources
- **Reset Trigger**: When turn advances to next participant
- **Examples**: Movement used, actions taken, bonus actions
- **Managed By**: Turn manager during `nextTurn()` operations

##### Encounter-scoped Resources  
- **Reset Trigger**: When encounter ends
- **Examples**: Initiative, concentration, temporary combat effects
- **Managed By**: Encounter manager during encounter state transitions

##### Session-scoped Resources
- **Reset Trigger**: Long rest completion or explicit reset
- **Examples**: Short rest benefits, exhaustion, inspiration
- **Managed By**: Rest system and explicit plugin actions

## Complete Action Flow Examples

### Example 1: Multi-Handler Action - "Player moves token"

This demonstrates how both core and plugin handlers work together for a single action, accessing resources from multiple storage locations.

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

const context = new ActionContext(gameState, request.playerId);
```

#### 3. Validation Phase (All handlers, fail-fast)
```typescript
// Core validation runs first (priority 0)
const coreValidation = await validateCoreMovement(request, context);
// Checks: collision detection, player owns token, player's turn
// Resource Access: None (basic permission checks)

if (!coreValidation.valid) {
  return sendErrorResponse(request.id, coreValidation.error);
}

// Plugin validation runs second (priority 100)  
const pluginValidation = await validateDnDMovement(request, context);
// Resource Access Examples:
// - Character speed: context.getCharacterResource(characterId, 'dnd5e-2024', 'speed')
// - Movement used this turn: context.getPluginResource('dnd5e-2024', 'turn', `${characterId}/movementUsed`)
// - Grappled condition: context.getTokenResource(tokenId, 'visibleConditions')

function validateDnDMovement(request, context) {
  const character = context.getCharacterForPlayer(request.playerId);
  const characterId = character.id;
  
  // Get character's base speed (from character document)
  const baseSpeed = context.getCharacterResource(characterId, 'dnd5e-2024', 'speed') || 30;
  
  // Get movement already used this turn (from plugin state)
  const turnState = context.getPluginResource<DnD5eTurnState>('dnd5e-2024', 'turn', characterId);
  const movementUsed = turnState?.movementUsed || 0;
  
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
  
  // Check for conditions that prevent movement (from token)
  const token = context.getTokenForCharacter(characterId);
  const conditions = context.getTokenResource(token.id, 'visibleConditions') || [];
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

#### 5. Execution Phase (Priority order)
```typescript
// Core execution runs first (priority 0)
const coreResult = await executeCoreMovement(request, context);
// Updates: token position in game state
// Resource Operations: context.setTokenResource(tokenId, 'position', newPosition)

function executeCoreMovement(request, context) {
  const operations = context.setTokenResource(
    request.parameters.tokenId, 
    'position', 
    request.parameters.newPosition
  );
  
  return {
    success: true,
    stateOperations: operations
  };
}

if (!coreResult.success) {
  return sendErrorResponse(request.id, coreResult.error);
}

// Plugin execution runs second (priority 100)
const pluginResult = await updateDnDMovementState(request, context);
// Updates: movement used this turn in plugin state

function updateDnDMovementState(request, context) {
  const character = context.getCharacterForPlayer(request.playerId);
  const characterId = character.id;
  
  // Update movement used this turn (plugin state)
  const currentTurnState = context.getPluginResource<DnD5eTurnState>('dnd5e-2024', 'turn', characterId) || {};
  const newTurnState = {
    ...currentTurnState,
    movementUsed: (currentTurnState.movementUsed || 0) + request.parameters.distance
  };
  
  const operations = context.setPluginResource(
    'dnd5e-2024',
    'turn', 
    characterId,
    newTurnState
  );
  
  return {
    success: true,
    stateOperations: operations
  };
}

if (!pluginResult.success) {
  return sendErrorResponse(request.id, pluginResult.error);
}
```

### Example 2: Plugin-Only Action - "Player casts Fireball"

This demonstrates a pure plugin action with complex resource management across all storage locations.

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

const context = new ActionContext(gameState, request.playerId);
```

#### 3. Plugin Validation with Multi-Storage Resource Checks
```typescript
function validateSpellCasting(request, context) {
  const character = context.getCharacterForPlayer(request.playerId);
  const characterId = character.id;
  const token = context.getTokenForCharacter(characterId);
  
  // 1. Check spell slots (character document resource)
  const spellSlots = context.getCharacterResource(characterId, 'dnd5e-2024', 'spellSlots');
  const requiredSlot = `level${request.parameters.spellLevel}`;
  const slotsAvailable = spellSlots?.[requiredSlot]?.total - spellSlots?.[requiredSlot]?.used || 0;
  
  if (slotsAvailable <= 0) {
    return {
      valid: false,
      error: { code: 'NO_SPELL_SLOTS', message: `No ${request.parameters.spellLevel} level spell slots remaining` }
    };
  }
  
  // 2. Check action economy (plugin state - turn scoped)
  const turnState = context.getPluginResource<DnD5eTurnState>('dnd5e-2024', 'turn', characterId);
  if (turnState?.actionUsed) {
    return {
      valid: false,
      error: { code: 'ACTION_ALREADY_USED', message: 'Action already used this turn' }
    };
  }
  
  // 3. Check conditions preventing spellcasting (token conditions)
  const conditions = context.getTokenResource(token.id, 'visibleConditions') || [];
  if (conditions.includes('silenced') || conditions.includes('unconscious')) {
    return {
      valid: false,
      error: { code: 'CANNOT_CAST', message: 'Cannot cast spells due to conditions' }
    };
  }
  
  // 4. Check concentration (plugin state - encounter scoped)  
  const encounterState = context.getPluginResource<DnD5eEncounterState>('dnd5e-2024', 'encounter', '');
  const concentration = encounterState?.concentration?.[characterId];
  if (concentration && request.parameters.spellId === 'fireball') {
    // Fireball doesn't require concentration, but if it did, we'd check here
  }
  
  // 5. Check spell known/prepared (character document)
  const knownSpells = context.getCharacterResource(characterId, 'dnd5e-2024', 'spells/known') || [];
  const preparedSpells = context.getCharacterResource(characterId, 'dnd5e-2024', 'spells/prepared') || [];
  
  if (!knownSpells.includes(request.parameters.spellId) && !preparedSpells.includes(request.parameters.spellId)) {
    return {
      valid: false,
      error: { code: 'SPELL_NOT_KNOWN', message: 'Character does not know this spell' }
    };
  }
  
  return { 
    valid: true,
    resourceCosts: [{
      resourceType: 'spellSlot',
      amount: 1,
      scope: 'session' // Will be restored on long rest
    }, {
      resourceType: 'action',
      amount: 1,
      scope: 'turn' // Will be restored next turn
    }]
  };
}

const validation = await validateSpellCasting(request, context);
if (!validation.valid) {
  return sendErrorResponse(request.id, validation.error);
}
```

#### 4. Resource-Heavy Spell Execution
```typescript
function executeSpellCasting(request, context) {
  const character = context.getCharacterForPlayer(request.playerId);
  const characterId = character.id;
  const operations: JsonPatchOperation[] = [];
  
  // 1. Consume spell slot (character document)
  const currentSpellSlots = context.getCharacterResource(characterId, 'dnd5e-2024', 'spellSlots');
  const slotLevel = `level${request.parameters.spellLevel}`;
  const newSpellSlots = {
    ...currentSpellSlots,
    [slotLevel]: {
      ...currentSpellSlots[slotLevel],
      used: currentSpellSlots[slotLevel].used + 1
    }
  };
  
  operations.push(...context.setCharacterResource(
    characterId, 
    'dnd5e-2024', 
    'spellSlots', 
    newSpellSlots
  ));
  
  // 2. Mark action as used (plugin state - turn scoped)
  const currentTurnState = context.getPluginResource<DnD5eTurnState>('dnd5e-2024', 'turn', characterId) || {};
  const newTurnState = { ...currentTurnState, actionUsed: true };
  
  operations.push(...context.setPluginResource(
    'dnd5e-2024',
    'turn',
    characterId,
    newTurnState
  ));
  
  // 3. Apply damage to target tokens (token resources)
  for (const targetTokenId of request.parameters.targetTokens) {
    const currentHp = context.getTokenResource(targetTokenId, 'hitPointsCurrent') || 0;
    const damageRoll = rollDamage('8d6'); // Simulate damage roll
    const newHp = Math.max(0, currentHp - damageRoll);
    
    operations.push(...context.setTokenResource(targetTokenId, 'hitPointsCurrent', newHp));
    
    // Sync current HP back to character document if needed
    const token = context.gameState.currentEncounter?.tokens?.find(t => t.id === targetTokenId);
    if (token?.characterId) {
      operations.push(...context.setCharacterResource(token.characterId, 'dnd5e-2024', 'hitPointsCurrent', newHp));
    }
  }
  
  // 4. Add visual effects (not stored, just triggered)
  const effects = [{
    type: 'explosion',
    position: request.parameters.targetPoint,
    radius: 20, // 20-foot radius for Fireball
    color: 'orange'
  }];
  
  return {
    success: true,
    stateOperations: operations,
    effects
  };
}

const result = await executeSpellCasting(request, context);
if (result.success) {
  await gameStateStore.updateGameState(result.stateOperations);
  
  // Trigger visual effects
  socketStore.emit('game:effects', { effects: result.effects });
}
```

## Implementation Plan

### Phase 1: Core Architecture (Week 1)
1. **Implement multi-handler ActionHandler interface**
   - Create ActionHandler interface with optional validate/execute methods
   - Define result types (ValidationResult, ActionExecutionResult)
   - Implement handler registration system with priority ordering

2. **Create ActionContext class**
   - Generic, game-agnostic state access methods
   - Resource tracking capabilities
   - State query and modification helpers

3. **Update GM Action Handler**
   - Multi-handler processing pipeline (validation → approval → execution)
   - Priority-based execution ordering
   - Simplified approval system (ANY requires approval)

### Phase 2: Resource Management System (Week 2)
1. **Extend game state with plugin storage**
   - Add pluginState section to ServerGameStateWithVirtuals
   - Implement scoped storage (turn/encounter/session)
   - State lifecycle management with automatic resets

2. **Unified resource access system**
   - Implement ActionContext resource methods
   - Priority-based resource lookup (plugin state → token → character)
   - Cross-storage synchronization patterns

3. **Resource lifecycle automation**
   - Turn-scoped resource reset on turn advancement
   - Encounter-scoped resource reset on encounter end
   - Session-scoped resource reset on long rest

### Phase 3: Plugin Integration (Week 2-3)
1. **Plugin action handler interface**
   - Standard interface for plugins to implement
   - Registration helpers for plugin actions
   - Context extension patterns

2. **D&D 5e reference implementation**
   - Spell casting action with multi-storage resource validation
   - Movement tracking with speed limits and turn-based usage
   - Action economy enforcement across all action types
   - Feature usage tracking with proper persistence

### Phase 4: Migration and Testing (Week 3-4)
1. **Convert existing core actions to multi-handler system**
   - Migrate move-token, end-turn, etc. to ActionHandler interface
   - Remove redundant requiresApproval/autoApprove logic
   - Replace with simplified requiresManualApproval system

2. **Comprehensive testing**
   - Unit tests for multi-handler execution
   - Integration tests for core + plugin validation flows
   - Priority ordering and approval aggregation testing
   - Performance testing for multiple handler execution

## Benefits

### For Plugin Developers
- **Symmetric registration**: Plugins use same registration API as core actions
- **Action enhancement**: Can extend core actions with game-specific validation and state tracking
- **Custom actions**: Can create entirely new action types with full system integration
- **Priority control**: Can influence execution order when needed
- **Clean interfaces**: Simple ActionHandler interface with optional methods

### For Core Application
- **Simple architecture**: Single registration system, uniform execution pipeline
- **No circular dependencies**: Core never references plugin code directly
- **Extensible by design**: Core actions can be enhanced without modification
- **Fail-fast validation**: Early termination prevents invalid state changes
- **Maintainable**: Clear separation between core infrastructure and game logic

### For Users
- **Rich gameplay**: Game-specific actions like spell casting, feature usage
- **Rule enforcement**: Automatic validation of game system rules
- **Better UX**: Clear feedback on resource costs and limitations
- **Visual effects**: Rich feedback for complex actions

## Technical Considerations

### Performance
- State operations are batched and applied atomically
- Resource lookups use priority-based caching (plugin state first)
- Plugin state is namespaced to prevent conflicts
- Lazy loading of plugin contexts to minimize overhead

### Security
- Plugin actions cannot bypass core validation
- State modifications go through same JSON patch system
- Resource costs are validated before application
- Cross-storage synchronization prevents data corruption

### Extensibility
- Action registration is dynamic, supporting hot-loading of plugins
- Context extension pattern allows unlimited customization
- Layered resource storage supports any game system
- Effect system supports rich visual and audio feedback

### Resource Synchronization Patterns

The system handles several common synchronization scenarios:

#### Current Hit Points Sync
- **Character Document**: Authoritative maximum and current HP
- **Token**: Display current HP for visual feedback
- **Synchronization**: HP changes update both locations atomically

#### Spell Slot Management
- **Character Document**: Total daily spell slots and current usage
- **Plugin State**: Turn-based spell casting tracking
- **Synchronization**: Spell casting updates both character slots and turn state

#### Condition Tracking
- **Token**: Visible conditions for UI display
- **Plugin State**: Mechanical effects and durations
- **Synchronization**: Condition changes update both visual and mechanical state

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

This multi-handler architecture provides a clean, symmetric system for extending VTT actions with game-specific logic. The approach eliminates the complexity of separate core and plugin registration systems while maintaining clear separation of concerns.

By allowing both core and plugins to register handlers for the same action type, we enable rich gameplay mechanics like D&D 5e movement validation and spell casting while keeping the core application game-agnostic. The simplified approval system and priority-based execution ensure predictable, secure behavior across all action types.