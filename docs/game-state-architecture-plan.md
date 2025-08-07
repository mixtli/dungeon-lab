# Game Session State Management Architecture - Implementation Plan

## Overview
This document outlines the complete redesign of game session state management from the current fragmented approach to a unified, GM-authority based architecture.

## 📊 Current Implementation Status (January 2025)

### ✅ Completed Phases
- **Phase 1**: Foundation & Data Models ✅ 
- **Phase 2.1-2.7**: Server-side architecture ✅ (Game state service, socket handlers, state sync)
- **Phase 3.1**: Created unified game state store ✅
- **Phase 3.2**: Removed legacy stores (actor, item, encounter) ✅  
- **Phase 3.3**: Updated 8 components to use game state store ✅
- **Phase 3.4**: GM client update logic with unified architecture ✅
- **Phase 4.1**: Plugin Interface Extensions ✅ (Reactive game state access for plugins)

### 🚧 Current Status
**What's Working Now**:
- ✅ Basic game state store architecture in place
- ✅ Components successfully migrated from legacy stores
- ✅ Simple functionality preserved (character selection, chat integration)
- ✅ REST API operations continue to work (character creation, loading)
- ✅ Server-side state management fully implemented
- ✅ **ICharacter vs IActor type issues RESOLVED** - relationship-based inventory implemented
- ✅ **GameSession schema alignment RESOLVED** - unified client/server schema with auto initialization
- ✅ Plugin-agnostic helper functions for item relationships added to game state store
- ✅ **Phase 4.1 Plugin Interface Extensions COMPLETED** - plugins now have reactive game state access

**Current Blockers**:
- ❌ **Complex Functionality**: Token management, encounter operations, item creation stubbed out with TODOs
- ❌ **Legacy Components**: EncounterDetailView needs complete rewrite

### ✅ Phase 3.4 - GM Client Update Logic - COMPLETED
**COMPLETED**: GM client state update mechanism implemented with proper architecture - enables complex game operations through the unified game state system.

### 📈 Progress: ~80% Complete  
- Server architecture: ✅ 100% complete
- Client basic migration: ✅ 100% complete
- Client type system & schema alignment: ✅ 100% complete  
- Plugin integration: ✅ 50% complete (Phase 4.1 done)
- Client advanced features: 📋 35% complete
- Testing & validation: 📋 0% complete

## 🎯 Recommended Next Steps

### ✅ Priority 1: COMPLETED - Type Issues Resolution  
**Status**: **RESOLVED** (January 2025)
**Solution Implemented**: Relationship-based inventory architecture

**What Was Done**:
1. **Removed embedded inventory arrays** from both `actor.schema.mts` and `character.schema.mts`
2. **Implemented relationship-based inventory** using `item.ownerId` field to establish ownership
3. **Added plugin-agnostic helper functions** to `game-state.store.mts`:
   - `getCharacterItems(ownerId: string)` - returns items filtered by ownership
   - `getCharacterItemCount(ownerId: string)` - returns count of owned items
4. **Maintained conceptual clarity** - kept ICharacter vs IActor distinction for domain clarity

**Architecture Decision**: 
- Items are NOT embedded in actors/characters
- Ownership relationships established via `item.ownerId === character.id` 
- Plugin-agnostic main app provides raw relationship filtering only
- Plugins handle item state interpretation (equipped, etc.)

### ✅ GameSession Schema Alignment COMPLETED
**Status**: **RESOLVED** (January 2025)
**Issue**: TypeScript errors in `GameSessionScheduleModal.vue` due to schema mismatch

**Problem**: 
- Client API used `createGameSessionSchema` (omitted only 2 fields)
- Server used `gameSessionCreateSchema` (omitted 6 fields including gameState)
- Result: Client expected gameState fields, server didn't accept them

**Solution Implemented**:
1. **Eliminated schema duplication** - Removed duplicate `createGameSessionSchema` from client
2. **Unified on shared schema** - Client now uses server's `gameSessionCreateSchema`
3. **Server-side initialization** - Modified `createGameSession()` to auto-call `initializeGameState()`
4. **Proper separation** - Client sends metadata, server handles gameState initialization

**Result**: 
- ✅ TypeScript errors in GameSessionScheduleModal resolved
- ✅ Single source of truth prevents future schema drift
- ✅ Clean architecture: client provides metadata, server manages game state

### Priority 2: Implement Phase 3.4 - GM Client Update Logic  
**Timeline**: 3-5 days
**Purpose**: Enable complex game operations through unified state system
**Impact**: Unlocks all the TODO functionality (token management, encounter operations, item creation)

**Key Deliverables**:
- Sequential update processing with queuing
- Integration with game state store
- Error handling and optimistic concurrency control
- Replace TODO comments with actual functionality

### Priority 3: Address Legacy Component Issues
**Timeline**: 2-3 days per component
**Focus**: EncounterDetailView.vue complete rewrite using new architecture
**Impact**: Removes legacy dependencies and technical debt

### Priority 4: Technical Debt Resolution
**Timeline**: 1-2 weeks
**Focus**: Replace TODO comments with proper implementations
**Areas**: Token management, encounter operations, item creation, complex state updates

## Client-Side State Management Architecture

### New Store Structure
- **`gameState.store.mts`** - Single unified game state (replaces multiple stores)
- **`chat.store.mts`** - Keep existing chat store (already separate)
- **`auth.store.mts`** - Keep existing auth store
- **`socket.store.mts`** - Keep existing socket store (may need updates)
- **`notification.store.mts`** - Keep existing notification store

### Server vs Client State Structure

**Server Database Structure (GameSession document):**
```typescript
interface GameSession {
  // ... existing fields (campaignId, gameMasterId, etc.)
  
  // Pure game state data
  gameState: ServerGameState
  
  // State metadata (stored at GameSession level)
  gameStateVersion: string
  gameStateHash: string     // Hash of entire gameState for integrity verification
  lastStateUpdate: number
}

interface ServerGameState {
  // Game entities (all campaign-associated) - pure data, no metadata
  characters: ICharacter[]  // Player characters
  actors: IActor[]          // NPCs, monsters, etc.
  items: IItem[]           // All campaign items
  
  // Active encounter only (no historical data)
  currentEncounter: IEncounter | null
  
  // Plugin-specific state
  pluginData: Record<string, unknown>
}
```

**Client Pinia Store Structure:**
```typescript
interface GameStateStore {
  // === SERVER-CONTROLLED STATE (wrapped) ===
  gameState: ServerGameState | null
  gameStateVersion: string | null
  gameStateHash: string | null
  
  // === CLIENT-ONLY STATE ===
  // Session metadata
  sessionId: string | null
  isGM: boolean
  
  // UI state
  selectedCharacter: ICharacter | null
  loading: boolean
  error: string | null
  
  // Update management (GM only)
  isUpdating: boolean
  updateQueue: StateUpdate[]
}
```

**Usage in Components:**
```typescript
// Access server state
const characters = gameStateStore.gameState?.characters || []
const currentEncounter = gameStateStore.gameState?.currentEncounter

// Access client state  
const selectedChar = gameStateStore.selectedCharacter
const isLoading = gameStateStore.loading
```

## Phase 1: Foundation & Data Models ✅ COMPLETED

### 1.1 Database Schema Updates ✅
- **File**: `packages/shared/src/schemas/game-session.schema.mts` ✅
  - ✅ Added `gameState` field containing complete session state (ServerGameState)
  - ✅ Added `gameStateVersion` field for optimistic concurrency control (incrementing string, default "0")
  - ✅ Added `gameStateHash` field for state integrity verification
  - ✅ Added `lastStateUpdate` timestamp field
  - ✅ **Removed duplicated fields**: `characterIds`, `currentEncounterId` (now in gameState)
  - ✅ **Kept**: `participantIds` for session access control

- **File**: `packages/server/src/features/campaigns/models/game-session.model.mts` ✅
  - ✅ Updated mongoose schema to support new fields
  - ✅ Added Mixed type for gameState field
  - ✅ Removed deprecated characterIds field handling
  - ✅ Added indexes for gameStateVersion and lastStateUpdate queries

### 1.2 Server Game State Schema ✅
- **New File**: `packages/shared/src/schemas/server-game-state.schema.mts` ✅
  - ✅ Defines ServerGameState structure with characters, actors, items
  - ✅ Uses `currentEncounter: IEncounter | null` (simplified from complex nested structure)
  - ✅ Clean separation with no metadata fields in game state

