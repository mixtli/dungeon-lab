# Game Session State Architecture

## Overview

Dungeon Lab uses a **GM-authoritative state management system** where the Game Master (GM) client serves as the single source of truth for all game session data. This architecture ensures consistent game state across all connected players while maintaining the GM's ultimate control over game events.

## Core Principles

### 1. GM Authority
- **Single Source of Truth**: GM client holds authoritative game state
- **Exclusive Write Access**: Only GM can modify game state
- **Player Requests**: Players request actions, GM approves/denies
- **Trust-Based**: Server trusts GM client, validates structure only

### 2. Sequential Processing  
- **Ordered Updates**: GM sends one state update at a time
- **Version Control**: Optimistic concurrency with incrementing versions
- **Atomic Operations**: Multiple changes applied as single transaction
- **Queue Management**: Updates processed in strict sequence

### 3. State Integrity
- **Hash Verification**: SHA-256 checksums prevent state corruption  
- **Version Tracking**: Prevents conflicting concurrent updates
- **Rollback Capability**: Previous values stored for recovery
- **Repair Mechanisms**: Auto-sync and manual refresh on errors

## System Architecture

```mermaid
graph TB
    P1[Player 1] --> S[Server]
    P2[Player 2] --> S
    P3[Player N] --> S
    GM[GM Client] --> S
    
    S --> DB[(MongoDB)]
    
    subgraph "State Flow"
        P1 -.->|"gameAction:request"| S
        S -.->|"gameAction:forward"| GM
        GM -->|"gameState:update"| S
        S -->|"gameState:updated"| P1
        S -->|"gameState:updated"| P2
        S -->|"gameState:updated"| P3
        GM <-->|"full sync"| S
    end
    
    subgraph "GM Authority"
        GM -->|"Authoritative State"| GS[Game State]
        GS --> CH[Characters]
        GS --> AC[Actors/NPCs]  
        GS --> IT[Items]
        GS --> EN[Current Encounter]
    end
```

## Event Flow Architecture

### Player Action Request Flow

```mermaid
sequenceDiagram
    participant P as Player
    participant S as Server
    participant GM as GM Client
    participant DB as MongoDB
    
    Note over P,GM: Player requests token movement
    
    P->>S: gameAction:request(moveToken, callback)
    Note right of S: Store callback for later
    S->>GM: gameAction:forward(moveToken)
    
    Note over GM: Validate movement<br/>Check collision detection<br/>Apply game rules
    
    alt Valid Movement
        GM->>S: gameState:update([{path: "currentEncounter.tokens.0.position", op: "set", value: newPos}])
        S->>DB: Apply state operations atomically
        DB-->>S: Success + new version/hash
        S->>GM: StateUpdateResponse(success: true)
        S->>P: callback(approved: true) 
        Note over S: Broadcast to all players
        S->>P: gameState:updated(newState)
        S->>GM: gameState:updated(newState)
    else Invalid Movement  
        GM->>S: gameAction:response(denied: collision)
        S->>P: callback(denied: "collision detected")
    end
```

### State Synchronization Flow

```mermaid
sequenceDiagram
    participant GM as GM Client
    participant S as Server  
    participant P as Player
    participant DB as MongoDB
    
    Note over GM,P: GM modifies character stats
    
    GM->>S: gameState:update(operations, version: "v42")
    S->>S: Validate GM permissions
    S->>S: Check version (current: "v42")
    
    alt Version Valid
        S->>DB: Apply operations atomically  
        DB-->>S: Success + new hash
        S->>S: Increment version to "v43"
        
        Note over S: Broadcast to all session participants
        S->>GM: gameState:updated(newState, v43, hash)
        S->>P: gameState:updated(newState, v43, hash) 
        S->>GM: StateUpdateResponse(success: true, newVersion: "v43")
        
    else Version Conflict
        S->>GM: StateUpdateResponse(error: VERSION_CONFLICT, currentVersion: "v44")
        Note over GM: GM must refresh and retry
        GM->>S: gameState:requestFull(sessionId)
        S-->>GM: Full state + current version
    end
```

## State Update Operations

The system supports five atomic operations based on MongoDB update patterns:

### Operation Types

