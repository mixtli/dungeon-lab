# Plugin-Aware Action System Implementation Plan

**Status:** Phase 1 Complete ✅, Phase 2.1 Complete ✅, Phase 2.2 Complete ✅  
**Created:** 2025-01-18  
**Updated:** 2025-01-19 (Phase 2.2 restructured for core VTT focus)
**Author:** Claude Code  
**Project Type:** Greenfield Implementation (No Backward Compatibility Required)

## Executive Summary

This implementation plan details the complete replacement of the current action system with a plugin-aware multi-handler architecture. Since this is a greenfield project, we can optimize for the best long-term architecture without compatibility constraints.

**Phase 1 has been successfully completed with full multi-handler system operational and tested.**

**Phase 2.1 has been successfully completed with universal document state management and type-safe schema implemented:**
- All document types now support plugin-extensible state management with type-safe standard fields
- z.object().catchall(z.any()) schema provides type-safe access to state.turnState, state.sessionState, etc.
- 614 existing documents successfully migrated to include standard state structure
- Complete lifecycle reset utility system implemented and ready for integration
- zod-mongoose compatibility resolved - server starts without errors

### Timeline Overview
- **Total Duration:** 5-6 weeks (reduced due to Immer simplification)
- **Parallel Development:** Document state extension and core infrastructure can be developed simultaneously
- **Breaking Changes:** Acceptable and encouraged for optimal design

### Key Milestones
1. **~~Week 1-2:~~ ✅ COMPLETED:** New multi-handler system with Immer integration operational
2. **Week 2-3:** Document state extension and core lifecycle integration complete
3. **Week 3-4:** Plugin integration framework ready
4. **Week 4:** Complete migration from old system
5. **Week 4-5:** Testing, optimization, and documentation complete
6. **Week 5-6:** Token bar system implementation (UI enhancement)

### Phase 1 Completion Status ✅
**Completed:** 2025-01-19  
**Result:** Full replacement of legacy action system with multi-handler architecture
- All core handlers converted and operational
- Immer integration providing automatic JSON patch generation
- System integrated into app startup and fully functional
- Comprehensive test suite (16 tests passing)

## Phase 1: New Action System Foundation ✅ COMPLETED

### Overview
Replace the existing action system entirely with the new multi-handler architecture. This phase establishes the core infrastructure that all subsequent phases depend on.

**Status:** ✅ **COMPLETED 2025-01-19**

### Tasks

#### 1.1 Replace Action Configuration System
**Duration:** 2 days  
**Dependencies:** None

**Current State:**
- `action-config-registry.mts` with confusing `requiresApproval`/`autoApprove` pattern
- Single handler per action type
- Limited extensibility

**Target State:**
- New `ActionHandler` interface supporting multiple handlers per action
- Simplified approval system with `requiresManualApproval` boolean
- Priority-based execution ordering

**Implementation Steps:**
1. Create new `ActionHandler` interface:
   ```typescript
   export interface ActionHandler {
     pluginId?: string;
     priority?: number;
     requiresManualApproval?: boolean;
     gmOnly?: boolean;
     validate?: (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => Promise<ValidationResult>;
     execute?: (request: GameActionRequest, draft: ServerGameStateWithVirtuals) => Promise<void>;
     approvalMessage?: (request: GameActionRequest) => string;
   }
   ```

2. Create new `multi-handler-registry.mts`:
   ```typescript
   const actionHandlers: Record<string, ActionHandler[]> = {};
   
   export function registerAction(actionType: string, handler: ActionHandler): void {
     if (!actionHandlers[actionType]) {
       actionHandlers[actionType] = [];
     }
     actionHandlers[actionType].push(handler);
     actionHandlers[actionType].sort((a, b) => (a.priority || 0) - (b.priority || 0));
   }
   ```

3. Define result types:
   ```typescript
   export interface ValidationResult {
     valid: boolean;
     error?: { code: string; message: string };
     resourceCosts?: ResourceCost[];
   }
   
   export interface ActionExecutionResult {
     success: boolean;
     error?: { code: string; message: string };
     effects?: GameEffect[];
   }
   ```

**Deliverables:**
- [x] New ActionHandler interface ✅
- [x] Multi-handler registration system ✅
- [x] Result type definitions ✅  
- [x] Unit tests for registration and priority ordering ✅

**Implementation Results:**
- ✅ Created `action-handler.interface.mts` with complete ActionHandler interface
- ✅ Created `multi-handler-registry.mts` with priority-based registration
- ✅ All result types defined and integrated
- ✅ Completely deleted old `action-config-registry.mts`
- ✅ 10 comprehensive unit tests covering all registration scenarios

#### 1.2 Add Immer Integration
**Duration:** 1 day  
**Dependencies:** 1.1 (interface definitions)

**Target State:**
Immer integration for automatic JSON patch generation from direct state mutations.

**Implementation Steps:**
1. Add Immer dependency to project:
   ```bash
   npm install immer
   npm install --save-dev @types/immer
   ```

2. Create Immer integration utilities in `packages/web/src/services/immer-utils.mts`:
   ```typescript
   import { produce, enablePatches } from 'immer';
   import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/schemas/index.mjs';
   import type { JsonPatchOperation } from '@dungeon-lab/shared/types/index.mjs';
   
   // Enable patch generation
   enablePatches();
   
   export function produceGameStateChanges(
     currentState: ServerGameStateWithVirtuals,
     mutator: (draft: ServerGameStateWithVirtuals) => void | Promise<void>
   ): [ServerGameStateWithVirtuals, JsonPatchOperation[]] {
     return produce(currentState, mutator, (patches) => patches);
   }
   ```