### 1.3 State Update Schema ✅
- **New File**: `packages/shared/src/schemas/game-state-update.schema.mts` ✅
```typescript
interface StateUpdate {
  id: string
  sessionId: string
  version: string           // Incrementing version for optimistic concurrency
  operations: StateOperation[]
  timestamp: number
  source: 'gm' | 'system'
}

interface StateOperation {
  path: string              // "characters.0.pluginData.hitPoints"
  operation: 'set' | 'unset' | 'inc' | 'push' | 'pull'
  value: unknown
  previous?: unknown        // For rollbacks
}

// Comprehensive error handling with specific error codes
interface StateUpdateResponse {
  success: boolean
  newVersion?: string
  newHash?: string          // For integrity verification
  error?: {
    code: 'VERSION_CONFLICT' | 'VALIDATION_ERROR' | 'TRANSACTION_FAILED' | 'SESSION_NOT_FOUND' | 'PERMISSION_DENIED'
    message: string
    currentVersion?: string
    currentHash?: string
  }
}
```

### 1.4 State Integrity System ✅
- **New File**: `packages/shared/src/utils/state-hash.mts` ✅
```typescript
function generateStateHash(gameState: ServerGameState): string {
  // Hash the pure game state data for integrity verification
  return hash(JSON.stringify(gameState, sortObjectKeys))
}

function validateStateIntegrity(gameState: ServerGameState, expectedHash: string): boolean {
  return generateStateHash(gameState) === expectedHash
}

function incrementStateVersion(currentVersion: string | null): string {
  // Simple incrementing version: "0" -> "1" -> "2" etc.
  const current = parseInt(currentVersion || '0') || 0;
  return (current + 1).toString();
}

function isValidNextVersion(currentVersion: string | null, incomingVersion: string): boolean {
  // Check if incoming version is exactly current + 1
  const expected = incrementStateVersion(currentVersion);
  return expected === incomingVersion;
}
```

### 1.5 Type System Updates ✅
- **File**: `packages/shared/src/types/index.mts` ✅
  - ✅ Added ServerGameState type export
  - ✅ Added StateOperation, StateUpdate, StateUpdateResponse, StateUpdateBroadcast type exports
  - ✅ Proper import organization for all new schemas

## Phase 2: Backend Implementation (2-3 weeks)

### 2.1 Remove Legacy Code ✅ COMPLETED
**DELETE ENTIRE DIRECTORIES:**
- ✅ `packages/server/src/aggregates/` - Remove entire aggregate system
- ✅ `packages/server/src/websocket/handlers/actor-handler.mts`
- ✅ `packages/server/src/websocket/handlers/item-handler.mts` 
- ✅ `packages/server/src/websocket/handlers/move-handler.mts`
- ✅ Updated `handlers/index.mts` to remove imports for deleted handlers

### 2.2 New Unified Game Session Handler ✅ COMPLETED
- **New File**: `packages/server/src/websocket/handlers/game-state-handler.mts` ✅
  - ✅ Implements GM-authority state updates with optimistic concurrency control
  - ✅ Sequential state update processing with version validation
  - ✅ State integrity verification using SHA-256 hashing
  - ✅ Session-based permission checking (GM for updates, participants for reads)
  - ✅ Full state refresh mechanism for reconnection scenarios
  - ✅ Session join/leave management with real-time broadcasts
  - ✅ Comprehensive error handling with specific error codes
  - ✅ Simplified state operation processing (set, unset, inc, push, pull)
  - ✅ Registered with socket handler registry

```typescript
// Key socket events implemented:
socket.on('gameState:update', async (update: StateUpdate, callback))       // GM only
socket.on('gameState:requestFull', async (sessionId: string, callback))    // All participants  
socket.on('gameSession:join', async (sessionId: string, callback))         // Session management
socket.on('gameSession:leave', async (sessionId: string, callback))        // Session management

// Broadcasts to clients:
socket.emit('gameState:updated', StateUpdateBroadcast)     // Real-time state sync
socket.emit('gameState:error', GameStateError)            // Error notifications
socket.emit('gameSession:joined', GameSessionJoined)      // User join notifications
socket.emit('gameSession:left', GameSessionLeft)          // User leave notifications
```

### 2.3 State Management Service ✅ COMPLETED
- **New File**: `packages/server/src/features/campaigns/services/game-state.service.mts` ✅
  - ✅ Apply atomic state updates to gameState only (no dual updates during gameplay)
  - ✅ Validate state structure with comprehensive checks (not plugin logic)
  - ✅ Handle version conflicts with optimistic concurrency control
  - ✅ Generate state hash after each update for integrity verification
  - ✅ **Defense in depth**: Both version AND hash checks in atomic MongoDB updates
  - ✅ Proper path parsing for nested state operations (characters.0.pluginData.hitPoints)
  - ✅ Full operation support: set, unset, inc, push, pull with deep object navigation
  - ✅ State initialization for new sessions with campaign data loading placeholder
  - ✅ Comprehensive error handling with specific error codes and detailed diagnostics
  - ✅ Retry logic for high-concurrency scenarios
  - ✅ **PERFORMANCE OPTION**: Manual direct MongoDB updates available when needed
  - ✅ **SAFE BY DEFAULT**: Always uses full validation unless explicitly overridden
  - ✅ Optional hash-check skipping for performance (manual control only)
  - ✅ Performance metrics and logging for monitoring optimization impact
  - ✅ Simple, predictable behavior - no automatic complexity detection
  
### 2.4 Backing Store Synchronization ✅ COMPLETED
- **New File**: `packages/server/src/features/campaigns/services/game-state-sync.service.mts` ✅
  - `syncGameStateToBackingModels()` function to update backing models from gameState ✅
  - Called at strategic times: session end, GM leaves, periodic intervals ✅
  - Handles syncing characters → Character documents, actors → Actor documents, etc. ✅
  - **Future**: Will be replaced with event sourcing for real-time sync
- **New File**: `packages/server/src/features/campaigns/services/periodic-sync.service.mts` ✅
  - Background periodic sync service with configurable intervals ✅
  - Batch processing with rate limiting for multiple sessions ✅
  - Integrated into server startup and shutdown processes ✅
- **Updated File**: `packages/server/src/websocket/handlers/game-state-handler.mts` ✅
  - Added sync triggers for session end and GM disconnect events ✅
  - Added `gameSession:end` event handler for proper session termination ✅
  - Enhanced disconnect handling to sync when GM disconnects unexpectedly ✅
- **Updated File**: `packages/shared/src/schemas/socket/game-state.mts` ✅
  - Added `gameSessionEndArgsSchema`, `gameSessionEndedSchema`, `gameSessionEndCallbackSchema` ✅

### 2.5 State Integrity System ✅ COMPLETED
- **New File**: `packages/shared/src/utils/state-hash.mts` ✅
  - `generateStateHash()` - SHA-256 hashing with consistent object key sorting ✅
  - `validateStateIntegrity()` - Hash-based state corruption detection ✅  
  - `incrementStateVersion()` - Simple integer version management ✅
  - `isValidNextVersion()` - Version conflict detection ✅
- **Integration**: Fully integrated into `game-state.service.mts` ✅
  - Defense-in-depth verification using BOTH version and hash checks ✅
  - Atomic database updates with integrity validation ✅
  - Comprehensive error handling for state corruption scenarios ✅

### 2.6 Update Socket Server ✅ COMPLETED
- **File**: `packages/server/src/websocket/socket-server.mts` ✅
  - No aggregate system references found - already clean ✅
  - New game-state-handler already integrated via handler registry ✅
  - Consolidated session joining logic - removed duplicate systems ✅
- **Enhanced File**: `packages/server/src/websocket/handlers/game-state-handler.mts` ✅
  - Enhanced `gameSession:join` with user participation management ✅
  - Added full GameSession data return in callback ✅  
  - Enhanced `gameSession:leave` with participant cleanup ✅
- **Removed Legacy Complexity**: ✅
  - Removed legacy `joinSession`/`leaveSession` event handlers ✅
  - Removed `handleJoinSession()` and `handleLeaveSession()` methods ✅
  - Removed unused actor room management (`actor:${actorId}` rooms) ✅
  - Cleaned up unused imports (GameSessionModel, JoinCallback, sendSystemMessage) ✅
- **Room Strategy**: Simplified to exactly what was requested ✅
  - `session:${sessionId}` - for session-wide broadcasts to all players ✅
  - `user:${userId}` - for user-specific targeted messages ✅
  - Removed unused actor rooms - nobody was emitting to them ✅

### 2.7 Legacy Socket Event Cleanup ✅ COMPLETED
With the unified game state system, many socket events become redundant and have been removed:

