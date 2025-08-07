# Game Session State Management Architecture - Implementation Plan

## Overview
This document outlines the complete redesign of game session state management from the current fragmented approach to a unified, GM-authority based architecture.

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

### 3.2 Remove Legacy Stores
**DELETE FILES:**
- `packages/web/src/stores/actor.store.mts`
- `packages/web/src/stores/item.store.mts`
- `packages/web/src/stores/encounter.store.mts`
- `packages/web/src/stores/character-sheet.store.mts`

**KEEP FILES (may need updates):**
- `packages/web/src/stores/game-session.store.mts` - Simplify to just session metadata
- `packages/web/src/stores/chat.store.mts` - Keep as-is
- `packages/web/src/stores/auth.store.mts` - Keep as-is
- `packages/web/src/stores/socket.store.mts` - May need event handler updates

### 3.3 Update Components
**MAJOR UPDATES REQUIRED:**
- All components that use `useActorStore()` → `useGameStateStore()` (access via `actors` array)
- All components that use `useItemStore()` → `useGameStateStore()` (access via `items` array)
- All components that use `useEncounterStore()` → `useGameStateStore()` (access via `currentEncounter`)
- Components using character data → access via `characters` array (ICharacter, not IActor)

**Files requiring updates (non-exhaustive):**
- `packages/web/src/components/character/CharacterSheetContainer.vue` - Use `characters` array
- `packages/web/src/components/encounter/EncounterView.vue` - Use `currentEncounter` object
- `packages/web/src/views/encounter/EncounterDetailView.vue` - Use `currentEncounter` object  
- `packages/web/src/components/campaign/CampaignCharacterList.vue` - Use `characters` array

### 3.4 GM Client Update Logic
```typescript
// GM sends updates sequentially
async function updateGameState(operations: StateOperation[]) {
  if (isUpdating.value) {
    updateQueue.value.push({ operations })
    return
  }
  
  isUpdating.value = true
  try {
    const update: StateUpdate = {
      id: generateId(),
      sessionId: sessionId.value,
      version: stateVersion.value,
      operations,
      timestamp: Date.now(),
      source: 'gm'
    }
    
    const result = await socketRequest('gameState:update', update)
    
    if (result.success) {
      // Apply changes locally only after server confirmation
      applyStateOperations(operations)
      stateVersion.value = result.newVersion
    } else {
      handleUpdateError(result.error)
    }
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

## Phase 4: Plugin Integration (1-2 weeks)

### 4.1 Update Plugin Interface
- **File**: `packages/shared/src/types/plugin.mts`
  - Add methods to work with unified game state
  - Remove individual entity management methods

### 4.2 Update D&D 5e Plugin  
- **Files**: `packages/plugins/dnd-5e-2024/web/**`
  - Replace store usage with unified game state
  - Update plugin data access patterns
  - Ensure all validation happens client-side

### 4.3 Plugin State Helpers
- **New File**: `packages/shared/src/utils/plugin-state.mts`
```typescript
// Helper utilities for plugins to access/modify state
function getPluginData(gameState: GameState, pluginId: string): unknown
function setPluginData(gameState: GameState, pluginId: string, data: unknown): StateOperation[]
function getCharacterPluginData(character: ICharacter, path: string): unknown
function getActorPluginData(actor: IActor, path: string): unknown
function updateCharacterState(characterId: string, updates: Record<string, unknown>): StateOperation[]
function updateActorState(actorId: string, updates: Record<string, unknown>): StateOperation[]
```

## Phase 5: State Synchronization Details

### 5.1 GM Client Behavior
1. GM makes change in UI
2. Generate state operations
3. Queue update if another update is in progress  
4. Send update to server with current version
5. Wait for server response
6. On success: apply changes locally, update version
7. On failure: handle error (refresh state, retry, etc.)
8. Process next queued update if any

### 5.2 Player Client Behavior
1. Receive `gameState:updated` broadcast from server with `{ operations, newVersion, expectedHash }`
2. Check if incoming version is current version + 1
3. If yes: apply operations directly to local gameState
4. Generate hash of updated local state and compare with expectedHash
5. If hash matches: update local version and continue
6. If version wrong OR hash mismatch: request full state refresh

### 5.3 Reconnection Logic
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
- Phase 3.2: Remove Legacy Stores 🔄 IN PROGRESS
- Phase 3.3: Update Components 📋 PENDING
- Phase 3.4: GM Client Update Logic 📋 PENDING
- Phase 4: Plugin Integration 📋 PENDING
- Phase 5: State Synchronization Details 📋 PENDING
- Phase 6: Testing & Migration 📋 PENDING

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

## Estimated Timeline: 8-9 weeks total

This plan provides a complete roadmap for migrating from the current fragmented state management to a unified, reliable system that supports your GM-authority architecture.