3. Add type-safe helper functions for common document operations:
   ```typescript
   export function updateDocumentState<T>(
     draft: ServerGameStateWithVirtuals,
     documentId: string,
     path: string,
     value: T
   ): void {
     if (!draft.documents[documentId]) {
       throw new Error(`Document ${documentId} not found`);
     }
     
     // Direct mutation - Immer handles immutability
     const pathParts = path.split('.');
     let target = draft.documents[documentId].state;
     
     for (let i = 0; i < pathParts.length - 1; i++) {
       if (!(pathParts[i] in target)) {
         target[pathParts[i]] = {};
       }
       target = target[pathParts[i]] as Record<string, unknown>;
     }
     
     target[pathParts[pathParts.length - 1]] = value;
   }
   ```

4. Create validation utilities for state access:
   ```typescript
   export function getDocumentState<T>(
     gameState: ServerGameStateWithVirtuals,
     documentId: string,
     path: string
   ): T | undefined {
     const document = gameState.documents[documentId];
     if (!document) return undefined;
     
     const pathParts = path.split('.');
     let value: any = document.state;
     
     for (const part of pathParts) {
       if (value && typeof value === 'object' && part in value) {
         value = value[part];
       } else {
         return undefined;
       }
     }
     
     return value as T;
   }
   ```

**Deliverables:**
- [x] Immer dependency added to project ✅
- [x] Immer integration utilities ✅
- [x] Type-safe helper functions for document mutations ✅
- [x] State access validation utilities ✅
- [x] Unit tests for Immer integration ✅

**Implementation Results:**
- ✅ Immer successfully installed and configured in web package
- ✅ Created `immer-utils.mts` with `produceGameStateChanges()` function
- ✅ Implemented `updateDocumentState()` and `getDocumentState()` helpers
- ✅ Created comprehensive test suite validating Immer patch generation
- ✅ Documented async operation patterns and limitations

#### 1.3 Replace GM Action Handler Service
**Duration:** 3 days  
**Dependencies:** 1.1, 1.2

**Current State:**
- Single handler execution
- Confusing approval logic
- Direct state updates from handlers (recently fixed)

**Target State:**
- Multi-handler processing pipeline
- Simplified approval aggregation ("ANY requires approval")
- Centralized state operation collection and application

**Implementation Steps:**
1. Update `gm-action-handler.service.mts` with new Immer-based execution flow:
   ```typescript
   import { produceGameStateChanges } from '../immer-utils.mjs';
   
   async function handleAction(request: GameActionRequest) {
     const handlers = actionHandlers[request.action] || [];
     const currentGameState = gameStateStore.getGameState();
     
     // 1. Run all validations (fail-fast)
     for (const handler of handlers) {
       if (handler.validate) {
         const result = await handler.validate(request, currentGameState);
         if (!result.valid) return sendError(result.error);
       }
     }
     
     // 2. Check if any handler requires manual approval
     const requiresApproval = handlers.some(h => h.requiresManualApproval);
     if (requiresApproval) return sendApprovalRequest(request);
     
     // 3. Execute all handlers with Immer - automatic patch generation
     try {
       const [newState, patches] = await produceGameStateChanges(
         currentGameState,
         async (draft) => {
           for (const handler of handlers) {
             if (handler.execute) {
               await handler.execute(request, draft);
             }
           }
         }
       );
       
       // 4. Apply all changes atomically via generated patches
       await gameStateStore.updateGameState(patches);
       
     } catch (error) {
       console.error('[GMActionHandler] Handler execution failed:', error);
       return sendError({
         code: 'HANDLER_EXECUTION_FAILED',
         message: error instanceof Error ? error.message : 'Handler execution failed'
       });
     }
   }
   ```

2. Remove old approval system entirely
3. Implement new approval aggregation logic
4. Add comprehensive error handling and logging

**State Update Pattern:**
The system uses an **"Immer draft mutations, automatic patches"** pattern that ensures atomic state updates:

1. **Handlers Mutate Draft**: Action handlers directly mutate the draft state passed to them. Immer automatically tracks these mutations and generates JSON patches.

2. **Automatic Patch Generation**: Immer's `produce()` function wraps all handler execution and automatically generates the exact JSON patch operations needed to transform the original state to the new state.

3. **Benefits of This Approach**:
   - **Atomic Updates**: All changes happen together or not at all within the `produce()` call
   - **Automatic Patches**: No manual JSON patch creation required
   - **Immutable Safety**: Draft mutations don't affect original state
   - **Easy Testing**: Handlers can be tested by examining the draft state after execution
   - **Developer Experience**: Natural mutable syntax with immutable guarantees
   - **Consistency**: Same pattern used throughout the application

**Deliverables:**
- [x] Updated GM action handler service with Immer integration ✅
- [x] Multi-handler execution pipeline ✅
- [x] New approval system ✅
- [x] Immer-based state update pattern implementation ✅
- [x] Integration tests ✅

**Implementation Results:**
- ✅ Completely rewrote `gm-action-handler.service.mts` with Immer integration
- ✅ Implemented three-phase execution: validation → approval check → Immer-wrapped execution
- ✅ Replaced confusing `requiresApproval`/`autoApprove` with simple `requiresManualApproval`
- ✅ Added comprehensive error handling and logging
- ✅ Created 6 integration tests covering multi-handler workflows and approval logic