**Socket Events REMOVED (replaced by gameState:update):** ✅
- ✅ **Token Events**: `token:moved`, `token:created`, `token:updated`, `token:deleted` (server-to-client)
- ✅ **Token Client Events**: `token:move`, `token:create`, `token:update`, `token:delete` (client-to-server)
- ✅ **Actor Events**: `actor:created`, `actor:updated`, `actor:deleted` (server-to-client)
- ✅ **Actor Client Events**: `actor:list`, `actor:get`, `actor:update`, `actor:delete` (client-to-server)
- ✅ **Item Events**: `item:created`, `item:updated`, `item:deleted` (server-to-client)
- ✅ **Item Client Events**: `item:list`, `item:get`, `item:create`, `item:update`, `item:delete` (client-to-server)
- ✅ **Combat State Events**: `initiative:rolled`, `initiative:updated`, `initiative:reordered`
- ✅ **Turn Management**: `turn:changed`, `turn:skipped`, `turn:delayed`
- ✅ **Action Events**: `action:executed`, `action:validated` 
- ✅ **Effect Events**: `effect:applied`, `effect:removed`, `effect:expired`
- ✅ **Movement Events**: `move` (if used for token movement)

**Socket Events PRESERVED (separate from game state):** ✅
- ✅ Chat events (separate system)
- ✅ Dice roll events (separate from game state)
- ✅ Session management: `encounter:started`, `encounter:stopped`, `user:joined`, `user:left`
- ✅ GM authority & heartbeat events
- ✅ Workflow events (map generation, etc.)
- ✅ New `gameState:*` and `gameSession:*` events

**Files Cleaned Up:** ✅
- ✅ **File**: `packages/shared/src/schemas/socket/index.mts`
  - ✅ Removed legacy event definitions from `serverToClientEvents` and `clientToServerEvents`
  - ✅ Removed imports for deprecated event schemas
  - ✅ Added missing `gameSession:ended` and `gameSession:end` event support
- ✅ **Deleted Files**: `packages/shared/src/schemas/socket/actors.mts`
- ✅ **Deleted Files**: `packages/shared/src/schemas/socket/items.mts`
- ✅ **Updated File**: `packages/shared/src/schemas/socket/encounters.mts`
  - ✅ Removed token, initiative, turn, action, and effect event schemas
  - ✅ Kept encounter lifecycle events (start/stop/pause/end)
- ✅ **File**: `packages/shared/src/types/socket/index.mts`
  - ✅ Removed type exports for deleted events
- ✅ **Updated**: Removed encounter-handler completely (replaced by game-state-handler)
- ✅ **Fixed**: `createGameSessionSchema` to remove reference to deleted `characterIds` field

**Type Safety Cleanup:** ✅
- ✅ **Socket Callback Consistency**: Created base socket callback schemas with discriminated union patterns
- ✅ **MongoDB Populated Document Types**: Added `IGameSessionPopulated` and `IGameSessionPopulatedDocument` interfaces
- ✅ **Replaced `any` Types**: All socket handlers now use proper TypeScript types for MongoDB populated documents
- ✅ **ESLint Compliance**: Removed all `any` type violations and ESLint disable annotations
- ✅ **TypeScript Compilation**: All server and shared packages compile without type errors

**Benefits Achieved:** ✅
- ✅ Removed ~25+ redundant socket events
- ✅ Simplified client-server communication model
- ✅ Eliminated complex event coordination between multiple handlers
- ✅ Reduced bundle size and complexity
- ✅ Enforced unified state management architecture
- ✅ All game state changes now flow through `gameState:update` event
- ✅ Single centralized game-state-handler replaces multiple specialized handlers
- ✅ Full type safety with no remaining `any` types or ESLint violations

## Phase 3: Frontend Implementation (2-3 weeks)

### 3.1 Create New Unified Game State Store ✅ COMPLETED
- **New File**: `packages/web/src/stores/game-state.store.mts` ✅
  - ✅ Single reactive object containing all game entities (characters, actors, items, currentEncounter)
  - ✅ Sequential update queue for GM client with concurrent update handling
  - ✅ Version tracking and optimistic concurrency control
  - ✅ Pinia persistence with selective state preservation (gameState, version, hash, sessionId, isGM)
  - ✅ GM authority enforcement with permission checking
  - ✅ Real-time synchronization via Socket.IO event handlers
  - ✅ State integrity verification with hash checking
  - ✅ Full state refresh mechanism for reconnection scenarios
  - ✅ Comprehensive error handling with version conflict resolution
  - ✅ Type-safe implementation with proper TypeScript types (no `any` usage)
  - ✅ Socket callback schemas integration with Zod validation
  - ✅ State operation processing (set, unset, inc, push, pull)
  - ✅ Session management with join/leave functionality
  - ✅ Clean separation between server-controlled and client-only state

**Key Implementation Details:** ✅
```typescript
// Store structure implemented:
interface GameStateStore {
  // Server-controlled state (persisted)
  gameState: ServerGameState | null           // Complete game state from server
  gameStateVersion: string | null             // Optimistic concurrency version
  gameStateHash: string | null                // Integrity verification hash
  sessionId: string | null                    // Current session ID
  isGM: boolean                              // GM authority flag

  // Client-only state (not persisted)
  selectedCharacter: ICharacter | null       // UI selection state
  loading: boolean                           // Loading indicators
  error: string | null                       // Error messages
  isUpdating: boolean                        // Update in progress flag

  // Computed access to game entities
  characters: computed<ICharacter[]>         // Player characters
  actors: computed<IActor[]>                 // NPCs, monsters
  items: computed<IItem[]>                   // Campaign items
  currentEncounter: computed<IEncounter | null> // Active encounter
}

// Socket events implemented:
- 'gameState:update' (GM → Server): Send state operations
- 'gameState:requestFull' (Client → Server): Request complete state
- 'gameSession:join' (Client → Server): Join game session
- 'gameSession:leave' (Client → Server): Leave game session
- 'gameState:updated' (Server → Clients): Broadcast state changes
- 'gameState:error' (Server → Clients): Error notifications
```

**Technical Achievements:** ✅
- ✅ Fixed all TypeScript compilation errors (8 errors resolved)
- ✅ Proper Zod schema integration for socket callbacks
- ✅ Type-safe state operations with runtime validation
- ✅ ESLint compliant with no `any` types or violations
- ✅ Sequential GM update processing with queue management
- ✅ Optimistic concurrency control with version tracking
- ✅ State integrity verification using SHA-256 hashing
- ✅ Comprehensive error handling with specific error codes
- ✅ Pinia plugin integration for selective persistence
- ✅ Socket connection management with automatic reconnection

### 3.2 Remove Legacy Stores ✅ COMPLETED
**DELETE FILES:**
- ✅ `packages/web/src/stores/actor.store.mts`
- ✅ `packages/web/src/stores/item.store.mts`
- ✅ `packages/web/src/stores/encounter.store.mts`
- ❌ `packages/web/src/stores/character-sheet.store.mts` - Kept and updated instead

**KEEP FILES (may need updates):**
- ✅ `packages/web/src/stores/game-session.store.mts` - Simplified to just session metadata
- ✅ `packages/web/src/stores/chat.store.mts` - Keep as-is
- ✅ `packages/web/src/stores/auth.store.mts` - Keep as-is
- ✅ `packages/web/src/stores/socket.store.mts` - Updated event handler references

### 3.3 Update Components ✅ COMPLETED
**MAJOR UPDATES COMPLETED:**
- ✅ All components that use `useActorStore()` → `useGameStateStore()` (access via `actors` array)
- ✅ All components that use `useItemStore()` → `useGameStateStore()` (access via `items` array)
- ✅ All components that use `useEncounterStore()` → `useGameStateStore()` (access via `currentEncounter`)
- ✅ Components using character data → access via `characters` array (with TODOs for complex operations)

**Files updated:**
- ✅ `packages/web/src/components/campaign/CampaignEncounterList.vue` - Replaced useEncounterStore imports
- ✅ `packages/web/src/components/chat/ChatComponent.vue` - Replaced useActorStore with gameStateStore.selectedCharacter
- ✅ `packages/web/src/components/hud/tabs/ChatTab.vue` - Updated character references for chat functionality
- ✅ `packages/web/src/components/socket/SocketManager.vue` - Updated character restoration logic
- ✅ `packages/web/src/views/CharacterCreateView.vue` - REST API only, updated character selection
- ✅ `packages/web/src/views/CharacterSheetView.vue` - Updated character loading from ActorsClient
- ✅ `packages/web/src/views/encounter/EncounterDetailView.vue` - Replaced imports, added TODOs for legacy functionality
- ✅ `packages/web/src/stores/game-session.store.mts` - Cleaned up references to deleted stores

### 3.4 GM Client Update Logic ✅ COMPLETED
**Status**: **IMPLEMENTED** - GM client update logic with fixed architecture enables complex game operations.

