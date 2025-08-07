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

**Server State (stored in GameSession.gameState):**
```typescript
interface ServerGameState {
  // Game entities (all campaign-associated)
  characters: ICharacter[]  // Player characters
  actors: IActor[]          // NPCs, monsters, etc.
  items: IItem[]           // All campaign items
  
  // Active elements only (no historical data)
  currentEncounter: {
    encounter: IEncounter
    map: IMap | null        // Fully hydrated map data
    tokens: IToken[]        // Current encounter tokens
  } | null
  
  // Plugin-specific state
  pluginData: Record<string, unknown>
  
  // Version info
  stateVersion: string
  lastUpdated: number
}
```

**Client Pinia Store Structure:**
```typescript
interface GameStateStore {
  // === SERVER-CONTROLLED STATE (wrapped) ===
  gameState: ServerGameState | null
  
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

## Phase 1: Foundation & Data Models (1-2 weeks)

### 1.1 Database Schema Updates
- **File**: `packages/shared/src/schemas/game-session.schema.mts`
  - Add `gameState` field containing complete session state
  - Add `stateVersion` field for optimistic concurrency control  
  - Add `pluginData` field for opaque plugin-specific state
  - Add `lastStateUpdate` timestamp field

- **File**: `packages/server/src/features/campaigns/models/game-session.model.mts`
  - Update mongoose schema to support new fields
  - Add Mixed type for gameState field
  - Add indexes for version and timestamp queries

### 1.2 State Update Schema
- **New File**: `packages/shared/src/schemas/game-state-update.schema.mts`
```typescript
interface StateUpdate {
  id: string
  sessionId: string
  version: string
  operations: StateOperation[]
  timestamp: number
  source: 'gm' | 'system'
}

interface StateOperation {
  path: string          // "characters.0.hitPoints"
  operation: 'set' | 'unset' | 'inc' | 'push' | 'pull'
  value: unknown
  previous?: unknown    // For rollbacks
}
```

## Phase 2: Backend Implementation (2-3 weeks)

### 2.1 Remove Legacy Code
**DELETE ENTIRE DIRECTORIES:**
- `packages/server/src/aggregates/` - Remove entire aggregate system
- `packages/server/src/websocket/handlers/actor-handler.mts`
- `packages/server/src/websocket/handlers/item-handler.mts` 
- `packages/server/src/websocket/handlers/move-handler.mts`

### 2.2 New Unified Game Session Handler
- **New File**: `packages/server/src/websocket/handlers/game-state-handler.mts`
```typescript
// Key socket events:
socket.on('gameState:update', async (update: StateUpdate, callback))
socket.on('gameState:requestFull', async (sessionId: string, callback))
socket.on('gameSession:join', async (sessionId: string, callback))
socket.on('gameSession:leave', async (sessionId: string, callback))
```

### 2.3 State Management Service
- **New File**: `packages/server/src/features/campaigns/services/game-state.service.mts`
  - Apply atomic state updates with MongoDB transactions  
  - Validate state structure (not plugin logic)
  - Handle version conflicts
  - Dual update: game session state + backing models (actors, items, etc.)

### 2.4 Update Socket Server
- **File**: `packages/server/src/websocket/socket-server.mts`
  - Remove references to aggregate system
  - Integrate new game-state-handler
  - Update session joining logic

## Phase 3: Frontend Implementation (2-3 weeks)

### 3.1 Create New Unified Game State Store
- **New File**: `packages/web/src/stores/game-state.store.mts`
  - Single reactive object containing all game entities
  - Sequential update queue for GM client
  - Version tracking and conflict resolution
  - localStorage persistence with version info

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
// Add actor to encounter: { path: "currentEncounter.tokens", operation: "push", value: newToken }
// Update encounter phase: { path: "currentEncounter.encounter.status", operation: "set", value: "active" }
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
1. Receive `gameState:updated` broadcast from server
2. Check if incoming version is current version + 1
3. If yes: apply operations directly
4. If no: request full state refresh
5. Update local version after successful application

### 5.3 Reconnection Logic
```typescript
async function handleReconnection() {
  const localVersion = localStorage.getItem('gameStateVersion')
  const serverResponse = await socketRequest('gameState:requestFull', sessionId)
  
  if (localVersion === serverResponse.gameState.stateVersion) {
    // State is current, no action needed
    return
  }
  
  // Replace entire server state with fresh data from server
  gameState.value = serverResponse.gameState
  localStorage.setItem('gameStateVersion', serverResponse.gameState.stateVersion)
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

1. **Week 1-2**: Database schema + backend state service
2. **Week 3-4**: New unified store + remove legacy stores  
3. **Week 5-6**: Update all components to use new store
4. **Week 7-8**: Plugin integration + testing
5. **Week 9**: Migration + cleanup

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
- **Server state**: `gameState` object persisted to localStorage with version
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

## Core Principles Enforced
- **GM Authority**: GM client is ultimate authority for all game state changes
- **Sequential Updates**: GM sends one state update at a time, waits for server confirmation
- **Trust-Based**: Server trusts GM client, only validates overall structure
- **Simple Start**: Begin with straightforward dual updates, evolve to event sourcing later

## Estimated Timeline: 8-9 weeks total

This plan provides a complete roadmap for migrating from the current fragmented state management to a unified, reliable system that supports your GM-authority architecture.