#### 1.4 Plugin Registration Lifecycle Implementation
**Duration:** 1 day  
**Dependencies:** 1.1, 1.2

**Target State:**
Complete plugin registration lifecycle with proper timing and cleanup.

**Implementation Steps:**
1. Create core handler registration during app startup:
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
     
     // ... other core handlers
   }
   ```

2. Implement PluginContext interface:
   ```typescript
   export interface PluginContext {
     // Registration methods exposed to plugins
     registerAction(actionType: string, handler: Omit<ActionHandler, 'pluginId'>): void;
     unregisterAction(actionType: string, pluginId: string): void;
     unregisterPluginActions(pluginId: string): void;
     
     // Access to game state and utilities (read-only for registration)
     getGameState(): ServerGameStateWithVirtuals;
     
     // Utility functions for common operations (no ActionContext needed)
     getDocumentState<T>(documentId: string, path: string): T | undefined;
     getDocumentData<T>(documentId: string, path: string): T | undefined;
   }
   ```

3. Add plugin lifecycle management:
   - Plugin loading: Register handlers via PluginContext
   - Plugin unloading: Clean up all handlers for pluginId
   - Dynamic registration/unregistration during gameplay

4. Implement registration timing:
   - App Startup: Core handlers registered first
   - Campaign Load: Active plugins loaded and register handlers
   - Plugin Enable/Disable: Dynamic registration/unregistration
   - Plugin Unload: Cleanup of all plugin handlers

**Deliverables:**
- [x] Core handler registration system ✅
- [x] PluginContext interface implementation ✅
- [x] Plugin lifecycle management ✅
- [x] Registration timing coordination ✅

**Implementation Results:**
- ✅ Created `core-action-handlers.mts` with `initializeCoreActionHandlers()` function
- ✅ Extended existing PluginContext interface in `shared-ui` with registration methods
- ✅ Implemented `registerActionHandler()`, `unregisterActionHandler()`, and `unregisterAllActionHandlers()`
- ✅ **CRITICAL**: Integrated initialization into app startup sequence in `main.mts`
- ✅ All 8 core handlers successfully converted and registered

### Phase 1 Success Criteria
- [x] All new interfaces implemented and tested ✅
- [x] Immer integration provides automatic patch generation ✅
- [x] GM action handler processes multiple handlers correctly with Immer ✅
- [x] Approval system simplified and functional ✅
- [x] All tests passing ✅

### ✅ PHASE 1 COMPLETED SUCCESSFULLY
**Completion Date:** 2025-01-19  
**Test Results:** 16/16 tests passing  
**Architecture Status:** Fully operational multi-handler system with Immer integration  
**Integration Status:** Successfully integrated into app startup sequence  

**Key Achievements:**
- 100% greenfield implementation with no legacy code remaining
- Automatic JSON patch generation eliminates manual patch creation
- Priority-based execution enables clean core/plugin separation  
- Simplified approval system improves developer experience
- Comprehensive test coverage ensures system reliability

## Phase 2: Document State Extension (Week 2-3)

**Status:** Phase 2.1 Complete ✅, Phase 2.2 In Progress 🔄

### Overview
Extend ALL document types with flexible state field and implement core VTT lifecycle management system. This phase provides plugin-extensible state management with type-safe access to standard lifecycle fields, while solving key problems like token recreation and data persistence across all document types.

### Tasks

#### 2.1 Add State Field to All Documents via BaseDocumentSchema
**Duration:** 2 days  
**Dependencies:** None (can start immediately)

**Target State:**
All document types (characters, actors, items, etc.) extended with state field for current transient data via baseDocumentSchema.

**Implementation Steps:**
1. Update base document schema with flexible state field:
   ```typescript
   // In packages/shared/src/schemas/document.schema.mts
   const baseDocumentFields = {
     // ... existing fields
     pluginData: z.record(z.string(), z.unknown()).default({}),
     state: z.record(z.string(), z.unknown()).default({}) // NEW FLEXIBLE STATE FIELD - plugins define structure
   }
   ```

2. Create plugin-extensible TypeScript interfaces for common state patterns:
   ```typescript
   // In packages/shared/src/types/document-state.mts - EXAMPLE interfaces only
   
   // Common lifecycle state patterns (plugins can extend or ignore)
   interface DocumentTurnState {
     movementUsed?: number;
     actionsUsed?: string[];
     bonusActionUsed?: boolean;
     reactionUsed?: boolean;
     [key: string]: unknown; // Plugin extensible
   }

   interface DocumentSessionState {
     spellSlotsUsed?: Record<string, number>;
     classFeatureUses?: Record<string, number>;
     hitDiceUsed?: number;
     [key: string]: unknown; // Plugin extensible
   }

   interface DocumentEncounterState {
     conditions?: string[];
     temporaryEffects?: unknown[];
     concentrationSpell?: string;
     [key: string]: unknown; // Plugin extensible
   }

   interface DocumentPersistentState {
     currentHitPoints?: number;
     temporaryHitPoints?: number;
     inspiration?: boolean;
     [key: string]: unknown; // Plugin extensible
   }

   // EXAMPLE nested state structure - plugins can use any structure they want
   interface ExampleDocumentState {
     turnState?: DocumentTurnState;
     sessionState?: DocumentSessionState;
     encounterState?: DocumentEncounterState;
     persistentState?: DocumentPersistentState;
     [key: string]: unknown; // Plugins can add any structure
   }

   // Actual BaseDocument uses flexible Record type
   interface BaseDocument {
     // ... existing properties
     pluginData: Record<string, unknown>;
     state: Record<string, unknown>; // FLEXIBLE - plugins define their own structure
   }
   ```

3. Initialize empty state object for all existing documents (database migration)
4. Update document validation and serialization for flexible state field

**Deliverables:**
- [x] Updated baseDocumentSchema with flexible state field (z.record(z.unknown())) ✅
- [x] Plugin-extensible TypeScript interfaces for common state patterns (examples only) ✅
- [x] Database migration script to add empty state object to all documents ✅
- [x] Document validation updates for flexible state field ✅
- [x] Serialization/deserialization support for all document types ✅

**Implementation Results:**
- ✅ Implemented `z.object().catchall(z.any())` schema providing type-safe access to standard fields
- ✅ Created `packages/shared/src/types/document-state.mts` with generic lifecycle concepts only
- ✅ Removed all D&D-specific content from shared package (kept plugin-extensible)
- ✅ Successfully resolved zod-mongoose compatibility with z.any() approach
- ✅ Created and executed migration script adding standard state structure to 614 documents
- ✅ Updated updateDocumentSchema to support structured state field in API operations
- ✅ Server starts without errors, all TypeScript builds pass, schema validation working

#### 2.2 Implement Core VTT Lifecycle Integration  
**Duration:** 3 days  
**Dependencies:** 2.1

**Target State:**
Integration of document state lifecycle resets with core VTT systems (turn manager, encounter end). Game-system specific lifecycle events (like long rest) are deferred to plugin implementation phase.

**Implementation Steps:**
1. Create simplified lifecycle reset utility functions for common patterns:
   ```typescript
   // Generic utility for resetting any state section with single patch
   function resetStateSection(
     documentId: string, 
     sectionPath: string, 
     defaultValue: unknown
   ): JsonPatchOperation[] {
     return [{
       op: 'replace',
       path: `/documents/${documentId}/state/${sectionPath}`,
       value: defaultValue
     }];
   }

   // Common reset patterns that plugins can use (EXAMPLES - not required)
   function resetTurnState(characterId: string, defaultTurnState = {}): JsonPatchOperation[] {
     return resetStateSection(characterId, 'turnState', defaultTurnState);
   }
   
   function resetSessionState(characterId: string, defaultSessionState = {}): JsonPatchOperation[] {
     return resetStateSection(characterId, 'sessionState', defaultSessionState);
   }

   function resetEncounterState(characterId: string, defaultEncounterState = {}): JsonPatchOperation[] {
     return resetStateSection(characterId, 'encounterState', defaultEncounterState);
   }

   // Plugin-specific reset function - plugins define their own state structure
   function resetPluginState(
     documentId: string, 
     pluginId: string, 
     stateDefinition: Record<string, unknown>
   ): JsonPatchOperation[] {
     const patches: JsonPatchOperation[] = [];
     
     // Reset each section defined by the plugin
     for (const [sectionName, defaultValue] of Object.entries(stateDefinition)) {
       patches.push({
         op: 'replace',
         path: `/documents/${documentId}/state/${sectionName}`,
         value: defaultValue
       });
     }
     
     return patches;
   }
   ```

2. Integrate with game lifecycle events:
   - Turn manager calls plugin-defined reset functions when turn advances
   - Long rest handler calls plugin-defined reset functions 
   - Encounter end calls plugin-defined reset functions
   - Each plugin registers their state reset requirements

3. Create plugin registration system for lifecycle state management:
   ```typescript
   // Plugin lifecycle state registration
   interface PluginStateLifecycle {
     pluginId: string;
     turnReset?: Record<string, unknown>; // State sections to reset on turn
     sessionReset?: Record<string, unknown>; // State sections to reset on long rest
     encounterReset?: Record<string, unknown>; // State sections to reset on encounter end
   }
   
   // Registry for plugin state lifecycle management
   function registerPluginStateLifecycle(lifecycle: PluginStateLifecycle): void;
   function getPluginStateResets(event: 'turn' | 'session' | 'encounter'): PluginStateLifecycle[];
   ```

**Deliverables:**
- [x] Generic single-patch state reset utility functions ✅
- [x] Plugin state lifecycle registration system ✅
- [x] Turn manager integration with plugin-defined resets ✅
- [x] Encounter end integration with plugin-defined resets ✅
- [x] Utility functions for multi-document state resets across all plugins ✅

**Deferred to Phase 3 (Plugin Implementation):**
- Long rest integration (D&D-specific, belongs in plugin)

**Implementation Results:**
- ✅ Created `packages/shared/src/utils/document-state-lifecycle.mts` with complete utility functions
- ✅ Implemented `resetStateSection()` for single-patch atomic state resets
- ✅ Created plugin registration system with `registerPluginStateLifecycle()` and `unregisterPluginStateLifecycle()`
- ✅ Implemented `resetPluginState()` for multi-section plugin state resets
- ✅ Created `generateLifecycleResetPatches()` for multi-document lifecycle event handling
- ✅ Added comprehensive logging and debugging support
- ✅ Exported utilities through shared package index, all builds pass
- ✅ **Integrated turn manager with lifecycle resets in `turnManagerService.nextTurn()`**
- ✅ **Integrated encounter end with lifecycle resets in `stopEncounterActionHandler`**
- ✅ **Simplified `endTurnActionHandler` to delegate to turn manager service**
- ✅ **Added JSON patch integration for atomic lifecycle reset operations**
- ✅ **Verified working integration via comprehensive test suite**


### Phase 2 Success Criteria
- [x] All document types have type-safe state field with standard lifecycle sections ✅
- [x] Simple lifecycle reset functions working ✅
- [x] Turn manager integrates with document state resets ✅
- [x] Encounter end integrates with document state resets ✅
- [x] All document state tests passing ✅

## Phase 3: Plugin Integration Framework (Week 3-4)

### Overview
Create the plugin integration framework that allows plugins to register action handlers and extend the system. This phase also includes the D&D 5e reference implementation.

### Tasks

#### 3.1 Plugin Action Handler Interface
**Duration:** 2 days  
**Dependencies:** Phase 1 (ActionHandler interface)

**Target State:**
Standard interface for plugins to implement action handlers with registration helpers.

**Implementation Steps:**
1. Create plugin action handler base class:
   ```typescript
   export abstract class PluginActionHandler {
     abstract pluginId: string;
     abstract registerActions(): void;
     
     protected registerAction(actionType: string, handler: Omit<ActionHandler, 'pluginId'>): void {
       registerAction(actionType, { ...handler, pluginId: this.pluginId });
     }
   }
   ```

2. Create plugin utility functions (no context classes needed):
   ```typescript
   // Game-specific utility functions for plugins
   export function getCharacterResource<T>(
     gameState: ServerGameStateWithVirtuals,
     characterId: string,
     resourcePath: string
   ): T | undefined {
     return getDocumentState(gameState, characterId, resourcePath);
   }
   
   export function updateCharacterResource<T>(
     draft: ServerGameStateWithVirtuals,
     characterId: string,
     resourcePath: string,
     value: T
   ): void {
     updateDocumentState(draft, characterId, resourcePath, value);
   }
   ```

3. Add plugin registration lifecycle hooks
4. Create registration validation system

**Deliverables:**
- [ ] PluginActionHandler base class
- [ ] Plugin utility functions (replacing context pattern)
- [ ] Registration helpers
- [ ] Validation system

#### 3.2 D&D 5e Reference Implementation
**Duration:** 3 days  
**Dependencies:** 3.1, Phase 2 (character state extension)

**Target State:**
Complete D&D 5e plugin implementation using simplified character-based storage, including D&D-specific lifecycle events like long rest.

**Implementation Steps:**
1. Create D&D 5e utility functions:
   ```typescript
   export function canCastSpell(
     gameState: ServerGameStateWithVirtuals,
     characterId: string,
     spellLevel: number
   ): boolean {
     const maxSlots = getDocumentData(gameState, characterId, `spellSlots.level${spellLevel}.total`) || 0;
     const usedSlots = getDocumentState(gameState, characterId, `spellSlotsUsed.level${spellLevel}`) || 0;
     return maxSlots > usedSlots;
   }
   
   export function getMovementRemaining(
     gameState: ServerGameStateWithVirtuals,
     characterId: string
   ): number {
     const baseSpeed = getDocumentData(gameState, characterId, 'speed') || 30;
     const movementUsed = getDocumentState(gameState, characterId, 'movementUsed') || 0;
     return baseSpeed - movementUsed;
   }
   
   export function hasCondition(
     gameState: ServerGameStateWithVirtuals,
     characterId: string,
     condition: string
   ): boolean {
     const conditions = getDocumentState<string[]>(gameState, characterId, 'conditions') || [];
     return conditions.includes(condition);
   }
   
   export function useSpellSlot(
     draft: ServerGameStateWithVirtuals,
     characterId: string,
     spellLevel: number
   ): void {
     const currentUsed = getDocumentState<number>(draft, characterId, `spellSlotsUsed.level${spellLevel}`) || 0;
     updateDocumentState(draft, characterId, `spellSlotsUsed.level${spellLevel}`, currentUsed + 1);
   }
   ```

2. Implement core D&D 5e actions using document.state:
   - Enhanced movement validation using document.pluginData.speed and document.state.turnState.movementUsed
   - Spell casting using document.pluginData.spellSlots and document.state.sessionState.spellSlotsUsed
   - Action economy using document.state.turnState.actionsUsed
   - Feature usage using document.state.sessionState.classFeatureUses
   - **Long rest integration** using document.state.sessionState resets

3. Create example plugin actions:
   ```typescript
   // Multi-handler: core + plugin for move-token
   registerAction('move-token', {
     pluginId: 'dnd5e-2024',
     priority: 100,
     validate: (request, gameState) => {
       const { characterId, distance } = request.parameters;
       const movementRemaining = getMovementRemaining(gameState, characterId);
       
       if (distance > movementRemaining) {
         return {
           valid: false,
           error: { code: 'INSUFFICIENT_MOVEMENT', message: 'Not enough movement remaining' }
         };
       }
       
       return { valid: true };
     },
     execute: async (request, draft) => {
       const { characterId, distance } = request.parameters;
       const currentUsed = getDocumentState<number>(draft, characterId, 'movementUsed') || 0;
       
       // Direct mutation - Immer handles immutability
       draft.documents[characterId].state.movementUsed = currentUsed + distance;
     }
   });
   
   // Pure plugin action: spell casting
   registerAction('dnd5e-2024:cast-spell', {
     pluginId: 'dnd5e-2024',
     validate: (request, gameState) => {
       const { characterId, spellLevel } = request.parameters;
       
       if (!canCastSpell(gameState, characterId, spellLevel)) {
         return {
           valid: false,
           error: { code: 'NO_SPELL_SLOTS', message: 'No spell slots available' }
         };
       }
       
       return { valid: true };
     },
     execute: async (request, draft) => {
       const { characterId, spellLevel } = request.parameters;
       
       // Direct mutation using utility function
       useSpellSlot(draft, characterId, spellLevel);
     }
   });
   ```

**Deliverables:**
- [ ] D&D 5e utility functions for document operations
- [ ] Enhanced movement validation using direct state access
- [ ] Spell casting using direct document mutations
- [ ] Action economy using document.state.turnState.actionsUsed
- [ ] **Long rest handler** using document.state.sessionState resets
- [ ] Integration tests for all actions

#### 3.3 Plugin Loading and Lifecycle
**Duration:** 2 days  
**Dependencies:** 3.1

**Target State:**
Dynamic plugin loading with proper lifecycle management.

**Implementation Steps:**
1. Create plugin loader that registers action handlers
2. Implement plugin unloading with handler cleanup
3. Add plugin dependency management
4. Create plugin health checking system

**Deliverables:**
- [ ] Plugin loader system
- [ ] Lifecycle management
- [ ] Dependency resolution
- [ ] Health checking

### Phase 3 Success Criteria
- [ ] Plugin integration framework complete
- [ ] D&D 5e reference implementation working
- [ ] All example actions functional
- [ ] Plugin loading/unloading working
- [ ] Integration tests passing

## Phase 4: Complete System Migration (Week 4-5)

### Overview
Replace all existing action handlers with the new system and remove legacy code entirely. Since this is greenfield, we can make breaking changes freely.

### Tasks

#### 4.1 Convert All Core Action Handlers
**Duration:** 3 days  
**Dependencies:** Phase 1, Phase 2

**Target State:**
All existing action handlers converted to new ActionHandler format.

**Current Handlers to Convert:**
- `move-token.handler.mts` ✅ (partially done - already returns operations)
- `add-document.handler.mts` ✅ (partially done - already returns operations)  
- `remove-token.handler.mts` ✅ (partially done - already returns operations)
- `update-document.handler.mts` ✅ (partially done - already returns operations)
- `end-turn.handler.mts` (needs conversion)
- `roll-initiative.handler.mts` (needs conversion)
- `start-encounter.handler.mts` (needs conversion)
- `stop-encounter.handler.mts` (needs conversion)

**Implementation Steps:**
1. Convert each handler to ActionHandler format:
   ```typescript
   // OLD FORMAT (current)
   export async function moveTokenHandler(request: GameActionRequest): Promise<ActionHandlerResult>
   
   // NEW FORMAT (target)
   const moveTokenHandler: ActionHandler = {
     priority: 0, // Core handler
     validate: async (request, gameState) => { /* validation */ },
     execute: async (request, draft) => { 
       // Direct mutations - Immer handles immutability
       draft.documents[request.characterId].state.movementUsed += request.distance;
     }
   };
   
   registerAction('move-token', moveTokenHandler);
   ```

2. Update registration calls to use new system
3. Remove old action-config-registry entirely
4. Update all imports and references

**Deliverables:**
- [ ] All handlers converted to ActionHandler format
- [ ] Old action-config-registry removed
- [ ] All registrations updated
- [ ] Import references updated

#### 4.2 Remove Legacy Approval System
**Duration:** 1 day  
**Dependencies:** 4.1

**Target State:**
Complete removal of old approval system with simplified replacement.

**Legacy Code to Remove:**
- `requiresApproval` and `autoApprove` properties
- Complex approval logic in GM action handler
- Related type definitions and interfaces

**Implementation Steps:**
1. Remove all `requiresApproval`/`autoApprove` references
2. Replace with simple `requiresManualApproval` boolean
3. Update approval aggregation logic
4. Clean up related types and interfaces

**Deliverables:**
- [ ] Legacy approval system removed
- [ ] New approval system implemented
- [ ] All references updated
- [ ] Tests updated

#### 4.3 Comprehensive Error Handling
**Duration:** 2 days  
**Dependencies:** 4.1, 4.2

**Target State:**
Robust error handling throughout the new action system.

**Implementation Steps:**
1. Define comprehensive error codes and messages
2. Implement error context and stack traces
3. Add validation error aggregation
4. Create user-friendly error reporting
5. Add logging and debugging capabilities

**Deliverables:**
- [ ] Comprehensive error handling
- [ ] Error code definitions
- [ ] User-friendly error messages
- [ ] Logging and debugging tools

### Phase 4 Success Criteria
- [ ] All action handlers use new system
- [ ] Legacy code completely removed
- [ ] Error handling comprehensive
- [ ] System fully operational
- [ ] All functionality tests passing

## Phase 5: Testing & Optimization (Week 4-5)

### Overview
Comprehensive testing, performance optimization, and documentation to ensure the system is production-ready.

### Tasks

#### 5.1 Comprehensive Testing Suite
**Duration:** 3 days  
**Dependencies:** Phase 4

**Target State:**
Complete test coverage for all system components.

**Test Categories:**
1. **Unit Tests:**
   - ActionHandler registration and execution
   - Immer integration and patch generation
   - Document state lifecycle management
   - Token bar configuration and display
   - Direct state mutation utilities

2. **Integration Tests:**
   - Multi-handler workflows with Immer
   - Core + plugin handler combinations
   - Document resource scenarios with direct mutations
   - Error handling flows
   - Patch generation accuracy

3. **End-to-End Tests:**
   - Complete action workflows with Immer
   - Plugin loading/unloading
   - Document state persistence across encounters
   - Token recreation scenarios
   - State isolation and immutability guarantees

**Implementation Steps:**
1. Create unit test suite for each component:
   ```typescript
   // Test Immer integration
   describe('Immer Integration', () => {
     test('should generate correct patches for document state changes', async () => {
       const [newState, patches] = await produceGameStateChanges(
         initialState,
         (draft) => {
           draft.documents.char1.state.hitPoints = 50;
         }
       );
       
       expect(patches).toEqual([
         { op: 'replace', path: '/documents/char1/state/hitPoints', value: 50 }
       ]);
     });
   });
   ```

2. Build integration test scenarios for multi-handler workflows
3. Implement E2E test workflows with state mutations
4. Add performance benchmarks for Immer operations
5. Create test data fixtures

**Deliverables:**
- [ ] Complete unit test suite with Immer testing
- [ ] Integration test scenarios for multi-handler workflows
- [ ] E2E test workflows with state mutation validation
- [ ] Performance benchmarks for Immer operations
- [ ] Test documentation

#### 5.2 Performance Optimization
**Duration:** 2 days  
**Dependencies:** 5.1

**Target State:**
Optimized performance for production use.

**Optimization Areas:**
1. **Handler Execution:**
   - Parallel validation where possible
   - Efficient priority sorting
   - Operation batching optimization

2. **Resource Access:**
   - Efficient document lookups
   - Optimized document data/state access
   - Memory usage optimization

3. **State Management:**
   - Efficient JSON patch generation
   - Minimized state update operations
   - Optimized serialization

**Deliverables:**
- [ ] Performance optimization implementation
- [ ] Benchmarking results
- [ ] Performance monitoring tools
- [ ] Optimization documentation

#### 5.3 Developer Documentation
**Duration:** 2 days  
**Dependencies:** 5.1, 5.2

**Target State:**
Complete documentation for developers using the system.

**Documentation Sections:**
1. **Architecture Overview:** How the multi-handler system works with Immer
2. **Plugin Development Guide:** How to create plugin action handlers with direct state mutations
3. **Document Resource Storage Guide:** How to use document-based resource storage (characters, actors, items)
4. **Immer Integration Guide:** How to use Immer for state mutations and patch generation
5. **API Reference:** Complete interface and method documentation for handlers and utilities
6. **Examples and Tutorials:** Step-by-step implementation examples with Immer
7. **Best Practices:** Recommended patterns and anti-patterns for state mutations

**Deliverables:**
- [ ] Architecture documentation with Immer integration
- [ ] Plugin development guide for direct state mutations
- [ ] Document resource storage guide
- [ ] Immer integration and usage guide
- [ ] Complete API reference for handlers and utilities
- [ ] Example implementations with Immer
- [ ] Best practices guide for state mutations

### Phase 5 Success Criteria
- [ ] Test coverage above 90%
- [ ] Performance targets met
- [ ] Complete developer documentation
- [ ] System ready for production use
- [ ] Knowledge transfer completed

## Phase 6: Token Bar System (Week 5-6)

### Overview
Implement visual token bar system that displays document resource values on map tokens. This phase builds on top of the fully tested and operational document state system to provide enhanced visual feedback for players and GMs.

### Tasks

#### 6.1 Token Bar Schema and Configuration
**Duration:** 1 day  
**Dependencies:** Phases 1-5 complete

**Target State:**
Token schema extended with flexible bar configuration system that points to document resource paths.

**Implementation Steps:**
1. Update token schema with bars configuration:
   ```typescript
   interface Token {
     // ... existing properties
     bars: {
       [barId: string]: {
         resourcePath: string;        // e.g., "state.persistentState.currentHitPoints"
         maxResourcePath: string;     // e.g., "pluginData.hitPointsMax"
         color: string;
         visible: boolean;
         position: 'top' | 'bottom' | 'left' | 'right';
       }
     }
   }
   ```

2. Create bar configuration validation and defaults
3. Add bar configuration to token creation workflow

**Deliverables:**
- [ ] Token bars schema and interface
- [ ] Bar configuration validation
- [ ] Default bar templates

#### 6.2 Bar Display Logic Implementation
**Duration:** 2 days  
**Dependencies:** 6.1

**Target State:**
Visual rendering system that reads document data and displays bars on tokens.

**Implementation Steps:**
1. Implement bar value calculation logic:
   - Read document.state and document.pluginData via resource paths
   - Calculate current/max values for bar display
   - Handle missing or invalid resource paths gracefully
   - Support percentage-based display

2. Create bar rendering components:
   - Visual bar display with current/max values
   - Color-coded bars based on percentage
   - Responsive sizing and positioning

3. Add real-time updates:
   - Update bars when document state changes
   - Efficient re-rendering for performance

**Deliverables:**
- [ ] Bar value calculation logic
- [ ] Bar rendering components
- [ ] Real-time update system
- [ ] Error handling for invalid paths

#### 6.3 Bar Configuration Templates and Helpers
**Duration:** 1 day  
**Dependencies:** 6.2

**Target State:**
Helper system for easy token bar setup with pre-configured templates.

**Implementation Steps:**
1. Create token creation helpers:
   - Automatic bar setup for common resources (HP, spell slots)
   - Template system for plugin-specific bar configurations
   - Easy bar addition/removal tools

2. Implement configuration templates:
   - D&D 5e common resources template
   - Generic RPG template
   - Custom configuration builder

**Deliverables:**
- [ ] Token creation helpers
- [ ] Bar configuration templates
- [ ] Configuration management tools

### Phase 6 Success Criteria
- [ ] Token bars display document resources correctly
- [ ] Token recreation preserves resource display
- [ ] Bar configuration is intuitive and flexible
- [ ] Real-time updates work efficiently
- [ ] Templates make setup easy for common use cases
- [ ] All token bar tests passing

## Technical Specifications

### Key Interfaces

#### ActionHandler Interface
```typescript
export interface ActionHandler {
  pluginId?: string;           // undefined = core handler
  priority?: number;           // Lower = runs first (core = 0, plugins = 100+)
  requiresManualApproval?: boolean;  // Default: false = auto-execute
  gmOnly?: boolean;           // Default: false = players can use
  validate?: (request: GameActionRequest, context: ActionContext) => Promise<ValidationResult>;
  execute?: (request: GameActionRequest, context: ActionContext) => Promise<ActionExecutionResult>;
  approvalMessage?: (request: GameActionRequest) => string;
}
```

#### Immer Integration Utilities
```typescript
// Core Immer integration
export function produceGameStateChanges(
  currentState: ServerGameStateWithVirtuals,
  mutator: (draft: ServerGameStateWithVirtuals) => void | Promise<void>
): [ServerGameStateWithVirtuals, JsonPatchOperation[]];