**Purpose**: Implement the client-side mechanism for GMs to send state updates to the server through the unified game state system. This will enable all the complex functionality currently stubbed out with TODOs.

**Implemented Features**:
- ✅ Sequential update processing (no concurrent updates)
- ✅ Update queuing when updates are in progress  
- ✅ Optimistic concurrency control with version checking
- ✅ Error handling with proper socket.io callbacks
- ✅ Integration with existing game state store
- ✅ **Architectural Fix**: GM follows same state update pattern as all other clients
- ✅ **Unified Pattern**: All clients receive updates via `gameState:updated` broadcast
- ✅ **Proper Error Handling**: Socket callbacks handle errors without local state changes

**Implementation**:
```typescript
// GM sends updates sequentially (with proper socket.io syntax)
async function updateGameState(operations: StateOperation[]): Promise<StateUpdateResponse> {
  if (isUpdating.value) {
    // Queue update if another is in progress
    updateQueue.value.push({ operations })
    return { success: true }
  }
  
  isUpdating.value = true
  try {
    const update: StateUpdate = {
      id: generateUpdateId(),
      sessionId: sessionId.value!,
      version: gameStateVersion.value!,
      operations,
      timestamp: Date.now(),
      source: 'gm'
    }
    
    return new Promise((resolve) => {
      socketStore.emit('gameState:update', update, (response: StateUpdateResponse) => {
        if (response.success) {
          console.log('State update sent successfully - will receive broadcast');
          // NOTE: State will be updated via gameState:updated broadcast
          // This ensures GM follows same pattern as all other clients
          resolve(response);
        } else {
          handleUpdateError(response.error);
          resolve(response);
        }
      });
    });
  } finally {
    isUpdating.value = false
    processUpdateQueue()
  }
}

// Example state operations (paths are within gameState):
// Update character HP: { path: "characters.0.pluginData.hitPoints", operation: "set", value: 45 }
// Update encounter status: { path: "currentEncounter.status", operation: "set", value: "active" }
// Add item to character: { path: "characters.0.inventory", operation: "push", value: newItem }
```

### 📋 Phase 3 Appendix: State Synchronization Architecture Details

**Implementation reference for the unified state synchronization patterns established in Phase 3.4:**

#### GM Client Behavior (Fixed Architecture)
1. GM makes change in UI
2. Generate state operations
3. Queue update if another update is in progress  
4. Send update to server with current version using `socket.emit('gameState:update', update, callback)`
5. Wait for server response in callback (for error handling only)
6. **Wait for broadcast**: GM receives `gameState:updated` broadcast like all other clients
7. On broadcast: apply changes locally, update version (same as players)
8. On failure: handle error (refresh state, retry, etc.)
9. Process next queued update if any

**Architectural Fix**: GM no longer applies state locally in the callback - only via broadcast like everyone else.

#### All Client Behavior (GM and Players - Unified Pattern)
1. Receive `gameState:updated` broadcast from server with `{ operations, newVersion, expectedHash }`
2. Check if incoming version is current version + 1
3. If yes: apply operations directly to local gameState
4. Generate hash of updated local state and compare with expectedHash
5. If hash matches: update local version and continue
6. If version wrong OR hash mismatch: request full state refresh

**Key Architectural Principle**: GM and players follow identical update patterns - only GM can *send* updates, but all clients *receive* updates the same way.

#### Reconnection Logic
```typescript
async function handleReconnection() {
  const localVersion = localStorage.getItem('gameStateVersion')
  const localHash = localStorage.getItem('gameStateHash')
  const serverResponse = await socketRequest('gameState:requestFull', sessionId)
  
  if (localVersion === serverResponse.gameStateVersion && 
      localHash === serverResponse.gameStateHash) {
    // State is current and integrity verified, no action needed
    return
  }
  
  // Replace entire server state with fresh data from server
  gameState.value = serverResponse.gameState
  gameStateVersion.value = serverResponse.gameStateVersion
  gameStateHash.value = serverResponse.gameStateHash
  
  // Update localStorage
  localStorage.setItem('gameStateVersion', serverResponse.gameStateVersion)
  localStorage.setItem('gameStateHash', serverResponse.gameStateHash)
}
```

## Phase 4: Plugin Integration 🔌

**Goal**: Update plugins to work with the new unified game state architecture instead of the old fragmented stores.

**Timeline**: 1 week

### Current Status: PHASE 4.1 COMPLETED ✅

**Phase 4.1 - Plugin Interface Extensions - COMPLETED (January 2025)**

✅ **GameStateContext Interface Added** to `packages/shared/src/types/plugin-context.mts`:
- Reactive computed refs for characters, actors, items, currentEncounter
- Synchronous helper methods for entity lookups (getActorById, getCharacterById, etc.)
- State subscription methods for side effects
- Proper Vue reactivity integration with ComputedRef and Ref types

✅ **PluginGameStateService Implementation** created in `packages/web/src/services/plugin-game-state.service.mts`:
- Wraps existing game state store with reactive Vue computeds
- Implements all GameStateContext interface methods
- Provides proper Vue reactivity through watch() and readonly()
- Handles subscription management for plugin cleanup

✅ **Plugin Registry Updates** - Modified plugin registry to:
- Optionally include GameStateContext when creating plugin contexts
- Check for active sessions before providing game state access
- Maintain backward compatibility with plugins that don't use game state

✅ **Type System Integration** ensured:
- GameStateContext properly exported through shared types index
- PluginContext interface includes optional gameState property
- Full TypeScript compilation and type safety verified

✅ **Architecture Benefits Achieved**:
- **Plugin Reactivity**: Plugins now have reactive access to unified game state
- **Clean Separation**: Read-only access prevents plugins from corrupting game state  
- **Session Awareness**: Game state only available during active sessions
- **Vue Integration**: Proper Vue reactivity patterns with computed refs and watchers
- **Backward Compatible**: Existing plugins continue to work without changes

The plugin interface extensions are now ready for plugins to consume reactive game state data during active game sessions. This completes the foundation for Phase 4 of the game state architecture migration.

### 4.1: Plugin Interface Extensions 🔧 ✅ COMPLETED

**Extend plugin context with game state access while maintaining read-only boundaries:**

- [ ] **Add GameStateContext to PluginContext interface** (`packages/shared/src/types/plugin-context.mts`)
  ```typescript
  export interface GameStateContext {
    // Direct reactive access to game state arrays (maintains Vue reactivity)
    readonly characters: ComputedRef<ICharacter[]>;
    readonly actors: ComputedRef<IActor[]>;
    readonly items: ComputedRef<IItem[]>;
    readonly currentEncounter: ComputedRef<IEncounter | null>;
    
    // State metadata
    readonly gameStateVersion: Ref<string | null>;
    
    // Synchronous helper methods for convenience (work with reactive data)
    getActorById(id: string): IActor | null;
    getCharacterById(id: string): ICharacter | null;
    getItemById(id: string): IItem | null;
    getItemsByOwner(ownerId: string): IItem[];
    getTokensByActor(actorId: string): IToken[];
    
    // Subscribe to state changes for side effects
    subscribeToState(callback: (state: Readonly<ServerGameState>) => void): () => void;
    subscribeToStateUpdates(callback: (broadcast: StateUpdateBroadcast) => void): () => void;
  }
  
  export interface PluginContext {
    // ... existing methods ...
    
    /** Reactive game state access for plugin components */
    gameState: GameStateContext;
  }
  ```

- [ ] **Implement GameStateContext service** (`packages/web/src/services/plugin-game-state.service.mts`)
  ```typescript
  export class PluginGameStateService implements GameStateContext {
    private gameStateStore = useGameStateStore();
    
    // Direct reactive access to store's computed properties (maintains Vue reactivity)
    get characters() { return this.gameStateStore.characters; }
    get actors() { return this.gameStateStore.actors; }
    get items() { return this.gameStateStore.items; }
    get currentEncounter() { return this.gameStateStore.currentEncounter; }
    get gameStateVersion() { return this.gameStateStore.gameStateVersion; }
    
    // Synchronous helper methods that work with reactive data
    getActorById(id: string): IActor | null {
      return this.actors.value.find(a => a.id === id) || null;
    }
    
    getCharacterById(id: string): ICharacter | null {
      return this.characters.value.find(c => c.id === id) || null;
    }
    
    getItemsByOwner(ownerId: string): IItem[] {
      return this.items.value.filter(item => item.ownerId === ownerId);
    }
    
    // Subscription management for plugin cleanup
    subscribeToState(callback: (state: Readonly<ServerGameState>) => void): () => void {
      return this.gameStateStore.$subscribe((mutation, state) => {
        if (state.gameState) callback(state.gameState);
      });
    }
  }
  ```
  - Wraps game state store's existing reactive computed properties
  - All helper methods work synchronously with reactive data  
  - Maintains proper Vue reactivity chains for plugin components