```typescript
// Set field value
{
  path: "characters.0.pluginData.hitPoints", 
  operation: "set", 
  value: 45
}

// Remove field entirely  
{
  path: "characters.0.temporaryHP", 
  operation: "unset"
}

// Increment number
{
  path: "characters.0.experience", 
  operation: "inc", 
  value: 100  
}

// Add to array
{
  path: "currentEncounter.tokens", 
  operation: "push", 
  value: newTokenObject
}

// Remove from array
{
  path: "characters.0.conditions", 
  operation: "pull", 
  value: "poisoned"
}
```

### Batch Operations Example

```typescript
// GM heals character and adds experience in single atomic update
const operations = [
  {
    path: "characters.0.pluginData.hitPoints", 
    operation: "set", 
    value: characterMaxHP
  },
  {
    path: "characters.0.experience", 
    operation: "inc", 
    value: 150
  },
  {
    path: "characters.0.conditions", 
    operation: "pull", 
    value: "unconscious"
  }
];

await gameStateStore.updateGameState(operations);
```

## State Synchronization Mechanisms

### 1. Real-Time Updates
- **Event**: `gameState:updated` 
- **Trigger**: Every successful GM state update
- **Recipients**: All session participants
- **Payload**: Complete new state + version + hash

### 2. Full State Refresh
- **Event**: `gameState:requestFull`
- **Usage**: Error recovery, reconnection, version conflicts  
- **Authority**: Server queries GM's current state
- **Result**: Complete state synchronization

### 3. Session Join Sync
- **Event**: `gameSession:join`
- **Trigger**: Player joins active session
- **Process**: Server sends current state immediately
- **Prevents**: Stale state on reconnection

## Error Handling & State Repair

### Version Conflicts
```typescript
// When GM's state version is outdated
{
  success: false,
  error: {
    code: 'VERSION_CONFLICT',
    message: 'State version mismatch', 
    currentVersion: '47' // Server's current version
  }
}
```
**Recovery**: GM requests full state refresh, retries operation

### State Corruption Detection
```typescript
// Hash mismatch indicates corruption
if (generateStateHash(gameState) !== expectedHash) {
  logger.error('State integrity violation detected');
  // Trigger full state resync
}
```

### Network Disconnection Recovery
- **Player Reconnect**: Automatic state sync via `gameSession:join`
- **GM Reconnect**: Full state comparison and sync
- **Orphaned Updates**: Cleanup via session heartbeat mechanism

## Performance Characteristics

### Throughput
- **Sequential Processing**: ~10-50 updates/second per session
- **Batching**: Multiple operations in single update
- **Optimizations**: Hash-based change detection

### Latency  
- **Local GM**: ~5-15ms for state updates
- **Player Sync**: ~20-50ms for broadcast propagation
- **Network**: Additional latency based on connection quality

### Memory
- **Full State**: ~1-10MB per active session
- **Version History**: Not stored (stateless)
- **Hash Verification**: Minimal overhead (~32 bytes)

## Security Model

### Authentication
- **Session-based**: GM must be authenticated session owner  
- **Participant Validation**: Players must be session participants
- **Admin Override**: System admins bypass GM checks

### Authorization  
- **State Updates**: GM-only (except system operations)
- **State Reads**: All session participants  
- **Action Requests**: All session participants

### Data Integrity
- **Input Validation**: Zod schema validation on all operations
- **Operation Safety**: Path validation prevents prototype pollution
- **State Bounds**: MongoDB schema enforces data structure

## Future Improvements

### Consistency Enhancements
- **Conflict-free Replicated Data Types (CRDTs)** for automatic conflict resolution
- **Operation-based state synchronization** instead of full state broadcasts  
- **Client-side optimistic updates** with server reconciliation

### Performance Optimizations  
- **Delta compression** for state update broadcasts
- **State partitioning** for large sessions (encounter vs character data)
- **WebSocket connection pooling** for high-concurrency sessions

### Reliability Improvements
- **Persistent operation log** for audit trails and replay capability
- **Automatic state snapshots** for faster recovery after crashes
- **Circuit breaker patterns** for graceful degradation under load

---

*This architecture ensures reliable, consistent multiplayer TTRPG sessions while maintaining the GM's traditional authority over game events and state changes.*