// Document state utilities
export function getDocumentState<T>(
  gameState: ServerGameStateWithVirtuals,
  documentId: string,
  path: string
): T | undefined;

export function updateDocumentState<T>(
  draft: ServerGameStateWithVirtuals,
  documentId: string,
  path: string,
  value: T
): void;

// Game-specific utilities
export function getCharacterResource<T>(
  gameState: ServerGameStateWithVirtuals,
  characterId: string,
  resourcePath: string
): T | undefined;

export function updateCharacterResource<T>(
  draft: ServerGameStateWithVirtuals,
  characterId: string,
  resourcePath: string,
  value: T
): void;
```

### Resource Storage Architecture

#### Storage Locations
1. **Document.pluginData** - Permanent document definition (max HP, spell slots, speed)
2. **Document.state** - Current transient state (current HP, movement used, actions taken)
3. **Token.bars** - Visual display configuration pointing to document data

#### Lifecycle Management
- **Turn-scoped**: Reset document.state fields when turn advances (movementUsed, actionsUsed)
- **Encounter-scoped**: Reset document.state fields when encounter ends (conditions, temporaryEffects)
- **Session-scoped**: Reset document.state fields on long rest (spellSlotsUsed, classFeatureUses)

## Risk Assessment

### High Risk Items
1. **Breaking Changes**: Complete system replacement may impact existing functionality
   - **Mitigation**: Comprehensive testing and gradual rollout
2. **Immer Learning Curve**: Team needs to learn Immer patterns and best practices
   - **Mitigation**: Documentation, examples, and training
3. **Performance Impact**: Multi-handler execution with Immer could be slower
   - **Mitigation**: Performance optimization and benchmarking specific to Immer

### Medium Risk Items
1. **Character Schema Migration**: Adding state field to existing documents
   - **Mitigation**: Careful database migration with proper defaults
2. **State Mutation Patterns**: Developers need to learn direct mutation with Immer
   - **Mitigation**: Clear patterns, examples, and utility functions
3. **Token Bar Configuration**: Complex bar setup may be confusing
   - **Mitigation**: Simple templates and clear documentation

### Low Risk Items
1. **Testing Coverage**: New system needs comprehensive testing
   - **Mitigation**: Structured testing approach in Phase 5 with Immer-specific tests
2. **Immer Bundle Size**: Adding Immer dependency increases bundle size
   - **Mitigation**: Immer is widely used and well-optimized, minimal impact expected

## Success Criteria

### Technical Success
- [ ] All existing action functionality preserved
- [ ] Plugin system extensible and easy to use with direct mutations
- [ ] Immer integration provides reliable patch generation
- [ ] Document state management efficient and reliable
- [ ] Performance within acceptable bounds (including Immer overhead)
- [ ] Test coverage above 90%

### Business Success
- [ ] D&D 5e actions significantly enhanced
- [ ] Plugin developers can easily extend system
- [ ] Foundation ready for additional game systems
- [ ] System scalable for future requirements

## Conclusion

This implementation plan provides a structured approach to replacing the current action system with a modern, extensible, plugin-aware architecture powered by Immer. The greenfield approach allows us to optimize for the best long-term design without backward compatibility constraints.

The Immer integration significantly simplifies the architecture by eliminating the need for ActionContext classes and manual JSON patch creation, while providing automatic immutability guarantees and patch generation. This results in a more developer-friendly system where plugins can use natural mutable syntax for state changes.

The phased approach ensures that each component is thoroughly tested before building on it, with core VTT functionality prioritized over UI enhancements. The document state system provides a solid foundation for plugin extensibility, while the token bar system in Phase 6 delivers enhanced visual feedback as a final polish feature.

The D&D 5e reference implementation will serve as both a validation of the architecture and a guide for future plugin developers using the Immer-based approach.