### 4.2: Focus on Actual Game State Integration Needs 🎯

**Update components that actually need game state integration (not character sheets):**

**🔧 Character Sheet: Game State Store Integration**
- Update `useCharacterState()` to integrate with game state store when in session
- Enable opening character sheets for any session participant by ID  
- Integrate with GM authority system for character updates during sessions
- Maintain backward compatibility for standalone mode operation

**✅ Character Creator: No Changes Needed**
- Uses REST API for character creation (correct approach)
- Independent of game sessions and game state
- No need for plugin integration changes

**🔧 Character Sheet Game State Integration:**

- [ ] **Enhanced useCharacterState Composable** (`packages/web/src/composables/useCharacterState.mts`)
  ```typescript
  // Updated to work with character ID and integrate with game state store
  export function useCharacterState(
    characterId: string,  // Changed: takes ID instead of pre-fetched character
    options: CharacterStateOptions = {}
  ): CharacterStateReturn {
    const gameStateStore = useGameStateStore();
    const isInSession = computed(() => !!gameStateStore.sessionId);
    const standaloneCharacter = ref<IActor | null>(null);
    
    // Reactive character source - game state store when in session, API when standalone
    const character = computed(() => {
      if (isInSession.value) {
        // Get from game state store (reactive to real-time updates)
        return gameStateStore.actors.find(a => a.id === characterId) ||
               gameStateStore.characters.find(c => c.id === characterId) ||
               null;
      } else {
        // Use standalone API-fetched data
        return standaloneCharacter.value;
      }
    });
    
    // Dual save mechanism based on session context
    const save = async () => {
      if (isInSession.value && !gameStateStore.isGM) {
        // Session mode + not GM: Request approval from GM
        return requestCharacterUpdateApproval(characterId, getCharacterChanges());
      } else if (isInSession.value && gameStateStore.isGM) {
        // Session mode + GM: Update via game state system
        return updateViaGameState(characterId, getCharacterChanges());
      } else {
        // Standalone mode: Direct API save
        return saveDirectlyViaAPI(characterId, character.value);
      }
    };
    
    // Load character data for standalone mode
    const loadStandaloneData = async () => {
      if (!isInSession.value) {
        standaloneCharacter.value = await documentsClient.getDocument(characterId);
      }
    };
    
    return { character, save, loadStandaloneData, /* ... other methods */ };
  }
  ```

- [ ] **Updated CharacterSheetView Integration** (`packages/web/src/views/CharacterSheetView.vue`)
  ```typescript
  // Remove direct API fetching - let useCharacterState handle data source
  const characterId = route.params.id as string;
  const characterState = useCharacterState(characterId, {
    enableWebSocket: gameStateStore.sessionId ? true : false,
    readonly: false
  });
  
  // Character data comes from composable (game state or API)
  const character = characterState.character;
  
  onMounted(async () => {
    // Load data if not in session (composable handles the logic)
    if (!gameStateStore.sessionId) {
      await characterState.loadStandaloneData();
    }
    // If in session, data comes from game state store automatically
  });
  ```

- [ ] **GM Authority Workflow for Session Updates**
  ```typescript
  // New socket events for GM approval workflow
  async function requestCharacterUpdateApproval(
    characterId: string, 
    changes: Partial<IActor>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      socketStore.emit('character:updateRequest', {
        characterId,
        changes,
        requesterId: authStore.user.id
      }, (response) => {
        if (response.success) {
          // GM approved - update will come via gameState:updated broadcast
          resolve();
        } else {
          reject(new Error(response.error || 'Update denied by GM'));
        }
      });
    });
  }
  
  // GM can approve/deny character update requests
  socketStore.on('character:updateRequest', (request, callback) => {
    if (gameStateStore.isGM) {
      // Show GM approval UI or auto-approve based on settings
      handleCharacterUpdateRequest(request, callback);
    }
  });
  ```

**🔧 Components That Need Game State Integration:**

- [ ] **HUD Equipment Displays** - Real-time inventory during sessions
  ```typescript
  // Plugin components that show character equipment in HUD
  const context = inject<PluginContext>('pluginContext');
  const characterItems = computed(() => {
    const selectedChar = gameStateStore.selectedCharacter;
    if (!selectedChar) return [];
    
    // Tracks both character selection AND items array changes
    return context?.gameState.items.value.filter(item => 
      item.ownerId === selectedChar.id
    ) || [];
  });
  ```

- [ ] **Token Status Displays** - Real-time character status on encounter map
  ```typescript
  // Plugin components that show character status on tokens
  const characterHealth = computed(() => {
    const actor = context?.gameState.actors.value.find(a => a.id === actorId.value);
    return actor?.pluginData?.hitPoints || 0;
  });
  ```

- [ ] **Encounter Participant Lists** - Real-time participant management
  ```typescript
  // Plugin components that display encounter participants
  const encounterActors = computed(() => {
    const encounter = context?.gameState.currentEncounter.value;
    if (!encounter) return [];
    
    return encounter.participantIds.map(id => 
      context?.gameState.actors.value.find(a => a.id === id)
    ).filter(Boolean);
  });
  ```

### 4.3: Plugin State Helper Utilities 🛠️

**Create plugin-friendly utilities for common game state operations:**

- [ ] **Plugin State Composables** (`packages/plugins/dnd-5e-2024/src/composables/useSessionState.mts`)
  ```typescript
  export function useSessionGameState() {
    const context = inject<PluginContext>('pluginContext');
    if (!context) throw new Error('Plugin context not available');
    
    return {
      // Real-time encounter participants for plugin displays
      useEncounterParticipants: () => {
        return computed(() => {
          const encounter = context.gameState.currentEncounter.value;
          if (!encounter) return [];
          
          return encounter.participantIds.map(id =>
            context.gameState.actors.value.find(a => a.id === id)
          ).filter(Boolean);
        });
      },
      
      // Real-time inventory for HUD displays (not character sheets)
      useSessionInventory: (ownerId: Ref<string>) => {
        return computed(() => 
          context.gameState.items.value.filter(item => item.ownerId === ownerId.value)
        );
      },
      
      // Token status for map displays
      useTokenStatus: (actorId: Ref<string>) => {
        return computed(() => {
          const encounter = context.gameState.currentEncounter.value;
          if (!encounter) return null;
          
          return encounter.tokens.find(token => token.actorId === actorId.value) || null;
        });
      },
      
      // Actor health/status for real-time displays
      useActorStatus: (actorId: Ref<string>) => {
        return computed(() => {
          const actor = context.gameState.actors.value.find(a => a.id === actorId.value);
          return {
            hitPoints: actor?.pluginData?.hitPoints || 0,
            maxHitPoints: actor?.pluginData?.maxHitPoints || 0,
            conditions: actor?.pluginData?.conditions || [],
            armorClass: actor?.pluginData?.armorClass || 10
          };
        });
      }
    };
  }
  ```

- [ ] **Plugin Data Transformers** (`packages/plugins/dnd-5e-2024/src/utils/session-transformers.mts`)
  ```typescript
  // Transform game state data for plugin displays (not character sheets)
  export function transformTokenDisplay(actor: IActor, token: IToken): TokenDisplayData {
    const pluginData = actor.pluginData as DnD5eCharacter;
    
    return {
      id: token.id,
      name: actor.name,
      position: token.position,
      size: token.size,
      
      // D&D 5e specific display data
      hitPoints: pluginData.hitPoints,
      maxHitPoints: pluginData.maxHitPoints,
      armorClass: pluginData.armorClass,
      conditions: pluginData.conditions || [],
      deathSaves: pluginData.deathSaves,
      
      // Computed display properties
      healthPercentage: Math.round((pluginData.hitPoints / pluginData.maxHitPoints) * 100),
      isBloodied: pluginData.hitPoints <= (pluginData.maxHitPoints / 2),
      isUnconscious: pluginData.hitPoints <= 0
    };
  }
  
  export function transformInventoryDisplay(items: IItem[]): InventoryDisplayData {
    return {
      weapons: items.filter(item => item.pluginDocumentType === 'weapon'),
      armor: items.filter(item => item.pluginDocumentType === 'armor'),
      equipment: items.filter(item => 
        !['weapon', 'armor', 'spell'].includes(item.pluginDocumentType)
      ),
      
      // Quick access for common displays
      equippedWeapon: items.find(item => 
        item.pluginDocumentType === 'weapon' && item.pluginData?.equipped
      ),
      equippedArmor: items.find(item =>
        item.pluginDocumentType === 'armor' && item.pluginData?.equipped
      )
    };
  }
  ```

### 4.4: Plugin Interface Evolution 🔄

**Extend plugin contracts for better integration without breaking existing patterns:**

- [ ] **Add optional game state methods to GameSystemPlugin** (`packages/shared/src/types/plugin.mts`)
  ```typescript
  export interface GameSystemPlugin {
    // ... existing methods ...
    
    /**
     * OPTIONAL: Handle game state updates for plugin-specific logic
     * Called when unified state changes affect plugin data
     */
    onStateUpdate?(broadcast: StateUpdateBroadcast, context: PluginContext): Promise<void>;
    
    /**
     * OPTIONAL: Plugin-specific state queries
     * Allows plugins to expose custom query methods
     */
    queryState?(queryType: string, params: unknown, context: PluginContext): Promise<unknown>;
    
    /**
     * OPTIONAL: Validate state operations before they are applied
     * Plugins can prevent invalid operations (e.g., equipment incompatibility)
     */
    validateOperation?(operation: StateOperation, context: PluginContext): ValidationResult;
  }
  ```

- [ ] **Update BaseGameSystemPlugin with default implementations**
  ```typescript
  export abstract class BaseGameSystemPlugin {
    // ... existing methods ...
    
    async onStateUpdate?(broadcast: StateUpdateBroadcast, context: PluginContext): Promise<void> {
      // Default: no-op, plugins can override
    }
    
    async queryState?(queryType: string, params: unknown, context: PluginContext): Promise<unknown> {
      // Default: return null, plugins can override  
    }
    
    validateOperation?(operation: StateOperation, context: PluginContext): ValidationResult {
      // Default: allow all operations, plugins can override
      return { success: true };
    }
  }
  ```

### 4.5: Plugin Component Integration Testing 🧪

**Ensure plugin components work correctly with unified state:**

- [ ] **Update plugin component tests**
  - Mock `PluginContext` with `GameStateContext`
  - Test reactive updates when state changes
  - Test component cleanup (unsubscribe from state)

- [ ] **Integration testing scenarios**
  - Character sheet updates when actor data changes
  - Inventory updates when items are added/removed via state operations
  - Multiple plugin components react to same state changes
  - Plugin cleanup doesn't leave orphaned subscriptions

### 4.6: Plugin Performance Optimization ⚡

**Optimize plugin-state integration for performance:**

- [ ] **Implement plugin context caching**
  - Cache frequently accessed actors/items
  - Invalidate cache on relevant state updates
  - Batch multiple state queries

- [ ] **Lazy loading for plugin components**  
  ```typescript
  // Only subscribe to state when component is actually mounted
  onMounted(() => {
    stateSubscription = context.gameState.subscribeToState(updateHandler);
  });
  ```

### Success Criteria for Phase 4:

✅ **Plugin Context Extended**: New `GameStateContext` provides read-only access to unified state
✅ **Session UI Components**: HUD tabs, encounter displays use game state for real-time data
✅ **Character Sheet Integration**: Uses game state store when in session, API when standalone
✅ **Any Participant Access**: Can open character sheets for any session participant by ID
✅ **GM Authority Workflow**: Character updates in sessions go through GM approval system
✅ **Character Creator**: No changes needed - correctly uses REST API independently  
✅ **Plugin Performance**: No degradation in plugin component performance
✅ **Architectural Boundaries**: Plugins maintain read-only access, cannot directly modify state
✅ **Backward Compatibility**: Existing plugin interface methods still work

### Migration Notes:

- Plugins get **read-only** access to game state (cannot modify directly)
- State modifications still flow through main app → game session service → WebSocket updates
- Plugin components become **reactive consumers** of unified state
- Plugin context provides **convenience methods** for common queries
- **Optional extensions** allow plugins to participate in state validation/processing

## Phase 5: Technical Debt Resolution 🧹

**Goal**: Replace TODO comments with actual implementations to enable full game functionality.

**Timeline**: 1-2 weeks

### Current Status: NOT STARTED ❌

During the component migration (Phase 3.3), 38 TODO comments were strategically added to preserve working code while deferring complex operations. This phase systematically implements each TODO to achieve full functionality.

### 5.1: Token Management Implementation 🎭

**Priority: HIGH - Core game functionality**

**Components Affected:**
- `ActorTokenGenerator.vue` - 4 TODOs
- `EncounterView.vue` - 6 TODOs  
- `HUD/ActorsTab.vue` - 3 TODOs

**Token Operations to Implement:**

- [ ] **Token Creation** (`ActorTokenGenerator.vue`)
  ```typescript
  // TODO: Replace with game state update
  async function createToken(actorId: string, position: { x: number, y: number }) {
    const operations: StateOperation[] = [{
      path: "currentEncounter.tokens",
      operation: "push", 
      value: {
        id: generateId(),
        actorId,
        position,
        // ... token properties
      }
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

- [ ] **Token Movement** (`EncounterView.vue`)
  ```typescript
  // TODO: Implement token movement via game state
  async function moveToken(tokenId: string, newPosition: { x: number, y: number }) {
    const tokenIndex = findTokenIndex(tokenId);
    const operations: StateOperation[] = [{
      path: `currentEncounter.tokens.${tokenIndex}.position`,
      operation: "set",
      value: newPosition
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

- [ ] **Token Updates** (Health, conditions, properties)
  ```typescript
  // TODO: Token property updates
  async function updateTokenHealth(tokenId: string, newHealth: number) {
    const tokenIndex = findTokenIndex(tokenId);
    const operations: StateOperation[] = [{
      path: `currentEncounter.tokens.${tokenIndex}.currentHealth`,
      operation: "set",
      value: newHealth
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

- [ ] **Token Deletion** (`HUD/ActorsTab.vue`)
  ```typescript
  // TODO: Remove token via game state
  async function deleteToken(tokenId: string) {
    const operations: StateOperation[] = [{
      path: "currentEncounter.tokens",
      operation: "pull",
      value: { id: tokenId } // MongoDB pull syntax
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

### 5.2: Item Management Implementation 📦

**Priority: HIGH - Inventory system core functionality**

**Components Affected:**
- `HUD/ItemsTab.vue` - 8 TODOs (highest concentration)
- `CharacterSelector.vue` - 2 TODOs

**Item Operations to Implement:**

- [ ] **Item Creation** (`HUD/ItemsTab.vue`)
  ```typescript
  // TODO: Implement item creation via game state updates
  async function createItem(itemData: Partial<IItem>) {
    const newItem: IItem = {
      id: generateId(),
      campaignId: campaignId.value,
      ownerId: null, // Unassigned initially
      ...itemData
    };
    
    const operations: StateOperation[] = [{
      path: "items",
      operation: "push",
      value: newItem
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

- [ ] **Item Duplication** (`HUD/ItemsTab.vue`)
  ```typescript
  // TODO: Implement item duplication
  async function duplicateItem(originalItem: IItem) {
    const duplicatedItem = {
      ...originalItem,
      id: generateId(),
      name: `${originalItem.name} (Copy)`
    };
    
    const operations: StateOperation[] = [{
      path: "items",
      operation: "push",
      value: duplicatedItem
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

- [ ] **Give Item to Player** (`HUD/ItemsTab.vue`)
  ```typescript
  // TODO: Implement give to player (ownership transfer)
  async function giveToPlayer(item: IItem, playerId: string) {
    const itemIndex = gameStateStore.items.findIndex(i => i.id === item.id);
    
    const operations: StateOperation[] = [{
      path: `items.${itemIndex}.ownerId`,
      operation: "set",
      value: playerId
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

- [ ] **Character Equipment Access** (`CharacterSelector.vue`)
  ```typescript
  // TODO: Load character items using game state store
  const characterItems = computed(() => 
    gameStateStore.getCharacterItems(selectedCharacter.value?.id || '')
  );
  ```

### 5.3: Encounter Management Implementation ⚔️

**Priority: MEDIUM - Advanced game features**

**Components Affected:**
- `CampaignEncounterList.vue` - 3 TODOs
- `EncounterView.vue` - 6 TODOs (shared with tokens)
- `GameSessionScheduleModal.vue` - 2 TODOs

**Encounter Operations to Implement:**

- [ ] **Encounter Status Updates** (`CampaignEncounterList.vue`) 
  ```typescript
  // TODO: Update encounter status via game state
  async function updateEncounterStatus(encounterId: string, status: EncounterStatusType) {
    const operations: StateOperation[] = [{
      path: "currentEncounter.status",
      operation: "set",
      value: status
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

- [ ] **Encounter Deletion** (`CampaignEncounterList.vue`)
  ```typescript
  // TODO: Delete encounter functionality
  async function deleteEncounter(encounterId: string) {
    // If it's the current encounter, clear it
    if (gameStateStore.currentEncounter?.id === encounterId) {
      const operations: StateOperation[] = [{
        path: "currentEncounter",
        operation: "set",
        value: null
      }];
      await gameStateStore.updateGameState(operations);
    }
    
    // Also delete from REST API for persistence
    await encountersClient.delete(encounterId);
  }
  ```

- [ ] **Initiative Management** (`EncounterView.vue`)
  ```typescript
  // TODO: Initiative tracking implementation
  async function rollInitiative(actorId: string, initiative: number) {
    const operations: StateOperation[] = [{
      path: "currentEncounter.initiativeTracker.entries",
      operation: "push", 
      value: { actorId, initiative, hasActed: false }
    }];
    await gameStateStore.updateGameState(operations);
  }
  ```

### 5.4: Character Management Implementation 👥

**Priority: MEDIUM - Player workflow improvements**

**Components Affected:**
- `CharacterCreateView.vue` - 3 TODOs
- `CharacterSheetView.vue` - 2 TODOs  
- `ChatComponent.vue` - 2 TODOs

**Character Operations to Implement:**

- [ ] **Character Selection Persistence** (`CharacterCreateView.vue`, `CharacterSheetView.vue`)
  ```typescript
  // TODO: Auto-select created character
  async function selectCharacterInGameState(character: ICharacter) {
    // This is client-only state, not server state
    gameStateStore.selectedCharacter = character;
    
    // Persist to localStorage
    localStorage.setItem('selectedCharacterId', character.id);
  }
  ```

- [ ] **Chat Integration** (`ChatComponent.vue`)
  ```typescript
  // TODO: Get character name from game state
  const currentCharacterName = computed(() => 
    gameStateStore.selectedCharacter?.name || 'Unknown Character'
  );
  ```

### 5.5: UI State Management Implementation 🖥️

**Priority: LOW - Polish and user experience**

**Components Affected:**
- `SocketManager.vue` - 4 TODOs
- `ChatTab.vue` - 3 TODOs

**UI Operations to Implement:**

- [ ] **Session Reconnection Character Restoration** (`SocketManager.vue`)
  ```typescript
  // TODO: Restore selected character from localStorage on reconnect
  function restoreCharacterSelection() {
    const savedCharacterId = localStorage.getItem('selectedCharacterId');
    if (savedCharacterId && gameStateStore.gameState) {
      const character = gameStateStore.characters.find(c => c.id === savedCharacterId);
      if (character) {
        gameStateStore.selectedCharacter = character;
      }
    }
  }
  ```

- [ ] **Chat Character Context** (`ChatTab.vue`)
  ```typescript
  // TODO: Use real character from game state
  const chatCharacter = computed(() => {
    return gameStateStore.selectedCharacter || {
      id: 'system',
      name: 'System',
      // ... default properties
    };
  });
  ```

### 5.6: Implementation Strategy & Prioritization 📋

**Week 1 Focus - Core Game Functionality:**
1. **Token Management** (Day 1-3)
   - Token creation, movement, deletion
   - Health/condition updates
   - Critical for encounter gameplay

2. **Item Management** (Day 4-5)
   - Item creation and duplication
   - Ownership transfer (give to player)
   - Inventory system completion

**Week 2 Focus - Advanced Features & Polish:**
3. **Encounter Management** (Day 1-2)
   - Status updates and deletion
   - Initiative tracking basics
   - Advanced encounter features

4. **Character & UI Management** (Day 3-4)
   - Selection persistence
   - Chat integration improvements
   - Reconnection handling

5. **Testing & Validation** (Day 5)
   - Integration testing of all TODO implementations
   - GM authority validation
   - Error handling verification

### Success Criteria for Phase 5:

✅ **All TODOs Replaced**: 38 TODO comments replaced with working implementations
✅ **Core Functionality**: Token movement, item creation, encounter management work
✅ **GM Authority**: All state changes properly validated and authorized  
✅ **Error Handling**: Graceful handling of state update failures
✅ **Performance**: No degradation from TODO implementations
✅ **User Experience**: Smooth workflows for GM and players
✅ **Testing Coverage**: All new implementations covered by tests

### Technical Debt Eliminated:

- ❌ **"Stubbed out" functionality** - All placeholder implementations replaced
- ❌ **Missing state operations** - All required StateOperation patterns implemented  
- ❌ **UI workflow gaps** - Complete user workflows from start to finish
- ❌ **Error-prone workarounds** - Proper implementations replace temporary solutions
- ❌ **Incomplete features** - Full feature parity with pre-migration functionality

## Phase 6: Testing & Migration (1-2 weeks)

### 6.1 Migration Strategy
- **New File**: `packages/server/src/scripts/migrate-game-sessions.mts`
  - Convert existing game sessions to new format
  - Populate gameState field from related entities
  - Set initial version numbers

### 6.2 Integration Tests
- **New File**: `packages/server/test/integration/game-state.test.mts`
  - Test state update sequences
  - Test version conflict handling  
  - Test dual update transactions
  - Test reconnection scenarios

### 6.3 Component Updates Testing
- Update existing component tests to use new store
- Test GM sequential update behavior
- Test player state synchronization

## Implementation Priority Order

1. **Week 1-2**: Database schema + backend state service + socket event cleanup
2. **Week 3-4**: New unified store + remove legacy stores  
3. **Week 5-6**: Update all components to use new store
4. **Week 7-8**: Plugin integration + testing
5. **Week 9**: Migration + cleanup

**Updated Phase Sequence:**
- Phase 1: Foundation & Data Models ✅ COMPLETED
- Phase 2.1: Remove Legacy Code ✅ COMPLETED  
- Phase 2.2: New Unified Game Session Handler ✅ COMPLETED
- Phase 2.3: State Service with Performance Options ✅ COMPLETED
- Phase 2.4: Backing Store Synchronization ✅ COMPLETED
- Phase 2.5: State Integrity System ✅ COMPLETED
- Phase 2.6: Update Socket Server ✅ COMPLETED  
- Phase 2.7: Legacy Socket Event Cleanup ✅ COMPLETED
- Phase 3.1: Create New Unified Game State Store ✅ COMPLETED
- Phase 3.2: Remove Legacy Stores ✅ COMPLETED
- Phase 3.3: Update Components ✅ COMPLETED (with known type issues)
  - ✅ CampaignEncounterList.vue - Replaced useEncounterStore imports
  - ✅ ChatComponent.vue - Replaced useActorStore with gameStateStore.selectedCharacter
  - ✅ ChatTab.vue - Updated character references for chat functionality
  - ✅ SocketManager.vue - Updated character restoration logic
  - ✅ CharacterCreateView.vue - REST API only, updated character selection
  - ✅ CharacterSheetView.vue - Updated character loading from ActorsClient
  - ✅ EncounterDetailView.vue - Replaced imports, added TODOs for legacy functionality
  - ✅ game-session.store.mts - Cleaned up references to deleted stores
- Phase 3.4: GM Client Update Logic ✅ COMPLETED
- Phase 4.1: Plugin Interface Extensions ✅ COMPLETED
- Phase 4: Plugin Integration 📋 IN PROGRESS (4.1 complete)
- Phase 5: Technical Debt Resolution 📋 PENDING
- Phase 6: Testing & Migration 📋 PENDING

## 🚧 Critical Issues Discovered During Component Migration

### Phase 3.3 Component Updates - Type Issues (New Issues - January 2025)
**Status**: Import replacements completed, but TypeScript compilation issues remain

**Issues Discovered**:
1. **ICharacter vs IActor Type Mismatch**: 
   - Game state store uses `ICharacter` interface (requires `inventory` property)  
   - REST API returns `IActor` interface (`inventory` property is optional)
   - Affects: CharacterSheetView.vue, CharacterCreateView.vue, GameSessionScheduleModal.vue
   - **Solution Required**: Interface harmonization or type casting

2. **Character Creation Type Confusion**:
   - Character creation components expect `ICharacter` but receive `IActor` from REST API
   - Character sheet expects `ICharacter` but receives `IActor` from ActorsClient
   - **Future Work**: Decide on unified character interface approach

3. **Legacy Encounter View Issues**:
   - EncounterDetailView.vue marked as LEGACY but still active
   - Missing proper game state integration - uses placeholder TODO comments
   - **Future Work**: Complete rewrite needed using new encounter architecture

**Current Status**: Basic compilation works with warnings. Components use game state store imports but some functionality is stubbed out with TODOs.

## 📋 Technical Debt from Minimal Approach

### Strategy Used: "Clean up the easy stuff"
The Phase 3.3 implementation followed a deliberate **minimal approach** to get basic functionality working quickly while deferring complex operations to future phases.

### ✅ What Was Implemented (Simple Replacements)
- **Import Statement Updates**: All legacy store imports replaced with `useGameStateStore()`
- **Basic Property References**: Simple property access like `actorStore.currentActor` → `gameStateStore.selectedCharacter`
- **REST API Integration**: Character creation/loading through REST endpoints (no game state needed)
- **Chat Integration**: Updated chat to use selected character from game state store

### 📋 What Was Deferred (Complex Operations)
**Token Management** - Components affected:
- Token movement, creation, deletion operations
- Map interaction and token positioning
- Token property updates (health, conditions, etc.)

**Encounter Operations** - Components affected:  
- `EncounterDetailView.vue` - Start/stop encounter, participant management
- `CampaignEncounterList.vue` - Encounter deletion and status updates
- Initiative tracking and turn management

**Item Management** - Areas affected:
- Item creation, modification, deletion
- Inventory management operations  
- Item state synchronization

**Game State Updates** - Missing implementations:
- All operations that require server state updates
- Complex multi-step operations
- Real-time state synchronization between clients

### 🔧 TODO Comments Distribution
- **35+ TODO comments** added across 8 components
- Each TODO includes specific context about what functionality needs implementation
- TODOs clearly reference which game state operations are needed
- Provides clear roadmap for Phase 3.4 and beyond

### 💡 Benefits of This Approach
- ✅ **Fast Progress**: Completed phase 3.3 in ~2 days instead of 1-2 weeks
- ✅ **Working System**: Basic functionality preserved during migration
- ✅ **Clear Roadmap**: TODOs provide exact requirements for future work  
- ✅ **Type Safety**: Compilation works (with known type issues)
- ✅ **Foundation Ready**: Game state store infrastructure proven and working

### ⚠️ Technical Debt To Address
- **High Priority**: Type interface mismatches (ICharacter vs IActor)
- **Medium Priority**: Replace TODO comments with actual implementations
- **Low Priority**: Legacy component rewrites (marked as LEGACY already)

**Current Status**: Basic compilation works with warnings. Components use game state store imports but some functionality is stubbed out with TODOs.

## 🚧 Original Critical Issues Discovered During Component Migration (Previous)

### Token Management Complexity
During component migration, we discovered that token management (movement, creation, deletion, updates) was deeply integrated into the old encounter store. This functionality needs to be reimplemented using the new game state update system:

**Affected Components:**
- `EncounterView.vue` - Token movement, selection, deletion
- `PixiMapViewer.vue` - Token positioning and rendering  
- `ActorTokenGenerator.vue` - Token creation from actors

**Required Implementation:**
- Token movement via state operations: `{ path: "currentEncounter.tokens.X.position", operation: "set", value: newPosition }`
- Token creation via state operations: `{ path: "currentEncounter.tokens", operation: "push", value: newToken }`
- Token deletion via state operations: `{ path: "currentEncounter.tokens", operation: "pull", value: tokenToDelete }`
- All token operations require GM authority and sequential processing

### Character vs Actor Type Confusion  
The migration revealed confusion between `ICharacter` (player characters) and `IActor` (NPCs, monsters) in several components:

**Issues Found:**
- `CharacterSelector.vue` was using `IActor[]` for characters but should use `ICharacter[]`
- `FloatingCharacterSheet.vue` now correctly uses `ICharacter` but components calling it may pass `IActor`
- Some components mix character and actor concepts

**Required Resolution:**
- Audit all components to ensure proper type usage
- Characters = player-controlled entities (`ICharacter` from `gameStateStore.characters`) 
- Actors = NPCs, monsters (`IActor` from `gameStateStore.actors`)

### Missing State Operations Implementation
Several component methods were commented out because they require state update operations that aren't yet implemented:

**Functionality Gaps:**
- Item creation/duplication in `ItemsTab.vue`
- Actor selection persistence (currentActor concept removed)
- Item selection persistence (currentItem concept removed) 
- Complex token management operations
- Encounter state changes (status updates, participant management)

**Next Steps:**
1. Complete basic component import updates (simpler changes first)
2. Design and implement missing state operation helpers
3. Reimplement complex token management functionality
4. Resolve Character vs Actor type usage
5. Add GM authority checks to all state-changing operations

### Store Dependencies Still Present
Some stores still import deleted stores:
- `chat.store.mts` imports `actor.store.mts` 
- `game-session.store.mts` imports `encounter.store.mts`
- Socket-related stores may have dependencies

**Resolution Required:**
- Update remaining store imports
- Test all store interdependencies
- Ensure no circular dependencies with new game-state store

## Key Implementation Notes

### Error Handling Strategy
```typescript
// Server response format
interface StateUpdateResponse {
  success: boolean
  newVersion?: string
  error?: {
    code: 'VERSION_CONFLICT' | 'VALIDATION_ERROR' | 'TRANSACTION_FAILED'
    message: string
    currentVersion?: string
  }
}
```

### Persistence Strategy
- **Server state**: `gameState` object persisted to localStorage with version and hash
- **State integrity**: Both `gameStateVersion` and `gameStateHash` stored for verification
- **Client state**: `selectedCharacter`, UI state not persisted (reset on page load)
- **Session metadata**: `sessionId`, `isGM` persisted to localStorage
- Chat store remains separate and persisted independently  
- Auth store remains separate and persisted to sessionStorage

### Socket Event Migration
**Remove Events:**
- `actor:*` events
- `item:*` events  
- `encounter:*` events (except encounter:started)

**New Events:**
- `gameState:update` - GM sends state changes
- `gameState:updated` - Server broadcasts successful changes
- `gameState:error` - Server reports update failures
- `gameState:requestFull` - Client requests complete state

## Synchronization Strategy

### During Active Sessions
- **Only gameState is updated** in real-time during gameplay
- No complex dual updates to backing models (Character, Actor, Item documents)
- Better performance and simpler server logic
- All players see consistent state via gameState synchronization

### Backing Store Sync Points
- **Session End**: Full sync when session status changes to 'ended'
- **GM Disconnect**: Sync when GM leaves session (preserves progress)
- **Periodic Intervals**: Optional background sync every N minutes
- **Server Shutdown**: Graceful sync during maintenance

### Benefits
- **Performance**: No double writes during gameplay
- **Simplicity**: No complex path parsing or transaction coordination
- **Reliability**: Single source of truth during active sessions
- **Flexibility**: Can optimize sync timing based on usage patterns

### Future Evolution
- Current approach provides data to understand usage patterns
- Can migrate to event sourcing for real-time sync when needed
- Enables performance optimization based on real-world data

## Core Principles Enforced
- **GM Authority**: GM client is ultimate authority for all game state changes
- **Sequential Updates**: GM sends one state update at a time, waits for server confirmation
- **Trust-Based**: Server trusts GM client, only validates overall structure
- **Simple Synchronization**: During sessions, only update gameState. Sync to backing models at strategic times
- **Performance First**: Avoid complex dual updates and path parsing during gameplay
- **Evolution Path**: Design enables future event sourcing when patterns are understood

## Updated Timeline Estimates

### ✅ Completed Work (6-7 weeks ahead of schedule)
- **Original Estimate**: 8-9 weeks total
- **Actual Completion**: ~5 weeks for Phases 1-3.3
- **Accelerated Due To**: Focused "minimal approach" - implemented basic functionality, deferred complex features

### 📋 Remaining Work (1-2 weeks estimated)
- **Phase 3.4**: GM Client Update Logic - 3-5 days (NEXT PRIORITY)
- **✅ Type Issue Resolution**: ✅ COMPLETED - 0 days (was BLOCKER)
- **✅ Schema Alignment**: ✅ COMPLETED - GameSession create API fixed
- **Technical Debt**: 1-2 weeks (replacing TODOs with real implementations)
- **Legacy Component Rewrites**: 2-3 days per component
- **Testing & Validation**: 1 week

### 🎯 Revised Total Timeline
- **Original**: 8-9 weeks
- **Revised**: ~6-7 weeks (ahead of schedule)
- **Current Status**: ~75% complete, 1-2 weeks remaining

### ⚡ Acceleration Factors  
- Server-side architecture completed efficiently
- Minimal approach for client migration allowed faster progress
- Clear separation of "easy stuff" vs complex functionality
- Well-defined TODOs provide clear roadmap for remaining work
- **Rapid blocker resolution**: Type issues and schema alignment fixed in 1 day instead of estimated 1-2 days
- **Architectural decision clarity**: Relationship-based inventory approach was unambiguous once analyzed

This plan provides a complete roadmap for migrating from the current fragmented state management to a unified, reliable system that supports your GM-authority architecture.